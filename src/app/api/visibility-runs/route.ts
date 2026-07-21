import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db, brands, models, visibilityRuns, visibilityResponses, now } from "@/lib/db";
import { eq, and, gte, inArray } from "drizzle-orm";
import { queryModel } from "@/lib/openrouter";
import { extractEvidence } from "@seer/geo-platform";
import { CallBudget } from "@/lib/cost-guard";

// Identical submissions inside this window return the existing run instead of
// spawning a new fleet of LLM calls. The July 15 617-call burst was 4 identical
// runs created within 6 seconds (client retry) — 4 × 26 prompts × 3 models × 2
// calls. Same pattern recurred July 15 15:56 and July 16 17:12.
const DEDUP_WINDOW_MS = 10 * 60 * 1000;

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.API_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    brandName?: string;
    brandDomain?: string;
    prompts?: string[];
    modelIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { brandName, brandDomain = "", prompts: promptList, modelIds } = body;

  if (!brandName) {
    return NextResponse.json({ error: "brandName is required" }, { status: 400 });
  }
  if (!Array.isArray(promptList) || promptList.length < 1 || promptList.length > 100) {
    return NextResponse.json({ error: "prompts must be an array of 1–100 items" }, { status: 400 });
  }
  if (!Array.isArray(modelIds) || modelIds.length < 1 || modelIds.length > 4) {
    return NextResponse.json({ error: "modelIds must be an array of 1–4 items" }, { status: 400 });
  }

  // Find or create brand
  let brand = await db.query.brands.findFirst({ where: eq(brands.name, brandName) });
  if (!brand) {
    const [created] = await db.insert(brands).values({ name: brandName, domain: brandDomain || null }).returning();
    brand = created;
  }

  // Validate all requested model IDs exist
  const requestedModels = await Promise.all(
    modelIds.map((id) => db.query.models.findFirst({ where: eq(models.id, id) }))
  );
  const missingModel = requestedModels.find((m) => !m);
  if (missingModel !== undefined) {
    return NextResponse.json({ error: "One or more modelIds not found" }, { status: 400 });
  }

  const expectedResponses = promptList.length * modelIds.length;

  // Idempotency guard: same brand + same prompt list + same model set within
  // the dedup window (or still in flight) = the same job. Return the existing
  // run rather than double-billing it.
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        brandName,
        prompts: promptList,
        modelIds: [...modelIds].sort(),
      })
    )
    .digest("hex");

  const windowStart = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const duplicates = await db.query.visibilityRuns.findMany({
    where: and(
      eq(visibilityRuns.fingerprint, fingerprint),
      gte(visibilityRuns.createdAt, windowStart)
    ),
  });
  const inFlight = await db.query.visibilityRuns.findMany({
    where: and(
      eq(visibilityRuns.fingerprint, fingerprint),
      inArray(visibilityRuns.status, ["pending", "running"])
    ),
  });
  const existing = [...inFlight, ...duplicates][0];
  if (existing) {
    return NextResponse.json({
      runId: existing.id,
      status: existing.status,
      expectedResponses,
      deduplicated: true,
      message: "Identical run already submitted — returning it instead of re-running.",
    });
  }

  // Create the run
  const [run] = await db
    .insert(visibilityRuns)
    .values({
      brandId: brand.id,
      promptCount: promptList.length,
      modelIds,
      status: "pending",
      fingerprint,
    })
    .returning();

  // Fire and forget background processing
  (async () => {
    try {
      await db.update(visibilityRuns).set({ status: "running", updatedAt: now() as string }).where(eq(visibilityRuns.id, run.id));

      let errorCount = 0;

      const pairs = promptList.flatMap((promptText, promptIndex) =>
        modelIds.map((modelId) => ({ promptText, promptIndex, modelId }))
      );

      // Hard ceiling: each pair is exactly one answer call. Visibility is now
      // determined by the deterministic pattern matcher (geo-platform) — no
      // second model call, no cost, no nondeterminism, so the ceiling drops
      // from 2 calls/pair to 1. Anything beyond that (a future bug
      // reintroducing fan-out or unbounded retries) halts the run instead of
      // burning credits.
      const budget = new CallBudget(pairs.length, `visibility run ${run.id}`);

      const tasks = pairs.map(({ promptText, promptIndex, modelId }) => async () => {
        const model = requestedModels.find((m) => m!.id === modelId)!;

        try {
          budget.take();
          const rawResponse = await queryModel(promptText, { openrouterId: model.openrouterId, displayName: model.displayName }, "web", 2, "visibility");

          const evidence = extractEvidence(rawResponse, brandName);
          const visible = evidence.length > 0;
          const evidenceSentence = evidence[0] ?? null;

          await db.insert(visibilityResponses).values({
            runId: run.id,
            promptText,
            promptIndex,
            modelId,
            rawResponse,
            visible,
            evidenceSentence,
            sourceUrls: null,
            classifierModelId: null,
            error: null,
          });
        } catch (err: unknown) {
          errorCount++;
          await db.insert(visibilityResponses).values({
            runId: run.id,
            promptText,
            promptIndex,
            modelId,
            rawResponse: null,
            visible: null,
            evidenceSentence: null,
            sourceUrls: null,
            classifierModelId: null,
            error: String(err instanceof Error ? err.message : err).slice(0, 500),
          });
        }
      });

      await withConcurrency(tasks, 5);

      // Granular status: "completed" (no errors), "partial" (some jobs failed but
      // usable data exists), "failed" (nothing usable at all). A run should never
      // be labeled "failed" while it's still holding readable per-prompt results.
      const successCount = expectedResponses - errorCount;
      const finalStatus =
        successCount <= 0 ? "failed" : errorCount > 0 ? "partial" : "completed";
      await db.update(visibilityRuns).set({ status: finalStatus, updatedAt: now() as string }).where(eq(visibilityRuns.id, run.id));
    } catch (err) {
      console.error("Visibility run failed:", err);
      // Even on an unexpected crash, check whether any usable responses were
      // already persisted before marking the whole run a dead loss.
      let status: "failed" | "partial" = "failed";
      try {
        const existing = await db.query.visibilityResponses.findMany({
          where: eq(visibilityResponses.runId, run.id),
        });
        if (existing.some((r) => r.error === null)) {
          status = "partial";
        }
      } catch {
        // fall through with "failed"
      }
      await db.update(visibilityRuns).set({ status, updatedAt: now() as string }).where(eq(visibilityRuns.id, run.id));
    }
  })();

  return NextResponse.json({ runId: run.id, status: "pending", expectedResponses });
}
