# Feature Spec: Telegram week announce

## Context

The website is still where you plan. Telegram is how the household is told. One bot writes to **one chat** — a family group **or** a private chat. Token and chat id live in env — never in code. The bot **announces only**. It does not take recipes, assign meals, DM each member, or log anyone in.

Planning stays incremental. Empty meals are normal. No ping on every assign. No morning cook-along with ingredients and steps.

## Goal

1. **Sunday night** — post the **coming week** (Mon–Sun starting the next morning): every day listed; meals in calendar order; extras on that day **after** the slot they follow; each dish is `title · {cook} cooks`; empty day is `(nothing planned)`.
2. **Push** — on the week board, send the weekly message now, or send tomorrow’s reminder now.
3. **Night before** — every evening, tomorrow’s meals the same way, or `Nothing planned tomorrow.`

Times and timezone live in env. Defaults: weekly **Sunday 19:00**, night-before **20:00**, **Asia/Singapore**.

## Phases

- **This task:** One bot, one chat. Sunday-night weekly message. Night-before tomorrow. Push weekly / Push tomorrow on the week board. Token, chat id, and send times in env.
- **Not this task:** Ping on add/edit/remove. Ingredients, steps, or eaters on the message. Bot commands, inbound recipes, webhooks, DMs, login, multiple chats.

## In scope for this task

- One Telegram bot, one chat (group or private); token + chat id in env
- Sunday-night message for the coming week in the locked copy
- Night-before: tomorrow, or `Nothing planned tomorrow.`
- Week board **Push weekly** and **Push tomorrow**
- Times and timezone in env (defaults above)

## Out of scope for this task

- Ping on add/edit/remove
- Ingredients, steps, or eaters on the message
- Bot commands, inbound recipe ingest, webhooks
- DMs to each member, login, multiple chats
- Shopping list
- Always-on hosting (local process; a missed clock time skips that send)

## Acceptance criteria

- Sunday at the configured time, the chat gets the coming week in the locked copy (days, meals in calendar order, title + cook, extras after the right slot, empty days as `(nothing planned)`)
- Each evening at the configured time, the chat gets tomorrow, or `Nothing planned tomorrow.`
- **Push weekly** on the week board sends that weekly message now
- **Push tomorrow** sends the night-before message now
- Token or chat id missing: Push says so; scheduled sends do nothing (no crash)
- A send failure is shown on Push; the week on the site is unchanged

## Edge cases

- Coming week on Sunday night is **Mon–Sun starting the next morning**, not the week that is ending
- Extra meals follow calendar **after** order, on that day
- Dish with no cook name: send the title only (no `· cooks` clause)
- Push while token/chat id missing: error on the board, nothing sent
- Telegram down / bad chat id: Push shows the error; scheduled send is skipped
- App not running at 19:00 / 20:00: that send is skipped (local-only)
- Same Push clicked twice: two messages (no “already sent” lock)
- Empty week: weekly message still lists all 7 days as `(nothing planned)`

## Deliverable for this task

- Spec file: `specs/mvp/05-telegram-announce.md`
- Message builder (week + tomorrow) from planned meals — not hardcoded strings in the page
- Telegram sender behind an interface (HTTP Bot API); token/chat id/times from `src/config` / env
- Week board Push weekly / Push tomorrow
- Scheduler that fires weekly + night-before while the app process is running
- Tests: message copy (week with extras after lunch vs after dinner, empty day, empty tomorrow, missing cook); sender not called when env is missing

## Notes

- Never commit `.env`. Example keys only in `.env.example`.
- A recipe URL is an HTML link on the dish title. Sends disable Telegram’s page preview so no thumbnail.
- Sunday may send both the weekly plan (19:00) and the Monday reminder (20:00).
- Inbound recipes via webhook need a public HTTPS host **and** the same database as the planner. Out of this task; free hosts exist (Cloudflare Workers, Vercel) but would not write to local SQLite on their own.
- Locked weekly copy (placeholders):

```
This week · 16–22 Mar

Mon
• Breakfast — Oats · Ada cooks
• Dinner — Pasta · Ada cooks

Tue
• Lunch — Leftovers of Monday dinner · Kai cooks

Wed
• Dinner — Soup · Ada cooks

Thu
• (nothing planned)

Fri
• Breakfast — Eggs · Ada cooks
• Lunch — Takeaway noodles · Kai cooks
• Snack — Fruit plate · Ada cooks
• Dinner — Pizza · Kai cooks

Sat
• (nothing planned)

Sun
• Dinner — Roast chicken · Ada cooks
```

- Locked night-before copies:

```
Tomorrow · Tue 17 Mar

• Lunch — Leftovers of Monday dinner · Kai cooks
```

```
Tomorrow · Thu 19 Mar

Nothing planned tomorrow.
```
