# Feature Spec: Week meal planning

## Context

Planning is incremental, not a Sunday batch: assign a few meals when you know them; empty slots are normal. A week has breakfast, lunch, and dinner each day. A slot is a **meal you are prepping**, not a recipe on a calendar. A meal can have several dishes. Each dish has **one or more eaters** and **one cook** (the cook does not have to be eating it). Dish content can be a **recipe from the pool**, **leftovers of a meal from the last 7 days**, **leftovers as free text**, or **free-form** (takeaway, freezer, anything not in the pool). You can optionally add **extra meals** for this week, place them in sequence between the usual meals, and mark them to **recur** on later weeks. The website is where you plan; Telegram comes later.

## Goal

Let you prep meals for a week in two places:

1. **Recipe page** — take this pool item and use it as content on a meal (day + slot, eaters, cook).
2. **Week / planning tab** — a board of **meals**. Search the pool (name, notes, tags, and text in the recipe), filter, then drag onto a meal or pick the meal. Add leftover and free-form dishes the same way.

A recipe is optional content, not the thing being planned. Extra meals are for that week, with an option to recur. Empty meals stay empty.

## Phases

- **This task, slice 1:** Meal board (days × breakfast/lunch/dinner). Add / edit / remove dishes on a meal; eaters + cook. First content type wired: recipe (search / filter / drag, or from the recipe page). The UI is “add to this meal,” not “schedule a recipe.”
- **This task, slice 2:** Other content: leftovers of the last 7 days, leftover free text, free-form.
- **This task, slice 3:** Extra meals for this week, ordered between the usual ones, optional recur.

- **Not this task:** Photo upload or auto-generated avatars (already shipped). Photo of leftovers. Auto-generating meals. Telegram, shopping list, login, multiple households. A separate “who eats what” recap board (MVP-4).

Later MVP order after this: **MVP-4** week recap (who eats what) → **MVP-5** Telegram bot in the family group.

## In scope for this task

- Week / planning tab: a week of **meals** (breakfast, lunch, dinner). Empty meals are fine
- A meal can have several dishes; each dish has **eaters** and **one cook**
- Dish content: **recipe** (pool), **leftovers of a dish on a planned meal**, **leftover free text**, **free-form** (takeaway, freezer, …)
- From a **recipe page**: assign that recipe as content on a meal (day + slot on this week or next week, eaters, cook)
- On the week tab: **search / filter** the pool (name, notes, tags, recipe text) and **drag** onto a meal or pick the meal
- Extra meals **for this week**, ordered between the usual ones, with an **option to recur**
- Edit or remove a dish; change eaters/cook/content, including moving it to another day or meal on **this week or next week**

## Out of scope for this task

- Telegram, login, shopping list
- Photo of leftovers or freezer
- Auto-generating meals / recipes
- A separate “who eats what” recap board (MVP-4)
- Multiple households

## Acceptance criteria

- Sidebar **Week** opens the planning tab (no “soon”)
- I see a week of meals (breakfast / lunch / dinner each day); empty meals show as empty, not errors
- I can add a dish to a meal with eaters (one or more members) and one cook
- I can add a dish whose content is a **pool recipe**, **leftovers of a meal from the last 7 days**, **leftover free text**, or **free-form** text
- From a recipe page I can assign that recipe onto a day + meal on this week or next week, with eaters and cook; it appears on the week
- On the week tab I can find a recipe by name, notes, tag, or text in the recipe, then drag it onto a meal or pick the meal
- I can add an extra meal on this week, place it between existing meals, and optionally mark it to recur
- I can edit or remove a dish; the week updates
- I can edit a dish and move it to another day or meal, including next week; if it lands on next week the board follows that week
- After a refresh, the week’s meals and dishes are still there
- A meal with several dishes shows all of them

## Edge cases

- No members yet: I can still add a dish, but eaters and cook cannot be saved until at least one member exists — show a short prompt to add people first
- Cook is not in the eaters list: allowed
- Recipe deleted from the pool after it was used on a meal: keep the dish; show the title we stored, mark that the pool recipe is gone
- Leftovers-of-a-meal: pick a **day + meal** that already has dishes (lookback from today through the **end of next week**), then pick **which dish** on that meal (e.g. Wednesday dinner shows soya sauce chicken and dump-and-bake wings). The leftover title is that dish. Older meals do not appear. If that source dish or meal is later removed, keep the leftover dish and its title; it becomes ordinary leftover text
- Leftover free text or free-form with empty/whitespace: do not save
- Search with no matches: empty list, not an error
- Drag a recipe onto a meal that already has dishes: add another dish, do not replace
- Extra meal with no name: do not save
- Recurring extra meal: new weeks get that extra slot; this week’s dishes do not copy forward
- Two extra meals in the same gap (e.g. two snacks after lunch): both allowed; order is the sequence I set
- Week boundaries: leftover lookback can include meals from the previous week; leftover sources also include planned meals through next week
- Same recipe on two meals: allowed (e.g. cook once, leftovers later)
- Moving a dish to next week relocates that dish; it does not copy it, and the library recipe stays one recipe

## Deliverable for this task

- Spec file: `specs/mvp/03-week-meal-planning.md`
- Persist a **week of meals**, **dishes** on those meals (content type + eaters + cook), and **extra meals** (order + optional recur)
- Week / planning tab: meal board, search / filter / drag, add leftover and free-form dishes
- Recipe page: assign this recipe onto a meal
- Sidebar **Week** links to that tab
- Small helpers so content types and leftover windows are not hardcoded in the page (e.g. leftover lookback days in `src/config`)
- Tests: save/list a week, add each content type, search, leftover 7-day window, extra meal recur flag, empty meal allowed

## Notes

- The week tab is **meals you are prepping**. A recipe is optional content, not the thing being planned.
- One household, no auth. Members and the recipe pool already exist; this feature only points at them.
- Kid/adult is still just a label — it does not restrict who can cook or eat.
- Leftover lookback (7 days), slot names, default meal order, week start, and timezone live in `src/config` / env — not hardcoded in page or repository logic.
- Recur copies the **extra meal slot** to later weeks, not the dishes on it.
- Dishes store a title snapshot plus eater/cook name snapshots so a later member or recipe delete does not blank the week. Member delete stays hard-delete (MVP-2); the dish keeps the names.
- Telegram, shopping list, and the eaters-first recap board stay later.
