# 2026-08-20 — Renewals desk on a reusable queue + rail layout

Closes `PROGRESS.md` Next Up item 8 ("optional: deeper renewals UX — filters, member name
join") and lands the hybrid layout from the `stash@{3}` prototype as real code.

## Why the two were one job

The prototype's `variant-d-hybrid` was a stream list plus a persistent detail rail, built
standalone under `_prototype/` with no route. The open question was which screen it should
become. Renewals answers it: a rail is pointless on a screen with no per-item detail, and
renewals is the one screen where "who is this, and how do I reach them" is the whole task.

The old inbox was a database view. A row read `BASE · ends 2026-08-30` / `Client
22222222… · ₹999 / 30d`, which an owner cannot act on — no name, no phone, no urgency.

## The layout is a primitive, not a page

`components/admin/work-queue-layout.tsx` holds the shape (summary / toolbar / queue /
sticky rail) and **no domain logic**, with `metric-strip.tsx` and `segmented-filter.tsx`
alongside it. Renewals is its first consumer; attendance, leads and members can adopt it
by passing different children. Every class is token-indirected, so the dark theme came out
correct with no per-component work — which is the property the backlog actually asked for.

Two columns at `lg`, stacked below it. When stacked, selecting a row scrolls the rail into
view; rows stay independently actionable so the rail is never the only path to an action.
A `Sheet` presentation for phones is the known next step — it needs the rail mounted
twice, so it was left out rather than half-done.

## Member names: a join, not a new endpoint

`renewals-due` returns `clientUserId` and nothing else about the person. Rather than ask
for an API change, `subscriptions-queries.ts` now rides the roster along in the screen
payload — the same pattern `attendance-queries.ts` already used for the desk picker. One
cache entry per window instead of two lists the client has to keep in step.

The roster is fetched `ACTIVE` only. An offboarded member's row falls back to
`Member abcdef12` rather than silently resurrecting them into the chase list.

`clientPhone` was already in that payload and unused, which is where the `tel:` / `wa.me` /
`mailto:` actions in the rail come from — the highest-value change here per line of code,
and it needed no API work at all.

## Partial payments: an input, not a guess

The old panel sent `Math.floor(priceAmount / 2)` for a partial payment — it wrote a number
nobody had agreed to into a billing record. `subscriptions-actions.ts` has always required
`amountPaid` for a partial, so the guess was covering for a missing input. There is now a
dialog that asks. Paying the full price through it records `paid`, not `partial`.

## Filters split by what they actually change

- **Window** (`overdue` / today / 7 / 30 days) is a real query parameter, so it is a
  `<Link>`: it re-runs the fetch and is part of the query key.
- **Payment status and search** narrow a list already in the cache. They stay in the URL
  for shareability (`state-management.mdc` §2) but go through
  `hooks/use-shallow-search-param.ts`, which uses `window.history.replaceState` — the
  documented Next.js shallow-routing hatch — so a keystroke does not re-run the page and
  its `prefetchQuery`.

`overdue` looks back 90 days, not forever: an Admin chases last month's lapsed members,
not someone who left two years ago.

## Tone: the dot reads time, the badge reads money

`overdue` is the one urgency that earns `danger`, and it earns it on the **dates** — the
subscription window has closed, so entitlement has genuinely lapsed
(`000-project-context.mdc`). This does not weaken §3's rule: an unpaid member whose dates
are still open stays `warning` and still trains. The two scales are independent and both
visible on every row.

## Two things found along the way

- **The glass design system never landed.** `pending-work-backlog` recorded `stash@{5}`
  ("glass-on-chrome v1") as shipped, but `docs/ui-theme.md` has no glass section, there is
  no `.glass-panel` class in `globals.css`, and `--font-heading` still points at Geist, not
  Archivo. That stash is still unmerged. The metric strip therefore reuses the shell
  header's existing idiom (`--color-surface` at partial alpha + `backdrop-blur`) rather
  than inventing a class the design system does not yet define.
- **Playwright workers are not isolated.** `store.ts` claimed they were. Six workers share
  one `next start`, so they share one fixture store; two of the new specs mutating the same
  row surfaced it as a 30s timeout in the full run that passed in isolation. Each mutating
  spec now owns a member nobody else touches (Vikram Rao, Neha Iyer), shared assertions
  moved onto values no mutation can move (billed totals, names, ordering), and the comment
  in `store.ts` now says what is actually true.

## Numbers

`font-mono` was giving commas a full character cell — `₹6,497` rendered as `₹6 , 497`.
Money now uses `tabular-nums` on the body face, which was all the alignment ever needed,
and `lib/ui/format-money.ts` centralises `en-IN` whole-rupee formatting.

## Verification

`npm run verify` clean (84 unit tests, 27 of them new and covering the date maths, urgency
scale, window presets, join and filters). 38 Playwright specs green, 9 of them new. Light
and dark both checked against real screenshots, not just assertions.

## Not done

- The module-wide consistency audit against this layout (roster, attendance, leads, plans,
  invites, auth) — deliberately a separate pass, so a layout regression and a cross-module
  restyle never land in one diff.
- Colour palette: still deferred, as agreed. Nothing here picks one.
