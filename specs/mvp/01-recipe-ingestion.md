# Feature Spec: Recipe Ingestion

## Context

Feeds the shared Recipe schema used by the weekly meal plan (see `spec-weekly-meal-plan.md`, written with MVP-3/4). Recipes enter the system three ways, built in phases: URL import, copy-paste, and eventually AI-driven generation. All three must output the same Recipe shape.

## Goal

Let a user add a recipe to their pool by pasting a URL or pasting raw recipe text, and have it land as a structured Recipe object — without the user manually filling out ingredients/steps by hand.

## Phases

### Phase 1 — URL import

Most recipe sites embed schema.org Recipe JSON-LD in the page `<head>` for SEO. Fetch the page, extract that block, map it into our Recipe schema.

Flow:

1. User pastes a URL
2. Fetch the page HTML
3. Look for `<script type="application/ld+json">` containing `"@type": "Recipe"`
4. Map fields: `name`→title, `recipeIngredient`→ingredients (parse into name/quantity/unit), `recipeInstructions`→steps, `recipeYield`→servings
5. Save as Recipe with `sourceType: "url"`, `sourceUrl` set
6. If no JSON-LD found or required fields missing → fall back to Phase 1b (treat page text as pasted content)

### Phase 1b — Copy-paste

No structure to lean on — also the fallback when Phase 1 fails or a site blocks fetching.

Flow:

1. User pastes raw text (ingredient list + instructions, however formatted)
2. Send to LLM with an extraction prompt: parse into title, ingredients (name/quantity/unit), steps, servings
3. Return structured result for a quick confirm/edit step before saving — do not trust extraction blindly on first pass
4. Save as Recipe with `sourceType: "pasted"` (if this ran as URL fallback and the page was fetched, still store `sourceUrl`)

### Phase 2 — AI-driven generation (future, not this task)

User gives constraints (available ingredients, cuisine, time) → LLM generates a net-new recipe into the same schema, `sourceType: "generated"`. Depends on Phase 1b's extraction prompt patterns but is a distinct creation flow, not extraction. Do not build in this task — noted only so the schema (`sourceType`) already accounts for it.

## In scope for this task

- Phase 1 (URL import with JSON-LD parsing)
- Phase 1b (paste + LLM extraction, with user confirm/edit step)
- Fallback logic: Phase 1 failure routes into Phase 1b
- LLM token/cost logging so each call and the running total are visible (no hardcoded prices)

## Out of scope for this task

- Phase 2 (AI generation)
- Scraping sites without JSON-LD via custom per-site parsers
- Image-based recipe import (photo of a cookbook page, etc.)
- Assigning the recipe to a day/slot, members, Telegram, week board

## Acceptance criteria

- Given a URL with valid Recipe JSON-LD, import produces a complete Recipe object with no manual entry needed
- Given a URL with no JSON-LD, the system falls back to treating the fetched text as pasted content rather than failing outright
- Given pasted raw text, LLM extraction returns a Recipe-shaped object, and the user sees an editable preview before it is saved
- Ingredient quantity/unit parsing handles common formats (`2 cups flour`, `1/2 tsp salt`, `3 large eggs`) without crashing on unparseable ones — unparseable lines should be flagged, not silently dropped or silently guessed
- Every saved recipe has `sourceType` set correctly

## Edge cases to handle

- URL that is unreachable or times out — surface an error; offer to paste the page text by hand (Phase 1b), do not save
- JSON-LD present but missing required fields (e.g. no ingredients list) — treat as Phase 1 failure, fall back to Phase 1b
- Pasted text with no discernible recipe structure (e.g. a grocery ad) — show extraction failed; do not save; user can edit the draft or cancel
- Duplicate import (same URL, or near-identical pasted text) — warn before save; do not silently merge or overwrite; user may still save a second copy

## Deliverable for this task

- `importFromUrl(url)` → Recipe (or routes to paste fallback)
- `extractFromPastedText(text)` → Recipe (LLM-backed, returns editable draft, not auto-saved)
- Basic tests covering the acceptance criteria, including at least one real recipe site fixture and one paste-fallback fixture

## Notes

Keep the JSON-LD parser and the LLM extraction prompt as separate, swappable functions. Phase 2's generation prompt will likely reuse patterns from the Phase 1b extraction prompt, so keep that logic isolated rather than inlined into the import flow.

A real URL or paste provided at build time becomes the primary fixture; until then tests use a checked-in HTML fixture with Recipe JSON-LD.

LLM model, base URL, API key, timeouts, and token prices come from environment / config — never hardcoded in the importer.
