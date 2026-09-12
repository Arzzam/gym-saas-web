# 2026-08-26 — Profile & Progress status (already wired)

- Confirmed frontend matches Postman **Profile & Progress** @ `9b0b561`: Client `GET/PATCH /me/profile`, `GET/PUT /me/progress-logs`; staff grant-aware `GET …/clients/:id/profile` and `…/progress-logs`.
- Surfaces: `/client/profile` (own edit + logs), `/admin/members/:clientUserId` from roster **Profile**. Live BFF reads already 200 in local `next dev`.
- Small fix: progress form defaults to **local** calendar date (not UTC) so India evening doesn’t land on the wrong day.
