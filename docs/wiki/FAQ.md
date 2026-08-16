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
