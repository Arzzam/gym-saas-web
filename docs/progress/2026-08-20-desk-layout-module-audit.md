# 2026-08-20 — Desk layout adopted across the modules

Closes `PROGRESS.md` Next Up item 9, opened the same day when the renewals desk landed.
Three commits: CRM rebuild, attendance rework, consistency pass.

## The finding that shaped the work

The item read "audit the remaining modules against the desk layout", which invites
rolling the layout out everywhere. Reading the modules said otherwise: **only two wanted
it.**

| Module | Verdict |
|---|---|
| Leads / CRM | Rebuild. Every row rendered its own expanded edit form |
| Attendance | Rework. Three interactions to mark one person, and no way to see who was already in |
| Roster, plans, membership + staff invites | Leave alone. Already correct as tables |
| Auth | Two hand-styled links; otherwise fine |

Forcing a queue + rail onto the plan catalog or the invite lists would have contradicted
§2 of the design system — prefer a table over cards-for-everything — in the name of
following it. §6 now says which screens qualify, so the next reader does not have to
re-derive that: adopt it when the job is *work through a list of people*, and a rail with
nothing to put in it is worse than no rail.

## CRM: twenty leads meant twenty live forms

Each pipeline row carried a full inline edit form — its own local state, its own save
button — so the list an Admin came to read was buried under the forms. There is now one
form, in the rail, keyed on the lead so it cannot keep the previous lead's typed values.

The pipeline is ordered by who is owed a follow-up rather than by capture date, which
makes it readable top-to-bottom as a call list. Dot reads time, badge reads stage — the
same split the renewals desk uses, so the two screens teach each other.

Capture moved into a dialog. It was a permanent five-field form pinned above the pipeline.
It closes only on success, so a failed capture keeps the typed details and the reason on
screen rather than losing a walk-in's number.

Follow-up urgency tops out at `warning`. `danger` is reserved for states that deny access
(§3) and no CRM state does — the worst case is a call the gym owes someone. Stage badges
follow §3's existing rule: middle stages neutral, `CONVERTED` positive, `LOST` neutral at
reduced emphasis rather than red, because losing a lead is a normal outcome.

The "follow-ups due" metric reads the API's own `leads/due-follow-ups` list instead of
counting visible rows. It is gym-wide, so the number does not lie when the Admin switches
stage tabs, and the client does not re-derive a rule the backend owns.

**Leads is not this repo's owner's module** under the split (backlog item 2). Done with the
user's explicit go-ahead, kept to one commit so it can be reviewed or reverted whole, and
ports/actions/hooks/query-keys are untouched — presentation only.

## Attendance: the desk could not see who was already in

Marking one person cost a search box, a `<Select>`, and a submit button: two controls
doing one job, then a confirmation of a choice just made by name. The member list is now
the queue — type a few letters, press Mark, or click the row, since there is no detail to
open and the row *is* the action.

The more useful fix is that rows now carry arrival time and whether it came from the desk
or a self check-in. Previously the only way to discover someone was already marked was to
mark them again. Already-marked members stay visible as confirmation; pending members sort
to the top so the list stays a to-do rather than a log.

`buildDeskRows` keeps the **earliest** attendance per member: a self check-in followed by
a desk mark is normal, and the desk cares when someone arrived, not how many rows the API
holds. Present is `positive`, not-yet-arrived is `neutral` — absence is not a problem
state, and colouring it amber would make the whole list shout.

This forced a fix in the primitive: `WorkQueueRow.onSelect` is now optional. An
already-marked row has nothing to open, and a focusable full-row overlay that does nothing
would put a silent tab stop on every checked-in member.

## Consistency pass — three real duplications

Found by reading, not assumed:

- **`formatPlanPrice` was a byte-identical copy of `formatMoney`.** I wrote `formatMoney`
  for the renewals desk without noticing plans already had the same `en-IN` whole-rupee
  formatter. Two money formatters is how two screens end up disagreeing about a currency
  symbol later.
- **Five panels had their own error banner**, already drifted: roster and members used
  `rounded-md`, the rest `--radius-control`. Now one `ErrorNotice`. Field-level errors
  deliberately stay inline next to their input — promoting them would separate the message
  from the control that caused it.
- **Radii outside the scale.** §1 defines three, but `rounded-md` (0.8× control) and
  `rounded-2xl` (1.8× control) had crept into four places. Token-derived rather than
  literal, which is why they survived review, but a retheme still could not move them
  together.

`ContactActions` and `WorkQueueSkeleton` were also extracted, both because a second
consumer appeared rather than in anticipation of one.

## Verification

`npm run verify` clean — 102 unit tests, 18 added across the two new desk models. 44
Playwright specs green, up from 38. Both new screens checked against real screenshots.

Test isolation held: each mutating spec owns a fixture nobody else touches (Priya Sharma
for attendance, a throwaway lead for CRM), per the shared-store constraint found the same
day.

## Not done — deliberately

- **Offboard and Delete lead still fire on one click**, with no confirm and no undo. A
  real risk to a gym owner, but it is new behaviour rather than consistency, so it was
  raised rather than silently added. Worth a decision.
- **`planKindLabel` says "Base" where `subscriptionKindLabel` says "Membership"** for the
  same enum. Defensible — the catalog talks about plan kinds, a renewal talks about what
  the member has — but it is a divergence someone should confirm is intentional.
- **Colour palette**: still deferred. Nothing here picks one, and both new screens came
  out correct in dark mode with no per-component work.
