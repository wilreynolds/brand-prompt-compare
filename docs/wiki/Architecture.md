# Architecture

## System Overview

Brand Prompt Compare uses a **two-pass pipeline** to transform free-text LLM responses into structured, comparable brand perception data.

```
User Prompt
    │
    ▼
┌──────────────────────┐
│  Pass 1: Brand       │
│  Detection (Haiku)   │
│  ─ Extract brand     │
│    names from prompt  │
└──────────┬───────────┘
           │
    User confirms brands
           │
           ▼
┌──────────────────────┐
│  Parallel LLM Calls  │
│  via OpenRouter       │
│  ─ ChatGPT           │
│  ─ Claude             │
│  ─ Gemini             │
│  ─ Perplexity         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Pass 2: Structured  │
│  Extraction (Haiku)  │
│  ─ Pros / Cons       │
│  ─ Strengths / Weak  │
│  ─ Sources           │
│  ─ Concept Scores    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Source Verification  │
│  ─ HEAD requests     │
│  ─ ✓ real / ✗ broken │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Store & Visualize   │
│  ─ Radar chart       │
│  ─ Comparison matrix │
│  ─ Trend tracking    │
└──────────────────────┘
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `brands` | Companies being compared |
| `models` | LLM models with provider info and launch date |
| `prompts` | Saved prompt templates with `{brand1}/{brand2}/{brand3}` placeholders |
| `runs` | Comparison executions with `models_used` snapshot |
| `run_brands` | Join table: which brands were compared in each run |
| `responses` | Raw LLM responses per model per run |
| `parsed_comparisons` | Structured pros/cons/strengths/weaknesses per brand per response |
| `sources` | Extracted URLs with verification status (resolved / broken) |
| `concept_scores` | Aggregated perception scores per brand per concept per run |

### Entity Relationships

```
prompts ──1:N──▶ runs ──1:N──▶ responses ──1:N──▶ parsed_comparisons
                  │                                      │
                  ├──M:N──▶ run_brands ◀── brands        ├──1:N──▶ sources
                  │                                      │
                  └──1:N──▶ concept_scores               │
                                                         │
models ─────────────────────────────────────────────────▶ responses
```

## Pages & Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Guided prompt input with templates and brand confirmation |
| `/results/[id]` | Results | Radar chart, comparison matrix, raw responses, source table |
| `/history` | History | Trend tracking across runs over time |
| `/prompts` | Prompts | Template library for reusable comparison prompts |
| `/settings` | Settings | Model management and API configuration |

## API Routes

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/brands` | GET, POST | Brand CRUD |
| `/api/brands/detect` | POST | Extract brand names from prompt text via Haiku |
| `/api/models` | GET, PATCH | List models, batch toggle active status |
| `/api/prompts` | GET, POST, PATCH, DELETE | Prompt template CRUD |
| `/api/runs` | GET, POST | Trigger comparison pipeline, list past runs |
| `/api/runs/[id]` | GET | Full run details with all responses and parsed data |
| `/api/history` | GET | Trend data filtered by brand and concept |
| `/api/seed` | POST | Seed default models and starter templates |

## Key Design Decisions

**Why OpenRouter instead of direct API calls?**  
One API key, one integration point, access to every major model. Adding a new LLM is a database row, not a code change.

**Why Haiku for extraction?**  
Fast, cheap, and reliable for structured JSON extraction. The extraction task doesn't need frontier intelligence — it needs consistent formatting. Haiku 4.5 hits the sweet spot.

**Why SQLite as default?**  
Zero-friction first run. No account signups, no connection strings, no waiting for provisioning. SQLite gets someone from `git clone` to results in under 2 minutes. Supabase is there when they need persistence or collaboration.

**Why store raw responses alongside parsed data?**  
The extraction layer isn't perfect. Keeping raw responses means you can re-extract with improved prompts later, or manually verify when parsed data looks off.
