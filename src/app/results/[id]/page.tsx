"use client";

import { useState, useEffect, useCallback, use } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { SourceTable } from "@/components/source-table";

type Tab = "responses" | "sources";

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
    brand: { id: string; name: string; domain: string | null };
  }>;
  responses: Array<{
    id: string;
    rawText: string;
    mode: string;
    model: { displayName: string };
    parsedComparisons: Array<{
      brand: { name: string };
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
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [run, setRun] = useState<RunData | null>(null);
  const [tab, setTab] = useState<Tab>("responses");
  const [loading, setLoading] = useState(true);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [mode, setMode] = useState<"training" | "web">("training");

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

  const trackedBrand = run.runBrands[0]?.brand;
  const modeResponses = run.responses.filter((r) => r.mode === mode);

  const allSources = modeResponses.flatMap((r) =>
    r.sources.map((s) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      brandName: s.brand?.name || null,
      brandDomain: trackedBrand?.domain || null,
      modelName: r.model.displayName,
      isVerified: s.isVerified,
    }))
  );

  function getVisibility(response: RunData["responses"][number]) {
    const pc = response.parsedComparisons[0];
    if (!pc) return null;
    const visible = pc.conceptEvidence._visible;
    const evidence = pc.conceptEvidence._evidence;
    if (visible === undefined) return null;
    return { visible: visible === "true", evidence: evidence || "" };
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "responses", label: "Responses" },
    { key: "sources", label: `Sources (${allSources.length})` },
  ];

  const hasWebResponses = run.responses.some((r) => r.mode === "web");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <a href="/" className="text-sm text-blue-600 hover:underline">
            ← New run
          </a>
          <a
            href={`/api/runs/${id}/export`}
            download
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            ↓ Export HTML Report
          </a>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          {trackedBrand ? `Tracking: ${trackedBrand.name}` : "Results"}
          {trackedBrand?.domain && (
            <span className="ml-2 text-base font-normal text-gray-400">({trackedBrand.domain})</span>
          )}
        </h1>
        <p className="mb-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 italic">
          &ldquo;{run.promptText}&rdquo;
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span>{new Date(run.completedAt || run.createdAt).toLocaleDateString()}</span>
          <span>
            {(run.modelsUsed || []).map((m) => m.displayName).join(", ")}
          </span>
        </div>

        {hasWebResponses && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Mode:</span>
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {(["training", "web"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {m === "training" ? "Training Data" : "Web Search"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary row */}
      {trackedBrand && modeResponses.length > 0 && (
        <div className="mb-6 rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Brand Visibility Summary</h2>
          <div className="flex flex-wrap gap-3">
            {modeResponses.map((response) => {
              const vis = getVisibility(response);
              return (
                <div
                  key={response.id}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                    vis === null
                      ? "bg-gray-100 text-gray-500"
                      : vis.visible
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <span>{vis === null ? "?" : vis.visible ? "✓" : "✗"}</span>
                  <span>{response.model.displayName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Responses tab */}
      {tab === "responses" && (
        <div className="space-y-4">
          {modeResponses.length === 0 && (
            <div className="rounded-lg border bg-white p-8 text-center text-gray-400">
              No responses for this mode.
            </div>
          )}
          {modeResponses.map((response) => {
            const vis = getVisibility(response);
            const isExpanded = expandedResponse === response.id;

            return (
              <div key={response.id} className="rounded-lg border bg-white">
                <button
                  onClick={() => setExpandedResponse(isExpanded ? null : response.id)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{response.model.displayName}</span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{response.mode}</span>
                    {vis !== null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          vis.visible
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {vis.visible ? `✓ ${trackedBrand?.name} mentioned` : `✗ ${trackedBrand?.name} not mentioned`}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="border-t px-6 py-4">
                    {/* Visibility detail */}
                    {vis !== null && vis.visible && vis.evidence && (
                      <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm">
                        <span className="font-medium text-green-800">Evidence: </span>
                        <span className="text-green-700 italic">&ldquo;{vis.evidence}&rdquo;</span>
                      </div>
                    )}
                    {vis !== null && !vis.visible && (
                      <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                        {trackedBrand?.name} was not mentioned in this response.
                      </div>
                    )}

                    {/* Raw response */}
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                      {response.rawText}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sources tab */}
      {tab === "sources" && (
        <div className="rounded-lg border bg-white p-6">
          {mode === "training" ? (
            <div className="flex h-32 items-center justify-center text-gray-400">
              No sources — training data mode. Switch to Web Search to see sources.
            </div>
          ) : allSources.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-gray-400">
              No sources found in responses.
            </div>
          ) : (
            <SourceTable sources={allSources} />
          )}
        </div>
      )}
    </div>
  );
}
