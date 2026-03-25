"use client";

import { useState, useEffect, useCallback, use } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { RadarChart } from "@/components/radar-chart";
import { ComparisonMatrix } from "@/components/comparison-matrix";
import { SourceTable } from "@/components/source-table";
import { ContextPanel } from "@/components/context-panel";

type Tab = "raw" | "radar" | "matrix" | "sources" | "quality";

interface RunData {
  id: string;
  promptText: string;
  status: string;
  industryPubs: string[] | null;
  modelsUsed: Array<{
    displayName: string;
    provider: string;
    launchDate: string | null;
  }>;
  completedAt: string | null;
  createdAt: string;
  runBrands: Array<{
    position: number;
    brand: { id: string; name: string; domain: string | null };
  }>;
  responses: Array<{
    id: string;
    rawText: string;
    mode: string;
    model: { displayName: string };
    parsedComparisons: Array<{
      brand: { name: string };
      pros: string[];
      cons: string[];
      strengths: string[];
      weaknesses: string[];
      conceptEvidence: Record<string, string>;
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
    mode: string;
  }>;
}

function buildGoogleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
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
  const [mode, setMode] = useState<"training" | "web">("training");
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/runs/${id}`);
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

  // Filter by mode
  const modeScores = run.conceptScores.filter((s) => s.mode === mode);
  const modeResponses = run.responses.filter((r) => r.mode === mode);

  // Build radar/matrix data from filtered concept scores
  const concepts = [...new Set(modeScores.map((s) => s.conceptName))];
  const brandScores = brandNames.map((name) => ({
    brandName: name,
    scores: Object.fromEntries(
      modeScores
        .filter((s) => s.brand.name === name)
        .map((s) => [s.conceptName, s.score])
    ),
  }));

  // Build evidence map for context panel
  const evidenceMap: Record<string, Array<{ brandName: string; modelName: string; quote: string; score: number }>> = {};
  for (const response of modeResponses) {
    for (const pc of response.parsedComparisons) {
      if (!pc.conceptEvidence) continue;
      for (const [concept, quote] of Object.entries(pc.conceptEvidence)) {
        if (!evidenceMap[concept]) evidenceMap[concept] = [];
        const score = modeScores.find(
          (s) => s.brand.name === pc.brand.name && s.conceptName === concept
        )?.score || 0;
        evidenceMap[concept].push({
          brandName: pc.brand.name,
          modelName: response.model.displayName,
          quote,
          score,
        });
      }
    }
  }

  // Build source table data (web mode only has real sources)
  const allSources = modeResponses.flatMap((r) =>
    r.sources.map((s) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      brandName: s.brand?.name || null,
      modelName: r.model.displayName,
      isVerified: s.isVerified,
    }))
  );

  // Build quality check search links per brand
  const industryPubs = run.industryPubs || [];

  const tabs: { key: Tab; label: string }[] = [
    { key: "radar", label: "Radar Chart" },
    { key: "matrix", label: "Comparison Matrix" },
    { key: "raw", label: "Raw Responses" },
    { key: "sources", label: `Sources (${allSources.length})` },
    { key: "quality", label: "Quality Check" },
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

        {/* Mode toggle */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Mode:</span>
          <div className="flex rounded-lg bg-gray-100 p-0.5">
            <button
              onClick={() => { setMode("training"); setSelectedConcept(null); }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                mode === "training"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Training Data
            </button>
            <button
              onClick={() => { setMode("web"); setSelectedConcept(null); }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                mode === "web"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Web Search
            </button>
          </div>
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
        <>
          <div className="rounded-lg border bg-white p-6">
            <RadarChart brands={brandScores} concepts={concepts} />
          </div>
          <ContextPanel
            concepts={concepts}
            selectedConcept={selectedConcept}
            onSelectConcept={setSelectedConcept}
            evidence={evidenceMap}
            brandScores={brandScores}
          />
        </>
      )}

      {tab === "matrix" && (
        <>
          <div className="rounded-lg border bg-white p-6">
            <ComparisonMatrix brands={brandScores} concepts={concepts} />
          </div>
          <ContextPanel
            concepts={concepts}
            selectedConcept={selectedConcept}
            onSelectConcept={setSelectedConcept}
            evidence={evidenceMap}
            brandScores={brandScores}
          />
        </>
      )}

      {tab === "raw" && (
        <div className="space-y-4">
          {modeResponses.map((response) => (
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
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    ({response.mode})
                  </span>
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
          {mode === "training" ? (
            <div className="flex h-32 items-center justify-center text-gray-400">
              No sources cited &mdash; training data only. Switch to Web Search mode to see verified sources.
            </div>
          ) : (
            <SourceTable sources={allSources} />
          )}
        </div>
      )}

      {tab === "quality" && (
        <div className="space-y-6">
          {/* Explainer */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="mb-2 font-semibold">Why check quality?</p>
            <p>
              AI models train on web content. If a brand publishes lots of &ldquo;Best X&rdquo;
              listicles ranking themselves, their scores may be inflated by their own content
              rather than genuine reputation. Use these searches to spot-check.
            </p>
          </div>

          {/* Manual Google search links per brand */}
          <div className="space-y-4">
            {run.runBrands.map((rb) => {
              const brand = rb.brand;
              const domain = brand.domain;
              const searchBase = domain || brand.name;

              // Build search links
              const searches: { label: string; query: string; description: string }[] = [
                {
                  label: "Listicle check",
                  query: `site:${searchBase} intitle:"best" OR intitle:"top" OR intitle:"vs"`,
                  description: "Find self-published listicles that may inflate AI training data",
                },
                {
                  label: "General mentions",
                  query: `"${brand.name}" -site:${searchBase}`,
                  description: "Third-party mentions across the web",
                },
              ];

              // Add industry pub searches if provided
              if (industryPubs.length > 0) {
                const pubSiteQueries = industryPubs.map((pub) => `site:${pub}`).join(" OR ");
                searches.push({
                  label: "Industry publications",
                  query: `"${brand.name}" (${pubSiteQueries})`,
                  description: `Mentions in ${industryPubs.join(", ")}`,
                });
              }

              // Competitor comparison searches
              const otherBrands = brandNames.filter((n) => n !== brand.name);
              if (otherBrands.length > 0) {
                searches.push({
                  label: "Competitor comparisons",
                  query: `"${brand.name}" ${otherBrands.map((b) => `"${b}"`).join(" OR ")} comparison OR review OR vs`,
                  description: "Third-party content comparing these brands",
                });
              }

              return (
                <div key={brand.id} className="rounded-lg border bg-white p-5">
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">{brand.name}</h3>
                  {domain && (
                    <p className="mb-3 text-xs text-gray-400">{domain}</p>
                  )}
                  <div className="space-y-3">
                    {searches.map((search) => (
                      <div key={search.label} className="flex items-start gap-3">
                        <a
                          href={buildGoogleSearchUrl(search.query)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          {search.label} &rarr;
                        </a>
                        <div>
                          <p className="text-sm text-gray-600">{search.description}</p>
                          <p className="mt-0.5 text-xs text-gray-400 font-mono break-all">{search.query}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
