"use client";

import { useState, useEffect, useCallback } from "react";

interface Model {
  id: string;
  displayName: string;
  provider: string;
  launchDate: string | null;
  isActive: boolean;
  apiType: "openrouter" | "google";
}

export default function SettingsPage() {
  const [modelsList, setModelsList] = useState<Model[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/models");
      if (res.ok) setModelsList(await res.json());
    } catch {
      console.error("Failed to fetch models");
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const toggleModel = async (id: string, isActive: boolean) => {
    setSaving(true);
    try {
      await fetch("/api/models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelIds: [id], isActive }),
      });
      setModelsList((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isActive } : m))
      );
    } catch {
      console.error("Failed to update model");
    } finally {
      setSaving(false);
    }
  };

  const setApiType = async (id: string, apiType: "openrouter" | "google") => {
    setSaving(true);
    try {
      await fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiType }),
      });
      setModelsList((prev) =>
        prev.map((m) => (m.id === id ? { ...m, apiType } : m))
      );
    } catch {
      console.error("Failed to update API type");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = modelsList.filter((m) => m.isActive).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      {/* Models */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">
          Active Models ({activeCount})
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          These models will be used when you run a comparison. Each model
          provides a different perspective on the brands.
        </p>
        <div className="space-y-2">
          {modelsList.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {model.displayName}
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {model.provider}
                  </span>
                  {model.launchDate && (
                    <span className="text-xs text-gray-400">
                      Launched{" "}
                      {new Date(model.launchDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* API source toggle — only for Google models */}
                {model.provider === "google" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">API:</span>
                    <button
                      onClick={() =>
                        setApiType(
                          model.id,
                          model.apiType === "google" ? "openrouter" : "google"
                        )
                      }
                      disabled={saving}
                      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
                      style={{
                        backgroundColor:
                          model.apiType === "google" ? "#2563eb" : "#d1d5db",
                      }}
                      role="switch"
                      aria-checked={model.apiType === "google"}
                      aria-label="Use Gemini API directly"
                    >
                      <span
                        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                        style={{
                          transform:
                            model.apiType === "google"
                              ? "translateX(18px)"
                              : "translateX(3px)",
                        }}
                      />
                    </button>
                    <span className="text-xs font-medium text-gray-600">
                      {model.apiType === "google"
                        ? "Gemini API"
                        : "OpenRouter"}
                    </span>
                  </div>
                )}
              </div>

              {/* Active / Inactive toggle switch */}
              <button
                onClick={() => toggleModel(model.id, !model.isActive)}
                disabled={saving}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50"
                style={{
                  backgroundColor: model.isActive ? "#16a34a" : "#d1d5db",
                }}
                role="switch"
                aria-checked={model.isActive}
                aria-label={`Toggle ${model.displayName}`}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  style={{
                    transform: model.isActive
                      ? "translateX(22px)"
                      : "translateX(3px)",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* API Keys Info */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">API Keys</h2>
        <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
          <p className="mb-3">
            API keys are configured in your{" "}
            <code className="rounded bg-gray-100 px-1">.env.local</code> file.
            You need:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>OPENROUTER_API_KEY</strong> &mdash;{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Get from OpenRouter
              </a>
            </li>
            <li>
              <strong>GOOGLE_GEMINI_API_KEY</strong> &mdash;{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Get from Google AI Studio
              </a>
            </li>
            <li>
              <strong>ANTHROPIC_API_KEY</strong> &mdash;{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Get from Anthropic
              </a>
            </li>
            <li>
              <strong>DATABASE_URL</strong> &mdash;{" "}
              <a
                href="https://supabase.com/docs/guides/database/connecting-to-postgres"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Get from Supabase
              </a>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
