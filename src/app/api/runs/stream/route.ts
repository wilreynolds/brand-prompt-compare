import { NextRequest } from "next/server";
import {
  db,
  runs,
  runBrands,
  brands,
  responses,
  parsedComparisons,
  sources,
  conceptScores,
  models,
  now,
} from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { queryModel, type QueryMode } from "@/lib/openrouter";
import { extractComparison } from "@/lib/extraction";
import { verifyUrls } from "@/lib/source-verification";
import { aggregateScores } from "@/lib/scoring";

// POST /api/runs/stream - Trigger a run with SSE progress updates
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    promptText,
    promptId,
    brandNames,
    brandDomains,
    modelModes,
    selectedConcepts,
  }: {
    promptText: string;
    promptId?: string;
    brandNames: string[];
    brandDomains?: Record<string, string>;
    modelModes?: Record<string, { training: boolean; web: boolean }>;
    selectedConcepts?: string[];
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

        // Build job list: each model + mode combo
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

        // 2. Create brands (with domain if provided)
        const brandRecords = await Promise.all(
          brandNames.map(async (name) => {
            const domain = brandDomains?.[name] || null;
            const existing = await db.query.brands.findFirst({ where: eq(brands.name, name) });
            if (existing) {
              // Update domain if one was provided and it changed
              if (domain && existing.domain !== domain) {
                await db.update(brands).set({ domain }).where(eq(brands.id, existing.id));
                return { ...existing, domain };
              }
              return existing;
            }
            const [created] = await db.insert(brands).values({ name, domain }).returning();
            return created;
          })
        );

        // 3. Create run
        const modelsSnapshot = activeModels.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          provider: m.provider || "unknown",
          launchDate: m.launchDate instanceof Date ? m.launchDate.toISOString() : (m.launchDate || null),
        }));

        const [run] = await db
          .insert(runs)
          .values({ promptText, promptId: promptId || null, status: "running", modelsUsed: modelsSnapshot })
          .returning();

        await db.insert(runBrands).values(
          brandRecords.map((brand, i) => ({ runId: run.id, brandId: brand.id, position: i + 1 }))
        );

        send("run_created", { runId: run.id });

        // 4. Query each model individually, streaming progress
        const allResults: Array<{ model: typeof activeModels[number]; text: string; mode: QueryMode }> = [];
        let completed = 0;

        // Fire all in parallel but report as each finishes
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
            send("model_error", {
              model: displayName,
              mode,
              elapsed,
              completed,
              total: jobs.length,
              error: err instanceof Error ? err.message : "Unknown error",
            });
          }
        });

        await Promise.all(jobPromises);

        // 5. Store responses
        send("phase", { phase: "extracting" });
        const responseRecords: Array<{ id: string; rawText: string; mode: string; modelId: string }> = [];
        for (const result of allResults) {
          if (!result.text) continue;
          const [responseRecord] = await db
            .insert(responses)
            .values({ runId: run.id, modelId: result.model.id, rawText: result.text, mode: result.mode })
            .returning();
          responseRecords.push({ ...responseRecord, modelId: result.model.id });
        }

        // 6. Extract
        const brandNamesList = brandRecords.map((b) => b.name);
        const allExtractions = await Promise.all(
          responseRecords.map((r) => extractComparison(r.rawText, brandNamesList, selectedConcepts))
        );

        // 7. Store parsed comparisons and sources
        send("phase", { phase: "storing" });
        const allSourceUrls: string[] = [];

        for (let i = 0; i < allExtractions.length; i++) {
          const extraction = allExtractions[i];
          const responseId = responseRecords[i].id;
          const responseMode = responseRecords[i].mode;

          for (const brandData of extraction.brands) {
            const brandRecord = brandRecords.find(
              (b) => b.name.toLowerCase() === brandData.brandName.toLowerCase()
            );
            if (!brandRecord) continue;
            await db.insert(parsedComparisons).values({
              responseId,
              brandId: brandRecord.id,
              pros: brandData.pros,
              cons: brandData.cons,
              strengths: brandData.strengths,
              weaknesses: brandData.weaknesses,
              conceptEvidence: brandData.conceptEvidence || {},
            });
          }

          if (responseMode === "web") {
            for (const source of extraction.sources) {
              if (!source.url || !source.url.startsWith("http")) continue;
              const brandRecord = source.brandName
                ? brandRecords.find((b) => b.name.toLowerCase() === source.brandName!.toLowerCase())
                : null;
              await db.insert(sources).values({
                responseId,
                brandId: brandRecord?.id || null,
                url: source.url,
                title: source.title || null,
                isVerified: null,
              });
              allSourceUrls.push(source.url);
            }
          }
        }

        // 8. Verify sources
        if (allSourceUrls.length > 0) {
          send("phase", { phase: "verifying" });
          const verifications = await verifyUrls(allSourceUrls);
          const verificationMap = new Map(verifications.map((v) => [v.url, v.isVerified]));
          for (const rec of responseRecords) {
            if (rec.mode !== "web") continue;
            const responseSources = await db.query.sources.findMany({ where: eq(sources.responseId, rec.id) });
            for (const source of responseSources) {
              await db.update(sources).set({ isVerified: verificationMap.get(source.url) ?? false, verifiedAt: now() }).where(eq(sources.id, source.id));
            }
          }
        }

        // 9. Score
        send("phase", { phase: "scoring" });
        for (const mode of ["training", "web"] as const) {
          const modeExtractions = allExtractions.filter((_, i) => responseRecords[i].mode === mode);
          const modeConceptScores = modeExtractions.map((e) => e.conceptScores);
          const aggregated = aggregateScores(modeConceptScores);
          for (const score of aggregated) {
            const brandRecord = brandRecords.find((b) => b.name.toLowerCase() === score.brandName.toLowerCase());
            if (!brandRecord) continue;
            await db.insert(conceptScores).values({
              runId: run.id,
              brandId: brandRecord.id,
              conceptName: score.conceptName,
              score: score.score,
              mode,
            });
          }
        }

        // 10. Complete
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
