# Leads (Admin CRM)

Contract from Postman **Leads** @ `9b0b561`.

**Auth:** Bearer **ADMIN** at the gym.

| Action | Method | Path |
|---|---|---|
| Create | `POST` | `/gym-orgs/:gymOrgId/leads` |
| List | `GET` | `/gym-orgs/:gymOrgId/leads?status&limit&offset` |
| Get | `GET` | `/gym-orgs/:gymOrgId/leads/:leadId` |
| Update | `PATCH` | `/gym-orgs/:gymOrgId/leads/:leadId` |
| Change status | `PATCH` | `/gym-orgs/:gymOrgId/leads/:leadId/status` |
| Due follow-ups | `GET` | `/gym-orgs/:gymOrgId/leads/due-follow-ups` |
| Convert | `POST` | `/gym-orgs/:gymOrgId/leads/:leadId/convert` |
| Soft delete | `DELETE` | `/gym-orgs/:gymOrgId/leads/:leadId` → `204` |

**Create example:**

```json
{
  "name": "Walk-in Prospect",
  "phone": "9876543210",
  "email": "prospect@example.com",
  "source": "walk-in",
  "interest": "trial",
  "notes": null
}
```

**201:** `{ lead, warnings }` — soft warn `DUPLICATE_OPEN_LEAD_PHONE` possible while still creating.  
**Statuses:** `NEW` → `CONTACTED` → `TRIAL` → `CONVERTED` | `LOST` (any→any).  
**followUpDate:** `YYYY-MM-DD` or `null` to clear.  
**email:** nullable on the lead, settable on create and update. Optional for a walk-in, but it is
what **Convert** falls back to — a lead without one has to be given an address at convert time.

**Convert example:**

```json
{
  "invitedEmail": "priya@example.com",
  "basePlanId": "<uuid>",
  "basePaymentStatus": "paid",
  "addonPlanId": null,
  "addonPaymentStatus": null,
  "expiresAt": "2026-09-18T00:00:00.000Z"
}
```

`invitedEmail` optional (required only if the lead has no email); `basePlanId` +
`basePaymentStatus` required; the add-on pair is all-or-nothing; `expiresAt` optional,
invite stays open-ended if omitted.

**201:** `{ lead, membershipInvite }` — lead now `CONVERTED` with `convertedMembershipInviteId`
set; invite is `PENDING`. Errors: `403 LEAD_FORBIDDEN` · `404` · `409 LEAD_ALREADY_CONVERTED` ·
`422 LEAD_EMAIL_REQUIRED` · `422 LEAD_NOT_CONVERTIBLE` (lost lead) · `422 VALIDATION_ERROR`.

Web: `/admin/crm` — capture form, per-lead **Update** inputs (`PATCH …/leads/:leadId` for name/phone/source/interest/notes/followUpDate), status change (`NEW`/`CONTACTED`/`TRIAL`/`LOST` only — `CONVERTED` is reachable only through **Convert**, so a converted lead always has an invite behind it), due follow-ups, delete, and the **Convert** dialog (email + plan/payment picks, shared with the members desk's invite form).
