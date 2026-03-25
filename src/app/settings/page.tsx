"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-fetch";

interface Model {
  id: string;
  displayName: string;
  provider: string;
  launchDate: string | null;
  isActive: boolean;
}

export default function SettingsPage() {
  const [modelsList, setModelsList] = useState<Model[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchModels = useCallback(async () => {
    try {
      const res = await apiFetch("/api/models");
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
      await apiFetch("/api/models", {
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
              <div>
                <span className="font-medium text-gray-900">
                  {model.displayName}
                </span>
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {model.provider}
                </span>
                {model.launchDate && (
                  <span className="ml-2 text-xs text-gray-400">
                    Launched{" "}
                    {new Date(model.launchDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => toggleModel(model.id, !model.isActive)}
                disabled={saving}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  model.isActive
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                {model.isActive ? "Active" : "Inactive"}
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
            API keys are configured in your <code className="rounded bg-gray-100 px-1">.env.local</code> file.
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
          </ul>
        </div>
      </section>
    </div>
  );
}
