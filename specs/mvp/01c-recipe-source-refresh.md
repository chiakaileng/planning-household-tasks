# Feature Spec: Recipe source refresh

## Context

Older recipes were saved before nutrition fields existed. The original URL or pasted text is still on the recipe. You should be able to pull that source again so calories, protein, fat, carbohydrates, and fibre (and servings) can be filled or updated.

## Goal

A **Refresh from source** control on each recipe card re-runs the same ingest path (JSON-LD, then paste/LLM fallback) and merges stated values into the saved recipe.

## Phases

- **This task:** refresh from `sourceUrl` or `sourceText`, merge, persist, show on the card.
- **Not this task:** scraping sites we do not already support; rewriting household notes/tags/emojis; a bulk “refresh all” job.

## In scope

- Refresh button on the recipe card (review/edit card, pool row, week tile, recipe page)
- Prefer URL re-fetch; if there is no URL, re-extract the stored paste
- Merge incoming nutrition and servings when the source states them
- Keep title, ingredients, steps, notes, tags, emojis, and source identity
- Surface fetch/extract errors; do not wipe the saved recipe on failure

## Out of scope

- Inventing nutrition when the source still has none
- Overwriting a field with null because the source omitted it
- Changing how first-time import works

## Acceptance criteria

- Given a saved recipe with a URL and empty calories, refresh stores calories when the page states them
- Given a saved recipe with notes and tags, refresh leaves those unchanged
- Given a source that still has no protein, protein stays as it was
- Given no URL and no original text, the refresh control is hidden
- Given a fetch or extract failure, the saved recipe is unchanged and an error is shown

## Edge cases

- URL recipes that fall back to page-text LLM extract still refresh
- Paste-only recipes refresh from `sourceText` (needs `GEMINI_API_KEY`)
- Stated `0g` fibre is a real value and may replace an empty field
- Refresh is not a duplicate-import warning

## Deliverable

- `RecipeSourceRefresher` + `RecipeRefreshMerger`
- `POST /api/recipes/[id]/refresh`
- Refresh control on recipe cards
- Tests for merge rules and refresh orchestration
