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
