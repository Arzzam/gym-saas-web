# 2026-08-20 — Confirm before destroying, and one word for a membership

Two follow-ups the desk audit raised but deliberately left open. Closes `PROGRESS.md`
item 10.

## One word for `BASE`

The enum had four spellings: `planKindLabel` said "Base", the plan form's own private
helper said "Base membership", `subscriptionKindLabel` said "Membership", and the catalog
tabs hardcoded "Base"/"Add-ons". A plan an Admin created as a "Base membership" then
turned up on the renewals desk as something apparently different.

It is **"Membership"** everywhere now, from one function in `plans-labels.ts`. "Base" is
the schema's word, not a gym owner's — what they sell is a membership, and the fact that
add-ons hang off it is already obvious from the add-ons next to it. `planKindOptionLabel`
extends the same noun for the picker instead of introducing another, and the catalog tabs
read their labels from the function so they cannot drift from the rows underneath.

Subscriptions imports these instead of keeping a copy — the same cross-module label import
it already does for payment statuses.

## Saying which membership

The real gap behind that request. A renewal row read "Membership · ₹999", which is true
and useless to a gym running monthly, quarterly and annual plans — the normal case, not
the exception.

`renewals-due` carries a `planId` and a price snapshot but no plan name, so the plan
catalog now rides along in the desk payload exactly as the roster already does. Rows read
"Monthly · 30 days", and an add-on spells out its capability: "PT Coaching · Trainer
coaching · 30 days". No new endpoint; a gym's catalog is a handful of rows fetched in
parallel with two calls the screen already waits on.

`describePlan` falls back to the kind when the plan is not found. A subscription is a
price snapshot and stays valid after its plan leaves the catalog; blanking the row because
the catalog moved on would lose a real renewal.

`buildRenewalRows` took an options object in the process. It joins three lists plus a
clock now, and adding `plans` as a fourth positional argument with a default in the middle
immediately broke five call sites by sliding `today` into `plans` — which is the argument
for naming them.

## Confirming destructive actions

Six actions fired on a single click with no undo: offboard, delete plan, delete lead,
revoke membership invite, revoke staff invite, block check-in. Several sit inches from a
button pressed all day — Delete beside Deactivate, Offboard beside Block check-in — and
all of them write straight to the API, so there is nothing a toast could hold back.

One `ConfirmActionDialog`, six call sites. `description` is required rather than
defaulted because the copy *is* the feature: it has to say what happens to the gym's data,
not "this action cannot be undone". A generic warning teaches people to click through it,
which is worse than no dialog — it costs a click and buys nothing.

Blocking a check-in asks with `destructive={false}`: it denies access today but one click
undoes it tomorrow, so it earns a question rather than a red button. Unblocking asks
nothing.

## The bug the confirm step exposed

Adding the dialog should have broken the plans delete spec. It did not — it kept passing.

Base UI marks the rest of the page `aria-hidden` while a dialog is open, so every
`getByRole` query behind it returns nothing. `await deleteButton.click(); await
expect(row).toHaveCount(0)` was therefore measuring the open dialog, not the delete, and
would have gone on passing if delete had stopped working entirely.

Specs now go through `ConfirmDialog` (`e2e/pages/confirm-dialog.page.ts`), whose
`confirm()` waits for the dialog to close before returning. The plans and roster specs
assert the **cancel** path too — an untested Cancel is an untested feature. The offboard
spec owns a new fixture member (Deepa Rao) with no renewal line, so removing her cannot
move the renewals desk's money totals.

Recorded as §10 of `docs/ui-design-system.md`, including the testing trap.

## Verification

`npm run verify` clean — 105 unit tests, 3 added for the plan join and its fallback. 45
Playwright specs green, up from 44. Confirm dialog checked against a real screenshot.

## Still open

- **`planKindLabel` vs `subscriptionKindLabel` is resolved**, but the divergence flagged
  in the previous entry is worth re-reading: the fix was to pick the better word, not to
  keep both.
- Colour palette: still deferred. Nothing here picks one.
