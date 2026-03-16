"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PromptCards } from "@/components/prompt-cards";
import { ProgressStepper, type PipelineStep } from "@/components/progress-stepper";

interface Prompt {
  id: string;
  name: string;
  templateText: string;
}

interface DetectedBrand {
  name: string;
  confidence: string;
}

export default function HomePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Prompt[]>([]);
  const [promptText, setPromptText] = useState("");
  const [detectedBrands, setDetectedBrands] = useState<DetectedBrand[]>([]);
  const [editableBrands, setEditableBrands] = useState<string[]>([]);
  const [showBrandConfirm, setShowBrandConfirm] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep | null>(null);
  const [pipelineError, setPipelineError] = useState("");
  const [newBrand, setNewBrand] = useState("");

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/prompts");
      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          // First run: DB is empty — seed default models + prompts, then re-fetch
          await fetch("/api/seed", { method: "POST" });
          const seeded = await fetch("/api/prompts");
          if (seeded.ok) setTemplates(await seeded.json());
        } else {
          setTemplates(data);
        }
      }
    } catch {
      // Fallback: seed on network error too
      await fetch("/api/seed", { method: "POST" });
      const res = await fetch("/api/prompts");
      if (res.ok) setTemplates(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDetectBrands = async () => {
    if (!promptText.trim()) return;
    setPipelineStep("detecting");
    setPipelineError("");

    try {
      const res = await fetch("/api/brands/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptText }),
      });
      const data = await res.json();
      setDetectedBrands(data.brands || []);
      setEditableBrands((data.brands || []).map((b: DetectedBrand) => b.name));
      setShowBrandConfirm(true);
      setPipelineStep(null);
    } catch {
      setPipelineError("Failed to detect brands. Check your API keys.");
      setPipelineStep("error");
    }
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

  const handleRunComparison = async () => {
    if (editableBrands.length < 2) return;

    setPipelineStep("querying");
    setShowBrandConfirm(false);

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText,
          brandNames: editableBrands,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Run failed");
      }

      const data = await res.json();
      setPipelineStep("complete");

      setTimeout(() => {
        router.push(`/results/${data.runId}`);
      }, 1000);
    } catch (err) {
      setPipelineError(
        err instanceof Error ? err.message : "Comparison failed"
      );
      setPipelineStep("error");
    }
  };

  const handleSelectTemplate = (templateText: string) => {
    setPromptText(templateText);
    setShowBrandConfirm(false);
    setPipelineStep(null);
  };

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

      {pipelineStep && pipelineStep !== "error" ? (
        <ProgressStepper currentStep={pipelineStep} error={pipelineError} />
      ) : (
        <>
          {/* Sample prompts */}
          {!showBrandConfirm && templates.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Start with a template
              </h2>
              <PromptCards templates={templates} onSelect={handleSelectTemplate} />
            </div>
          )}

          {/* Prompt input */}
          {!showBrandConfirm && (
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
                disabled={!promptText.trim()}
                className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
              >
                Detect Brands
              </button>
              {pipelineError && (
                <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {pipelineError}
                </div>
              )}
            </div>
          )}

          {/* Brand confirmation */}
          {showBrandConfirm && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                We detected these brands:
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
                  onClick={handleRunComparison}
                  disabled={editableBrands.length < 2}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Run Comparison ({editableBrands.length} brands)
                </button>
                <button
                  onClick={() => {
                    setShowBrandConfirm(false);
                    setPipelineStep(null);
                  }}
                  className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Back to Edit
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
