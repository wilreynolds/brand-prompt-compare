"use client";

import { useState, useEffect, useCallback, use } from "react";
import { RadarChart } from "@/components/radar-chart";
import { ComparisonMatrix } from "@/components/comparison-matrix";
import { SourceTable } from "@/components/source-table";

type Tab = "raw" | "radar" | "matrix" | "sources";

interface RunData {
  id: string;
  promptText: string;
  status: string;
  modelsUsed: Array<{
    displayName: string;
    provider: string;
    launchDate: string | null;
  }>;
  completedAt: string | null;
  createdAt: string;
  runBrands: Array<{
    position: number;
    brand: { id: string; name: string };
  }>;
  responses: Array<{
    id: string;
    rawText: string;
    model: { displayName: string };
    parsedComparisons: Array<{
      brand: { name: string };
      pros: string[];
      cons: string[];
      strengths: string[];
      weaknesses: string[];
    }>;
    sources: Array<{
      id: string;
      url: string;
      title: string | null;
      isVerified: boolean | null;
      brand: { name: string } | null;
    }>;
  }>;
  conceptScores: Array<{
    brandId: string;
    brand: { name: string };
    conceptName: string;
    score: number;
  }>;
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [run, setRun] = useState<RunData | null>(null);
  const [tab, setTab] = useState<Tab>("radar");
  const [loading, setLoading] = useState(true);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${id}`);
      if (res.ok) setRun(await res.json());
    } catch {
      console.error("Failed to fetch run");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Loading results...
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500">
        Run not found
      </div>
    );
  }

  const brandNames = run.runBrands.map((rb) => rb.brand.name);

  // Build radar/matrix data from concept scores
  const concepts = [...new Set(run.conceptScores.map((s) => s.conceptName))];
  const brandScores = brandNames.map((name) => ({
    brandName: name,
    scores: Object.fromEntries(
      run.conceptScores
        .filter((s) => s.brand.name === name)
        .map((s) => [s.conceptName, s.score])
    ),
  }));

  // Build source table data
  const allSources = run.responses.flatMap((r) =>
    r.sources.map((s) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      brandName: s.brand?.name || null,
      modelName: r.model.displayName,
      isVerified: s.isVerified,
    }))
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "radar", label: "Radar Chart" },
    { key: "matrix", label: "Comparison Matrix" },
    { key: "raw", label: "Raw Responses" },
    { key: "sources", label: `Sources (${allSources.length})` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">
          {brandNames.join(" vs ")}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span>
            {new Date(run.completedAt || run.createdAt).toLocaleDateString()}
          </span>
          <span>
            Models:{" "}
            {(run.modelsUsed || [])
              .map(
                (m) =>
                  `${m.displayName}${m.launchDate ? ` (${new Date(m.launchDate).toLocaleDateString()})` : ""}`
              )
              .join(", ")}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "radar" && (
        <div className="rounded-lg border bg-white p-6">
          <RadarChart brands={brandScores} concepts={concepts} />
        </div>
      )}

      {tab === "matrix" && (
        <div className="rounded-lg border bg-white p-6">
          <ComparisonMatrix brands={brandScores} concepts={concepts} />
        </div>
      )}

      {tab === "raw" && (
        <div className="space-y-4">
          {run.responses.map((response) => (
            <div
              key={response.id}
              className="rounded-lg border bg-white"
            >
              <button
                onClick={() =>
                  setExpandedResponse(
                    expandedResponse === response.id ? null : response.id
                  )
                }
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-semibold">
                  {response.model.displayName}
                </span>
                <span className="text-gray-400">
                  {expandedResponse === response.id ? "\u25B2" : "\u25BC"}
                </span>
              </button>
              {expandedResponse === response.id && (
                <div className="border-t px-6 py-4">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                    {response.rawText}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "sources" && (
        <div className="rounded-lg border bg-white p-6">
          <SourceTable sources={allSources} />
        </div>
      )}
    </div>
  );
}
