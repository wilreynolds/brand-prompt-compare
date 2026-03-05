# Brand Prompt Compare

A tool to compare brand perception across multiple LLMs by running competitive prompts and extracting structured comparisons.

## Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Database**: Supabase PostgreSQL + Drizzle ORM
- **LLM API**: OpenRouter (multi-model queries)
- **Extraction**: Anthropic Haiku 4.5 (structured parsing)
- **Visualization**: Recharts (radar chart, line charts)

## Quick Start

1. Copy `.env.example` to `.env.local` and fill in credentials
2. Run `npm run db:push` to create database tables
3. Run `npm run dev` to start the development server

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

## Architecture

### Two-Pass Pipeline

1. User enters prompt -> brand detection (Haiku 4.5) -> user confirms brands
2. Prompt fires to all active models via OpenRouter (parallel)
3. Each response extracted by Haiku 4.5 into structured JSON (pros, cons, strengths, weaknesses, sources, concept scores)
4. Source URLs verified via HEAD requests (checkmark/X badges)
5. Concept scores aggregated and stored per-run for trend tracking

### Database Tables

- **brands** — Companies being compared
- **models** — LLM models with provider and launch date
- **prompts** — Saved prompt templates with {brand1}/{brand2}/{brand3} placeholders
- **runs** — Comparison executions with models_used snapshot
- **run_brands** — Which brands were compared in each run
- **responses** — Raw LLM responses per model
- **parsed_comparisons** — Structured pros/cons/strengths/weaknesses per brand per response
- **sources** — Extracted URLs with verification status
- **concept_scores** — Aggregated scores per brand per concept per run

### Pages

- `/` — Home: guided prompt input with templates and brand confirmation
- `/results/[id]` — Results: radar chart, comparison matrix, raw responses, source table
- `/history` — Trend tracking across runs
- `/prompts` — Prompt template library
- `/settings` — Model management and API key info

### API Routes

- `/api/brands` — CRUD + `/detect` for brand extraction from prompt text
- `/api/models` — List and batch toggle active status
- `/api/prompts` — CRUD for prompt templates
- `/api/runs` — Trigger pipeline + list runs + `/[id]` for full details
- `/api/history` — Trend data filtered by brand and concept
- `/api/seed` — Seed default models and starter templates
