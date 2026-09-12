# Profile & Progress

Contract from Postman **Profile & Progress** @ sibling `gym-backend-postman` tip `9b0b561`.

Client-owned. Staff reads are grant-filtered by the API. Missing grant → calm empty copy, never invented values.

## Client (own data)

| Action | Method | Path |
|---|---|---|
| Get my profile | `GET` | `/me/profile` |
| Update my profile | `PATCH` | `/me/profile` |
| List my progress logs | `GET` | `/me/progress-logs?limit&offset` |
| Upsert my progress log | `PUT` | `/me/progress-logs` |

**Profile fields:** `userId`, `heightCm`, `weightKg`, `dob`, `gender` (`MALE` \| `FEMALE` \| `OTHER` or null), `medicalNotes`, `bmi`, timestamps.

**PATCH body:** all fields required, nullable. A weight change upserts today’s ProgressLog.

**Progress log:** `id`, `clientUserId`, `logDate` (`YYYY-MM-DD`), `weightKg`, `bmi`, `notes`, `createdAt`.

**PUT body:** `logDate`, `weightKg`, `notes` (all required; last two nullable).

## Staff (grant-aware)

| Action | Method | Path |
|---|---|---|
| Get client profile | `GET` | `/gym-orgs/:gymOrgId/clients/:clientUserId/profile` |
| List client progress | `GET` | `/gym-orgs/:gymOrgId/clients/:clientUserId/progress-logs?limit&offset` |

**Auth:** Bearer ADMIN or TRAINER live at gym. Web: Auth + STAFF + gym tenant from the session. `gymOrgId` is never taken from the URL.

Ungranted profile attributes come back as `null`. BMI only when HEIGHT **and** WEIGHT are granted. `403 USERS_FORBIDDEN` when there is no active membership / grants (profile) or no `PROGRESS` class grant (logs).

**Web:** `/client/profile` — own profile editor + progress log (nudge to enable Progress under Data sharing). `/admin/members/:clientUserId` — Assignment + grant-aware profile/progress for ADMIN and TRAINER (trainers reach members via assigned roster).
