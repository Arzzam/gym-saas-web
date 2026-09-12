# 2026-08-26 — Staff progress logs display harden

- Hardened Profile adapter Zod for staff/client progress logs: coerce numeric strings, allow omitted `notes`/`createdAt`, accept page or bare-array envelopes (Postman `GET …/clients/:id/progress-logs`).
- Staff Progress panel normalizes list shape, shows count + Refresh; BFF maps Zod failures to calm `VALIDATION_ERROR`.
- Page size aligned to Postman default `limit=20`.
