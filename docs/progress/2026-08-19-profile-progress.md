# 2026-08-19 — Profile & Progress (Client + Admin grant-aware)

- Wired Postman **Profile & Progress**: Client `GET/PATCH /me/profile` and `GET/PUT /me/progress-logs` on `/client`; staff `GET /gym-orgs/:gymOrgId/clients/:clientUserId/profile` and `…/progress-logs` on `/admin/members/:clientUserId`.
- Tenant from session. Missing `USERS_FORBIDDEN` is the empty state “Member has not shared X”, not a red error. Ada E2E shares required vitals only — progress stays not-shared; medical notes stay hidden.
- State: TanStack Query (ADR-0011) with separate keys for own profile, own logs, and per-member staff reads. Mutations stay Server Actions.
