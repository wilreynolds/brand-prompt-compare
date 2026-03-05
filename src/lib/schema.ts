import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  real,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// -- Brands --
export const brands = pgTable("brands", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const brandsRelations = relations(brands, ({ many }) => ({
  runBrands: many(runBrands),
  parsedComparisons: many(parsedComparisons),
  sources: many(sources),
  conceptScores: many(conceptScores),
}));

// -- Models --
export const models = pgTable("models", {
  id: uuid("id").defaultRandom().primaryKey(),
  openrouterId: text("openrouter_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  provider: text("provider"),
  launchDate: timestamp("launch_date"),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const modelsRelations = relations(models, ({ many }) => ({
  responses: many(responses),
}));

// -- Prompts --
export const prompts = pgTable("prompts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  templateText: text("template_text").notNull(),
  isTemplate: boolean("is_template").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const promptsRelations = relations(prompts, ({ many }) => ({
  runs: many(runs),
}));

// -- Runs --
export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  promptId: uuid("prompt_id").references(() => prompts.id),
  promptText: text("prompt_text").notNull(),
  status: text("status").default("pending").notNull(),
  modelsUsed: jsonb("models_used").$type<
    Array<{ id: string; displayName: string; provider: string; launchDate: string | null }>
  >(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
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

// -- Run Brands (which brands were compared in a run) --
export const runBrands = pgTable("run_brands", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .references(() => runs.id)
    .notNull(),
  brandId: uuid("brand_id")
    .references(() => brands.id)
    .notNull(),
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
export const responses = pgTable("responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .references(() => runs.id)
    .notNull(),
  modelId: uuid("model_id")
    .references(() => models.id)
    .notNull(),
  rawText: text("raw_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  responseId: uuid("response_id")
    .references(() => responses.id)
    .notNull(),
  brandId: uuid("brand_id").references(() => brands.id),
  url: text("url").notNull(),
  title: text("title"),
  isVerified: boolean("is_verified"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
