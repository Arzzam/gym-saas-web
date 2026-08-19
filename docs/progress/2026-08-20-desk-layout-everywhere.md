# 2026-08-20 — The desk layout everywhere, and two calls reversed

The user asked for roster, plans and invites to get the layout too, with "if it doesn't
work the way we think, we can change it". Reading them properly first showed I had been
wrong about two of the three in the audit entry earlier today.

## What I got wrong

The audit said plans and the roster were "already correct as tables" and that a rail would
have nothing to put in it. Both were wrong, for different reasons:

- **A member** has contact details, a join date and real subscription lines. The
  four-column table showed none of it, so the members page could not answer "what is this
  member paying for?" — the question it exists to answer.
- **A plan** has three editable fields — name, term, price — that `updatePlan` has
  supported since the module landed and that no screen ever exposed. The only write the
  catalog could do was the active toggle, so correcting a typo in a plan name meant
  deleting and recreating it, orphaning every subscription snapshot pointing at the old
  id. The rail did not restyle the catalog; it unlocked writes that were unreachable.

I was right about **invites**: an invite genuinely is a name, a plan and a deadline. Its
rail says that plainly instead of padding itself out.

So the rule in §6 was wrong, not just incomplete. The test is not "is the queue made of
people" — it is *does an item have more to it than the row shows, or actions the row
cannot hold?* §6 now says that, and says what it used to say and why that was wrong.

## Plans

`updatePlanAction` + `useUpdatePlan` are new; the use-case, adapter and port were already
bound. Validation mirrors `createPlanAction` — a plan that could not be created should not
be reachable by edit. `kind` stays out: turning a membership into an add-on would change
what every existing subscription on it means, and the API does not accept it either.

The rail states the price-snapshot rule where the decision is actually made — "members
already on ₹999 keep that price until they renew" — rather than leaving it in a doc.
Deactivate/Activate became Retire / Make available again, with a line explaining that
retiring hides a plan from new invites while existing members keep their subscription.
Retired is `neutral`, not `warning`: retiring is a deliberate decision, the same reasoning
that keeps a revoked invite neutral.

## Members

Three stacked panels — a seven-field invite form, an invites list, the roster — became one
desk. Members and invites keep separate query keys (they are mutated independently; a
check-in block must not refetch invites) but share a queue behind a scope filter, because
an Admin looking for a person should not have to know which list that person is in. Scope
lives in the URL, so a colleague can be sent straight to Invites.

`ClientSubscriptionLines` was extracted from the renewals rail so both rails render a
client's billing identically. Sharing the component rather than the hook keeps the fetch,
the empty state and the money formatting inside the module that owns subscriptions.

## Two bugs the work surfaced

- **A POM locator that matched too much.** `getByRole('list', { name: 'Members' })` also
  matched the "Membership invites" queue — role-name matching is substring by default, and
  "Members" is a prefix of "Membership". Both queue locators are now `exact`.
- **E2E flakiness under load.** One full run failed three specs (plans + CRM) on 5s
  timeouts. They pass individually and passed on four subsequent full runs; that run was
  ~60% slower overall, so it reads as machine contention rather than a defect. Recorded as
  PROGRESS item 11 rather than silently retried away — if CI sees it, the fix is a longer
  `expect` timeout or fewer workers, not edits to the specs.

## Verification

`npm run verify` clean — 122 unit tests, 20 added across the two new desk models. 50
Playwright specs green (up from 45), run four times over. Both new screens checked against
real screenshots; the members rail's check-in control was demoted from `secondary` to
`outline` after the screenshot showed a rarely-used safety valve outweighing everything
else in the rail.

## Still open

- The layout is now on every ops screen, which is what the user asked to try. If any of it
  reads badly in real use, the primitive is one component and the modules pass children —
  changing course is a props change, not a rewrite. That was the point of building it this
  way.
- Colour palette: still deferred. Nothing here picks one.
