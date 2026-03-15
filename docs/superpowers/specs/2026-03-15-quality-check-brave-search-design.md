# Automated Quality Check with Brave Search

## Problem

The Quality Check tab currently generates static Google search links that users must click manually. We want to run those searches automatically during the pipeline, then display structured results (quadrant visualization, quality flags, detailed URLs) so users can assess whether a brand's AI scores are trustworthy or inflated by listicle spam.

## Decisions Made

- **Brave Search API** over OpenRouter `:online` mode — exact query control with `site:` and `intitle:` operators, deterministic results, clean JSON responses
- **Option A (Google scraping) is the documented fallback** if Brave output is unsatisfactory — swap `brave-search.ts` internals without changing the rest of the architecture
- **Runs automatically** as a pipeline phase (not on-demand) — fires after scoring completes
- **User provides brand domains and industry publications** as optional inputs during wizard — no hardcoded publication list
- **Three-layer display**: quadrant (big picture) → flags (interpretation) → detailed URLs (receipts)

## User Input Changes

### Wizard: Brand Confirmation Step

Add two optional fields per brand during the existing brand confirmation UI:

1. **Domain** — single text input (e.g. `seerinteractive.com`)
   - Used for `site:` listicle searches
   - Optional — if blank, listicle search is skipped for that brand

2. **Industry Publications** — comma-separated domains, up to 10 (e.g. `searchengineland.com, moz.com, forbes.com`)
   - Shared across all brands in the run (not per-brand)
   - Used for trade pub presence searches
   - Optional — if blank, trade pub search is skipped

If both are blank for all brands, the quality check phase still runs the "general authority" search (conference/speaker mentions).

## Brave Search Integration

### New module: `src/lib/brave-search.ts`

```typescript
interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

interface QualityCheckResult {
  brandName: string;
  listicleCount: number;
  listicleResults: BraveSearchResult[];
  tradePubCount: number;
  tradePubResults: BraveSearchResult[];
  authorityCount: number;
  authorityResults: BraveSearchResult[];
}
```

**Search queries per brand** (up to 3, with 1-second delay between each):

1. **Listicle spam** (requires brand domain):
   - Query: `site:{domain} intitle:"top" OR intitle:"best" OR intitle:"leading"`

2. **Trade pub presence** (requires publication list):
   - Query: `"{brandName}" site:{pub1} OR site:{pub2} OR site:{pub3}...`

3. **General authority** (always runs):
   - Query: `"{brandName}" conference speaker OR keynote OR panelist`

**Rate limiting:** Sequential execution, 1 second between requests. For a 3-brand run this is ~9 searches, ~9 seconds.

**API key:** `BRAVE_API_KEY` in `.env.local`. Free tier allows 2,000 queries/month.

**Error handling:** If Brave API key is missing, skip the quality check phase silently. If individual searches fail, record zero results for that category and continue.

## Database Changes

### New table: `quality_checks`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| run_id | uuid | FK to runs |
| brand_id | uuid | FK to brands |
| listicle_count | integer | Number of listicle pages found |
| trade_pub_count | integer | Number of trade pub mentions found |
| authority_count | integer | Number of authority mentions found |
| listicle_results | json | Array of {title, url, description} |
| trade_pub_results | json | Array of {title, url, description} |
| authority_results | json | Array of {title, url, description} |
| created_at | timestamp | When the check ran |

### Schema update to `brands` table

Add optional `domain` column (text, nullable).

### Run metadata

Store the industry publication list on the run record (or a new `run_metadata` json column) since it's shared across all brands in a run.

## Pipeline Integration

### SSE Pipeline Phase (in `/api/runs/stream/route.ts`)

After the existing "scoring" phase, add:

```
Phase: "quality-check"
├── For each brand in run (sequential):
│   ├── Search 1: Listicle spam (if domain exists)
│   ├── Wait 1 second
│   ├── Search 2: Trade pub presence (if pubs provided)
│   ├── Wait 1 second
│   ├── Search 3: General authority (always)
│   ├── Wait 1 second
│   └── Store results in quality_checks table
│   └── SSE event: quality_check_done for brand
└── Continue to "complete" phase
```

If `BRAVE_API_KEY` is not set, skip entire phase — no error, just proceed to complete.

## Quality Check Tab (Redesigned)

Replaces the current static-links Quality Check tab. Three sections, top to bottom:

### Section 1: Source Quality Quadrant (top)

2x2 scatter plot using Recharts ScatterChart:

- **X-axis:** Listicle Spam (listicle_count) — 0 at left, 5+ at right
- **Y-axis:** Trade Pub Presence (trade_pub_count + authority_count) — 0 at bottom, 10+ at top
- Each brand is a labeled dot positioned by its counts
- Four quadrant labels:
  - Top-left: ✅ Trustworthy (low spam, high authority)
  - Top-right: ⚠️ Mixed Signals (high spam, high authority)
  - Bottom-left: ❓ Low Visibility (low spam, low authority)
  - Bottom-right: 🚩 Likely Inflated (high spam, low authority)

### Section 2: Quality Flags (middle)

One card per brand, color-coded by quadrant:

- **Green (Trustworthy):** "No listicle spam detected, solid trade publication presence"
- **Yellow (Mixed):** "Some listicle content found, but strong trade pub presence suggests legitimate authority"
- **Gray (Low Visibility):** "Limited web presence — AI scores based on sparse data"
- **Red (Inflated):** "High listicle content with limited trade pub validation — scores may be inflated"

### Section 3: Detailed Results (bottom)

Expandable card per brand showing:
- Listicle Pages: count + clickable URL list
- Trade Pub Mentions: count + clickable URL list
- Authority Mentions: count + clickable URL list

Each URL shows title and domain, links open in new tab.

### Empty state

If no Brave API key is configured, show a message: "Add a BRAVE_API_KEY to .env.local to enable automated quality checks" with a link to Brave Search API signup.

If quality check ran but all brands had no domain/pubs provided, show only the authority results section.

## Files to Create/Modify

### New files
- `src/lib/brave-search.ts` — Brave Search API client and query builder
- `src/components/quality-quadrant.tsx` — Recharts ScatterChart 2x2 visualization
- `src/components/quality-flags.tsx` — Color-coded flag cards
- `src/components/quality-details.tsx` — Expandable URL list cards

### Modified files
- `src/lib/schema.ts` — Add quality_checks table, domain column to brands
- `src/lib/schema-sqlite.ts` — Same for SQLite schema
- `src/app/api/runs/stream/route.ts` — Add quality-check phase after scoring
- `src/app/api/runs/[id]/route.ts` — Include quality_checks in run results response
- `src/app/results/[id]/page.tsx` — Replace Quality Check tab content with new components
- `src/app/page.tsx` — Add domain input and industry pubs input to wizard brand confirmation step
