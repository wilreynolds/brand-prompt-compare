import { NextResponse } from "next/server";
import { db, llmUsage } from "@/lib/db";
import { gte, sql } from "drizzle-orm";
import { getDailyCapUsd, getTodaySpendUsd } from "@/lib/cost-guard";

// GET /api/usage — today's spend vs the daily cap, plus recent per-model/mode
// average call costs so callers (the skill, the UI) can estimate a run's cost
// before firing it.
export async function GET() {
  try {
    const [spendTodayUsd, dailyCapUsd] = await Promise.all([
      getTodaySpendUsd(),
      getDailyCapUsd(),
    ]);

    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Per model+mode averages over the last 30 days of recorded calls
    const averages = await db
      .select({
        model: llmUsage.model,
        mode: llmUsage.mode,
        context: llmUsage.context,
        calls: sql<number>`count(*)`,
        avgCostUsd: sql<number>`avg(${llmUsage.cost})`,
        avgPromptTokens: sql<number>`avg(${llmUsage.promptTokens})`,
        avgCompletionTokens: sql<number>`avg(${llmUsage.completionTokens})`,
      })
      .from(llmUsage)
      .where(gte(llmUsage.createdAt, windowStart))
      .groupBy(llmUsage.model, llmUsage.mode, llmUsage.context);

    // Mode-level fallback averages for models with no history yet (e.g. a
    // freshly added roster model)
    const modeAverages = await db
      .select({
        mode: llmUsage.mode,
        calls: sql<number>`count(*)`,
        avgCostUsd: sql<number>`avg(${llmUsage.cost})`,
      })
      .from(llmUsage)
      .where(gte(llmUsage.createdAt, windowStart))
      .groupBy(llmUsage.mode);

    return NextResponse.json({
      date: new Date().toISOString().slice(0, 10),
      spendTodayUsd,
      // Daily budget is a WARNING threshold only — calls are never blocked by
      // the app; the prepaid OpenRouter balance is the hard stop.
      dailyBudgetUsd: dailyCapUsd,
      overBudget: spendTodayUsd >= dailyCapUsd,
      remainingTodayUsd: Math.max(0, dailyCapUsd - spendTodayUsd),
      windowDays: 30,
      averages,
      modeAverages,
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
