import { db } from "./db";
import { models, prompts } from "./schema";

const DEFAULT_MODELS = [
  {
    openrouterId: "openai/gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    launchDate: new Date("2024-05-13"),
    isActive: true,
  },
  {
    openrouterId: "anthropic/claude-sonnet-4",
    displayName: "Claude Sonnet 4",
    provider: "anthropic",
    launchDate: new Date("2025-05-22"),
    isActive: true,
  },
  {
    openrouterId: "google/gemini-2.5-pro-preview-03-25",
    displayName: "Gemini 2.5 Pro",
    provider: "google",
    launchDate: new Date("2025-03-25"),
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

const STARTER_PROMPTS = [
  {
    name: "Agency Comparison (Detailed)",
    templateText: `I'm a marketing manager evaluating agencies. Compare {brand1}, {brand2}, and {brand3} — give me the pros and cons of each, what it's likely to be like working with them, where they are strong and weak. Include a table at the end with all your sources and links.`,
    isTemplate: true,
  },
  {
    name: "Head-to-Head (2 Brands)",
    templateText: `I'm choosing between {brand1} and {brand2}. What are the strengths and weaknesses of each? Compare their reputation, expertise, pricing, and customer experience. Cite your sources with links.`,
    isTemplate: true,
  },
  {
    name: "Recommendation Request",
    templateText: `Tell me everything you know about {brand1} vs {brand2} vs {brand3}. Who would you recommend for a mid-market B2B company and why? Back up your answer with sources and links.`,
    isTemplate: true,
  },
  {
    name: "Visibility & Reputation Audit",
    templateText: `I work at {brand1} and I'm worried about our visibility in AI search compared to {brand2} and {brand3}. How do we stack up? Where are we strong, where are we weak, and what would you recommend? Include sources with links.`,
    isTemplate: true,
  },
];

export async function seedDatabase() {
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
