"use client";

interface BrandScores {
  brandName: string;
  scores: Record<string, number>;
}

interface ComparisonMatrixProps {
  brands: BrandScores[];
  concepts: string[];
}

function scoreColor(score: number): string {
  if (score >= 0.7) return "bg-green-100 text-green-800";
  if (score >= 0.4) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function scoreBar(score: number): string {
  if (score >= 0.7) return "bg-green-500";
  if (score >= 0.4) return "bg-yellow-500";
  return "bg-red-500";
}

export function ComparisonMatrix({ brands, concepts }: ComparisonMatrixProps) {
  if (concepts.length === 0 || brands.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        No data to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left font-semibold text-gray-600">
              Concept
            </th>
            {brands.map((brand) => (
              <th
                key={brand.brandName}
                className="px-4 py-3 text-center font-semibold text-gray-900"
              >
                {brand.brandName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {concepts.map((concept) => (
            <tr key={concept} className="border-b border-gray-100">
              <td className="px-4 py-3 font-medium text-gray-700">
                {concept}
              </td>
              {brands.map((brand) => {
                const score = brand.scores[concept] || 0;
                return (
                  <td key={brand.brandName} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${scoreColor(score)}`}
                      >
                        {(score * 10).toFixed(1)}
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${scoreBar(score)}`}
                          style={{ width: `${score * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
