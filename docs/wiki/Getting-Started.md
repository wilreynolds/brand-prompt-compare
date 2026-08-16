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
