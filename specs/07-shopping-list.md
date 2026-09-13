# Feature Spec: Shopping list

## Context

The week board already says what the household is eating and who cooks. The next glance is “what do we still need to buy for this week?” That list comes from **pool recipes assigned to the week you are looking at** — not a second inventory to maintain by hand.

Planning stays incremental. Empty meals are normal. Leftovers and free-form have no ingredient list, so they do not invent groceries. One household, no login. Telegram can **push** the list the same way it pushes the week; the website is where you tick things off.

## Goal

1. Open a shopping list for the **same week** as the planner (previous / next week still work).
2. See one merged grocery list from every assigned pool-recipe dish that still has a live recipe.
3. Tick items off on this machine while shopping.
4. Optionally **Push list** to the configured Telegram chat.

## Phases

- **This task:** Build the list from the loaded week’s live pool-recipe dishes. Merge lines that share the same normalized name and unit. Check-off remembered in this browser for that week. A Shopping entry in the nav. Push list to Telegram (same bot, same chat, no page preview).
- **Not this task:** Hand-typed extra groceries as a first-class store. Aisle / store sections. Scaling to servings or eater count. Pantry “we already have.” Leftover and free-form lines. Checking off from Telegram. Multiple households.

## In scope for this task

- Shopping view for the loaded week (`/shopping`, same week query as the board)
- One merged list: each live assigned recipe contributes its ingredients; the same recipe on two meals contributes twice
- Merge when normalized name + unit match; sum quantities only when both sides are plain numbers (including simple fractions already stored as text that parse as a number); otherwise keep separate lines
- Skip leftover dishes, free-form dishes, and dishes whose recipe was deleted
- Check-off in this browser, keyed by week + line identity; refresh keeps ticks
- Nav item **Shopping**; previous / next week
- **Push list** to the configured chat (token/chat id already in env)

## Out of scope for this task

- Adding ad-hoc “milk” that is not on a recipe (later)
- Store layout, categories, or “buy at wet market vs supermarket”
- Scaling quantities by servings, eaters, or “cook once eat twice”
- Pantry stock or “we have this”
- Leftovers / free-form as grocery rows
- Ticking off via Telegram buttons
- Inbound recipes (spec 06)

## Acceptance criteria

- Opening Shopping for this week lists ingredients from every assigned live pool recipe on that week
- The same recipe planned twice lists its ingredients twice (then merge may collapse identical name+unit)
- Leftovers and free-form do not add rows
- A deleted recipe’s leftover calendar title does not add rows
- Checking a line, refreshing, still checked (this browser, this week)
- Previous / next week: list and ticks follow that week
- Empty week (or only leftovers): empty list, not an error — copy says there is nothing to buy from recipes
- **Push list** sends the locked copy to the configured chat; missing token/chat id explains on the page; a send failure does not change ticks
- Week board planning is unchanged

## Edge cases

- No meals: empty shopping list, not an error
- Recipe with no ingredients: contributes nothing
- Ingredient with no quantity/unit: still a line (name only)
- `parseFlagged` ingredients: still a line; do not drop them
- Two recipes both need `flour` / `cups`: one line, quantities summed when both parse as numbers
- Same name, different unit (`flour` cups vs g): two lines
- Same name, one has a unit and one does not: two lines
- Check off, then the plan changes so that line disappears: drop the tick with the line; do not error
- Check off, then quantity changes (plan edited): treat as a new line if identity changes; an exact same identity keeps the tick
- Push on an empty list: send the empty copy (`Nothing to buy this week.`), not a no-op
- Push clicked twice: two messages (same as week Push)

## Deliverable for this task

- Spec file: `specs/07-shopping-list.md`
- Small builder that turns a week’s planned dishes + recipes into merged grocery lines — not hardcoded in the page
- `/shopping` week view, nav entry, previous / next week, check-off in this browser
- Push list via the existing Telegram sender
- Tests: two meals same recipe; leftover/free-form omitted; merge same name+unit; different units stay split; numeric quantity sum; flagged line kept; empty week; deleted recipe omitted

## Notes

- Home stays the week board. Shopping is a sibling page, not a Recap-style strip (the list is long).
- Do not hardcode week bounds, Telegram copy, or merge rules in the page — config / domain helpers.
- Line identity for ticks: week start + normalized name + unit + a stable quantity key, so a harmless re-render does not clear checks.
- Kid/adult does not change the list. Eaters do not scale it. You buy for the recipe as written.
- Locked empty and Telegram copies (placeholders):

```
Shopping · 16–22 Mar

• 2 cups flour
• 1 tbsp olive oil
• salt
```

```
Shopping · 16–22 Mar

Nothing to buy this week.
```
