# Feature Spec: Household members

## Context

The planner is one household, no login. Recipes are already in a shared pool. A later week plan will put dishes on breakfast/lunch/dinner, and each dish needs **who eats it** (one or more people) and **who cooks it** (one person, can differ from the eaters). Those people have to exist first. Members can be labeled **kid** or **adult**. Each member has a **profile avatar**. The site already has a Members item in the sidebar, marked “soon.” This feature is only the member list — not assigning dishes or the week board.

## Goal

Let you add, edit, and remove household members on a Members page. Each person has a **name**, **kid / adult**, and an **avatar**. Avatars for this task are **initials in a colored circle** and/or a pick from a **small built-in set** (emoji / illustrated faces). No photo upload or name-generated art. The sidebar Members item opens this page. Saved members stay so later features can pick eaters and cooks. **Remove** deletes the person from the list (add them again if needed).

## Phases

- **This task:** Members page — add / edit / remove; name + kid/adult; avatar defaults to initials; optional pick from a small built-in set; switch back to initials. Sidebar “Members” goes to this page (no more “soon”).
- **Not this task:** Photo upload, auto-generated avatars, assigning eaters/cooks on the week, week board, Telegram bot or any login, multiple households.

Later MVP order (not this task): **MVP-3** assign dishes onto a week → **MVP-4** week board → **MVP-5** Telegram bot in the family group. Website stays one household with no login; Telegram is a group bot, not a sign-in.

## In scope for this task

- Members page from the sidebar
- Add / edit / remove a member
- Name
- Kid / adult label
- Avatar: initials (colored circle) by default; optional pick from a small built-in set; can switch back to initials
- Persist members so later assignment can use them

## Out of scope for this task

- Photo upload / auto-generated avatars
- Assigning dishes, eaters, cooks, week board
- Telegram bot or any login
- Multiple households, guests as a separate type (a guest can just be another member if you add them)

## Acceptance criteria

- Sidebar **Members** opens the Members page (no “soon”)
- I can add a member with a name and kid/adult; they appear on the list after save
- A new member’s avatar is **initials** in a colored circle (from the name)
- I can change the avatar to one from the **built-in set**, and switch back to initials
- I can edit name, kid/adult, and avatar; the list shows the new values
- I can remove a member; they no longer appear on the list
- After a refresh, members are still there
- Name is required; kid/adult is required

## Edge cases

- Empty or whitespace-only name: do not save; show a short error
- Duplicate name (same letters after trim, ignore case — `Kai` and `kai`): warn; allow save anyway if you confirm (two people can share a name)
- Remove: ask to confirm; no undo after confirm (add them again if needed)
- Initials: use the first letter of each word (`Kai Leng` → `KL`); one word → first two letters (`Kai` → `KA`); empty after trim already blocked
- Switching avatar set → initials (or the other way) does not change name or kid/adult
- Built-in avatar pick is cleared if that option is later removed from the set: fall back to initials
- Zero members: empty state on the page (“Add someone”) — not an error
- Later assignment (not this task) will need to handle a removed member who was already on a dish — we only note it; no week data exists yet

## Deliverable for this task

- Spec file: `specs/mvp/02-household-members.md`
- `Member` persisted (name, kid/adult, avatar mode + built-in key)
- Small `Avatar` helper (initials + built-in key) so the page and later week board share one rule
- Members page: list, add, edit, remove, avatar initials + built-in picker
- Sidebar **Members** links to that page
- Tests for save/list/edit/remove, initials, name trim, empty name rejected

## Notes

- One household, no auth — members are just rows, not user accounts.
- Kid/adult is a stored label, not permissions.
- Do not hardcode the built-in avatar list or colors in page/business logic — keep them in `src/config` (or env) so the set can change without rewriting the Members flow.
- Default avatar is initials; a built-in pick is optional.
- Remove is hard delete for now. When assignment exists, we’ll decide whether a cook/eater who was deleted stays as a name snapshot or blocks delete.
- Telegram and week assignment stay later features.
