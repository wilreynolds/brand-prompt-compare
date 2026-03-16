import type { ModelConfig, QueryMode } from "./openrouter";

interface GeminiChatResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

interface GeminiNativeResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
  }>;
}

/**
 * Strip the "google/" prefix from an OpenRouter model ID
 * to get the native Gemini model identifier.
 * e.g. "google/gemini-2.0-flash" -> "gemini-2.0-flash"
 */
function toGeminiModelId(openrouterId: string): string {
  return openrouterId.replace(/^google\//, "");
}

/**
 * Query a single Gemini model via the direct Google AI Studio API.
 *
 * Training mode: uses the OpenAI-compatible chat completions endpoint.
 * Web mode: uses the native generateContent API with Google Search grounding.
 */
export async function queryModelGemini(
  prompt: string,
  model: ModelConfig,
  mode: QueryMode = "training"
): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  }

  const geminiModelId = toGeminiModelId(model.openrouterId);

  if (mode === "web") {
    return queryGeminiNativeWithSearch(prompt, geminiModelId, apiKey);
  }

  return queryGeminiOpenAICompat(prompt, geminiModelId, apiKey);
}

// ── Training mode: OpenAI-compatible endpoint ──────────────────────

async function queryGeminiOpenAICompat(
  prompt: string,
  modelId: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Gemini API error for ${modelId} (training): ${error}`
    );
  }

  const data = (await response.json()) as GeminiChatResponse;
  return data.choices[0]?.message?.content || "";
}

// ── Web mode: Native generateContent with Google Search grounding ──

async function queryGeminiNativeWithSearch(
  prompt: string,
  modelId: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          maxOutputTokens: 4000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error for ${modelId} (web): ${error}`);
  }

  const data = (await response.json()) as GeminiNativeResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
