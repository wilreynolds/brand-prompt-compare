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
