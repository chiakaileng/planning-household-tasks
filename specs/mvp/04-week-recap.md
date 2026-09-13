# Feature Spec: Week recap (who eats what)

## Context

Planning is incremental; empty meals are normal. You already assign dishes with eaters and a cook on the week calendar. A parent should be able to look at this week and answer “who is eating what so far?” without hovering, then open a pool recipe to cook. Leftovers and free-form stay visible as food, not as recipes. Same household, no login; Telegram is still later.

The calendar stays meal-first. A **member recap** sits **right under it**. That recap is a watch list of existing household members — not a Recap tab, not people-as-rows instead of the calendar, and not a per-person “my week” after login.

## Goal

On the week board, each dish shows **who eats it first**, then who cooks. A pool-recipe dish opens the **recipe card** so you can cook; leftovers and free-form stay labels, not recipes. Edit/remove stay on the calendar pills so planning does not move off this board.

Under the calendar, pick who appears in the recap from **existing** members. Add/remove only changes the watch list, not the household. **Nobody selected is fine** — then you only see the calendar. For each watched member, show what they are **eating** and **cooking** this week. Empty meals stay empty. Previous / next week still work.

## Phases

- **This task:** Same week calendar, dishes show eaters then cook. Recap strip under the calendar: pick members to watch, see what each is eating and cooking this week, open a pool recipe to cook. Watch list remembered in this browser.
- **Not this task:** Telegram, shopping list, a Recap tab, people-as-rows instead of the calendar, adding/deleting household members from this strip, per-person “my week” after login, saving the watch list in the database.

Later MVP order after this: **MVP-5** Telegram bot in the family group.

## In scope for this task

- Week calendar dishes show **eaters first**, then cook
- Recap strip **under the calendar**: pick who appears from existing members; empty is fine
- For each watched member: what they **eat** and **cook** this week
- Open a **pool recipe** from the recap (or a recipe dish) to cook
- Previous / next week; empty meals stay empty
- Watch list remembered in this browser

## Out of scope for this task

- Telegram, shopping list, login
- Recap tab or replacing the calendar with people-as-rows
- Add/delete household members from the recap
- Saving the watch list in the database
- Editing dishes from the recap (edit stays on the calendar pills)

## Acceptance criteria

- Each dish on the calendar shows eaters first, then cook (no hover required)
- Under the calendar I can add a household member to the recap, and remove them; with no one added the recap is empty, not an error
- A watched member’s recap lists what they eat and what they cook this week; days they are not on stay omitted or clearly empty
- Clicking a pool-recipe dish (calendar or recap) opens the recipe card to cook
- Leftovers and free-form show as food, not as a recipe
- After a refresh, the same people are still in the recap (this browser)
- Previous / next week: recap follows that week’s meals; empty weeks are empty, not errors

## Edge cases

- No meals assigned the whole week: calendar is empty cells, not an error. Recap still shows whoever you picked, each with nothing to eat or cook. No one picked → the strip is empty.
- No household members yet: recap stays empty; no add list (same prompt as planning: add people first)
- Member deleted after they were on the watch list: drop them from the recap; dishes still show the name snapshot
- Same person eats and cooks the same dish: show once, both roles
- Same person on two dishes in one meal: list both
- Recipe deleted from the pool: recap keeps the title; do not open a recipe card
- Watch list has people but this week has no dishes for them: show the people, no meals — not an error
- Two members watched: each only sees their own eat/cook dishes

## Deliverable for this task

- Spec file: `specs/mvp/04-week-recap.md`
- Calendar dish pills show eaters then cook
- Recap under the calendar: watch-list picker, per-member eat/cook for the loaded week
- Click a live pool recipe → existing recipe card overlay (cook); leftovers/free-form/missing recipe do not open a card
- Browser-local watch list (not Prisma)
- Small helper that builds a member’s week recap from planned meals — not hardcoded in the page
- Tests: recap grouping (eat, cook, both roles, empty week), watch list drops deleted members, missing recipe does not open

## Notes

- Home stays the week board. Recap is a strip on that page, not a new sidebar item.
- Recap day columns share the calendar’s width and grid so member meals line up with Mon–Sun.
- Eating and cooking are separate recap rows and filters. Neither filter on is fine.
- One household, no auth. The watch list is “who I want to glance at on this machine,” not household membership.
- Kid/adult is still just a label — it does not change the recap.
- Click-to-cook uses the recipe overlay already on the week board. Calendar pills still edit the dish (eaters/cook/content). Recap rows do not edit.
- Telegram stays MVP-5; the recap is the on-site glance that later morning messages can mirror.
