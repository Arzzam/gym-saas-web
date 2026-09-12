# 2026-08-27 — Client member sidebar

- Client layout now uses the same Sidebar shell as Admin (`ClientShell` + `ClientSidebar`).
- Nav modules from Postman client folders: **Home**, **Profile**, **Nutrition**, **Diet**, **Workouts**, **Health Sync**.
- Home + Profile remain live; Nutrition / Diet / Workouts / Health are calm “Coming soon” placeholders (no invented endpoints).
- Removed top `ClientSectionNav`; E2E POMs point at complementary **Member modules**.
