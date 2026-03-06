"use client";

interface EvidenceEntry {
  brandName: string;
  modelName: string;
  quote: string;
  score: number;
}

interface ContextPanelProps {
  concepts: string[];
  selectedConcept: string | null;
  onSelectConcept: (concept: string) => void;
  evidence: Record<string, EvidenceEntry[]>;
  brandScores: Array<{ brandName: string; scores: Record<string, number> }>;
}

function findBiggestGap(
  brandScores: Array<{ brandName: string; scores: Record<string, number> }>,
  concepts: string[]
): string | null {
  let maxGap = 0;
  let gapConcept: string | null = null;

  for (const concept of concepts) {
    const scores = brandScores
      .map((b) => b.scores[concept] || 0)
      .filter((s) => s > 0);
    if (scores.length < 2) continue;
    const gap = Math.max(...scores) - Math.min(...scores);
    if (gap > maxGap) {
      maxGap = gap;
      gapConcept = concept;
    }
  }

  return gapConcept;
}

export function ContextPanel({
  concepts,
  selectedConcept,
  onSelectConcept,
  evidence,
  brandScores,
}: ContextPanelProps) {
  const biggestGap = findBiggestGap(brandScores, concepts);
  const activeConcept = selectedConcept || biggestGap || concepts[0];

  if (!activeConcept || concepts.length === 0) {
    return null;
  }

  const entries = evidence[activeConcept] || [];

  // Calculate gap for active concept
  const scores = brandScores
    .map((b) => ({ name: b.brandName, score: b.scores[activeConcept] || 0 }))
    .sort((a, b) => b.score - a.score);
  const gap = scores.length >= 2 ? scores[0].score - scores[scores.length - 1].score : 0;
  const isBigGap = gap > 0.2;

  return (
    <div className="mt-4 rounded-lg border bg-white">
      {/* Concept selector */}
      <div className="flex flex-wrap gap-1.5 border-b p-3">
        {concepts.map((concept) => {
          const conceptGap = (() => {
            const s = brandScores.map((b) => b.scores[concept] || 0);
            return s.length >= 2 ? Math.max(...s) - Math.min(...s) : 0;
          })();

          return (
            <button
              key={concept}
              onClick={() => onSelectConcept(concept)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                concept === activeConcept
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {concept}
              {conceptGap > 0.2 && (
                <span className="ml-1 text-[10px] opacity-75">
                  ({(conceptGap * 10).toFixed(1)} gap)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Evidence content */}
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {activeConcept}
          </h3>
          {isBigGap && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Significant gap: {(gap * 10).toFixed(1)} pts
            </span>
          )}
        </div>

        {/* Score summary */}
        <div className="mb-4 flex gap-4">
          {scores.map((s, i) => (
            <div key={s.name} className="text-sm">
              <span className="font-medium text-gray-900">{s.name}:</span>{" "}
              <span
                className={`font-bold ${
                  i === 0
                    ? "text-green-600"
                    : i === scores.length - 1 && isBigGap
                      ? "text-red-600"
                      : "text-gray-600"
                }`}
              >
                {(s.score * 10).toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        {/* Evidence quotes */}
        {entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="rounded-lg bg-gray-50 p-3"
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {entry.brandName}
                  </span>
                  <span>&middot;</span>
                  <span>{entry.modelName}</span>
                  <span>&middot;</span>
                  <span>{(entry.score * 10).toFixed(1)}/10</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700 italic">
                  &ldquo;{entry.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No evidence quotes available for this concept.
          </p>
        )}
      </div>
    </div>
  );
}
