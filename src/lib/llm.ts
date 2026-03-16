import { queryModel, type ModelConfig, type QueryMode } from "./openrouter";
import { queryModelGemini } from "./google-gemini";

export type { ModelConfig, QueryMode };

/**
 * Dispatch a single model call to the correct provider.
 */
async function dispatchQuery(
  prompt: string,
  model: ModelConfig,
  mode: QueryMode
): Promise<string> {
  if (model.apiType === "google") {
    return queryModelGemini(prompt, model, mode);
  }
  return queryModel(prompt, model, mode);
}

/**
 * Query all models in parallel, dispatching each to the correct
 * provider based on model.apiType ("openrouter" | "google").
 */
export async function queryAllModels(
  prompt: string,
  modelConfigs: ModelConfig[],
  mode: QueryMode = "training"
): Promise<
  Array<{ model: ModelConfig; text: string; mode: QueryMode; error?: string }>
> {
  const results = await Promise.allSettled(
    modelConfigs.map(async (model) => {
      const text = await dispatchQuery(prompt, model, mode);
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
