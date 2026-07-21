import { NextRequest } from "next/server";
import {
  db,
  runs,
  runBrands,
  brands,
  responses,
  parsedComparisons,
  sources,
  models,
  now,
} from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { queryModel, type QueryMode } from "@/lib/openrouter";
import { extractEvidence, VISIBILITY_MATCHER_VERSION } from "@seer/geo-platform";
import { extractComparison } from "@/lib/extraction";
import { verifyUrls } from "@/lib/source-verification";

// POST /api/runs/stream - Trigger a run with SSE progress updates
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    promptText,
    promptId,
    brandName,
    brandDomain,
    modelModes,
  }: {
    promptText: string;
    promptId?: string;
    brandName: string;
    brandDomain?: string;
    modelModes?: Record<string, { training: boolean; web: boolean }>;
  } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        if (!promptText || !brandName) {
          send("error", { message: "promptText and brandName are required" });
          controller.close();
          return;
        }

        // 1. Get models
        let activeModels: (typeof models.$inferSelect)[];
        if (modelModes && Object.keys(modelModes).length > 0) {
          const modelIds = Object.entries(modelModes)
            .filter(([, modes]) => modes.training || modes.web)
            .map(([id]) => id);
          activeModels = modelIds.length > 0
            ? await db.query.models.findMany({ where: inArray(models.id, modelIds) })
            : [];
        } else {
          activeModels = await db.query.models.findMany({ where: eq(models.isActive, true) });
        }

        if (activeModels.length === 0) {
          send("error", { message: "No models selected." });
          controller.close();
          return;
        }

        // Build job list
        const runTraining = modelModes
          ? activeModels.filter((m) => modelModes[m.id]?.training)
          : activeModels;
        const runWeb = modelModes
          ? activeModels.filter((m) => modelModes[m.id]?.web)
          : activeModels;

        type Job = { model: typeof activeModels[number]; mode: QueryMode };
        const jobs: Job[] = [
          ...runTraining.map((m) => ({ model: m, mode: "training" as const })),
          ...runWeb.map((m) => ({ model: m, mode: "web" as const })),
        ];

        send("init", { totalJobs: jobs.length });

        // 2. Create/find brand
        const domain = brandDomain || null;
        const existingBrand = await db.query.brands.findFirst({ where: eq(brands.name, brandName) });
        let brandRecord: typeof brands.$inferSelect;
        if (existingBrand) {
          if (domain && existingBrand.domain !== domain) {
            await db.update(brands).set({ domain }).where(eq(brands.id, existingBrand.id));
            brandRecord = { ...existingBrand, domain };
          } else {
            brandRecord = existingBrand;
          }
        } else {
          const [created] = await db.insert(brands).values({ name: brandName, domain }).returning();
          brandRecord = created;
        }

        // 3. Create run
        const modelsSnapshot = activeModels.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          provider: m.provider || "unknown",
          launchDate: m.launchDate || null,
        }));

        const [run] = await db
          .insert(runs)
          .values({ promptText, promptId: promptId || null, status: "running", modelsUsed: modelsSnapshot })
          .returning();

        await db.insert(runBrands).values([{ runId: run.id, brandId: brandRecord.id, position: 1 }]);

        send("run_created", { runId: run.id });

        // 4. Query each model, streaming progress
        const allResults: Array<{ model: typeof activeModels[number]; text: string; mode: QueryMode }> = [];
        let completed = 0;

        const jobPromises = jobs.map(async (job) => {
          const displayName = job.model.displayName;
          const mode = job.mode;
          send("model_start", { model: displayName, mode });
          const startTime = Date.now();

          try {
            const config = { openrouterId: job.model.openrouterId, displayName };
            const text = await queryModel(promptText, config, mode);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            completed++;
            send("model_done", { model: displayName, mode, elapsed, completed, total: jobs.length });
            allResults.push({ model: job.model, text, mode });
          } catch (err) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            completed++;
            const errMsg = err instanceof Error ? err.message : "Unknown error";
            console.error(`Failed after retries: ${displayName} (${mode}): ${errMsg}`);
            send("model_error", {
              model: displayName,
              mode,
              elapsed,
              completed,
              total: jobs.length,
              error: `Failed after retries: ${errMsg}`,
            });
          }
        });

        await Promise.all(jobPromises);

        // 5. Store responses
        send("phase", { phase: "classifying" });
        const responseRecords: Array<{ id: string; rawText: string; mode: string; modelId: string }> = [];
        for (const result of allResults) {
          if (!result.text) continue;
          const [responseRecord] = await db
            .insert(responses)
            .values({ runId: run.id, modelId: result.model.id, rawText: result.text, mode: result.mode })
            .returning();
          responseRecords.push({ ...responseRecord, modelId: result.model.id });
        }

        // 6. Determine visibility via the deterministic pattern matcher
        // (geo-platform) — no model call, no cost, no nondeterminism.
        // Replaces the old LLM-classifier call.
        // Per docs/superpowers/specs/2026-07-21-geo-consolidation-design.md D2/R5.
        for (let i = 0; i < responseRecords.length; i++) {
          const rec = responseRecords[i];
          const evidence = extractEvidence(rec.rawText, brandName);
          await db.insert(parsedComparisons).values({
            responseId: rec.id,
            brandId: brandRecord.id,
            pros: [],
            cons: [],
            strengths: [],
            weaknesses: [],
            conceptEvidence: {
              _visible: String(evidence.length > 0),
              _evidence: evidence[0] ?? "",
              _matcherVersion: VISIBILITY_MATCHER_VERSION,
            },
          });
        }

        // 7. Extract sources from web-mode responses
        send("phase", { phase: "extracting" });
        const allSourceUrls: string[] = [];
        for (const rec of responseRecords) {
          if (rec.mode !== "web") continue;
          try {
            const extraction = await extractComparison(rec.rawText, [brandName], undefined);
            for (const source of extraction.sources) {
              if (!source.url || !source.url.startsWith("http")) continue;
              await db.insert(sources).values({
                responseId: rec.id,
                brandId: brandRecord.id,
                url: source.url,
                title: source.title || null,
                isVerified: null,
              });
              allSourceUrls.push(source.url);
            }
          } catch {
            // extraction is best-effort
          }
        }

        // 8. Verify sources
        if (allSourceUrls.length > 0) {
          send("phase", { phase: "verifying" });
          const verifications = await verifyUrls(allSourceUrls);
          const verificationMap = new Map(verifications.map((v) => [v.url, v.isVerified]));
          const responseIds = responseRecords.map((r) => r.id);
          const responseSources = responseIds.length > 0
            ? await db.query.sources.findMany({ where: inArray(sources.responseId, responseIds) })
            : [];
          for (const source of responseSources) {
            await db.update(sources)
              .set({ isVerified: verificationMap.get(source.url) ?? false, verifiedAt: now() })
              .where(eq(sources.id, source.id));
          }
        }

        // 9. Complete
        await db.update(runs).set({ status: "completed", completedAt: now() }).where(eq(runs.id, run.id));

        send("complete", { runId: run.id });
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        send("error", { message: error instanceof Error ? error.message : "Run failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
