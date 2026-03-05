"use client";

interface SourceRow {
  id: string;
  url: string;
  title: string | null;
  brandName: string | null;
  modelName: string;
  isVerified: boolean | null;
}

interface SourceTableProps {
  sources: SourceRow[];
}

export function SourceTable({ sources }: SourceTableProps) {
  if (sources.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-gray-400">
        No sources found in responses
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left font-semibold text-gray-600">
              Status
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">
              Source
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">
              Brand
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">
              Model
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id} className="border-b border-gray-100">
              <td className="px-4 py-3 text-center text-lg">
                {source.isVerified === true
                  ? "\u2705"
                  : source.isVerified === false
                    ? "\u274C"
                    : "\u23F3"}
              </td>
              <td className="px-4 py-3">
                <div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {source.title || source.url}
                  </a>
                  {source.title && (
                    <div className="mt-0.5 truncate text-xs text-gray-400">
                      {source.url}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {source.brandName || "General"}
              </td>
              <td className="px-4 py-3 text-gray-600">{source.modelName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
