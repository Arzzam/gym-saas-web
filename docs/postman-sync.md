# Sync Postman collection (multi-root + cloud)

## Single source of truth

| Layer | What |
|---|---|
| **Publish** | Sibling git clone [`abdulhasibn/gym-backend-postman`](https://github.com/abdulhasibn/gym-backend-postman) — usually `/Users/iqbal/Projects/gym-backend-postman` next to this app |
| **Working copy** | **Postman cloud** (Active workspace below) — agents inject via Postman MCP |
| **Auth / invite narrative** | `docs/api/client-auth.md`, `docs/api/staff-invites.md` — not a full collection duplicate |

**This repo does not vendor `postman/*.json`.** Open both folders via **`gym-saas.code-workspace`**.

Skills: **sync-postman-collection** · **verify-api-flow**  
Rule: `.cursor/rules/postman-sync.mdc`

## Cursor multi-root workspace

1. Clone sibling (once), if missing:
   ```bash
   cd /Users/iqbal/Projects
   git clone https://github.com/abdulhasibn/gym-backend-postman.git
   ```
2. In Cursor: **File → Open Workspace from File…** →  
   `/Users/iqbal/Projects/gym-saas-web/gym-saas.code-workspace`
3. You should see two roots: **gym-saas-web** and **gym-backend-postman**.

When the backend updates the Postman GitHub repo: `git pull` in the sibling folder, then run the sync skill (inject to cloud).

## Pipeline

```
Backend updates GitHub (gym-backend-postman)
        ↓
Sibling: git pull (preferred)  —  or GitHub MCP fallback
        ↓
Read collection/env JSON from sibling (or /tmp only)
        ↓
Postman MCP → putCollection / putEnvironment
        ↓
Delete ephemeral prep files
        ↓
verify-api-flow against Postman cloud when needed
```

## Backend API URLs

| Name | `baseUrl` | Check |
|---|---|---|
| **Prod (Dev env in Postman)** | `https://gym-backend-lovat-mu.vercel.app` | `GET /health` → `200` `{"status":"ok"}` (verified 2026-08-04) |
| **Local** | `http://localhost:3000` | Local Express when running |

Root `GET /` may return `404 NOT_FOUND` — that is expected; use `/health` or collection routes.

Admin smokes: Postman env **Gym Backend — dev** with `lane=STAFF` and prod `baseUrl`.

---

## Active Postman workspace

| Field | Value |
|---|---|
| Workspace ID | `e9147605-c2a5-48a6-8497-46b4a3489b95` (My Workspace) |
| Collection name | `Gym Backend API` |
| Collection uid | `33631273-e6dafd3b-8829-4ba6-885f-763020fc8347` |
| Env Dev uid | `33631273-1aa7f187-7064-4d7e-a761-fedcbdc3b2bd` |
| Env Local uid | `33631273-70c6c3c1-3487-45db-b394-30ed5cf90718` |

---

## Canonical prompt

```
Use skill sync-postman-collection. Pull sibling gym-backend-postman (or GitHub), inject into my Postman workspace with Postman MCP (no postman/ JSON in gym-saas-web). Update docs/api/client-auth.md if auth changed, note SHA in PROGRESS. Don’t commit unless I ask.
```

---

## Agent steps (summary)

1. Prefer sibling `git pull`; record tip SHA. Fallback: GitHub MCP `list_commits` + file fetch.
2. Read JSON from sibling (or `/tmp/gym-postman-sync/` only — never `gym-saas-web/postman/`).
3. Inject collection/envs via Postman MCP; force Dev `baseUrl` = prod Vercel URL, `lane` = `STAFF`.
4. Update `docs/api/client-auth.md` / `docs/api/staff-invites.md` only if contracts changed.
5. Note SHA in `docs/PROGRESS.md`; refresh **Last verified sync** below.
6. Delete ephemeral prep dirs.
7. Do not commit unless asked.

| MCP / git | Tools |
|---|---|
| Sibling git | `git fetch` / `git pull --ff-only` |
| GitHub (fallback) | `list_commits`, `get_file_contents` |
| Postman | `getWorkspaces`, `getCollections`, `createCollection`, `putCollection`, `createEnvironment`, `putEnvironment` |

### Examples caveat

Postman MCP often cannot round-trip nested request **Examples**. Publish SSOT for Examples remains the sibling/GitHub repo; optional Desktop Import from those files if cloud Examples are required.

### Manual fallback (MCP inject fails)

Import in Postman Desktop from the sibling JSON files, or GitHub raw:

- `https://raw.githubusercontent.com/abdulhasibn/gym-backend-postman/main/Gym-Backend-API.postman_collection.json`
- same for `Gym-Backend-Dev` / `Gym-Backend-Local` environment files  

Then set Dev `baseUrl` to prod and `lane` to `STAFF`.

---

## Last verified sync

| Field | Value |
|---|---|
| Upstream tip | `9b0b561` (2026-08-19 — Convert Lead; Create/Update Lead email refresh; plus Nutrition, Coaching, Health Sync, List Gym Trainers) |
| Sibling clone | `/Users/iqbal/Projects/gym-backend-postman` — tip `9b0b561` |
| Cursor workspace | `gym-saas.code-workspace` (web + postman roots) |
| GitHub / sibling pull | **OK** — `8d54a09..9b0b561` ff-only on 2026-08-19 |
| Postman inject | **Blocked** — Postman MCP still `401 Invalid API Key` (2026-08-19). Local JSON is current; cloud needs Desktop Import or a working Postman MCP login. |
| Local `postman/` in web repo | **Forbidden** — cloud + sibling only |
| Auth guide | `docs/api/client-auth.md` — OTP / Google contracts unchanged this tip |
| Staff invites guide | `docs/api/staff-invites.md` — unchanged this tip |
| New this tip | **Leads → Convert Lead** (`POST`); List Gym Trainers still in Gym Orgs |
| Prod API check | `GET https://gym-backend-lovat-mu.vercel.app/health` → `200` `{"status":"ok"}` (2026-08-19) |
| Examples caveat | MCP inject may strip nested Examples / long scripts; sibling tip remains Examples SSOT. Desktop Import from tip raw URLs below if needed. |

### Tip raw URLs (Desktop Import)

- Collection: `https://raw.githubusercontent.com/abdulhasibn/gym-backend-postman/9b0b561/Gym-Backend-API.postman_collection.json`
- Dev env: `https://raw.githubusercontent.com/abdulhasibn/gym-backend-postman/9b0b561/Gym-Backend-Dev.postman_environment.json`
- Local env: `https://raw.githubusercontent.com/abdulhasibn/gym-backend-postman/9b0b561/Gym-Backend-Local.postman_environment.json`
