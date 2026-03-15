"use client";

export interface ModelEvent {
  type: "start" | "done" | "error";
  model: string;
  mode: string;
  elapsed?: string;
  error?: string;
}

interface RunProgressProps {
  events: ModelEvent[];
  completed: number;
  total: number;
  phase: string | null;
  error: string | null;
}

export function RunProgress({ events, completed, total, phase, error }: RunProgressProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-lg space-y-4 py-8">
      {/* D: Streaming ticker (newest on top) */}
      <div className="rounded-lg border bg-white">
        <div className="max-h-64 overflow-y-auto p-4">
          {events.length === 0 && !error && (
            <div className="text-center text-sm text-gray-400">Starting...</div>
          )}
          <div className="space-y-1.5">
            {[...events].reverse().map((event, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {event.type === "start" && (
                  <>
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                    <span className="text-blue-700">
                      Running <strong>{event.model}</strong> on <strong>{event.mode === "web" ? "Web" : "Training"}</strong>...
                    </span>
                  </>
                )}
                {event.type === "done" && (
                  <>
                    <span className="text-green-600">{"\u2713"}</span>
                    <span className="text-gray-700">
                      <strong>{event.model}</strong> on <strong>{event.mode === "web" ? "Web" : "Training"}</strong>
                    </span>
                    <span className="text-xs text-gray-400">{event.elapsed}s</span>
                  </>
                )}
                {event.type === "error" && (
                  <>
                    <span className="text-red-500">{"\u2717"}</span>
                    <span className="text-red-600">
                      <strong>{event.model}</strong> on <strong>{event.mode === "web" ? "Web" : "Training"}</strong> — failed
                    </span>
                    <span className="text-xs text-gray-400">{event.elapsed}s</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* C: Progress bar with counter */}
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {phase === "extracting"
              ? "Extracting comparisons..."
              : phase === "storing"
              ? "Storing results..."
              : phase === "verifying"
              ? "Verifying sources..."
              : phase === "scoring"
              ? "Calculating scores..."
              : completed < total
              ? `Running comparisons... ${completed} of ${total} complete`
              : "Processing results..."}
          </span>
          <span className="text-xs font-bold text-gray-500">{percent}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
