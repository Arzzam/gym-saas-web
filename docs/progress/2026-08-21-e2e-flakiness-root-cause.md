# 2026-08-21 — The E2E flakiness was two isolation bugs, not a slow machine

`docs/PROGRESS.md` §11 logged intermittent E2E failures — three specs (plans +
CRM) timing out on one full run, passing individually and on four reruns — and
guessed at machine load, with "raise the `expect` timeout or drop worker count"
as the remedy. That diagnosis was wrong, and the remedy would not have worked.

## Why load was never the explanation

The whole suite finishes in **~9s** at six workers; the slowest single test is
1.1s, most are 200–600ms. The budgets they were failing against are Playwright's
defaults of 30s per test and 5s per `expect`. A run "~60% slower" moves a 1.1s
test to 1.8s — an order of magnitude short of the cliff. Nothing about the
timings supported a timeout.

What misled us is that **a strict-mode violation reports as a timeout**:
Playwright re-resolves the locator until the budget expires, then fails with
`Call log: waiting for …`. It reads exactly like slowness. Both real bugs below
surfaced that way.

## Bug 1 — a locator that matched two elements (CRM)

`CrmPage.captureTrigger` was `getByRole('button', { name: 'Capture lead' })`,
without `exact`. Playwright's name matching is a case-insensitive **substring**,
and every queue row carries an overlay button labelled `Open <name>`. The CRM
spec's own fixture lead is named **"E2E Capture Lead"**, so while that lead
existed — the window between one test creating it and deleting it — the trigger
resolved to two elements and the click failed.

That is why it needed a *parallel* run to show up, and why the spec passed alone.

Fixed by making the row-overlay and trigger locators `exact` across the CRM,
plans, members and renewals page objects. `exact` is load-bearing there now, so
the CRM one carries a comment saying why.

## Bug 2 — fixture ids derived from array length (plans)

The real prize. Every fixture `create` minted its id from the array length:

```ts
id: `plan-e2e-${e2ePlans.length + 1}`,
```

Playwright's workers share these arrays (one `next start`, `globalThis`-backed
store). A create that landed after another worker's delete therefore handed out
an id that was **already live**:

| step | worker | store | id issued |
|---|---|---|---|
| seed | — | 2 plans | — |
| create `E2E Editable` | A | 3 | `plan-e2e-3` |
| create `E2E Retirable` | B | 4 | `plan-e2e-4` |
| delete `E2E Editable` | A | 3 | — |
| create `E2E Cancellable` | C | 4 | **`plan-e2e-4`** ← collides with B |

Every subsequent `findIndex((item) => item.id === planId)` — `update`,
`softDelete` — then resolved to whichever duplicate came first. One spec's
delete removed another spec's row; the row the spec was asserting on never went
away. Reproduced directly: `E2E Cancellable` expected 0 rows, got 1, and
`E2E Retirable` expected 0, got **3**.

Serial runs hid it (3 sequential `--workers=1` runs, all green, at 28–32s each
against ~9s parallel): serially an id is only reused once its holder is already
gone.

Fixed with `e2eNextId()` in `lib/api/e2e/store.ts` — a monotonic per-prefix
counter that cannot collide however the arrays are mutated. Generated ids end up
as `plan-e2e-new-1`, so they can never equal a seeded id (`plan-e2e-base`,
`lead-e2e-1`). Applied to all five fixtures that had the length pattern: plans,
leads, attendance, membership-invites, staff-invites.

## Verification

- Before: 2 failures in 6 parallel runs (plans), 1 in the first run (CRM).
- After: **12 consecutive green runs at six workers** — deliberately more
  parallel than the default — plus typecheck and lint.
- `playwright.config.ts` is **unchanged**. The timeout/worker-cap edit made
  while chasing the load theory was reverted once the cause was known: it fixed
  nothing, cost ~3s a run, and a lower worker count would have *hidden* this
  class of bug rather than surfaced it.

## Left open

`plans-admin-panel.tsx:55` and its four siblings resolve the rail with
`visible.find(...) ?? visible[0] ?? null`. That fallback is deliberate for
search, but it also fires when the *list data* changes underneath: if the
selected row leaves the list, the rail silently retargets to whatever is now
first — including its destructive actions. The confirm dialog names the record,
which is what keeps this from being sharp today. Worth a decision, not fixed
here.
