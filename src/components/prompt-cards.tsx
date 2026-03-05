"use client";

interface PromptTemplate {
  id: string;
  name: string;
  templateText: string;
}

interface PromptCardsProps {
  templates: PromptTemplate[];
  onSelect: (templateText: string) => void;
}

export function PromptCards({ templates, onSelect }: PromptCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template.templateText)}
          className="rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-md"
        >
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            {template.name}
          </h3>
          <p className="text-xs leading-relaxed text-gray-500">
            {template.templateText.slice(0, 120)}...
          </p>
        </button>
      ))}
    </div>
  );
}
