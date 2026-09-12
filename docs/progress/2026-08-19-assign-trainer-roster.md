# 2026-08-19 — Assign trainer on Admin roster

- Admin Members roster now lists gym trainers from **Gym Orgs → List Gym Trainers** (`GET /gym-orgs/:gymOrgId/trainers`) and assigns via **Roster → Assign trainer** (`POST …/members/:membershipId/assign-trainer`).
- List lives on the gym-orgs port (`listTrainers` + `list-gym-trainers.ts` + BFF `/api/gym-orgs/trainers`); assign lives on the roster writer. Tenant from session. No DataGrant. API still enforces in-date `TRAINER_COACHING`; unpaid does not lock the picker.
- State: TanStack Query (ADR-0011) — trainers are a **separate** query key from roster members so a check-in block does not refetch the picker.
- E2E: fixture `e2eGymTrainers` (Owner Admin) + Playwright assign on Ada Client.
