import type { ExtractedConceptScore } from "./extraction";

export interface AggregatedScore {
  brandName: string;
  conceptName: string;
  score: number;
  modelCount: number;
}

// Normalize a concept name: "CustomerService" -> "Customer Service", trim, title case
export function normalizeConcept(name: string): string {
  // Insert space before uppercase letters in camelCase/PascalCase
  let normalized = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  // Replace underscores/hyphens with spaces
  normalized = normalized.replace(/[_-]+/g, " ");
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();
  // Title case
  normalized = normalized
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return normalized;
}

// Aggregate concept scores across multiple model responses into per-brand averages
export function aggregateScores(
  allScores: ExtractedConceptScore[][],
): AggregatedScore[] {
  const map = new Map<string, { total: number; count: number; displayName: string }>();

  for (const modelScores of allScores) {
    for (const score of modelScores) {
      const normalizedConcept = normalizeConcept(score.conceptName);
      const key = `${score.brandName}::${normalizedConcept}`;
      const existing = map.get(key);
      if (existing) {
        existing.total += score.score;
        existing.count += 1;
      } else {
        map.set(key, { total: score.score, count: 1, displayName: normalizedConcept });
      }
    }
  }

  const results: AggregatedScore[] = [];
  for (const [key, data] of map) {
    const [brandName] = key.split("::");
    results.push({
      brandName,
      conceptName: data.displayName,
      score: data.total / data.count,
      modelCount: data.count,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
