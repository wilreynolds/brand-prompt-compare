import type { ExtractedConceptScore } from "./extraction";

export interface AggregatedScore {
  brandName: string;
  conceptName: string;
  score: number;
  modelCount: number;
}

// Aggregate concept scores across multiple model responses into per-brand averages
export function aggregateScores(
  allScores: ExtractedConceptScore[][],
): AggregatedScore[] {
  const map = new Map<string, { total: number; count: number }>();

  for (const modelScores of allScores) {
    for (const score of modelScores) {
      const key = `${score.brandName}::${score.conceptName}`;
      const existing = map.get(key);
      if (existing) {
        existing.total += score.score;
        existing.count += 1;
      } else {
        map.set(key, { total: score.score, count: 1 });
      }
    }
  }

  const results: AggregatedScore[] = [];
  for (const [key, data] of map) {
    const [brandName, conceptName] = key.split("::");
    results.push({
      brandName,
      conceptName,
      score: data.total / data.count,
      modelCount: data.count,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
