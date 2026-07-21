import { db, llmUsage, appSettings, now } from "./db";
import { gte, eq, sql } from "drizzle-orm";

const DEFAULT_DAILY_CAP_USD = 25;

export async function getDailyCapUsd(): Promise<number> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "daily_spend_cap_usd"),
  });
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_CAP_USD;
}

export async function getTodaySpendUsd(): Promise<number> {
  // ISO timestamps compare lexicographically, so "YYYY-MM-DD" is a valid
  // lower bound for "createdAt within the current UTC day".
  const dayStart = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${llmUsage.cost}), 0)` })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, dayStart));
  return row?.total ?? 0;
}

/** Daily budget check — WARNING ONLY, never blocks a call (Wil, 2026-07-16:
 * the prepaid OpenRouter balance is the real hard stop; a 402 halts everything
 * and is not retried). Crossing the budget just gets loud in the logs and is
 * surfaced via GET /api/usage (`overBudget`). */
export async function warnIfOverDailyBudget(): Promise<void> {
  const [spent, cap] = await Promise.all([getTodaySpendUsd(), getDailyCapUsd()]);
  if (spent >= cap) {
    console.warn(
      `[cost-guard] OVER DAILY BUDGET: $${spent.toFixed(2)} spent today vs $${cap.toFixed(2)} ` +
        `budget (warning only — calls continue; hard stop is the prepaid OpenRouter balance).`
    );
  }
}

export interface UsageRecord {
  model: string;
  mode: string;
  context: string;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  cost: number;
}

/** Record one OpenRouter call's actual token/cost usage. Never throws — a
 * bookkeeping failure must not fail the call whose result we already have. */
export async function recordUsage(u: UsageRecord): Promise<void> {
  try {
    await db.insert(llmUsage).values({ ...u, createdAt: now() });
  } catch (err) {
    console.error("[cost-guard] failed to record usage:", err);
  }
}

/** Hard per-run ceiling on LLM calls — defense in depth against retry loops
 * or duplicated fan-out inside a single run. */
export class CallBudget {
  private used = 0;
  constructor(private readonly max: number, private readonly label: string) {}

  /** Consume n calls from the budget; throws once the ceiling is exceeded. */
  take(n: number = 1): void {
    this.used += n;
    if (this.used > this.max) {
      throw new Error(
        `Per-run call budget exhausted for ${this.label}: ${this.used} calls attempted, ` +
          `budget is ${this.max}. Halting instead of burning credits.`
      );
    }
  }
}
