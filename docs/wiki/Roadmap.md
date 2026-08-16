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
