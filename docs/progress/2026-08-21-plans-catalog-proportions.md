# 2026-08-21 — The plan catalog stops looking like a work queue

The Plans desk read as "a small weird": two rows of text stranded in a 760px column
beside a 21rem rail wrapping every helper sentence to three lines, under a four-tile
metric strip that said `Plans 2 / Available 2 / Memberships 2 / Add-ons 0`.

Every symptom came from one cause. `WorkQueueLayout` was built for triage — renewals,
leads, attendance — where you scan many rows ranked by urgency. A catalog has none of
that: two to ten rows forever, no urgency, `planStatusTone` green on every active row.
The template fit the other four ops screens and not this one.

## The metric strip was restating the list

Its job on renewals is to answer something the queue cannot ("₹6,497 due in this
window"). Over a two-row catalog it restated the rows verbatim, and `Add-ons 0`
duplicated the filter tab sitting directly above it — the widest band on the page spent
on the least information. Replaced with one muted line above the queue,
`E2E Gym · 3 plans · 2 available`, which keeps the gym name the `Plans` tile carried as
a hint and turns the zero case into words (`none available to invite onto`) rather than
a warning-toned `0`.

Deleting the strip also closed the split filter controls: the kind tabs and the
search/New-plan row had a stats band wedged between them, and are now adjacent. The tabs
stay in the page shell, outside the data `<Suspense>`, for the reason `FilterTabs`
already documents — moving them into the panel would have made them vanish into the
skeleton on every filter click.

## Density was inverted

The sparse column was wide and the dense one narrow. `railWidth="wide"` (25rem) puts the
room where the edit form is. The queue earns its width back with real columns —
`WorkQueueRow` gained a `columns` slot for aligned, read-only cells — so term and price
align down the list instead of ragging inside one dot-joined `₹999 · 30 days` phrase.
`PlanRow` therefore carries `termLabel` and `priceLabel` separately: a joined string
cannot be a column, and the formatters stay injected so `plans-desk.ts` stays pure.

**The first attempt was wrong and the screenshot caught it.** Reserving the status cell
unconditionally cost 4rem of gutter on a catalog with nothing retired, which left the
price floating mid-row and squeezed `Add-on · Trainer coaching` onto two lines — a wide
rail leaves the queue only ~460px at a 1178px viewport, so fixed cells are expensive
there. The cell is now reserved only when a retired plan is visible: all rows or none,
never per-row, or the price column would shift on the retired rows alone.

## Delete was the loudest thing on the page

Full-width filled destructive, for the action an Admin almost never wants, already
behind a confirm dialog. Now a quiet `ghost` button in danger text, fenced off by a
hairline. The hairline does the job the removed "Danger zone" heading (`d4a0a75`) used to:
without it, `Retiring hides it from new invites…` sat flush against Delete and read as
that button's caption.

## Shared chrome

`railWidth` and the skeleton's `summary` toggle live in `components/admin/rail-width.ts`,
not as exports of `work-queue-layout.tsx` — the skeleton renders inside a Server
Component, and every export of a `'use client'` module arrives there as a client
reference rather than the string map it needs to index. `WorkQueueSkeleton` takes both so
the fallback matches this screen's shape; a skeleton that guesses the wrong shape is the
layout shift it exists to prevent.

The other four consumers are untouched — both new props default to today's behaviour.

Verified: `npm run verify` green, 52/52 Playwright green. The two catalog assertions that
matched `₹999 · 30 days` as one phrase now assert the cells, not the punctuation between
them.
