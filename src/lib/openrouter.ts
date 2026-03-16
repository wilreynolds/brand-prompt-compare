interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
  model: string;
}

export interface ModelConfig {
  openrouterId: string;
  displayName: string;
  apiType?: "openrouter" | "google";
}

export type QueryMode = "training" | "web";

// Send a prompt to a single model via OpenRouter
export async function queryModel(
  prompt: string,
  model: ModelConfig,
  mode: QueryMode = "training"
): Promise<string> {
  const modelId = mode === "web"
    ? `${model.openrouterId}:online`
    : model.openrouterId;

  const body: Record<string, unknown> = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 4000,
  };

  // Add web search options for web mode
  if (mode === "web") {
    body.plugins = [{ id: "web", max_results: 5 }];
    body.web_search_options = { search_context_size: "high" };
  }

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
    throw new Error(`OpenRouter error for ${model.displayName} (${mode}): ${error}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  return data.choices[0]?.message?.content || "";
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
