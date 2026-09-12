# 2026-08-27 — Logout page

- Added `/logout` RSC: clears httpOnly session cookie → redirect `/login` (no backend logout endpoint; cookie-only web session).
- Profile menu Sign out is a menu item linking to `/logout` (works inside the dropdown; Admin + Client).
- E2E: Profile options → Sign out lands on login.
