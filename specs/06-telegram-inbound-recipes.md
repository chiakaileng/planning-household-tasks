# Feature Spec: Telegram inbound recipes

## Context

The website is still where you plan and edit in full (leftovers, extras, later tweaks). Telegram is the household chat. Someone should **opt in** with a slash command when a link or a dish belongs in the planner — not every URL in the group.

One bot, one configured chat. Token and chat id stay in env. The bot still announces the week; this task adds **commands**. The app is local SQLite. Same constraint as Sunday/night announces: it only hears messages while the Next process is running.

Website ingest stays confirm-then-save. Chat `/add` is drop-in for the pool. Putting something **on a meal** is a short interview: the bot asks each missing piece. It does **not** write the week dish until that interview finishes or the person taps Skip on an optional step. If they stop in the middle, the bot says it was **not saved** on a meal — never a silent no-op.

`/plan` is a **picker**: tap a saved recipe, search, or skip the pool and type **free-form** food (takeaway, freezer, “Ada’s pasta” — the same free-form dishes as the week board). A free-form line does **not** enter the recipe pool. The next ordinary group message is never treated as a search or a title.

## Goal

1. `/add <url>` imports a recipe into the pool (or finds the duplicate).
2. To put food on a meal, the bot walks **what → when → who eats → who cooks**, asking for whatever the command left out.
3. `/plan` shows saved recipes to tap, plus **Something else** for free-form. `/plan tomato` filters that list.
4. `/free <text>` starts free-form (never the pool) and continues the same interview.
5. `/cook` lists ingredients and steps **when asked** — never on the Sunday/night announce.
6. Ordinary chat and unknown commands are ignored — no replies, no LLM calls.

## What must be known to save a meal

A week dish is written only when **what** and **when** are both known.

| Piece | Required to save on a meal? | How the bot gets it |
| --- | --- | --- |
| What (pool recipe or free-form text) | Yes | Command, picker, or “What is it?” prompt |
| Title (free-form only) | Yes | “What should we call it?” — do not invent one from the paste |
| Recipe library (free-form only) | No | “Save this to the recipe library?” Yes / No. Default is meal-only. |
| When (day + meal) | Yes | `<when>` on the command, or day then meal buttons |
| Who eats | No | Member buttons, **Done**, **Everyone**, or **Skip** |
| Who cooks | No | Member buttons or **Skip** |

Pool-only `/add <url>` (no plan to assign) saves the recipe and stops. That is not a meal. If they started an assign, the recipe may already be in the pool; the meal is still unsaved until the interview ends.

**Cancel** on any assign prompt: `Not saved on a meal.` A new `/add`, `/plan`, `/free`, `/cook`, or `/help` from that person cancels their open interview the same way.

## Command syntax

Commands start the message. Telegram’s `/add@BotName` form is the same command.

**Days** (this week = the week on the home board, timezone and week-start from env):

- `mon` `tue` `wed` `thu` `fri` `sat` `sun` (also `monday` … `sunday`)
- `today` `tomorrow` (real calendar dates; tomorrow may be next week)
- `next mon` … `next sun` = that weekday on the **following** week

**Meals:** `breakfast` `lunch` `dinner` (also `b` `l` `d`). Extra slots stay on the website.

**When** is one or more `days + meal` groups. Several days may share one meal:

```
fri dinner
fri sat dinner
fri dinner sat lunch
next tue dinner
today lunch tomorrow dinner
```

Do not parse eaters or cook from the slash line. Always ask with buttons (or Skip).

### `/add` — URL into the pool, then maybe a meal

```
/add
/add <url>
/add <url> <when>
```

- `/add` with no URL: ask for the URL. In a group, reply to that prompt; in a private 1:1, the next line is enough. Empty reply → `Not saved.`
- URL imported first (same pipeline as the site). Then if there is no `<when>`, ask **Put it on a meal?** (Yes / No). No → stop after the pool reply. Yes → continue the interview (day, meal, eaters, cook).
- `<when>` present and valid: after import, continue with eaters then cook, then write the week dish.
- `<when>` present but invalid: import the URL; say the when was not understood; **do not** write a meal; offer day/meal buttons so they can still finish, or Cancel.

### `/plan` — pick or search the pool, or skip it

```
/plan
/plan <search>
/plan <search> <when>
```

- `/plan` — paginated buttons of the whole pool (title order), always with **Something else** (free-form). An empty pool still shows that button.
- `/plan <search>` — same buttons, filtered with the week-board search (title, notes, tags, ingredients, steps), plus **Something else**. If nothing matches, still offer **Add “{search}” as free-form**.
- `/plan <search> <when>` — if exactly one match, that is **what**; continue the interview from the next missing piece (usually eaters). If several, show those buttons; a tap sets what. If none, offer free-form with that search text.

`<search>` is the text after the command and before the first day word. A Search button on the picker opens Telegram inline search **in this chat** (`@Bot …`) so someone can type without the next group message becoming a query.

**Something else** asks **that person** what the dish is. In a **group**, only a reply to that prompt counts — not the next loose line. In a **private 1:1**, the next ordinary message is the answer (Telegram force-reply often does not attach there).

After what is known, if when is missing: this week’s days as buttons, then `breakfast` / `lunch` / `dinner`. `Next week` on the day row uses the following week’s days. Then eaters, then cook, then save.

Page size for the recipe list lives in env.

### `/free` — free-form only (never the pool)

```
/free
/free <text>
/free <text> <when>
```

Same dish as the week board’s free-form (never the recipe library). Missing text → “What is it?” (group: reply to the prompt; private 1:1: the next line). A second `/free` while that prompt is open is the paste, not a cancel. A long follow-up in a 1:1 is appended (Telegram splits long pastes). Then always ask **What should we call it?** — do not use the paste as the title. Then **Save this to the recipe library?** Yes writes a pasted recipe (title + body, no LLM) and the week dish is that recipe. No keeps a meal-only free-form dish. Missing when → day then meal. Then eaters, then cook, then save.

### `/cook` — ingredients and steps (only if asked)

Weekly and night-before announces stay title + cook. Method is opt-in.

```
/cook
/cook <search>
/cook <when>
```

- `/cook` — same pool picker as `/plan` (no Something else). Tap a recipe → send its ingredients and steps.
- `/cook <search>` — filter that picker. One clear hit → send the method now. Several → buttons. None → `Nothing in the pool matches “{search}”.`
- `/cook today`, `/cook tomorrow`, or `/cook fri dinner` — planned **pool-recipe** dishes on that when. One → send it. Several → pick which. None, or only free-form/leftovers → say there is no recipe method for that meal.

After a meal is saved from a **pool recipe**, the finish reply includes a **How to cook** button. Tapping it sends the same method. Free-form saves do not get that button.

A link stub (saved with no ingredients/steps) gets the title (and URL if any) and `No ingredients or steps saved.` Do not invent a method.

Long methods: split into follow-up messages so each stays under the Telegram length cap from config. Do not truncate silently.

`/cook` does not assign a meal and does not change the pool.

### `/unplan` — take a dish off a meal

```
/unplan
/unplan <when>
```

- `/unplan` — day, then meal, then pick which dish to remove.
- `/unplan fri dinner` — dishes on that when as buttons.
- After a successful assign, the finish message has **Remove** (one per slot if several days).
- Remove deletes that week dish only. A recipe that was saved to the library stays in the library.

### `/help`

Replies with the short usage below. Cancels that person’s open interview (`Not saved on a meal.` if one was in progress).

## Assign interview (one person, one draft)

Only **taps** and **replies to the current prompt** from the person who started the command move the draft. Other group chat is ignored.

Order of questions (skip any already answered):

1. What
2. Title (free-form only) — “What should we call it?”
3. Recipe library (free-form only) — Yes / No. No does not add to the library.
4. When (day, then meal — or accept a parsed `<when>`)
5. Who eats — household members as buttons, **Done** (current ticks), **Everyone**, **Skip**, **Cancel**. Tapping a name only updates that message (does not send a new copy). After they name it, later questions may use that short title. A pool recipe may show its title. Do not quote a paste.
6. Who cooks — household members as buttons, **Skip**, **Cancel** (a cook who is not an eater is allowed)

No household members: skip eaters and cook, save the meal, say there are no members yet.

Save once at the end. Same write path as the website (eaters and cook may be empty). Existing dishes on that meal stay.

## Phases

- **This task:** Long-poll `getUpdates` (messages, callback taps, inline search, replies to the current prompt). Only the configured chat. Parse `/add`, `/plan`, `/free`, `/cook`, `/help`. Picker + search + free-form + assign interview + on-demand method as above. Reuse `RecipeImporter` + `RecipeSearch` + existing meal-plan write (recipe dish or free-form dish; add, do not replace). Reply with locked copy. Offset stored so a restart does not replay commands. Register the five commands on the bot so the slash menu shows them.
- **Not this task:** Webhooks or a public host. Bare URLs without a command. LLM extract of a chat paste (library Yes saves title + paste as-is). Photos. DMs from other chats. Parsing eaters/cook from the slash line. Leftovers (of a past meal, or leftover free text). Extra meals. Putting ingredients or steps on the Sunday/night announce. Treating the next plain group message as a search or a title. Shopping list (spec 07). Auto-adding every `/free` to the library.

## In scope for this task

- Poll updates while the app process is running (long-poll timeout and a short idle between fast ticks in env — not the Sunday/night announce interval)
- Ignore every chat that is not `TELEGRAM_CHAT_ID`
- `/add`, `/plan`, `/free`, `/cook`, `/help` as specified
- `/plan` picker: list, search filter, Next/Prev, Search (inline in this chat), **Something else**, then the assign interview
- Free-form dishes through `/free`, Something else, or “add this search as free-form”
- Ask each missing piece; Cancel / abandoned required step → say not saved on a meal
- Same importer as the website; save on success; duplicate = do not save a second copy; parse fail = save-as-link
- Assign adds a dish on that day+slot; existing dishes stay
- Persist the Telegram update offset; skip backlog on first run
- Ignore the bot’s own messages
- `/cook` (and **How to cook** after a pool-recipe assign): ingredients + steps from the saved recipe, not from the announce builder
- `setMyCommands` (or equivalent) so Telegram lists `/add` `/plan` `/free` `/cook` `/help`
- Inline mode for the Search button (same pool search)

## Out of scope for this task

- Webhook mode or moving off local SQLite
- Treating a bare URL or a paste as an add
- Images, forwards-as-photos
- Eaters/cook words on the slash line (buttons only)
- Leftovers, extra meal names
- Saving free-form into the recipe pool
- A “dinner only” shelf (the pool is one list)
- Confirm-on-the-website before save
- The next ordinary message in the group as a search or a title (only a **reply** to the current prompt counts)
- Messages from other chats
- Shopping list (spec 07)

## Acceptance criteria

- `/add <url>` in the configured chat becomes a pool recipe (or a link stub) without opening the website
- `/add <url>` then Yes on “Put it on a meal?” walks day → meal → eaters → cook, then writes the week dish
- `/add <url> fri dinner` imports, then asks who eats and who cooks, then puts it on Friday dinner
- `/plan` shows tappable pool recipes and **Something else**; Next/Prev when the pool is longer than the page size
- `/plan tomato` shows tappable matches and **Something else**; typing `/plan tomato` is how you search (not the next chat line)
- Search on the picker lets someone type in the compose box (`@Bot tomato`) and pick a result in this chat
- Tapping a recipe starts the interview from the next missing piece (day if needed, then meal, eaters, cook)
- Skipping the list (Something else or `/free`) uses a free-form dish; it does not appear in the recipe pool
- `/free takeaway noodles fri dinner` asks what to call it, then who eats; tap names then **Done**, or Everyone / Skip, then who cooks, then saves. The meal title is what they typed, not the paste.
- `/plan tomato soup fri dinner` with one match continues at eaters (does not import)
- The week dish is not written until what + when are known and the people steps are answered or skipped
- Cancel, `/help`, or a new command mid-interview: `Not saved on a meal.` (pool import already done stays in the pool)
- Skip on eaters and cook: meal **is** saved; the reply says there are no eaters or cook yet
- The bot replies with added / already in the pool / saved as a link, plus which meals were assigned once the interview finishes
- The same URL a second time does not create a second recipe; `/add` may still assign
- Chat that is not a command, a picker tap, an inline search from this chat, or a reply to the current prompt: silence
- Another chat (including a stranger DMing the bot): silence, nothing saved
- Token or chat id missing: poller does nothing; site ingest unchanged
- App not running: commands wait in Telegram; the next poll after start runs them once
- `/cook tomato soup` (one match) sends that recipe’s ingredients and numbered steps
- `/cook` shows a picker; a tap sends the method
- `/cook tomorrow` sends or offers the pool recipes planned tomorrow
- How to cook after assigning a pool recipe sends the same method; free-form does not
- A link stub or a recipe with no ingredients and no steps says so; it does not invent a method
- Sunday/night announces still have no ingredients or steps
- Website add-recipe and week board stay as they are (free-form can save with eaters and no cook)

## Edge cases

- `/add` or `/free` with no args: ask the next required question (URL / what is it), do not fail silently
- Empty reply to a required prompt, or whitespace free-form: `Not saved.` (same as the week board for empty text)
- `/add` with a when that does not parse: import the URL; say so; ask day/meal or Cancel — do not guess a slot
- `/plan` with an empty pool: still offer Something else (and `/add` in the copy) — not an error
- `/plan` search matches nothing: offer **Add “{search}” as free-form**; do not invent a pool recipe
- `/plan soup fri dinner` and several matches: show those buttons plus Something else; do not write the meal until a tap and the people steps
- Someone else’s message, or a message that is not a reply to the current prompt: ignore; draft stays open
- Restart / process death mid-interview: draft is gone; they must start again. Do not write a half meal. (No need to resurrect the draft.)
- `fri` on a Saturday: this week’s Friday (may be yesterday). Use `next fri` or the Next week day row
- Two `/add`s of the same URL onto the same meal: two dishes (same as dragging twice on the board)
- Two free-form dishes with the same label on one meal: allowed
- Fetch fail / no JSON-LD / no Gemini key: same as the site — save-as-link when that is what the site would do; meal interview can still use that link stub
- Stale picker tap (recipe deleted): reply that it is gone; `Not saved on a meal.`
- No household members: skip eaters/cook; save if what + when are known; say there are no members yet
- Edited message: ignore edits
- Bot’s own announce or command reply: ignore
- Callback from another chat: ignore
- Poller crash / Telegram down: next tick retries; do not advance the offset unless getUpdates succeeded
- Hot reload: one poller
- First enable: skip backlog (do not run a year of old `/add`s)
- Extra meal names in `<when>`: not a valid when — ask day/meal or Cancel, do not guess
- `/cook` on free-form or leftovers: no method — say that meal has no recipe
- `/cook` search matches several: picker, do not dump every method
- Method longer than the Telegram cap: two (or more) messages, ingredients first if they fit, then steps — never a silent cut-off
- Deleted recipe after `/cook` tap: `That recipe is gone.`

## Deliverable for this task

- Spec file: `specs/06-telegram-inbound-recipes.md`
- Update poller behind an interface; token, chat id, poll interval, page size, timeouts from `src/config` / env
- Command parser (slash + when grammar) as its own small class
- Assign draft (what / when / eaters / cook) per chat+user; only taps and prompt replies advance it
- Picker: recipe pages, search, Something else, day, meal, members — callback data stays short
- Handler: import / search / assign recipe or free-form / reply through existing sender and meal-plan write
- Offset store; skip backlog on first run
- Start the poller next to the announce scheduler
- Method builder (ingredients + steps) as its own small class — not hardcoded in the poller; announce messages stay title + cook
- Tests: chatter ignored; configured chat only; `/add` pool-only; `/add` with when asks eaters before writing the meal; Cancel does not write a meal; Skip eaters/cook still writes; `fri sat dinner`; `next tue`; `/plan` list; `/plan` search; several hits stay on the picker; Something else / `/free`; empty free-form not saved; no-match search offers free-form; `/cook` one hit; `/cook` empty method; `/cook` when with only free-form; stale recipe tap; first run skips backlog; bot messages ignored

## Notes

- Never commit `.env`. Example keys only in `.env.example`.
- Do not hardcode Telegram hosts, intervals, page size, interview label length, or the chat id.
- Reuse `RecipeImporter` / `RecipeSearch` / `RecipeLinkDraft` / duplicate checks / meal-plan repository / existing free-form dish write — do not fork a second ingest or assign path. Method text is built from the saved recipe, same fields as the cook card.
- Website stays confirm-then-save. Chat `/add` is drop-in because the person typed a command on purpose.
- Days without a meal, or a meal without a day, are not a save — ask the next question. Do not default to dinner.
- Telegram has no search box on a bot message. Search is `/plan <text>` or the Search button (inline). Free-form text is `/free …` or a **reply** to the current prompt. Do not listen for the next plain line in the group.
- Locked `/help` / usage. Headings are normal text. Command lines are Telegram `<code>` (monospace on a muted background — Telegram has no grey text color):

```
Add recipes to your recipe library
/add
/add <recipe url>
/add <recipe url> fri dinner

Put a recipe from your library on a meal
/plan
/plan tomato
/plan tomato soup fri dinner

Put food that is not a recipe on a meal
/free takeaway noodles
/free takeaway noodles fri dinner

Show ingredients and steps
/cook
/cook tomato soup
/cook tomorrow

Days: mon–sun, today, tomorrow, next fri
Meals: breakfast, lunch, dinner (or b, l, d)
The bot asks who eats and who cooks. Cancel if you stop.
```

- Locked interview copy:

```
Pick a recipe, or something else
```

```
Matches for “soup”
```

```
Tomato soup — which day?
```

```
Tomato soup · Fri — which meal?
```

```
Tomato soup · Fri dinner — who eats?
```

```
Tomato soup · Fri dinner — who cooks?
```

```
Put Tomato soup on a meal?
```

```
Send the recipe URL. Reply to this message.
```

```
What is it? Reply to this message.
```

```
What should we call it? Reply to this message.
```

```
Save this to the recipe library?
```

```
Which dish to remove?
```

```
Removed · Friday pizza · Fri dinner
```

```
Nothing in the pool yet. /add a URL, or something else.
```

```
Nothing in the pool matches “takeaway noodles”.
```

```
Not saved on a meal.
```

```
Not saved.
```

- Locked replies after a finished save:

```
Added to the pool · Tomato soup
```

```
Already in the pool · Tomato soup
```

```
Saved as a link · example.com
Could not read a recipe from that page.
```

```
Added to the pool · Tomato soup
On Fri dinner · Ada, Kai eat · Ada cooks
```

```
On Fri dinner · Takeaway noodles · Ada eats · no cook yet
```

```
On Fri dinner · Tomato soup · no eaters or cook yet
```

```
Already in the pool · Tomato soup
Not put on a meal.
```

- Locked `/cook` copy:

```
Tomato soup

Ingredients
• 2 cups tomatoes
• 1 onion
• salt

Steps
1. Sweat the onion.
2. Simmer the tomatoes.
```

```
Tomato soup

No ingredients or steps saved.
```

```
Tomorrow has no recipe to cook from.
```

```
Which recipe?

• Tomato soup
• Pasta
```
