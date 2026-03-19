#!/bin/bash
# Run this from the root of your brand-prompt-compare repo
# on the contrib/wiki-and-repo-polish branch

set -e

echo "Creating directories..."
mkdir -p .github/ISSUE_TEMPLATE
mkdir -p docs/wiki

# ============================================================
# .github/ISSUE_TEMPLATE/bug_report.md
# ============================================================
cat > .github/ISSUE_TEMPLATE/bug_report.md << 'ENDOFFILE'
---
name: Bug Report
about: Something isn't working as expected
title: "[Bug] "
labels: bug
assignees: ''
---

## What happened?
<!-- A clear description of the bug. -->

## Steps to reproduce
1. 
2. 
3. 

## Expected behavior
<!-- What should have happened? -->

## Actual behavior
<!-- What happened instead? -->

## Environment
- **Database**: SQLite / Supabase (delete one)
- **Node version**: 
- **Browser**: 
- **OS**: 

## Screenshots / Logs
<!-- If applicable, add screenshots or paste error logs. -->
ENDOFFILE

# ============================================================
# .github/ISSUE_TEMPLATE/feature_request.md
# ============================================================
cat > .github/ISSUE_TEMPLATE/feature_request.md << 'ENDOFFILE'
---
name: Feature Request
about: Suggest an improvement or new capability
title: "[Feature] "
labels: enhancement
assignees: ''
---

## What problem does this solve?
<!-- Describe the pain point or opportunity. -->

## Proposed solution
<!-- How do you think this should work? -->

## Alternatives considered
<!-- Any other approaches you thought about? -->

## Additional context
<!-- Mockups, examples, links to related issues or roadmap items. -->
ENDOFFILE

# ============================================================
# docs/REPO-METADATA.md
# ============================================================
cat > docs/REPO-METADATA.md << 'ENDOFFILE'
# Repo Metadata Suggestions

## Description (GitHub "About" section)

```
Compare how AI models describe your brand vs competitors. Run branded prompts across ChatGPT, Claude, Gemini & Perplexity — get structured scores, radar charts, source verification, and trend tracking.
```

## Topics (GitHub tags)

Add these via Settings → Topics:

```
brand-monitoring
ai-perception
generative-engine-optimization
geo
llm-comparison
brand-intelligence
competitive-analysis
multi-model
openrouter
nextjs
typescript
seer-interactive
ai-search
brand-perception
prompt-engineering
```

## Website URL

Set to the deployed Vercel URL once available, or leave blank for now.

## Social Preview Image

Consider creating a social preview (1280×640) showing:
- The radar chart with 2-3 overlapping brand shapes
- The tagline: "See what AI tells buyers when they compare you by name"
- Brand Prompt Compare logo/wordmark

This shows up on Twitter/LinkedIn/Slack when someone shares the repo link.
ENDOFFILE

# ============================================================
# docs/wiki/Home.md
# ============================================================
cat > docs/wiki/Home.md << 'ENDOFFILE'
# Brand Prompt Compare Wiki

**Monitor how AI models describe your brand in head-to-head comparisons against competitors.**

Brand Prompt Compare is the first tool purpose-built for branded AI perception monitoring. While most tools track vanity queries like "best marketing agency," this tool focuses on the prompts where buying decisions actually happen — where prospects type your brand name next to a competitor's and ask AI to pick a winner.

---

## Quick Navigation

| Page | Description |
|------|-------------|
| [Getting Started](Getting-Started) | Installation, configuration, and your first comparison run |
| [Architecture](Architecture) | Two-pass pipeline, database schema, and system design |
| [API Reference](API-Reference) | All API routes with request/response examples |
| [Prompt Engineering Guide](Prompt-Engineering-Guide) | How to write prompts that produce actionable brand insights |
| [Understanding Results](Understanding-Results) | Reading radar charts, comparison matrices, and source verification |
| [Contributing](Contributing) | How to contribute code, report bugs, and suggest features |
| [Roadmap](Roadmap) | Planned features and improvement areas |
| [FAQ](FAQ) | Common questions and troubleshooting |

---

## Why This Exists

> "The industry is tracking the wrong prompts. While you're obsessing over 'best GEO agency,' your buyers are typing your name next to a competitor's and making decisions based on what AI says."

Gartner's research shows 77% of B2B buyers consult their network first. Increasingly, that network is AI. Seer Interactive's own research found 44% of brand-related prompts are head-to-head comparisons. This tool was built to make those invisible conversations visible — and actionable.

## How It Works (30-Second Version)

1. You type a prompt comparing 2–3 brands (or pick a template)
2. The tool fires that prompt to multiple AI models simultaneously (ChatGPT, Claude, Gemini, Perplexity)
3. A structured extraction pass pulls out pros, cons, strengths, weaknesses, and concept scores for each brand
4. Source URLs are verified — real link (✓) or hallucinated (✗)
5. Results render as a radar chart overlay, comparison matrix, and trend tracker

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Database | SQLite (local) or Supabase PostgreSQL (cloud) |
| LLM Routing | OpenRouter (multi-model queries) |
| Extraction | Anthropic Claude Haiku 4.5 (structured parsing) |
| Visualization | Recharts (radar charts, line charts) + D3 |
ENDOFFILE

# ============================================================
# docs/wiki/Getting-Started.md
# ============================================================
cat > docs/wiki/Getting-Started.md << 'ENDOFFILE'
# Getting Started

## Prerequisites

- **Node.js** 18+ 
- **npm** (comes with Node.js)
- **OpenRouter API Key** — routes prompts to multiple LLMs through one API. [Get one here](https://openrouter.ai/keys).
- **Anthropic API Key** — powers the structured extraction layer (Claude Haiku 4.5). [Get one here](https://console.anthropic.com/settings/keys).

## Installation

### Option A: SQLite (Zero Setup — Recommended for First Run)

```bash
git clone https://github.com/wilreynolds/brand-prompt-compare.git
cd brand-prompt-compare
npm install
cp .env.example .env.local
```

Edit `.env.local` and add your OpenRouter and Anthropic keys. Leave `DATABASE_URL` empty.

```bash
npm run db:push:sqlite
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Done.

### Option B: Supabase PostgreSQL (For Deployment & Team Use)

If you want cloud persistence, shareable deploys, or team access:

1. Create a free project at [supabase.com](https://supabase.com)
2. Get the connection string from **Project Settings → Database**
3. Add it as `DATABASE_URL` in your `.env.local`

```bash
npm run db:push
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | Routes prompts to ChatGPT, Claude, Gemini, Perplexity |
| `ANTHROPIC_API_KEY` | Yes | Powers structured extraction (Haiku 4.5) |
| `DATABASE_URL` | No | Supabase PostgreSQL connection string. Omit for SQLite. |
| `API_SECRET` | No | Protects API routes when deployed publicly. Generate with `openssl rand -hex 32` |

## Your First Comparison Run

1. **Pick a template** — The app ships with starter templates, or write your own prompt comparing 2–3 brands
2. **Confirm brands** — The tool auto-detects brand names; add or remove as needed
3. **Select concepts** — Check the comparison dimensions that matter to you (Trust, Innovation, Pricing, etc.)
4. **Choose models & modes** — Pick which LLMs to query and whether each uses Training Data, Web Search, or both
5. **Review results** — Explore the radar chart, comparison matrix, raw responses, and verified sources

## Useful Commands

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push schema to PostgreSQL |
| `npm run db:push:sqlite` | Push schema to local SQLite |
| `npm run db:studio` | Browse your data with Drizzle Studio |

## Security Note

When deploying to a public URL, **always set `API_SECRET`**. Without it, anyone who discovers your URL can trigger LLM runs on your API keys. Local development works without auth by default.
ENDOFFILE

# ============================================================
# docs/wiki/Architecture.md
# ============================================================
cat > docs/wiki/Architecture.md << 'ENDOFFILE'
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
ENDOFFILE

# ============================================================
# docs/wiki/API-Reference.md
# ============================================================
cat > docs/wiki/API-Reference.md << 'ENDOFFILE'
# API Reference

All API routes are under `/api/`. When deployed with `API_SECRET` set, include the header `Authorization: Bearer <your-secret>` on all requests.

---

## Brands

### `GET /api/brands`
List all brands in the database.

**Response:** Array of brand objects with `id`, `name`, `created_at`.

### `POST /api/brands`
Create a new brand.

**Body:** `{ "name": "Acme Corp" }`

### `POST /api/brands/detect`
Extract brand names from a free-text prompt using Haiku.

**Body:** `{ "prompt": "Compare Salesforce and HubSpot for mid-market CRM" }`  
**Response:** `{ "brands": ["Salesforce", "HubSpot"] }`

---

## Models

### `GET /api/models`
List all configured LLM models.

**Response:** Array of model objects with `id`, `name`, `provider`, `model_id`, `active`, `launch_date`.

### `PATCH /api/models`
Batch update model active status.

**Body:** `{ "models": [{ "id": 1, "active": true }, { "id": 2, "active": false }] }`

---

## Prompts

### `GET /api/prompts`
List all saved prompt templates.

### `POST /api/prompts`
Create a new prompt template.

**Body:** `{ "name": "Buyer Evaluation", "template": "I'm choosing between {brand1} and {brand2} for enterprise CRM. Compare them on pricing, support, and integrations." }`

### `PATCH /api/prompts`
Update an existing template.

### `DELETE /api/prompts`
Delete a template by ID.

---

## Runs

### `POST /api/runs`
Trigger a new comparison run. This is the main pipeline endpoint.

**Body:**
```json
{
  "prompt": "Compare Salesforce and HubSpot on trust and innovation",
  "brand_ids": [1, 2],
  "model_ids": [1, 2, 3, 4],
  "concepts": ["Trust", "Innovation", "Pricing"],
  "modes": ["training", "web_search"]
}
```

**Response:** Run object with `id`. Poll `/api/runs/[id]` for results.

### `GET /api/runs`
List all past runs with summary metadata.

### `GET /api/runs/[id]`
Full run details including all responses, parsed comparisons, sources, and concept scores.

---

## History

### `GET /api/history`
Trend data for chart rendering.

**Query params:**
- `brand_id` — Filter by brand (optional)
- `concept` — Filter by concept name (optional)

**Response:** Array of `{ run_id, date, brand, concept, score }` objects.

---

## Seed

### `POST /api/seed`
Populate default models (ChatGPT, Claude, Gemini, Perplexity) and starter prompt templates. Safe to call multiple times — skips existing records.
ENDOFFILE

# ============================================================
# docs/wiki/Prompt-Engineering-Guide.md
# ============================================================
cat > docs/wiki/Prompt-Engineering-Guide.md << 'ENDOFFILE'
# Prompt Engineering Guide

The quality of your brand perception insights depends entirely on the quality of your prompts. This guide covers what works, what doesn't, and why.

## The Core Principle

**Ask the question a buyer would actually ask.** Not the question your CEO wants tracked — the question a prospect types into ChatGPT at 10pm while evaluating vendors.

## What Makes a Good Comparison Prompt

### Be Specific About Dimensions

❌ "Compare Brand A vs Brand B"  
✅ "I'm evaluating Brand A and Brand B for enterprise data security. Compare their track record on breach response, compliance certifications, and customer data handling transparency."

Generic prompts produce generic praise. Specific dimensions produce differentiated scores.

### Ask for Evidence

❌ "Which is better, Brand A or Brand B?"  
✅ "Compare Brand A and Brand B on customer support quality. Cite specific examples, reviews, or reports that support your assessment."

Asking for evidence forces the LLM to ground its response in retrievable facts, which means the source verification pass has something to work with.

### Use Buyer Language, Not Marketer Language

❌ "Which brand has better thought leadership and brand equity?"  
✅ "I need to choose between Brand A and Brand B for my team. Which one do real users complain about less?"

Buyer prompts use plain language about real concerns. Marketer prompts use jargon that LLMs will reflect back without differentiation.

### Compare 2–3 Brands, Not More

The tool supports up to 3 brands per comparison. Two-brand comparisons produce the most focused results. Three-brand comparisons are useful for category mapping but dilute per-brand depth.

## Template Patterns That Work

### The Buyer Evaluation
```
I'm choosing between {brand1} and {brand2} for [use case]. Compare them on [dimension 1], [dimension 2], and [dimension 3]. Which would you recommend and why? Cite sources.
```

### The Switcher Question
```
I'm currently using {brand1} but considering switching to {brand2}. What would I gain and what would I lose? Be specific about features, pricing, and customer experience.
```

### The Category Perception Check
```
In the [industry] space, how do {brand1}, {brand2}, and {brand3} compare on [key buying criteria]? Which has the strongest reputation and why?
```

### The Objection Test
```
My team is leaning toward {brand1} over {brand2}. What are the strongest arguments against choosing {brand1}? What does {brand2} do better?
```

## Reading Your Results

### High Concept Score Variance = Useful Prompt
If Brand A scores 8/10 on Trust and Brand B scores 4/10, your prompt is revealing real perception differences. That's actionable.

### Low Variance Across All Concepts = Weak Prompt
If both brands score 6–7 on everything, the prompt is too vague. Try adding specific dimensions or asking for evidence.

### Model Disagreement = Signal Worth Investigating
If ChatGPT loves Brand A but Gemini prefers Brand B, that's not noise — it reflects different training data and recency. The disagreement itself is the insight.
ENDOFFILE

# ============================================================
# docs/wiki/Understanding-Results.md
# ============================================================
cat > docs/wiki/Understanding-Results.md << 'ENDOFFILE'
# Understanding Results

## Results Page Layout

After a comparison run completes, the results page (`/results/[id]`) shows four sections:

### 1. Radar Chart

The radar chart overlays all compared brands on the same axes, where each axis represents a concept (Trust, Innovation, Pricing, Support, etc.).

**How to read it:**
- Each axis runs from 0 (center) to 10 (edge)
- Larger area = stronger overall perception
- Asymmetric shapes reveal where brands differentiate — a brand that scores 9 on Trust but 3 on Innovation has a very different profile than one scoring 6 across the board
- Toggle between Training Data and Web Search views to see how recency affects perception

**What to look for:**
- Where your brand's shape collapses inward (weak spots competitors can exploit)
- Where competitor shapes collapse (your potential messaging advantages)
- Concepts where all brands score similarly (table stakes, not differentiators)

### 2. Comparison Matrix

A structured table showing extracted pros, cons, strengths, and weaknesses for each brand, organized by model.

**How to read it:**
- Each row is a model's assessment of a brand
- Pros/Cons are factual observations; Strengths/Weaknesses are evaluative judgments
- Cross-reference across models: if three out of four models cite the same weakness, that's a strong signal

### 3. Raw Responses

The unprocessed text returned by each LLM. This is your audit trail.

**When to use it:**
- When a parsed comparison looks off and you want to verify against the source
- When you want the full nuance that structured extraction necessarily loses
- When a model provides context or caveats that didn't fit neatly into pros/cons

### 4. Source Verification Table

Every URL cited by any LLM, with verification status.

**Status meanings:**
- ✓ (checkmark) — URL returned a successful HTTP response. The page exists.
- ✗ (X) — URL returned an error or didn't resolve. The source is broken or hallucinated.

**Important caveat:** A checkmark means the URL exists, not that it supports the claim. A future update will add claim-level verification.

## Training Data vs. Web Search

Each model can run in two modes:

**Training Data** — The model responds from its training corpus only. This reflects the brand's historical reputation as captured in the model's training data. Slower to change, broader coverage, but potentially stale.

**Web Search** — The model searches the web before responding. This reflects current, real-time brand perception. More recent, but potentially influenced by recent news events (positive or negative) that may not reflect long-term perception.

**The delta between these two modes is often the most valuable insight.** A brand that scores high in training data but low in web search is seeing its reputation degrade in real time — a signal to investigate what's changed.

## Trend Tracking

The history page (`/history`) plots concept scores over time across multiple runs.

**Best practices for trend tracking:**
- Use the same prompt template across runs for comparability
- Run comparisons on a consistent schedule (weekly or monthly)
- Watch for sudden score drops — they often correlate with news events, product launches, or PR incidents
- Filter by specific concepts to isolate trends in areas you're actively working to improve
ENDOFFILE

# ============================================================
# docs/wiki/Contributing.md
# ============================================================
cat > docs/wiki/Contributing.md << 'ENDOFFILE'
# Contributing

Thanks for your interest in contributing to Brand Prompt Compare. Here's how to get involved.

## Ways to Contribute

- **Bug reports** — Found something broken? Open an issue using the Bug Report template.
- **Feature requests** — Have an idea? Open an issue using the Feature Request template.
- **Code contributions** — Pick an open issue, fork the repo, and submit a PR.
- **Prompt templates** — Share comparison prompts that produce great results.
- **Documentation** — Improve wiki pages, add examples, fix typos.

## Development Setup

```bash
git clone https://github.com/wilreynolds/brand-prompt-compare.git
cd brand-prompt-compare
npm install
cp .env.example .env.local
# Add your OpenRouter + Anthropic keys
npm run db:push:sqlite
npm run dev
```

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling (no separate CSS files)
- Drizzle ORM for database queries
- API routes in `/src/app/api/`
- Components in `/src/components/`
- Database schema in `/src/db/`

## Pull Request Guidelines

1. **One concern per PR** — Don't bundle unrelated changes.
2. **Describe the "why"** — What problem does this solve? Link to the issue if one exists.
3. **Test locally** — Run `npm run build` before submitting. Make sure both SQLite and PostgreSQL paths still work if you touched the database layer.
4. **Keep it reviewable** — Prefer smaller PRs that are easy to review over large ones that sit.

## Branch Naming

```
feature/short-description
fix/short-description
docs/short-description
```

## Commit Messages

Use clear, imperative-tense messages:
- ✅ `Add prompt A/B testing to runs schema`
- ✅ `Fix radar chart axis labels overlapping`
- ❌ `Updated stuff`
- ❌ `WIP`

## Adding a New Model

To add a new LLM model to the default set:

1. Add the model to the seed data in `/api/seed`
2. Ensure OpenRouter supports the model identifier
3. Test a full comparison run with the new model active
4. Submit a PR with a screenshot of the results page showing the new model's output

## Adding a New Prompt Template

Good templates follow these principles:
- Compare specific, measurable dimensions (not "which is better overall?")
- Use brand placeholders: `{brand1}`, `{brand2}`, `{brand3}`
- Ask for evidence and sources
- Focus on dimensions that matter for buying decisions

## Questions?

Open an issue with the `question` label, or start a Discussion thread.
ENDOFFILE

# ============================================================
# docs/wiki/Roadmap.md
# ============================================================
cat > docs/wiki/Roadmap.md << 'ENDOFFILE'
# Roadmap

A living document of planned improvements and feature ideas, organized by priority.

---

## 🔴 High Priority — Reliability & Accuracy

### Multi-Pass Extraction Validation
**Problem:** Single-pass Haiku extraction sometimes hallucinates pros/cons that weren't in the raw LLM response.  
**Solution:** Add a validation agent that cross-checks extracted structured data against the raw response. Flag extractions that can't be traced back to the source text.  
**Impact:** Directly improves data quality — every chart and score downstream depends on extraction accuracy.

### Source Claim Verification (Deep)
**Problem:** Current HEAD-request verification only confirms a URL resolves, not that the source actually supports the LLM's claim.  
**Solution:** Fetch page content for verified URLs and run a second LLM pass to check whether the cited source supports the specific claim made. Display three states: ✓ verified (claim supported), ⚠ exists (URL works but claim unconfirmed), ✗ broken (URL dead).  
**Impact:** Transforms source verification from a binary check into a trust signal.

### Concept Taxonomy Normalization
**Problem:** Auto-detected concepts drift across runs ("Innovation" vs. "Technology Leadership" vs. "Tech Innovation"), breaking trend tracking.  
**Solution:** Establish a fixed taxonomy of brand perception dimensions with canonical names. Map detected concepts to the taxonomy using an embedding similarity check. Allow custom dimensions.  
**Impact:** Makes trend tracking reliable over time — the core value of the history page.

---

## 🟡 Medium Priority — Actionable Insights

### Training Data vs. Web Search Delta View
**Problem:** The tool supports both modes but doesn't surface the *gap* between them as a signal.  
**Solution:** Add a dedicated view showing the delta between training-data scores and web-search scores per brand per concept. A brand scoring high on "Trust" in training data but low in web search tells you recent coverage is hurting historical reputation.  
**Impact:** Tells content strategists whether to invest in new content (web search gap) or ride existing reputation (training data strength).

### Content Gap Recommendations
**Problem:** The tool shows where you're losing but doesn't connect that to *why* or *what to do about it*.  
**Solution:** When a brand scores low on a concept, surface the specific sources competitors are benefiting from. Identify what content assets competitors have that shape AI perception, and recommend content to create.  
**Impact:** Turns monitoring into action — the difference between a dashboard and a strategy tool.

### Prompt A/B Testing
**Problem:** No way to test how different prompt framings change brand perception results.  
**Solution:** Add a `prompt_group_id` to the runs schema. Allow users to run the same brands with different prompt framings and compare results side-by-side. Surface which framings produce the most differentiated (or most favorable) outcomes.  
**Impact:** Essential for GEO practitioners who need to understand how prompt framing affects brand perception.

---

## 🟢 Lower Priority — Polish & Distribution

### Export Pipeline (Client Deliverables)
**Problem:** No way to share results outside the app.  
**Solution:** One-click export to PDF or shareable link. Include radar chart, comparison matrix, key findings summary, and source verification table. Support custom branding for agency use.  
**Impact:** Makes the tool usable in client meetings and stakeholder presentations.

### Prompt Effectiveness Scoring
**Problem:** Users don't know which prompts produce the most useful, differentiated results.  
**Solution:** Score prompts based on variance produced across brands and models. High-variance prompts reveal real perception differences; low-variance prompts produce generic output.  
**Impact:** Helps users learn which questions actually matter.

### Scheduled Runs & Alerts
**Problem:** Trend tracking requires manual re-runs.  
**Solution:** Add cron-based scheduled comparison runs (daily/weekly). Alert when brand perception scores change significantly.  
**Impact:** Turns the tool into passive monitoring instead of requiring active usage.

### Model Response Caching
**Problem:** Re-running the same prompt with the same models costs money and produces similar results.  
**Solution:** Cache responses with a configurable TTL. Allow forced re-fetch. Show cache status in the UI.  
**Impact:** Reduces API costs and speeds up iteration.

---

## Contribution Opportunities

Every item on this roadmap is open for contribution. If you want to pick one up:
1. Open an issue referencing the roadmap item
2. Describe your proposed approach
3. Wait for a thumbs-up before building (to avoid duplicate work)
4. Submit a PR following the [Contributing](Contributing) guidelines
ENDOFFILE

# ============================================================
# docs/wiki/FAQ.md
# ============================================================
cat > docs/wiki/FAQ.md << 'ENDOFFILE'
# FAQ

## General

**What's the difference between this and just asking ChatGPT myself?**  
Three things: (1) you're querying 4+ models simultaneously, so you see consensus vs. disagreement, (2) responses are extracted into structured, comparable data instead of free text, and (3) results are stored for trend tracking over time. A single ChatGPT conversation gives you one opinion at one moment. This gives you a multi-model perception dataset.

**How much does it cost to run a comparison?**  
Depends on the models selected. A typical 4-model run with extraction costs roughly $0.05–0.15 in API credits. OpenRouter charges per-token at each model's rate. The Haiku extraction pass is very cheap (~$0.01 per response).

**Can I compare more than 3 brands?**  
Currently the tool supports up to 3 brands per run. Comparing more dilutes the depth of each assessment. For broader category mapping, run multiple 2-brand comparisons and use the history view to see the full landscape.

**Does this work for non-English brands/markets?**  
Yes, but LLM training data coverage varies significantly by language and region. English-language brands in North American and European markets will have the richest data. For other markets, web search mode will generally produce better results than training data.

## Technical

**SQLite or Supabase — which should I use?**  
Start with SQLite. It requires zero setup and is perfect for personal use. Switch to Supabase when you need cloud persistence (deployment), team access, or want data to survive across machines.

**Can I add more models?**  
Yes. Any model available through OpenRouter can be added. Go to `/settings`, add the model identifier, and it'll be available for your next run. No code changes needed.

**Why do some sources show ✓ but seem unrelated to the claim?**  
The current verification only checks if the URL exists (HTTP HEAD request). It doesn't verify whether the source actually supports the claim. This is a known limitation with a planned improvement — see the [Roadmap](Roadmap).

**I'm getting rate limit errors from OpenRouter.**  
OpenRouter enforces per-model rate limits. If you're running many models in parallel, some may hit limits. The tool retries automatically, but you can also reduce the number of simultaneous models or add a delay between calls.

**Can I self-host this on Vercel?**  
Yes. Push to a GitHub repo, connect it to Vercel, and add your environment variables. Use Supabase for the database (SQLite won't persist across Vercel's serverless functions). Don't forget to set `API_SECRET`.

## Strategy

**How often should I run comparisons?**  
For active brand monitoring: weekly. For campaign measurement: before and after major launches. For competitive audits: monthly is usually sufficient. The value is in the trend, not any single snapshot.

**What should I do when I find a weakness?**  
Look at *why* the models perceive the weakness. Check which sources they cite. Then create content that directly addresses the gap — blog posts, case studies, landing pages that future LLM training and web search will pick up. This is the GEO playbook.

**Should I trust training data or web search results more?**  
Neither is "more accurate" — they answer different questions. Training data tells you the brand's embedded reputation. Web search tells you the current narrative. The delta between them is often the most actionable signal.
ENDOFFILE

echo ""
echo "✅ All files created:"
echo ""
find .github docs -type f | sort
echo ""
echo "Next steps:"
echo "  git add ."
echo "  git commit -m 'Add wiki pages, issue templates, and repo metadata suggestions'"
echo "  git push origin contrib/wiki-and-repo-polish"
echo "  gh pr create --repo wilreynolds/brand-prompt-compare --title 'Wiki, issue templates, and repo polish' --body-file -"
