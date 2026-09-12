# 2026-08-19 — Fix membership invite expiry hydration mismatch

- `/admin/members` hydrated with `2 Sept 2026` from Node and `Sep 2, 2026` from the browser because `formatInviteExpiry` used `toLocaleDateString(undefined, …)`.
- Pin `en-IN` + `Asia/Kolkata` (same as staff invites / lead follow-up) so SSR and the client print one string.
