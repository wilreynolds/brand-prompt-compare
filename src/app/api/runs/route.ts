import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  runs,
  runBrands,
  brands,
  responses,
  parsedComparisons,
  sources,
  conceptScores,
  models,
} from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { queryAllModels } from "@/lib/llm";
import { extractComparison } from "@/lib/extraction";
import { verifyUrls } from "@/lib/source-verification";
import { aggregateScores } from "@/lib/scoring";

// GET /api/runs - List recent runs
export async function GET() {
  try {
    const allRuns = await db.query.runs.findMany({
      orderBy: [desc(runs.createdAt)],
      limit: 50,
      with: {
        runBrands: {
          with: { brand: true },
          orderBy: (rb, { asc }) => [asc(rb.position)],
        },
      },
    });
    return NextResponse.json(allRuns);
  } catch (error) {
    console.error("Error fetching runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch runs" },
      { status: 500 }
    );
  }
}

// POST /api/runs - Trigger a new comparison run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      promptText,
      promptId,
      brandNames,
    }: {
      promptText: string;
      promptId?: string;
      brandNames: string[];
    } = body;

    if (!promptText || !brandNames || brandNames.length < 2 || brandNames.length > 5) {
      return NextResponse.json(
        { error: "promptText and 2-5 brandNames are required" },
        { status: 400 }
      );
    }

    // 1. Get active models
    const activeModels = await db.query.models.findMany({
      where: eq(models.isActive, true),
    });

    if (activeModels.length === 0) {
      return NextResponse.json(
        { error: "No active models. Go to Settings to enable models." },
        { status: 400 }
      );
    }

    // 2. Create or find brands
    const brandRecords = await Promise.all(
      brandNames.map(async (name) => {
        const existing = await db.query.brands.findFirst({
          where: eq(brands.name, name),
        });
        if (existing) return existing;
        const [created] = await db
          .insert(brands)
          .values({ name })
          .returning();
        return created;
      })
    );

    // 3. Snapshot models used
    const modelsSnapshot = activeModels.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      provider: m.provider || "unknown",
      launchDate: m.launchDate?.toISOString() || null,
    }));

    // 4. Create the run
    const [run] = await db
      .insert(runs)
      .values({
        promptText,
        promptId: promptId || null,
        status: "running",
        modelsUsed: modelsSnapshot,
      })
      .returning();

    // 5. Link brands to run
    await db.insert(runBrands).values(
      brandRecords.map((brand, i) => ({
        runId: run.id,
        brandId: brand.id,
        position: i + 1,
      }))
    );

    // 6. Query all models in both modes (training + web) in parallel
    const modelConfigs = activeModels.map((m) => ({
      openrouterId: m.openrouterId,
      displayName: m.displayName,
      apiType: m.apiType as "openrouter" | "google",
    }));

    const [trainingResults, webResults] = await Promise.all([
      queryAllModels(promptText, modelConfigs, "training"),
      queryAllModels(promptText, modelConfigs, "web"),
    ]);

    const allModelResults = [...trainingResults, ...webResults];

    // 7. Store responses with mode
    const responseRecords: Array<{ id: string; rawText: string; mode: string; modelId: string }> = [];
    for (const result of allModelResults) {
      if (result.error || !result.text) continue;

      const model = activeModels.find(
        (m) => m.openrouterId === result.model.openrouterId
      );
      if (!model) continue;

      const [responseRecord] = await db
        .insert(responses)
        .values({
          runId: run.id,
          modelId: model.id,
          rawText: result.text,
          mode: result.mode,
        })
        .returning();

      responseRecords.push({ ...responseRecord, modelId: model.id });
    }

    // 8. Extract structured data from each response (parallel)
    const brandNamesList = brandRecords.map((b) => b.name);
    const allExtractions = await Promise.all(
      responseRecords.map((r) => extractComparison(r.rawText, brandNamesList))
    );

    // 9. Store parsed comparisons and sources
    const allSourceUrls: string[] = [];

    for (let i = 0; i < allExtractions.length; i++) {
      const extraction = allExtractions[i];
      const responseId = responseRecords[i].id;
      const responseMode = responseRecords[i].mode;

      // Store parsed comparisons with conceptEvidence
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

      // Store sources only for web mode responses
      if (responseMode === "web") {
        for (const source of extraction.sources) {
          if (!source.url || !source.url.startsWith("http")) continue;

          const brandRecord = source.brandName
            ? brandRecords.find(
                (b) =>
                  b.name.toLowerCase() === source.brandName!.toLowerCase()
              )
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

    // 10. Verify source URLs in parallel (web mode only)
    if (allSourceUrls.length > 0) {
      const verifications = await verifyUrls(allSourceUrls);
      const verificationMap = new Map(
        verifications.map((v) => [v.url, v.isVerified])
      );

      for (const responseRecord of responseRecords) {
        if (responseRecord.mode !== "web") continue;
        const responseSources = await db.query.sources.findMany({
          where: eq(sources.responseId, responseRecord.id),
        });
        for (const source of responseSources) {
          const isVerified = verificationMap.get(source.url) ?? false;
          await db
            .update(sources)
            .set({ isVerified, verifiedAt: new Date() })
            .where(eq(sources.id, source.id));
        }
      }
    }

    // 11. Aggregate and store concept scores per mode
    for (const mode of ["training", "web"] as const) {
      const modeExtractions = allExtractions.filter(
        (_, i) => responseRecords[i].mode === mode
      );
      const modeConceptScores = modeExtractions.map((e) => e.conceptScores);
      const aggregated = aggregateScores(modeConceptScores);

      for (const score of aggregated) {
        const brandRecord = brandRecords.find(
          (b) => b.name.toLowerCase() === score.brandName.toLowerCase()
        );
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

    // 12. Mark run as completed
    await db
      .update(runs)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(runs.id, run.id));

    return NextResponse.json({
      runId: run.id,
      status: "completed",
      responsesCount: responseRecords.length,
      brandsCompared: brandNamesList,
    });
  } catch (error) {
    console.error("Error running comparison:", error);
    return NextResponse.json(
      { error: "Failed to run comparison" },
      { status: 500 }
    );
  }
}
