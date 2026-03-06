# Brand Prompt Compare v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dual-mode (training vs web) comparison, updated models, context evidence panels, and improved source handling.

**Architecture:** Each run queries every model twice (training + `:online` web search). Extraction prompt enhanced to return per-concept evidence quotes. Results page adds a Training/Web toggle and a persistent context panel below the radar chart and comparison matrix. Sources show "No sources cited" for training mode; web mode provides real verified URLs.

**Tech Stack:** Same stack (Next.js 15, TypeScript, Tailwind, Supabase, Drizzle, OpenRouter, Anthropic SDK, Recharts)

---

### Task 1: Update Schema — Add `mode` to responses and `conceptEvidence` to parsed_comparisons

**Files:**
- Modify: `src/lib/schema.ts`

**Step 1: Add `mode` column to `responses` table**

In `src/lib/schema.ts`, add a `mode` text column to the `responses` table after `rawText`:

```typescript
// -- Responses --
export const responses = pgTable("responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .references(() => runs.id)
    .notNull(),
  modelId: uuid("model_id")
    .references(() => models.id)
    .notNull(),
  rawText: text("raw_text").notNull(),
  mode: text("mode").default("training").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 2: Add `conceptEvidence` column to `parsed_comparisons` table**

Add after the `weaknesses` column:

```typescript
export const parsedComparisons = pgTable("parsed_comparisons", {
  id: uuid("id").defaultRandom().primaryKey(),
  responseId: uuid("response_id")
    .references(() => responses.id)
    .notNull(),
  brandId: uuid("brand_id")
    .references(() => brands.id)
    .notNull(),
  pros: jsonb("pros").$type<string[]>().default([]).notNull(),
  cons: jsonb("cons").$type<string[]>().default([]).notNull(),
  strengths: jsonb("strengths").$type<string[]>().default([]).notNull(),
  weaknesses: jsonb("weaknesses").$type<string[]>().default([]).notNull(),
  conceptEvidence: jsonb("concept_evidence").$type<Record<string, string>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 3: Add `mode` to concept_scores table**

Add after `score`:

```typescript
export const conceptScores = pgTable("concept_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .references(() => runs.id)
    .notNull(),
  brandId: uuid("brand_id")
    .references(() => brands.id)
    .notNull(),
  conceptName: text("concept_name").notNull(),
  score: real("score").notNull(),
  mode: text("mode").default("training").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 4: Push schema changes**

```bash
npm run db:push
```

**Step 5: Commit**

```bash
git add src/lib/schema.ts
git commit -m "Add mode column to responses/concept_scores and conceptEvidence to parsed_comparisons"
```

---

### Task 2: Update Seed Data — Replace Old Models

**Files:**
- Modify: `src/lib/seed.ts`
- Modify: `src/app/api/seed/route.ts`

**Step 1: Replace DEFAULT_MODELS in `src/lib/seed.ts`**

Replace the entire `DEFAULT_MODELS` array with:

```typescript
const DEFAULT_MODELS = [
  {
    openrouterId: "openai/gpt-5.2",
    displayName: "GPT 5.2",
    provider: "openai",
    launchDate: new Date("2026-01-15"),
    isActive: true,
  },
  {
    openrouterId: "anthropic/claude-sonnet-4.6",
    displayName: "Claude Sonnet 4.6",
    provider: "anthropic",
    launchDate: new Date("2026-02-01"),
    isActive: true,
  },
  {
    openrouterId: "anthropic/claude-opus-4.6",
    displayName: "Claude Opus 4.6",
    provider: "anthropic",
    launchDate: new Date("2026-02-01"),
    isActive: true,
  },
  {
    openrouterId: "google/gemini-3-flash-preview",
    displayName: "Gemini 3 Flash",
    provider: "google",
    launchDate: new Date("2026-02-15"),
    isActive: true,
  },
  {
    openrouterId: "google/gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro",
    provider: "google",
    launchDate: new Date("2026-03-01"),
    isActive: true,
  },
  {
    openrouterId: "perplexity/sonar-pro",
    displayName: "Perplexity Sonar Pro",
    provider: "perplexity",
    launchDate: new Date("2025-02-01"),
    isActive: true,
  },
];
```

**Step 2: Update `seedDatabase()` to delete old models**

Replace the `seedDatabase` function:

```typescript
export async function seedDatabase() {
  // Delete old models that are no longer in the default list
  const oldSlugs = ["openai/gpt-4o", "anthropic/claude-sonnet-4", "google/gemini-2.5-pro-preview-03-25"];
  for (const slug of oldSlugs) {
    await db.delete(models).where(eq(models.openrouterId, slug));
  }

  // Seed models (skip existing)
  for (const model of DEFAULT_MODELS) {
    await db
      .insert(models)
      .values(model)
      .onConflictDoNothing();
  }

  // Seed prompts (only if no prompts exist)
  const existingPrompts = await db.query.prompts.findMany({ limit: 1 });
  if (existingPrompts.length === 0) {
    await db.insert(prompts).values(STARTER_PROMPTS);
  }

  return {
    models: DEFAULT_MODELS.length,
    prompts: STARTER_PROMPTS.length,
  };
}
```

Add the `eq` import at the top of seed.ts:

```typescript
import { eq } from "drizzle-orm";
```

**Step 3: Commit**

```bash
git add src/lib/seed.ts
git commit -m "Update seed data: replace old models with GPT 5.2, Claude 4.6, Gemini 3/3.1"
```

---

### Task 3: Update OpenRouter Client — Support Web Search Mode

**Files:**
- Modify: `src/lib/openrouter.ts`

**Step 1: Replace entire `src/lib/openrouter.ts`**

```typescript
interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
  model: string;
}

interface ModelConfig {
  openrouterId: string;
  displayName: string;
}

export type QueryMode = "training" | "web";

// Send a prompt to a single model via OpenRouter
export async function queryModel(
  prompt: string,
  model: ModelConfig,
  mode: QueryMode = "training"
): Promise<string> {
  const modelId = mode === "web"
    ? `${model.openrouterId}:online`
    : model.openrouterId;

  const body: Record<string, unknown> = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 4000,
  };

  // Add web search options for web mode
  if (mode === "web") {
    body.plugins = [{ id: "web", max_results: 5 }];
    body.web_search_options = { search_context_size: "high" };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Brand Prompt Compare",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error for ${model.displayName} (${mode}): ${error}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  return data.choices[0]?.message?.content || "";
}

// Send a prompt to all active models in parallel
export async function queryAllModels(
  prompt: string,
  modelConfigs: ModelConfig[],
  mode: QueryMode = "training"
): Promise<Array<{ model: ModelConfig; text: string; mode: QueryMode; error?: string }>> {
  const results = await Promise.allSettled(
    modelConfigs.map(async (model) => {
      const text = await queryModel(prompt, model, mode);
      return { model, text, mode };
    })
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      model: modelConfigs[i],
      text: "",
      mode,
      error: result.reason?.message || "Unknown error",
    };
  });
}
```

**Step 2: Commit**

```bash
git add src/lib/openrouter.ts
git commit -m "Add web search mode support via OpenRouter :online suffix"
```

---

### Task 4: Update Extraction — Add conceptEvidence to Haiku Prompt

**Files:**
- Modify: `src/lib/extraction.ts`

**Step 1: Update the `ExtractionResult` interface and extraction prompt**

Add `conceptEvidence` to `ExtractedBrandData`:

```typescript
export interface ExtractedBrandData {
  brandName: string;
  pros: string[];
  cons: string[];
  strengths: string[];
  weaknesses: string[];
  conceptEvidence: Record<string, string>;
}
```

**Step 2: Update the extraction prompt**

Replace the JSON structure section in the prompt with:

```
Return a JSON object with this exact structure:
{
  "brands": [
    {
      "brandName": "exact brand name",
      "pros": ["pro 1", "pro 2"],
      "cons": ["con 1", "con 2"],
      "strengths": ["strength 1"],
      "weaknesses": ["weakness 1"],
      "conceptEvidence": {
        "Trust": "Direct quote or paraphrase from the response that supports this brand's Trust score",
        "Innovation": "Quote supporting Innovation score"
      }
    }
  ],
  "sources": [
    {
      "url": "https://...",
      "title": "source title",
      "brandName": "brand name or null if general"
    }
  ],
  "conceptScores": [
    {
      "brandName": "brand name",
      "conceptName": "Trust",
      "score": 0.85
    }
  ]
}

Rules for conceptScores:
- Score each brand on 0.0 to 1.0 scale for each concept
- Extract concepts from what's discussed (e.g., Trust, Innovation, Pricing, Customer Service, Expertise, Technology, Reputation)
- Use the SAME concept names across all brands so they can be compared
- Base scores on the sentiment and detail in the response

Rules for conceptEvidence:
- For EVERY concept in conceptScores, include a matching entry in that brand's conceptEvidence
- Use a direct quote or close paraphrase from the response (1-2 sentences)
- The evidence should clearly justify the score given
```

Also increase `max_tokens` from 2000 to 3000 since we're asking for more data.

**Step 3: Commit**

```bash
git add src/lib/extraction.ts
git commit -m "Add conceptEvidence extraction to Haiku prompt"
```

---

### Task 5: Update Runs API — Dual-Mode Pipeline

**Files:**
- Modify: `src/app/api/runs/route.ts`

**Step 1: Update the POST handler to run both modes**

Replace step 6 onwards (from `// 6. Query all models in parallel`) with dual-mode logic:

```typescript
    // 6. Query all models in both modes (training + web) in parallel
    const modelConfigs = activeModels.map((m) => ({
      openrouterId: m.openrouterId,
      displayName: m.displayName,
    }));

    const [trainingResults, webResults] = await Promise.all([
      queryAllModels(promptText, modelConfigs, "training"),
      queryAllModels(promptText, modelConfigs, "web"),
    ]);

    const allModelResults = [...trainingResults, ...webResults];

    // 7. Store responses with mode
    const responseRecords: Array<{ id: string; rawText: string; mode: string; modelId: string }> = [];
    for (const result of allModelResults) {
      if (result.error || !result.text) continue;

      const model = activeModels.find(
        (m) => m.openrouterId === result.model.openrouterId
      );
      if (!model) continue;

      const [responseRecord] = await db
        .insert(responses)
        .values({
          runId: run.id,
          modelId: model.id,
          rawText: result.text,
          mode: result.mode,
        })
        .returning();

      responseRecords.push({ ...responseRecord, modelId: model.id });
    }

    // 8. Extract structured data from each response (parallel)
    const brandNamesList = brandRecords.map((b) => b.name);
    const allExtractions = await Promise.all(
      responseRecords.map((r) => extractComparison(r.rawText, brandNamesList))
    );

    // 9. Store parsed comparisons and sources
    const allSourceUrls: string[] = [];

    for (let i = 0; i < allExtractions.length; i++) {
      const extraction = allExtractions[i];
      const responseId = responseRecords[i].id;
      const responseMode = responseRecords[i].mode;

      // Store parsed comparisons with conceptEvidence
      for (const brandData of extraction.brands) {
        const brandRecord = brandRecords.find(
          (b) => b.name.toLowerCase() === brandData.brandName.toLowerCase()
        );
        if (!brandRecord) continue;

        await db.insert(parsedComparisons).values({
          responseId,
          brandId: brandRecord.id,
          pros: brandData.pros,
          cons: brandData.cons,
          strengths: brandData.strengths,
          weaknesses: brandData.weaknesses,
          conceptEvidence: brandData.conceptEvidence || {},
        });
      }

      // Store sources only for web mode responses
      if (responseMode === "web") {
        for (const source of extraction.sources) {
          if (!source.url || !source.url.startsWith("http")) continue;

          const brandRecord = source.brandName
            ? brandRecords.find(
                (b) =>
                  b.name.toLowerCase() === source.brandName!.toLowerCase()
              )
            : null;

          await db.insert(sources).values({
            responseId,
            brandId: brandRecord?.id || null,
            url: source.url,
            title: source.title || null,
            isVerified: null,
          });

          allSourceUrls.push(source.url);
        }
      }
    }

    // 10. Verify source URLs in parallel (web mode only)
    if (allSourceUrls.length > 0) {
      const verifications = await verifyUrls(allSourceUrls);
      const verificationMap = new Map(
        verifications.map((v) => [v.url, v.isVerified])
      );

      for (const responseRecord of responseRecords) {
        if (responseRecord.mode !== "web") continue;
        const responseSources = await db.query.sources.findMany({
          where: eq(sources.responseId, responseRecord.id),
        });
        for (const source of responseSources) {
          const isVerified = verificationMap.get(source.url) ?? false;
          await db
            .update(sources)
            .set({ isVerified, verifiedAt: new Date() })
            .where(eq(sources.id, source.id));
        }
      }
    }

    // 11. Aggregate and store concept scores per mode
    for (const mode of ["training", "web"] as const) {
      const modeExtractions = allExtractions.filter(
        (_, i) => responseRecords[i].mode === mode
      );
      const modeConceptScores = modeExtractions.map((e) => e.conceptScores);
      const aggregated = aggregateScores(modeConceptScores);

      for (const score of aggregated) {
        const brandRecord = brandRecords.find(
          (b) => b.name.toLowerCase() === score.brandName.toLowerCase()
        );
        if (!brandRecord) continue;

        await db.insert(conceptScores).values({
          runId: run.id,
          brandId: brandRecord.id,
          conceptName: score.conceptName,
          score: score.score,
          mode,
        });
      }
    }

    // 12. Mark run as completed
    await db
      .update(runs)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(runs.id, run.id));

    return NextResponse.json({
      runId: run.id,
      status: "completed",
      responsesCount: responseRecords.length,
      brandsCompared: brandNamesList,
    });
```

Also update the import at the top to include `QueryMode`:

```typescript
import { queryAllModels } from "@/lib/openrouter";
```

**Step 2: Commit**

```bash
git add src/app/api/runs/route.ts
git commit -m "Update pipeline to run both training and web modes in parallel"
```

---

### Task 6: Update Run Details API — Include mode in response data

**Files:**
- Modify: `src/app/api/runs/[id]/route.ts`

No code changes needed — the existing query already returns all responses with their relations. The `mode` field will automatically be included since Drizzle returns all columns. Just verify the query still works after schema push.

**Step 1: Commit (no-op, just verify)**

```bash
npm run db:push
```

---

### Task 7: Create Context Panel Component

**Files:**
- Create: `src/components/context-panel.tsx`

**Step 1: Create `src/components/context-panel.tsx`**

```tsx
"use client";

interface EvidenceEntry {
  brandName: string;
  modelName: string;
  quote: string;
  score: number;
}

interface ContextPanelProps {
  concepts: string[];
  selectedConcept: string | null;
  onSelectConcept: (concept: string) => void;
  evidence: Record<string, EvidenceEntry[]>;
  brandScores: Array<{ brandName: string; scores: Record<string, number> }>;
}

function findBiggestGap(
  brandScores: Array<{ brandName: string; scores: Record<string, number> }>,
  concepts: string[]
): string | null {
  let maxGap = 0;
  let gapConcept: string | null = null;

  for (const concept of concepts) {
    const scores = brandScores
      .map((b) => b.scores[concept] || 0)
      .filter((s) => s > 0);
    if (scores.length < 2) continue;
    const gap = Math.max(...scores) - Math.min(...scores);
    if (gap > maxGap) {
      maxGap = gap;
      gapConcept = concept;
    }
  }

  return gapConcept;
}

export function ContextPanel({
  concepts,
  selectedConcept,
  onSelectConcept,
  evidence,
  brandScores,
}: ContextPanelProps) {
  const biggestGap = findBiggestGap(brandScores, concepts);
  const activeConcept = selectedConcept || biggestGap || concepts[0];

  if (!activeConcept || concepts.length === 0) {
    return null;
  }

  const entries = evidence[activeConcept] || [];

  // Calculate gap for active concept
  const scores = brandScores
    .map((b) => ({ name: b.brandName, score: b.scores[activeConcept] || 0 }))
    .sort((a, b) => b.score - a.score);
  const gap = scores.length >= 2 ? scores[0].score - scores[scores.length - 1].score : 0;
  const isBigGap = gap > 0.2;

  return (
    <div className="mt-4 rounded-lg border bg-white">
      {/* Concept selector */}
      <div className="flex flex-wrap gap-1.5 border-b p-3">
        {concepts.map((concept) => {
          const conceptGap = (() => {
            const s = brandScores.map((b) => b.scores[concept] || 0);
            return s.length >= 2 ? Math.max(...s) - Math.min(...s) : 0;
          })();

          return (
            <button
              key={concept}
              onClick={() => onSelectConcept(concept)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                concept === activeConcept
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {concept}
              {conceptGap > 0.2 && (
                <span className="ml-1 text-[10px] opacity-75">
                  ({(conceptGap * 10).toFixed(1)} gap)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Evidence content */}
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {activeConcept}
          </h3>
          {isBigGap && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Significant gap: {(gap * 10).toFixed(1)} pts
            </span>
          )}
        </div>

        {/* Score summary */}
        <div className="mb-4 flex gap-4">
          {scores.map((s, i) => (
            <div key={s.name} className="text-sm">
              <span className="font-medium text-gray-900">{s.name}:</span>{" "}
              <span
                className={`font-bold ${
                  i === 0
                    ? "text-green-600"
                    : i === scores.length - 1 && isBigGap
                      ? "text-red-600"
                      : "text-gray-600"
                }`}
              >
                {(s.score * 10).toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        {/* Evidence quotes */}
        {entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="rounded-lg bg-gray-50 p-3"
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {entry.brandName}
                  </span>
                  <span>&middot;</span>
                  <span>{entry.modelName}</span>
                  <span>&middot;</span>
                  <span>{(entry.score * 10).toFixed(1)}/10</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700 italic">
                  &ldquo;{entry.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No evidence quotes available for this concept.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/context-panel.tsx
git commit -m "Add context panel component with evidence quotes and gap highlighting"
```

---

### Task 8: Update Results Page — Training/Web Toggle + Context Panel

**Files:**
- Modify: `src/app/results/[id]/page.tsx`

**Step 1: Update the RunData interface**

Add `mode` to responses and `conceptEvidence` to parsedComparisons, and `mode` to conceptScores:

```typescript
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
    brand: { id: string; name: string };
  }>;
  responses: Array<{
    id: string;
    rawText: string;
    mode: string;
    model: { displayName: string };
    parsedComparisons: Array<{
      brand: { name: string };
      pros: string[];
      cons: string[];
      strengths: string[];
      weaknesses: string[];
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
  conceptScores: Array<{
    brandId: string;
    brand: { name: string };
    conceptName: string;
    score: number;
    mode: string;
  }>;
}
```

**Step 2: Add mode state and context panel state**

After the existing state declarations, add:

```typescript
const [mode, setMode] = useState<"training" | "web">("training");
const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
```

**Step 3: Filter data by mode**

Replace the existing data building (concepts, brandScores, allSources) with mode-filtered versions:

```typescript
const brandNames = run.runBrands.map((rb) => rb.brand.name);

// Filter by mode
const modeScores = run.conceptScores.filter((s) => s.mode === mode);
const modeResponses = run.responses.filter((r) => r.mode === mode);

// Build radar/matrix data from filtered concept scores
const concepts = [...new Set(modeScores.map((s) => s.conceptName))];
const brandScores = brandNames.map((name) => ({
  brandName: name,
  scores: Object.fromEntries(
    modeScores
      .filter((s) => s.brand.name === name)
      .map((s) => [s.conceptName, s.score])
  ),
}));

// Build evidence map for context panel
const evidenceMap: Record<string, Array<{ brandName: string; modelName: string; quote: string; score: number }>> = {};
for (const response of modeResponses) {
  for (const pc of response.parsedComparisons) {
    if (!pc.conceptEvidence) continue;
    for (const [concept, quote] of Object.entries(pc.conceptEvidence)) {
      if (!evidenceMap[concept]) evidenceMap[concept] = [];
      const score = modeScores.find(
        (s) => s.brand.name === pc.brand.name && s.conceptName === concept
      )?.score || 0;
      evidenceMap[concept].push({
        brandName: pc.brand.name,
        modelName: response.model.displayName,
        quote,
        score,
      });
    }
  }
}

// Build source table data (web mode only has real sources)
const allSources = modeResponses.flatMap((r) =>
  r.sources.map((s) => ({
    id: s.id,
    url: s.url,
    title: s.title,
    brandName: s.brand?.name || null,
    modelName: r.model.displayName,
    isVerified: s.isVerified,
  }))
);
```

**Step 4: Add mode toggle to the header**

After the models display in the header, add:

```tsx
{/* Mode toggle */}
<div className="mt-3 flex items-center gap-2">
  <span className="text-xs font-medium text-gray-500">Mode:</span>
  <div className="flex rounded-lg bg-gray-100 p-0.5">
    <button
      onClick={() => setMode("training")}
      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
        mode === "training"
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      Training Data
    </button>
    <button
      onClick={() => setMode("web")}
      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
        mode === "web"
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      Web Search
    </button>
  </div>
</div>
```

**Step 5: Add context panel below radar and matrix tabs**

Import the ContextPanel component:

```typescript
import { ContextPanel } from "@/components/context-panel";
```

After the radar chart div and after the matrix div, add the context panel:

```tsx
{(tab === "radar" || tab === "matrix") && (
  <ContextPanel
    concepts={concepts}
    selectedConcept={selectedConcept}
    onSelectConcept={setSelectedConcept}
    evidence={evidenceMap}
    brandScores={brandScores}
  />
)}
```

**Step 6: Update sources tab for training mode**

Replace the sources tab content:

```tsx
{tab === "sources" && (
  <div className="rounded-lg border bg-white p-6">
    {mode === "training" ? (
      <div className="flex h-32 items-center justify-center text-gray-400">
        No sources cited &mdash; training data only. Switch to Web Search mode to see verified sources.
      </div>
    ) : (
      <SourceTable sources={allSources} />
    )}
  </div>
)}
```

**Step 7: Commit**

```bash
git add src/app/results/[id]/page.tsx
git commit -m "Add training/web toggle, context panel, and mode-filtered results"
```

---

### Task 9: Reseed Database and Verify

**Step 1: Call the seed endpoint to update models**

```bash
curl -X POST http://localhost:3001/api/seed
```

**Step 2: Verify new models appear**

```bash
curl http://localhost:3001/api/models
```

Expected: 6 new models, no old ones.

**Step 3: Run a test comparison in the browser**

Go to http://localhost:3001, pick a template, replace brand placeholders with real brands, run it. Verify:
- Both training and web responses are stored
- Mode toggle works on results page
- Context panel shows evidence quotes
- Sources only appear in web mode

**Step 4: Commit any fixes needed**

```bash
git add -A
git commit -m "Verify v2 improvements working end-to-end"
```

---

## Execution Summary

**Total Tasks: 9**

| Task | What | Files |
|------|------|-------|
| 1 | Schema: add mode + conceptEvidence columns | `schema.ts` |
| 2 | Seed: replace old models with new ones | `seed.ts` |
| 3 | OpenRouter: add web search mode | `openrouter.ts` |
| 4 | Extraction: add conceptEvidence to prompt | `extraction.ts` |
| 5 | Runs API: dual-mode pipeline | `runs/route.ts` |
| 6 | Run details API: verify mode field | `runs/[id]/route.ts` |
| 7 | Context panel component | `context-panel.tsx` (new) |
| 8 | Results page: toggle + panel + filtering | `results/[id]/page.tsx` |
| 9 | Reseed + end-to-end verification | — |
