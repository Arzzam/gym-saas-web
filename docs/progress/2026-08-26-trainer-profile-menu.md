# 2026-08-26 — Trainer assigned roster + Profile menu

- **Trainer Members:** `GET /gym-orgs/:id/my-assigned-members` wired (ports/adapter/BFF `/api/roster/assigned`). TRAINER Members page shows assigned clients + Profile link; ADMIN keeps full roster + invites.
- **Member detail:** Assignment block (trainer name for Admin); clearer empty/not-shared copy for profile & progress; staff profile queries `staleTime: 0` so refreshes after client saves.
- **Client progress:** Copy links to Data sharing — staff only see logs when Progress grant is on.
- **Profile options:** Admin + Client chrome use `ProfileMenu` (avatar); dark mode toggle lives only inside that menu (login auth layout keeps standalone ThemeToggle for unsigned users / theme E2E).
