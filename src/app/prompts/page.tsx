"use client";

import { useState, useEffect, useCallback } from "react";

interface Prompt {
  id: string;
  name: string;
  templateText: string;
  isTemplate: boolean;
  createdAt: string;
}

export default function PromptsPage() {
  const [promptsList, setPromptsList] = useState<Prompt[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editText, setEditText] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");

  const fetchPrompts = useCallback(async () => {
    try {
      const res = await fetch("/api/prompts");
      if (res.ok) setPromptsList(await res.json());
    } catch {
      console.error("Failed to fetch prompts");
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleSave = async (id: string) => {
    await fetch(`/api/prompts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, templateText: editText }),
    });
    setEditingId(null);
    fetchPrompts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prompt template?")) return;
    await fetch(`/api/prompts/${id}`, { method: "DELETE" });
    fetchPrompts();
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newText.trim()) return;
    await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        templateText: newText,
        isTemplate: true,
      }),
    });
    setNewName("");
    setNewText("");
    setShowNew(false);
    fetchPrompts();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prompt Library</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showNew ? "Cancel" : "New Template"}
        </button>
      </div>

      {showNew && (
        <div className="mb-6 rounded-lg border bg-white p-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name"
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Use {brand1}, {brand2}, {brand3} as placeholders..."
            rows={4}
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || !newText.trim()}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300"
          >
            Save Template
          </button>
        </div>
      )}

      <div className="space-y-4">
        {promptsList.map((prompt) => (
          <div key={prompt.id} className="rounded-lg border bg-white p-6">
            {editingId === prompt.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                  className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(prompt.id)}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-2 font-semibold text-gray-900">
                  {prompt.name}
                </h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-600">
                  {prompt.templateText}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(prompt.id);
                      setEditName(prompt.name);
                      setEditText(prompt.templateText);
                    }}
                    className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(prompt.id)}
                    className="rounded bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
