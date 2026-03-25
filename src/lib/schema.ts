import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { randomUUID } from "crypto";

// Helper: generate UUID default for SQLite
const uuidPk = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const now = () => new Date().toISOString();

// -- Brands --
export const brands = sqliteTable("brands", {
  id: uuidPk(),
  name: text("name").notNull(),
  domain: text("domain"),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

export const brandsRelations = relations(brands, ({ many }) => ({
  runBrands: many(runBrands),
  parsedComparisons: many(parsedComparisons),
  sources: many(sources),
  conceptScores: many(conceptScores),
}));

// -- Models --
export const models = sqliteTable("models", {
  id: uuidPk(),
  openrouterId: text("openrouter_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  provider: text("provider"),
  launchDate: text("launch_date"),
  isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

export const modelsRelations = relations(models, ({ many }) => ({
  responses: many(responses),
}));

// -- Prompts --
export const prompts = sqliteTable("prompts", {
  id: uuidPk(),
  name: text("name").notNull(),
  templateText: text("template_text").notNull(),
  isTemplate: integer("is_template", { mode: "boolean" }).default(false).notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

export const promptsRelations = relations(prompts, ({ many }) => ({
  runs: many(runs),
}));

// -- Runs --
export const runs = sqliteTable("runs", {
  id: uuidPk(),
  promptId: text("prompt_id").references(() => prompts.id),
  promptText: text("prompt_text").notNull(),
  status: text("status").default("pending").notNull(),
  modelsUsed: text("models_used", { mode: "json" }).$type<
    Array<{ id: string; displayName: string; provider: string; launchDate: string | null }>
  >(),
  industryPubs: text("industry_pubs", { mode: "json" }).$type<string[]>(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  completedAt: text("completed_at"),
});

export const runsRelations = relations(runs, ({ one, many }) => ({
  prompt: one(prompts, {
    fields: [runs.promptId],
    references: [prompts.id],
  }),
  runBrands: many(runBrands),
  responses: many(responses),
  conceptScores: many(conceptScores),
}));

// -- Run Brands --
export const runBrands = sqliteTable("run_brands", {
  id: uuidPk(),
  runId: text("run_id").references(() => runs.id).notNull(),
  brandId: text("brand_id").references(() => brands.id).notNull(),
  position: integer("position").notNull(),
});

export const runBrandsRelations = relations(runBrands, ({ one }) => ({
  run: one(runs, {
    fields: [runBrands.runId],
    references: [runs.id],
  }),
  brand: one(brands, {
    fields: [runBrands.brandId],
    references: [brands.id],
  }),
}));

// -- Responses --
export const responses = sqliteTable("responses", {
  id: uuidPk(),
  runId: text("run_id").references(() => runs.id).notNull(),
  modelId: text("model_id").references(() => models.id).notNull(),
  rawText: text("raw_text").notNull(),
  mode: text("mode").default("training").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const responsesRelations = relations(responses, ({ one, many }) => ({
  run: one(runs, {
    fields: [responses.runId],
    references: [runs.id],
  }),
  model: one(models, {
    fields: [responses.modelId],
    references: [models.id],
  }),
  parsedComparisons: many(parsedComparisons),
  sources: many(sources),
}));

// -- Parsed Comparisons --
export const parsedComparisons = sqliteTable("parsed_comparisons", {
  id: uuidPk(),
  responseId: text("response_id").references(() => responses.id).notNull(),
  brandId: text("brand_id").references(() => brands.id).notNull(),
  pros: text("pros", { mode: "json" }).$type<string[]>().default([]).notNull(),
  cons: text("cons", { mode: "json" }).$type<string[]>().default([]).notNull(),
  strengths: text("strengths", { mode: "json" }).$type<string[]>().default([]).notNull(),
  weaknesses: text("weaknesses", { mode: "json" }).$type<string[]>().default([]).notNull(),
  conceptEvidence: text("concept_evidence", { mode: "json" }).$type<Record<string, string>>().default({}).notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const parsedComparisonsRelations = relations(
  parsedComparisons,
  ({ one }) => ({
    response: one(responses, {
      fields: [parsedComparisons.responseId],
      references: [responses.id],
    }),
    brand: one(brands, {
      fields: [parsedComparisons.brandId],
      references: [brands.id],
    }),
  })
);

// -- Sources --
export const sources = sqliteTable("sources", {
  id: uuidPk(),
  responseId: text("response_id").references(() => responses.id).notNull(),
  brandId: text("brand_id").references(() => brands.id),
  url: text("url").notNull(),
  title: text("title"),
  isVerified: integer("is_verified", { mode: "boolean" }),
  verifiedAt: text("verified_at"),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const sourcesRelations = relations(sources, ({ one }) => ({
  response: one(responses, {
    fields: [sources.responseId],
    references: [responses.id],
  }),
  brand: one(brands, {
    fields: [sources.brandId],
    references: [brands.id],
  }),
}));

// -- Concept Scores --
export const conceptScores = sqliteTable("concept_scores", {
  id: uuidPk(),
  runId: text("run_id").references(() => runs.id).notNull(),
  brandId: text("brand_id").references(() => brands.id).notNull(),
  conceptName: text("concept_name").notNull(),
  score: real("score").notNull(),
  mode: text("mode").default("training").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const conceptScoresRelations = relations(conceptScores, ({ one }) => ({
  run: one(runs, {
    fields: [conceptScores.runId],
    references: [runs.id],
  }),
  brand: one(brands, {
    fields: [conceptScores.brandId],
    references: [brands.id],
  }),
}));

// -- Type exports --
export type Brand = typeof brands.$inferSelect;
export type Model = typeof models.$inferSelect;
export type Prompt = typeof prompts.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type RunBrand = typeof runBrands.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type ParsedComparison = typeof parsedComparisons.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type ConceptScore = typeof conceptScores.$inferSelect;
