# 2026-09-12 — Convert Lead stops being a status label

The CRM pipeline could already move a lead to `CONVERTED`, but that was only a status
change: `PATCH …/leads/:leadId/status` flipped the enum and nothing else happened. The
lead's `convertedMembershipInviteId` — parsed through the adapter since the module
landed — stayed `null` forever, because the web app never called the endpoint that sets
it. An Admin who marked a lead "Converted" had told the gym a prospect became a member
and produced no invite for anyone to accept.

`POST /gym-orgs/:gymOrgId/leads/:leadId/convert` has been in the Postman collection since
tip `9b0b561`. It creates a PENDING membership invite from the lead and flips it to
`CONVERTED` in one call — the flow PRD **A14** and `product-flows.md` **F11.4** already
specified.

## The rail's stage picker no longer offers CONVERTED

`LEAD_STAGE_OPTIONS` (`leads-labels.ts`) lists `NEW`/`CONTACTED`/`TRIAL`/`LOST` only.
Convert is now the *only* path to `CONVERTED`, so a lead in that stage always has a real
invite behind it. `LEAD_STATUSES` stays whole — the CRM's filter tabs still need to show
and filter for converted leads.

## A real gap, found while planning: the lead had no email

The API's `Lead` has carried `email: string | null` since before this module landed —
Create and Update Lead both accept it. The web types (`leads-ports.ts`, the zod schema in
`leads-adapter.ts`) had none; the module was pinned to Postman `7a2d9bf`, which predates
the field.

Convert's email rule is *"use `invitedEmail`, else the lead's stored email, else 422
`LEAD_EMAIL_REQUIRED`"*, and F11.4 asks for the invite to open prefilled. Without the
field, every conversion would have demanded a freshly typed address even when the
backend already held one. Shipped first as its own commit: `Lead.email`, the create/update
payloads, both edit forms (capture dialog, rail), and the E2E fixtures.

## The plan + payment picker is shared, not duplicated

Converting creates a membership invite, so it needs the same four controls the members
desk's `MemberInviteDialog` already has: base plan, its payment status, an optional
add-on, and the add-on's payment status. That block carried real domain rules — the
render-prop `SelectValue` Base UI needs, the `'none'` sentinel for the add-on, the
all-or-nothing add-on pair the API rejects otherwise — so it was extracted to
`modules/membership-invites/components/invite-plan-fields.tsx` before a second consumer
needed it, rather than copied.

**That extraction turned up a real coverage gap on the way**: the invite form had no E2E
spec at all. `members.page.ts` carried an `inviteTrigger` locator nothing ever clicked.
Fixed alongside the refactor — inviting a member with a plan, a payment status and an
add-on, asserted back from the rail, since the queue row shows neither.

## Design choices worth stating

- **Not optimistic.** Same reasoning as `useAssignTrainer`: the API can refuse after the
  click (`409 LEAD_ALREADY_CONVERTED`, `422 LEAD_NOT_CONVERTIBLE`), and painting a lead
  `CONVERTED` before the server agrees would claim a prospect joined when they did not.
- **Invalidates two modules' caches.** The one mutation in the repo that writes a lead
  *and* a membership invite in one call — `leadsKeys.all` and `membershipInvitesKeys.all`
  both need to move, so the new PENDING invite shows up on the members desk immediately.
- **The convert trigger disappears for `CONVERTED`/`LOST` leads** rather than staying
  enabled and surfacing a post-submit refusal — unlike the roster's coaching-add-on check,
  which deliberately stays enabled because entitlement can drift server-side between page
  load and click. A lead's own stage is neither: it is the badge already on screen, so
  hiding a control guaranteed to fail is not a guess. `LOST` un-hides it automatically the
  moment the stage moves elsewhere, matching the API's own any→any transition rule.
- **The port returns a narrow result** — `{ lead, membershipInviteId }`, not the full
  `MembershipInvite`. The CRM never renders the invite, so `modules/leads` does not take a
  type dependency on `modules/membership-invites` for something no screen here reads.

Verified: `npm run verify` green (144 unit tests), full Playwright suite green (59 specs,
including 3 new CRM convert specs + 1 members-desk invite-form spec) on a fresh build.
