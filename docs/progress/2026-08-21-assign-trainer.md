# 2026-08-21 — Assign a coach from the members rail

Closes the oldest open item on the backlog (PROGRESS item 6). It had been blocked on
"when Postman exposes a list endpoint"; both `List Gym Trainers` and `Assign Trainer` have
been in the sibling collection since `ddffe43`, so the blocker was stale rather than real.

## The dead field

`assignedTrainerId` was parsed through `roster-adapter.ts` into `RosterMember` when the
module landed, and rendered **nowhere**. The roster carried the answer to "who coaches
this member" through the whole stack and no screen asked for it. Yesterday's members rail
gave it somewhere to live.

## Two ids for one person

`trainerProfileId` is what `assignedTrainerId` holds and what `Assign Trainer` expects.
`userId` is the person's account. Confusing them assigns nobody and nothing downstream
throws — the request succeeds, the wrong id is stored, and the picker then shows no coach.
The picker keys on `trainerProfileId` end to end and an adapter test pins both, including
a body missing them entirely.

## The domain rule is the feature

The API answers **422 `COACHING_ADDON_REQUIRED`** unless the member holds an in-date
TRAINER_COACHING add-on. Three decisions follow:

- **Do not pre-check it client-side.** The API owns that rule, and this app never
  re-derives entitlement (`000-project-context.mdc`). Guessing would also go stale the
  moment an add-on lapses mid-session.
- **Say it before it bites.** The control's hint states the requirement, so a refusal
  reads as an expected precondition rather than a broken button.
- **Do not be optimistic.** Showing a coach as assigned before the server agrees would
  tell an Admin a member is coached when they are not — the one thing this control exists
  to get right. Every other roster mutation is optimistic; this one earns the exception.

The E2E fixture enforces the same precondition instead of always succeeding, so both paths
are covered: Priya holds the add-on and is assigned; Rahul has a BASE line only and is
refused with the plain-copy message. A fixture that skipped the rule would let a spec
"prove" a flow the real endpoint rejects.

There is deliberately **no unassign** — the contract has no such request.

## Why trainers got their own query key

The renewals and attendance desks join extra lists into one screen payload. Trainers do
not, and the reason is mutation rather than size: the roster's optimistic writes map over
a plain `RosterMember[]`, so nesting a second list inside that cache entry would make every
check-in block rewrite a list it never touches. Trainers are also mutated by neither
screen. The members page already prefetches keys in parallel, so this is a third
`prefetchQuery`, not a new pattern.

## Two fixtures that were wrong

- `capability: 'PERSONAL_TRAINING'` in the E2E store was invented — the domain only
  defines `TRAINER_COACHING`. It typechecked because `Subscription.capability` is a loose
  `string | null` while a plan's is a typed `PlanCapability`.
- `ClientSubscriptionLines` rendered a capability through its own
  `replace(/_/g,' ').toLowerCase()`, spelling it "trainer coaching" where the plan catalog
  says "Trainer coaching". Known values now route through `planCapabilityLabel`; anything
  unrecognised is shown as sent rather than mangled.

## Verification

`npm run verify` clean — 126 unit tests, 4 new against the real adapter with a stub
`HttpClient`. 52 Playwright specs green, 2 new covering the assign and the 422 refusal.
Checked against a real screenshot.

## Still open

Everything left is outside this repo or a team decision: the backend deploy with
`GOOGLE_OAUTH_REDIRECT_ORIGINS`, the Google-lane refresh round-trip, the module ownership
split with Iqbal, and the colour palette. There is no unstarted product work in the web
app's Admin surface; the Trainer persona is an explicit Phase B placeholder.
