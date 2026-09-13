# Feature Spec: Delete a recipe or change its source

## Context

Recipes stay in the pool forever once saved. A bad import, a moved URL, or a recipe you no longer cook needs a way out — or a new source so refresh can pull again.

## Goal

Let you **delete** a recipe from the pool, and **change** its source URL or original paste, without losing meal history names.

## Phases

- **This task:** delete with confirm; edit source on the recipe card and recipe page; persist source on save.
- **Not this task:** undo delete; merging two recipes; changing meals that already used the recipe.

## In scope

- Delete from the recipe card, pool, week tile overlay, and recipe page (confirm first)
- Planned dishes keep their title snapshot; the recipe link is cleared
- Edit `sourceUrl` and `sourceText`; `sourceType` follows URL vs paste
- Do not save a source that is already used by a different recipe

## Out of scope

- Soft delete / trash
- Recreating the recipe from a meal snapshot
- Bulk delete

## Acceptance criteria

- Given a saved recipe, Delete removes it from the pool after confirm
- Given a dish that used that recipe, the week still shows the dish name
- Given a new URL on the card, Save stores it and Refresh uses that URL
- Given a source already used by another recipe, Save is refused and the existing title is shown

## Edge cases

- Cancel on confirm: nothing is deleted
- Empty URL and empty paste: recipe stays, refresh is unavailable
- Delete on the recipe page: return to the pool

## Deliverable

- `RecipeRepository.remove` and source fields on `update`
- `DELETE /api/recipes/[id]`
- Source fields + Delete on recipe cards
- Tests for delete and source update
