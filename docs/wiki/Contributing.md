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
