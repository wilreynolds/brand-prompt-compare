// Yes/no visibility classification is Haiku-grade work. Before this was pinned,
// the classifier defaulted to the first active model alphabetically — which was
// Claude Opus, the most expensive model on the roster, at ~25x Haiku's price.
export const PREFERRED_CLASSIFIER_OPENROUTER_ID = "anthropic/claude-haiku-4.5";

// Visibility classification is a yes/no + one-sentence-evidence task; a brand
// mention is overwhelmingly in the body of the answer, not the tail of a very
// long one. Cap what we re-send so classifier input cost stays bounded (SEE-648).
const MAX_CLASSIFIER_RESPONSE_CHARS = 6000;

export function buildClassifierPrompt(
  promptText: string,
  rawResponse: string,
  brandName: string,
  brandDomain: string,
): string {
  const truncatedResponse = rawResponse.slice(0, MAX_CLASSIFIER_RESPONSE_CHARS);
  return `Question for the model: "${promptText}"
Model's answer: "${truncatedResponse}"

Does the model's answer mention or describe "${brandName}" (or its domain ${brandDomain})? Reply ONLY in this JSON format, no prose:
{"visible": true|false, "evidence": "<exact sentence from the answer that mentions the brand, or empty string>"}`;
}

export function parseClassifierResponse(
  raw: string,
): { visible: boolean; evidence: string } | null {
  try {
    const match = raw.match(/\{[\s\S]*?"visible"[\s\S]*?\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.visible !== "boolean") return null;
    return { visible: parsed.visible, evidence: String(parsed.evidence ?? "") };
  } catch {
    return null;
  }
}
