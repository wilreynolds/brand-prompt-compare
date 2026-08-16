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
