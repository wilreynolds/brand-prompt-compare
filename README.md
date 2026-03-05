# Brand Prompt Compare

Compare how AI describes your brand vs competitors. Run natural language prompts across multiple AI models (ChatGPT, Claude, Gemini, Perplexity), then see structured comparisons with radar charts, scoring matrices, and verified sources.

## What This Tool Does

1. You type a prompt comparing 2-3 brands (or pick a template)
2. The tool sends it to multiple AI models at once
3. It extracts structured pros, cons, strengths, and weaknesses for each brand
4. It checks if the sources cited by AI are real (checkmark = real, X = broken)
5. You see a radar chart overlay, comparison matrix, and trend tracking over time

## What You'll Need

Before you start, you'll need accounts (all have free tiers) at these services:

- **Supabase** — This is your database. [Sign up here](https://supabase.com). You'll need the database connection string from Project Settings > Database.
- **OpenRouter** — This lets you query multiple AI models through one API. [Sign up and get a key here](https://openrouter.ai/keys).
- **Anthropic** — This powers the comparison extraction (Claude Haiku 4.5). [Get an API key here](https://console.anthropic.com/settings/keys).

## Setup Steps

### 1. Get the code

Download or clone this repository to your computer.

### 2. Install dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

### 3. Configure your keys

Copy the example environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` in a text editor and fill in your keys. Each line has a comment explaining where to get the value.

### 4. Set up the database

```bash
npm run db:push
```

This creates all the tables in your Supabase database.

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. First run

The app will automatically set up default models (ChatGPT, Claude, Gemini, Perplexity) and sample prompt templates on first use.

## How To Use It

1. **Pick a template** or write your own prompt comparing brands
2. **Confirm the brands** the tool detected (you can add/remove)
3. **Watch it run** — the progress stepper shows each phase
4. **Explore results** — radar chart, comparison matrix, raw responses, verified sources
5. **Track trends** — run comparisons over time to see how brand perception changes

## Commands

```bash
npm run dev          # Start the app
npm run build        # Build for production
npm run db:push      # Set up database tables
npm run db:studio    # Browse your data
```

## License

MIT — use it however you want.
