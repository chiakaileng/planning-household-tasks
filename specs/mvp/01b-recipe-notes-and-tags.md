# Feature Spec: Recipe notes and tags

## Context

Feeds the same Recipe used by ingest (`01-recipe-ingestion.md`) and later the weekly meal plan. After a draft is extracted, you want household context that the source page does not have: a reminder note, and labels you invent (`child`, `family`, `parents`, `spicy`, …).

## Goal

Let you optionally add **one notes box** and **any tags** after extract, keep them on the saved recipe, change them later, and filter the pool by tag.

## Phases

- **This task:** notes + free-text tags on draft → save → show → edit → filter.
- **Not this task:** Gemini suggesting tags; a fixed child/family/parents enum; using tags to hide dishes on the week board.

## In scope for this task

- Optional notes textarea on the review-before-save form
- Optional tags: type, add, remove; several per recipe
- Persist notes and tags on save
- Show notes and tags on the saved list and the recipe page
- Edit notes and tags on the saved recipe page
- Filter the saved list by tag (click a tag or type one)
- Normalize tags: trim + lowercase so `Child` and `child` are the same

## Out of scope for this task

- Extract/LLM filling notes or tags
- Required tags
- Dated comment threads
- Week-plan or Telegram using tags
- Members (MVP-2)

## Acceptance criteria

- Given a fresh extract, notes and tags start empty; save still works
- Given notes and tags on review, save stores them; the recipe page and list show them
- Given `Child` and `child`, they become one tag `child`
- Given a list with mixed tags, filtering by `child` shows only those recipes
- Given a saved recipe, I can change notes/tags without re-extracting
- Existing rows get `notes = null` and no tags

## Edge cases

- Empty tag / whitespace-only: ignore, do not save
- Duplicate tag on the same recipe after normalize: keep one
- Filter with no matches: empty list, not an error
- Filter cleared: show all recipes

## Deliverable for this task

- `RecipeDraft.notes` + `RecipeDraft.tags` (normalized string list)
- Prisma: `notes` on `Recipe`; `Tag` + `RecipeTag` (unique normalized `Tag.name`)
- Review UI, list + filter, recipe page edit
- Tests: normalize, persist, filter, extract leaving notes/tags empty

## Notes

Keep a small `TagNormalizer` (trim + lowercase) so ingest, save, and filter share one rule. Do not hardcode `child` / `family` / `parents` in code; those are examples you type.
