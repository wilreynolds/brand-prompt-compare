import { queryOpenRouterRaw } from "./openrouter";

export interface DetectedBrand {
  name: string;
  confidence: "high" | "medium" | "low";
}

// Detect brand names mentioned in a user's prompt
export async function detectBrands(
  promptText: string
): Promise<DetectedBrand[]> {
  const prompt = `Extract all company/brand names from this text. Return ONLY a JSON array of objects with "name" (the brand's proper name) and "confidence" ("high", "medium", or "low").

Rules:
- Use the brand's official/proper name (e.g., "Seer Interactive" not "seer")
- Include ONLY real companies/brands, not generic terms
- "high" = explicitly named, "medium" = likely a brand, "low" = might be a brand

Text:
<text>
${promptText.slice(0, 2000)}
</text>

Respond with ONLY the JSON array.`;

  const content = await queryOpenRouterRaw(prompt, "anthropic/claude-haiku-4-5-20251001", 500);

  try {
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned) as DetectedBrand[];
  } catch {
    return [];
  }
}
