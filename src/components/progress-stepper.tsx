"use client";

export type PipelineStep =
  | "detecting"
  | "querying"
  | "extracting"
  | "verifying"
  | "scoring"
  | "complete"
  | "error";

interface ProgressStepperProps {
  currentStep: PipelineStep;
  error?: string;
}

const STEPS: { key: PipelineStep; label: string }[] = [
  { key: "detecting", label: "Detecting brands" },
  { key: "querying", label: "Querying models" },
  { key: "extracting", label: "Extracting comparisons" },
  { key: "verifying", label: "Verifying sources" },
  { key: "scoring", label: "Calculating scores" },
  { key: "complete", label: "Complete" },
];

export function ProgressStepper({ currentStep, error }: ProgressStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="mx-auto max-w-md space-y-3 py-8">
      {STEPS.map((step, i) => {
        const isActive = step.key === currentStep;
        const isDone = i < currentIndex || currentStep === "complete";
        const isError = currentStep === "error" && i === currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                isDone
                  ? "bg-green-500 text-white"
                  : isActive
                    ? "animate-pulse bg-blue-500 text-white"
                    : isError
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 text-gray-400"
              }`}
            >
              {isDone ? "\u2713" : i + 1}
            </div>
            <span
              className={`text-sm ${
                isDone
                  ? "font-medium text-green-700"
                  : isActive
                    ? "font-medium text-blue-700"
                    : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
