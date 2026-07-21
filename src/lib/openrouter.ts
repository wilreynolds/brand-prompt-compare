import { warnIfOverDailyBudget, recordUsage } from "./cost-guard";

interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
  model: string;
  usage?: OpenRouterUsage;
}

interface ModelConfig {
  openrouterId: string;
  displayName: string;
}

export type QueryMode = "training" | "web";

// Models that keep their provider-default reasoning behavior. Everything else
// gets reasoning effort "low" — SEE-645 found 60-71% of GPT-5/Gemini output
// tokens were invisible reasoning spend that brand Q&A doesn't need.
// Terra Pro's entire point is its "pro" reasoning mode — capping it would
// silently turn it back into plain Terra.
const REASONING_DEFAULT_MODELS = new Set(["openai/gpt-5.6-terra-pro"]); // "GPT 5.6 Thinking"

// Web plugin limits (SEE-648 context trim): "high" search context with 5
// results injected 20-95K prompt tokens per call — 56% of the July 15 burn.
const WEB_MAX_RESULTS = 3;
const WEB_SEARCH_CONTEXT_SIZE = "medium";

// Anthropic prompt caching pays off only above the provider's minimum
// cacheable prefix (~1024 tokens); below that the breakpoint is ignored.
const ANTHROPIC_CACHE_MIN_CHARS = 8000;

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}

function reasoningFor(baseModelId: string): { effort: "low" } | undefined {
  if (REASONING_DEFAULT_MODELS.has(baseModelId)) return undefined;
  // Anthropic models don't reason unless asked — sending an effort value would
  // switch thinking ON and increase cost, so omit the param entirely.
  if (baseModelId.startsWith("anthropic/")) return undefined;
  return { effort: "low" };
}

function buildRequestBody(
  baseModelId: string,
  modelId: string,
  prompt: string,
  maxTokens: number,
  mode: QueryMode
): Record<string, unknown> {
  // For large Anthropic prompts, mark the content as a cache breakpoint so an
  // identical prefix re-sent within the cache TTL is billed at ~10% (SEE-648
  // fix #1). Small prompts skip this — below the minimum, caching never kicks in.
  const useCacheControl =
    baseModelId.startsWith("anthropic/") && prompt.length >= ANTHROPIC_CACHE_MIN_CHARS;

  const content = useCacheControl
    ? [{ type: "text", text: prompt, cache_control: { type: "ephemeral" } }]
    : prompt;

  const body: Record<string, unknown> = {
    model: modelId,
    messages: [{ role: "user", content }],
    max_tokens: maxTokens,
    // Ask OpenRouter to return actual token counts + USD cost on every call.
    usage: { include: true },
  };

  const reasoning = reasoningFor(baseModelId);
  if (reasoning) {
    body.reasoning = reasoning;
  }

  if (mode === "web") {
    body.plugins = [{ id: "web", max_results: WEB_MAX_RESULTS }];
    body.web_search_options = { search_context_size: WEB_SEARCH_CONTEXT_SIZE };
  }

  return body;
}

async function callOpenRouter(
  body: Record<string, unknown>,
  displayName: string,
  mode: QueryMode,
  usageContext: string
): Promise<string> {
  // Budget check — warning only, never blocks (the prepaid OpenRouter balance
  // is the hard stop; 402s are non-retryable and fail fast).
  await warnIfOverDailyBudget();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Brand Prompt Compare",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    const message = `OpenRouter error for ${displayName} (${mode}): ${response.status} ${error}`;
    // Only rate limits (429) and server errors (5xx) can succeed on retry.
    // Retrying other 4xx (bad request, auth, moderation) just re-bills the
    // same failure — that pattern burned 769 errored calls on July 15.
    if (response.status === 429 || response.status >= 500) {
      throw new Error(message);
    }
    throw new NonRetryableError(message);
  }

  const data = (await response.json()) as OpenRouterResponse;

  // Record actual spend before any content checks — the call cost money
  // whether or not we like the response.
  if (data.usage) {
    await recordUsage({
      model: String(body.model),
      mode,
      context: usageContext,
      promptTokens: data.usage.prompt_tokens ?? 0,
      completionTokens: data.usage.completion_tokens ?? 0,
      reasoningTokens: data.usage.completion_tokens_details?.reasoning_tokens ?? 0,
      cachedTokens: data.usage.prompt_tokens_details?.cached_tokens ?? 0,
      cost: data.usage.cost ?? 0,
    });
  }

  return data.choices[0]?.message?.content || "";
}

// Send a prompt to a single model via OpenRouter, with bounded retry on
// retryable failures only (429/5xx/network), exponential backoff + jitter.
export async function queryModel(
  prompt: string,
  model: ModelConfig,
  mode: QueryMode = "training",
  maxRetries: number = 2,
  usageContext: string = "run"
): Promise<string> {
  const modelId = mode === "web"
    ? `${model.openrouterId}:online`
    : model.openrouterId;

  const body = buildRequestBody(model.openrouterId, modelId, prompt, 4000, mode);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) =>
          setTimeout(r, 1000 * 2 ** (attempt - 1) + Math.random() * 500)
        );
      }

      const content = await callOpenRouter(body, model.displayName, mode, usageContext);
      if (!content && attempt < maxRetries) {
        throw new Error(`Empty response from ${model.displayName} (${mode})`);
      }
      return content;
    } catch (err) {
      // A non-retryable API error (4xx other than 429) can't be fixed by
      // retrying — surface it immediately instead of re-billing the failure.
      if (err instanceof NonRetryableError) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        console.warn(`Retry ${attempt + 1}/${maxRetries} for ${model.displayName} (${mode}): ${lastError.message}`);
      }
    }
  }

  throw lastError!;
}

// Send a single prompt to a specific OpenRouter model (used for extraction/utility calls)
export async function queryOpenRouterRaw(
  prompt: string,
  model: string,
  maxTokens: number = 3000,
  usageContext: string = "extraction"
): Promise<string> {
  const body = buildRequestBody(model, model, prompt, maxTokens, "training");
  return callOpenRouter(body, model, "training", usageContext);
}

// Send a prompt to all active models in parallel
export async function queryAllModels(
  prompt: string,
  modelConfigs: ModelConfig[],
  mode: QueryMode = "training"
): Promise<Array<{ model: ModelConfig; text: string; mode: QueryMode; error?: string }>> {
  const results = await Promise.allSettled(
    modelConfigs.map(async (model) => {
      const text = await queryModel(prompt, model, mode);
      return { model, text, mode };
    })
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      model: modelConfigs[i],
      text: "",
      mode,
      error: result.reason?.message || "Unknown error",
    };
  });
}
