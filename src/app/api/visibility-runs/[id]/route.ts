import { NextRequest, NextResponse } from "next/server";
import { db, brands, models, visibilityRuns, visibilityResponses } from "@/lib/db";
import { eq } from "drizzle-orm";

// `db` is typed `any` (see src/lib/db.ts), so query results need an explicit
// cast back to their schema row types — otherwise every downstream
// .map/.filter/.sort callback on them trips noImplicitAny. Pre-existing gap,
// unrelated to this task; annotated here only so `npm run build` is green.
type VisibilityResponseRow = typeof visibilityResponses.$inferSelect;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const run = await db.query.visibilityRuns.findFirst({ where: eq(visibilityRuns.id, id) });
  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [brand, runResponses]: [typeof brands.$inferSelect | undefined, VisibilityResponseRow[]] =
    await Promise.all([
      db.query.brands.findFirst({ where: eq(brands.id, run.brandId) }),
      db.query.visibilityResponses.findMany({ where: eq(visibilityResponses.runId, run.id) }),
    ]);

  // Fetch models for all unique model IDs referenced in responses
  const modelIdSet = new Set<string>([
    ...(run.modelIds as string[]),
    ...runResponses.map((r) => r.modelId),
  ]);
  const modelRows = await Promise.all(
    [...modelIdSet].map((mid) => db.query.models.findFirst({ where: eq(models.id, mid) }))
  );
  const modelMap = new Map(modelRows.filter(Boolean).map((m) => [m!.id, m!]));

  const formattedResponses = runResponses.map((r) => {
    const model = modelMap.get(r.modelId);
    return {
      promptIndex: r.promptIndex,
      promptText: r.promptText,
      model: model ? { id: model.id, name: model.displayName } : { id: r.modelId, name: r.modelId },
      visible: r.visible ?? null,
      evidenceSentence: r.evidenceSentence ?? null,
      rawResponseExcerpt: r.rawResponse ? r.rawResponse.slice(0, 500) : null,
      rawResponse: r.rawResponse ?? null,
      sourceUrls: (r.sourceUrls as Array<{ url: string; isVerified: boolean }>) ?? [],
      error: r.error ?? null,
    };
  });

  // Compute visibility per model — expose real counts (fraction), not just a bare
  // rate. Distinguishing "0 evaluated because everything errored" from "0 evaluated
  // because nothing was ever attempted" prevents a misleading "(0/0)"-style display
  // when a run has full, readable data.
  const modelIds = run.modelIds as string[];
  const visibilityRateByModel: Record<string, number> = {};
  const visibilityByModel: Record<
    string,
    { visibleCount: number; evaluatedCount: number; totalCount: number; errorCount: number; rate: number; fraction: string }
  > = {};
  for (const modelId of modelIds) {
    const modelResponses = runResponses.filter((r) => r.modelId === modelId);
    const totalCount = modelResponses.length;
    const errored = modelResponses.filter((r) => r.error !== null);
    const evaluated = modelResponses.filter((r) => r.visible !== null);
    const visibleCount = evaluated.filter((r) => r.visible === true).length;
    const evaluatedCount = evaluated.length;
    const rate = evaluatedCount === 0 ? 0 : visibleCount / evaluatedCount;

    visibilityRateByModel[modelId] = rate;
    visibilityByModel[modelId] = {
      visibleCount,
      evaluatedCount,
      totalCount,
      errorCount: errored.length,
      rate,
      fraction: `${visibleCount}/${evaluatedCount}`,
    };
  }

  // Per-prompt "x of N models" fraction (R10) — the primary unit for per-prompt
  // visibility. Percentage, if shown at all, is secondary/aggregate-only.
  const promptIndices = [...new Set(runResponses.map((r) => r.promptIndex))].sort((a, b) => a - b);
  const visibilityByPrompt = promptIndices.map((promptIndex) => {
    const promptResponses = runResponses.filter((r) => r.promptIndex === promptIndex);
    const evaluated = promptResponses.filter((r) => r.visible !== null);
    const visibleCount = evaluated.filter((r) => r.visible === true).length;
    const totalModels = modelIds.length;
    return {
      promptIndex,
      promptText: promptResponses[0]?.promptText ?? "",
      visibleCount,
      evaluatedCount: evaluated.length,
      totalModels,
      fraction: `${visibleCount}/${totalModels}`,
    };
  });

  const errorCount = runResponses.filter((r) => r.error !== null).length;
  const isTerminal = run.status === "completed" || run.status === "partial" || run.status === "failed";

  return NextResponse.json({
    id: run.id,
    status: run.status,
    brand: brand
      ? { id: brand.id, name: brand.name, domain: brand.domain ?? "" }
      : { id: run.brandId, name: "", domain: "" },
    modelIds,
    createdAt: run.createdAt,
    completedAt: isTerminal ? run.updatedAt : null,
    responses: formattedResponses,
    summary: {
      visibilityRateByModel,
      visibilityByModel,
      visibilityByPrompt,
      totalResponses: runResponses.length,
      errorCount,
    },
  });
}
