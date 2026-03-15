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

interface DetectedBrand {
  name: string;
  confidence: string;
}

interface DetectedConcept {
  name: string;
  description: string;
}

interface ModelOption {
  id: string;
  displayName: string;
  provider: string;
  isActive: boolean;
}

type WizardStep = "prompt" | "brands" | "concepts" | "models";

export default function HomePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Prompt[]>([]);
  const [promptText, setPromptText] = useState("");

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>("prompt");

  // Brand step
  const [detectedBrands, setDetectedBrands] = useState<DetectedBrand[]>([]);
  const [editableBrands, setEditableBrands] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState("");

  // Concept step
  const [detectedConcepts, setDetectedConcepts] = useState<DetectedConcept[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());

  // Model step — track which modes are selected per model
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [modelModes, setModelModes] = useState<Record<string, { training: boolean; web: boolean }>>({});

  // Pipeline / progress
  const [isRunning, setIsRunning] = useState(false);
  const [runEvents, setRunEvents] = useState<ModelEvent[]>([]);
  const [runCompleted, setRunCompleted] = useState(0);
  const [runTotal, setRunTotal] = useState(0);
  const [runPhase, setRunPhase] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState("");
  const [detecting, setDetecting] = useState(false);

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

  // Step 1: Detect brands
  const handleDetectBrands = async () => {
    if (!promptText.trim()) return;
    setDetecting(true);
    setPipelineError("");

    try {
      const res = await apiFetch("/api/brands/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptText }),
      });
      const data = await res.json();
      setDetectedBrands(data.brands || []);
      setEditableBrands((data.brands || []).map((b: DetectedBrand) => b.name));
      setWizardStep("brands");
    } catch {
      setPipelineError("Failed to detect brands. Check your API keys.");
    } finally {
      setDetecting(false);
    }
  };

  // Step 2: Detect concepts
  const handleDetectConcepts = async () => {
    if (editableBrands.length < 2) return;
    setDetecting(true);
    setPipelineError("");

    try {
      const res = await apiFetch("/api/concepts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptText, brandNames: editableBrands }),
      });
      const data = await res.json();
      const concepts = data.concepts || [];
      setDetectedConcepts(concepts);
      setSelectedConcepts(new Set(concepts.map((c: DetectedConcept) => c.name)));
      setWizardStep("concepts");
    } catch {
      setPipelineError("Failed to detect concepts.");
    } finally {
      setDetecting(false);
    }
  };

  // Step 3: Load models
  const handleLoadModels = async () => {
    setDetecting(true);
    try {
      const res = await apiFetch("/api/models");
      const models: ModelOption[] = await res.json();
      setAvailableModels(models);
      // Default: active models get both modes checked
      const modes: Record<string, { training: boolean; web: boolean }> = {};
      for (const m of models) {
        modes[m.id] = { training: m.isActive, web: m.isActive };
      }
      setModelModes(modes);
      setWizardStep("models");
    } catch {
      setPipelineError("Failed to load models.");
    } finally {
      setDetecting(false);
    }
  };

  // Run comparison with streaming progress
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
          brandNames: editableBrands,
          modelModes,
          selectedConcepts: Array.from(selectedConcepts),
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
      setPipelineError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectTemplate = (templateText: string) => {
    setPromptText(templateText);
    setWizardStep("prompt");
    setIsRunning(false);
  };

  const handleRemoveBrand = (index: number) => {
    setEditableBrands((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddBrand = () => {
    if (newBrand.trim() && editableBrands.length < 5) {
      setEditableBrands((prev) => [...prev, newBrand.trim()]);
      setNewBrand("");
    }
  };

  const toggleConcept = (name: string) => {
    setSelectedConcepts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleModelMode = (id: string, mode: "training" | "web") => {
    setModelModes((prev) => ({
      ...prev,
      [id]: { ...prev[id], [mode]: !prev[id]?.[mode] },
    }));
  };

  // Count how many total API calls will be made
  const trainingCount = Object.values(modelModes).filter((m) => m.training).length;
  const webCount = Object.values(modelModes).filter((m) => m.web).length;
  const totalCalls = trainingCount + webCount;
  const hasAnyModel = totalCalls > 0;

  const stepNumber =
    wizardStep === "prompt" ? 0 :
    wizardStep === "brands" ? 1 :
    wizardStep === "concepts" ? 2 : 3;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Brand Prompt Compare
        </h1>
        <p className="text-lg text-gray-600">
          Compare how AI describes your brand vs competitors
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
          {/* Step indicator */}
          {wizardStep !== "prompt" && (
            <div className="mb-6 flex items-center justify-center gap-2 text-sm">
              {["Brands", "Concepts", "Models"].map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className="h-px w-8 bg-gray-300" />}
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      stepNumber > i
                        ? "bg-green-500 text-white"
                        : stepNumber === i + 1
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {stepNumber > i ? "\u2713" : i + 1}
                  </div>
                  <span className={stepNumber === i + 1 ? "font-semibold text-gray-900" : "text-gray-500"}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Step 0: Prompt input */}
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
                  placeholder="Example: I'm a marketing manager evaluating agencies. Compare Seer Interactive, Wpromote, and Directive..."
                  className="w-full rounded-lg border border-gray-300 p-4 text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  rows={6}
                />
                <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Tip: For best results, ask for pros/cons, strengths/weaknesses,
                  and a source table with links.
                </div>
                <button
                  onClick={handleDetectBrands}
                  disabled={!promptText.trim() || detecting}
                  className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {detecting ? "Detecting..." : "Detect Brands"}
                </button>
                {pipelineError && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {pipelineError}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 1: Confirm brands */}
          {wizardStep === "brands" && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Step 1: Confirm Brands
              </h2>
              <div className="mb-4 flex flex-wrap gap-2">
                {editableBrands.map((brand, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm"
                  >
                    {brand}
                    <button
                      onClick={() => handleRemoveBrand(i)}
                      className="ml-1 text-gray-400 hover:text-red-500"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddBrand()}
                  placeholder="Add a brand..."
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleAddBrand}
                  disabled={!newBrand.trim() || editableBrands.length >= 5}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDetectConcepts}
                  disabled={editableBrands.length < 2 || detecting}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {detecting ? "Detecting Concepts..." : "Next: Select Concepts"}
                </button>
                <button
                  onClick={() => setWizardStep("prompt")}
                  className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select concepts */}
          {wizardStep === "concepts" && (
            <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-6">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">
                Step 2: Select Concepts to Evaluate
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                Check the topics that matter most to you. Only selected concepts will be scored.
              </p>
              <div className="mb-4 space-y-2">
                {detectedConcepts.map((concept) => (
                  <label
                    key={concept.name}
                    className="flex cursor-pointer items-start gap-3 rounded-lg bg-white px-4 py-3 shadow-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedConcepts.has(concept.name)}
                      onChange={() => toggleConcept(concept.name)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">{concept.name}</span>
                      <p className="text-xs text-gray-500">{concept.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mb-3 flex gap-2 text-xs">
                <button
                  onClick={() => setSelectedConcepts(new Set(detectedConcepts.map((c) => c.name)))}
                  className="text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setSelectedConcepts(new Set())}
                  className="text-blue-600 hover:underline"
                >
                  Clear All
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleLoadModels}
                  disabled={selectedConcepts.size === 0 || detecting}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {detecting ? "Loading Models..." : `Next: Select Models (${selectedConcepts.size} concepts)`}
                </button>
                <button
                  onClick={() => setWizardStep("brands")}
                  className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Select models & modes */}
          {wizardStep === "models" && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-6">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">
                Step 3: Select Models &amp; Modes
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                For each model, choose whether to run Training Data, Web Search, or both.
              </p>

              {/* Header row */}
              <div className="mb-2 flex items-center gap-3 px-4 text-xs font-semibold text-gray-500">
                <span className="flex-1">Model</span>
                <span className="w-20 text-center">Training</span>
                <span className="w-20 text-center">Web</span>
              </div>

              <div className="mb-4 space-y-2">
                {availableModels.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm"
                  >
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
                    for (const m of availableModels) modes[m.id] = { training: false, web: true };
                    setModelModes(modes);
                  }}
                  className="text-blue-600 hover:underline"
                >
                  All Web
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

              {/* Summary */}
              <div className="mb-4 rounded-lg bg-white p-3 text-sm text-gray-700">
                <strong>Summary:</strong> {editableBrands.join(" vs ")} &mdash;{" "}
                {selectedConcepts.size} concepts, {trainingCount} training + {webCount} web = {totalCalls} API calls
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRunComparison}
                  disabled={!hasAnyModel}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Run Comparison
                </button>
                <button
                  onClick={() => setWizardStep("concepts")}
                  className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {pipelineError && wizardStep !== "prompt" && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {pipelineError}
            </div>
          )}
        </>
      )}
    </div>
  );
}
