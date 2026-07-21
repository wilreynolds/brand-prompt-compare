"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PromptCards } from "@/components/prompt-cards";
import { RunProgress, type ModelEvent } from "@/components/run-progress";
import { apiFetch } from "@/lib/api-fetch";

interface Prompt {
  id: string;
  name: string;
  templateText: string;
}

interface ModelOption {
  id: string;
  displayName: string;
  provider: string;
  isActive: boolean;
}

type WizardStep = "prompt" | "brand" | "models";

export default function HomePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Prompt[]>([]);
  const [promptText, setPromptText] = useState("");

  const [wizardStep, setWizardStep] = useState<WizardStep>("prompt");

  // Brand step
  const [brandName, setBrandName] = useState("");
  const [brandDomain, setBrandDomain] = useState("");

  // Model step
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [modelModes, setModelModes] = useState<Record<string, { training: boolean; web: boolean }>>({});

  // Pipeline / progress
  const [isRunning, setIsRunning] = useState(false);
  const [runEvents, setRunEvents] = useState<ModelEvent[]>([]);
  const [runCompleted, setRunCompleted] = useState(0);
  const [runTotal, setRunTotal] = useState(0);
  const [runPhase, setRunPhase] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiFetch("/api/prompts");
      if (res.ok) setTemplates(await res.json());
    } catch {
      await apiFetch("/api/seed", { method: "POST" });
      const res = await apiFetch("/api/prompts");
      if (res.ok) setTemplates(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleNextToBrand = () => {
    if (!promptText.trim()) return;
    setWizardStep("brand");
    setPipelineError("");
  };

  const handleLoadModels = async () => {
    if (!brandName.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/models");
      const modelList: ModelOption[] = await res.json();
      setAvailableModels(modelList);
      const modes: Record<string, { training: boolean; web: boolean }> = {};
      for (const m of modelList) {
        modes[m.id] = { training: m.isActive, web: m.isActive };
      }
      setModelModes(modes);
      setWizardStep("models");
    } catch {
      setPipelineError("Failed to load models.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunComparison = async () => {
    setIsRunning(true);
    setRunEvents([]);
    setRunCompleted(0);
    setRunTotal(0);
    setRunPhase(null);
    setPipelineError("");

    try {
      const res = await apiFetch("/api/runs/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText,
          brandName,
          brandDomain: brandDomain.trim() || undefined,
          modelModes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Run failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ") && currentEvent) {
            const data = JSON.parse(line.slice(6));

            switch (currentEvent) {
              case "init":
                setRunTotal(data.totalJobs);
                break;
              case "model_start":
                setRunEvents((prev) => [...prev, { type: "start", model: data.model, mode: data.mode }]);
                break;
              case "model_done":
                setRunEvents((prev) => [
                  ...prev.filter((e) => !(e.model === data.model && e.mode === data.mode && e.type === "start")),
                  { type: "done", model: data.model, mode: data.mode, elapsed: data.elapsed },
                ]);
                setRunCompleted(data.completed);
                break;
              case "model_error":
                setRunEvents((prev) => [
                  ...prev.filter((e) => !(e.model === data.model && e.mode === data.mode && e.type === "start")),
                  { type: "error", model: data.model, mode: data.mode, elapsed: data.elapsed, error: data.error },
                ]);
                setRunCompleted(data.completed);
                break;
              case "phase":
                setRunPhase(data.phase);
                break;
              case "complete":
                router.push(`/results/${data.runId}`);
                return;
              case "error":
                throw new Error(data.message);
            }
            currentEvent = "";
          }
        }
      }
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectTemplate = (templateText: string) => {
    setPromptText(templateText);
    setWizardStep("prompt");
    setIsRunning(false);
  };

  const toggleModelMode = (id: string, mode: "training" | "web") => {
    setModelModes((prev) => ({
      ...prev,
      [id]: { ...prev[id], [mode]: !prev[id]?.[mode] },
    }));
  };

  const trainingCount = Object.values(modelModes).filter((m) => m.training).length;
  const webCount = Object.values(modelModes).filter((m) => m.web).length;
  const totalCalls = trainingCount + webCount;
  const hasAnyModel = totalCalls > 0;

  const stepNumber = wizardStep === "prompt" ? 0 : wizardStep === "brand" ? 1 : 2;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">AI Prompt Runner</h1>
        <p className="text-lg text-gray-600">
          Run any prompt across multiple LLMs and track your brand&apos;s visibility in the responses
        </p>
      </div>

      {isRunning ? (
        <RunProgress
          events={runEvents}
          completed={runCompleted}
          total={runTotal}
          phase={runPhase}
          error={pipelineError || null}
        />
      ) : (
        <>
          {wizardStep !== "prompt" && (
            <div className="mb-6 flex items-center justify-center gap-2 text-sm">
              {["Brand", "Models"].map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className="h-px w-8 bg-gray-300" />}
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      stepNumber > i + 1
                        ? "bg-green-500 text-white"
                        : stepNumber === i + 1
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {stepNumber > i + 1 ? "✓" : i + 1}
                  </div>
                  <span className={stepNumber === i + 1 ? "font-semibold text-gray-900" : "text-gray-500"}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Step 0: Prompt */}
          {wizardStep === "prompt" && (
            <>
              {templates.length > 0 && (
                <div className="mb-6">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Start with a template
                  </h2>
                  <PromptCards templates={templates} onSelect={handleSelectTemplate} />
                </div>
              )}

              <div className="mb-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {templates.length > 0 ? "Or write your own" : "Enter your prompt"}
                </h2>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Ask anything — e.g. What are the best SEO agencies right now? Who would you recommend for a B2B company?"
                  className="w-full rounded-lg border border-gray-300 p-4 text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  rows={6}
                />
                <button
                  onClick={handleNextToBrand}
                  disabled={!promptText.trim()}
                  className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Next: Set Brand to Track →
                </button>
              </div>
            </>
          )}

          {/* Step 1: Brand */}
          {wizardStep === "brand" && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">Step 1: Brand to Track</h2>
              <p className="mb-4 text-sm text-gray-600">
                Which brand do you want to check visibility for? We&apos;ll analyze every model response to see if this brand is mentioned.
              </p>
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-700">Brand name (required)</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLoadModels()}
                  placeholder="e.g. Seer Interactive"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mb-5">
                <label className="mb-1 block text-xs font-medium text-gray-700">Domain (optional)</label>
                <input
                  type="text"
                  value={brandDomain}
                  onChange={(e) => setBrandDomain(e.target.value)}
                  placeholder="e.g. seerinteractive.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleLoadModels}
                  disabled={!brandName.trim() || loading}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {loading ? "Loading Models..." : "Next: Select Models →"}
                </button>
                <button
                  onClick={() => setWizardStep("prompt")}
                  className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Back
                </button>
              </div>
              {pipelineError && (
                <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{pipelineError}</div>
              )}
            </div>
          )}

          {/* Step 2: Models */}
          {wizardStep === "models" && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-6">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">Step 2: Select Models &amp; Modes</h2>
              <p className="mb-4 text-sm text-gray-600">
                Choose which models to run your prompt against, and whether to use training data, web search, or both.
              </p>

              <div className="mb-2 flex items-center gap-3 px-4 text-xs font-semibold text-gray-500">
                <span className="flex-1">Model</span>
                <span className="w-20 text-center">Training</span>
                <span className="w-20 text-center">Web</span>
              </div>

              <div className="mb-4 space-y-2">
                {availableModels.map((model) => (
                  <div key={model.id} className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm">
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{model.displayName}</span>
                      <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {model.provider}
                      </span>
                    </div>
                    <label className="flex w-20 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={modelModes[model.id]?.training || false}
                        onChange={() => toggleModelMode(model.id, "training")}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex w-20 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={modelModes[model.id]?.web || false}
                        onChange={() => toggleModelMode(model.id, "web")}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div className="mb-3 flex gap-2 text-xs">
                <button
                  onClick={() => {
                    const modes: Record<string, { training: boolean; web: boolean }> = {};
                    for (const m of availableModels) modes[m.id] = { training: true, web: false };
                    setModelModes(modes);
                  }}
                  className="text-blue-600 hover:underline"
                >
                  All Training
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => {
                    const modes: Record<string, { training: boolean; web: boolean }> = {};
                    for (const m of availableModels) modes[m.id] = { training: true, web: true };
                    setModelModes(modes);
                  }}
                  className="text-blue-600 hover:underline"
                >
                  All Both
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => {
                    const modes: Record<string, { training: boolean; web: boolean }> = {};
                    for (const m of availableModels) modes[m.id] = { training: false, web: false };
                    setModelModes(modes);
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="mb-4 rounded-lg bg-white p-3 text-sm text-gray-700">
                <strong>Tracking:</strong> {brandName}
                {brandDomain && <span className="ml-1 text-gray-400">({brandDomain})</span>}
                {" — "}
                {trainingCount} training + {webCount} web = {totalCalls} API calls
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRunComparison}
                  disabled={!hasAnyModel}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Run Prompt
                </button>
                <button
                  onClick={() => setWizardStep("brand")}
                  className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Back
                </button>
              </div>

              {pipelineError && (
                <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{pipelineError}</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
