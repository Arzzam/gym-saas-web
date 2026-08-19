# Progress

Living project stage for agents and humans. Log entries live one-per-file in `docs/progress/`.

## Current stage

| Area | Status |
|---|---|
| Agent OS (rules, skills, docs) | Done — drift from `e537810` repaired; Cursor + Claude Code parity |
| Tooling + CI | Done — Prettier/ESLint architecture rules/Husky/lint-staged + GitHub Actions (ADR-0006); `typecheck` runs `next typegen` first so `LayoutProps` exists on a clean CI checkout |
| Folder architecture | Done — top-level `modules/<module>/`; `lib/` is shared infrastructure (ADR-0007, ADR-0008). E2E fixtures split into `lib/api/e2e/store.ts` (shared state) + nine per-module fakes, closing ADR-0007's last deferred consequence — no shared-file hotspots remain |
| UI foundation | Done — shadcn/ui on `data-theme`, tokens aliased to the CRM palette (ADR-0006) |
| Admin desk layout (queue + rail) | Done — `components/admin/work-queue-layout.tsx` + `metric-strip` + `segmented-filter`, domain-free chrome landing the `stash@{3}` hybrid prototype as real code. Renewals is the first consumer; roster/attendance/leads/plans can adopt it by passing children. Fully token-indirected, so dark mode needed no per-component work. Colour palette still deferred by design |
| Architecture plan + SOLID/DI | Done (ADR-0003, ADR-0004) |
| Matt Pocock skills | Done (`.agents/skills`) |
| Postman API collection | Done — **sibling clone + Postman cloud** (`gym-saas.code-workspace`; no vendored `postman/` in web) |
| Client/Admin auth guide | Done — `docs/api/client-auth.md` |
| Silent session refresh | Done — `proxy.ts` rotates the access/refresh pair via `POST /auth/refresh` before it expires; cookie `Max-Age` decoupled from the access-token TTL (`2026-08-16` fix, see progress log) so it survives to be refreshed instead of the browser dropping it at the 1h mark. Verified live against prod (`2026-08-16`): rotation + 401-on-stale-token both confirmed; Google-lane compatibility inferred high-confidence (shared Supabase issuer), not directly browser-tested |
| Auth research notes | Archived — `docs/archive/research/` |
| MCP (Context7, Postman, GitHub, Supabase, Vercel, Playwright) | Configured + connected in Cursor |
| Playwright E2E skill | Done — `.cursor/skills/playwright-e2e-testing` (from fugazi/test-automation-skills-agents) |
| Next.js app scaffold | Done — App Router + Clean Arch ports/adapters (build green) |
| Feature modules | M1 auth; M2 Settings-first + invites; **M3 membership invites + my-data-grants**; **M4 plans/addons**; **roster / attendance / renewals**; **M11 leads** |
| Admin CRM-light chrome | Done — Base UI `Sidebar` primitive (icon rail + `Sheet` mobile drawer + cookie-persisted state), light/dark tokens, Settings-only first-run; Client persona shares the same header atoms |
| Admin navigation latency | Done — page shells do no network work; `loading.tsx` per ops route; filter tabs are `<Link>` in the shell (was a raw `<a>` full-page reload) (ADR-0009) |
| Client data layer | Done — **TanStack Query v5** across all six Admin modules (ADR-0011): RSC `prefetchQuery` + `<HydrationBoundary>` for first paint, `/api/*` route handlers for refetch, mutations wrapping the existing Server Actions so the auth→lane→tenant gate never moved. Retired all `*-data.tsx`, every `useOptimistic` block, and 18 of 22 `router.refresh()` sites. Navigation between ops screens now serves from cache instead of re-paying ~400ms per hop. CLIENT persona migrated too; the 4 remaining `router.refresh()` calls are session creation and Admin-shell-mode changes, which cache invalidation cannot re-render |

**Summary:** Roster, attendance desk, renewals inbox, and client my-data-grants wired against Postman tip `91d4aba`. Plans + Leads + membership invites remain live. Agent OS repaired after the `e537810` rule drift; tooling + CI landed (ADR-0006). Domain slices live at top-level `modules/` (ADR-0008 amending ADR-0007). Admin shell rebuilt on Base UI's `Sidebar` primitive, replacing the hand-rolled collapsible nav. Admin navigation reworked to stream the page shell and stop reloading the document on filter clicks (ADR-0009). Renewals rebuilt as the first consumer of a reusable queue + rail desk layout, with member names joined from the roster and contact actions on the rail.

## Next up

**Team setup:**

1. ~~Apply the status-badge scale~~ — **Done.** `lib/ui/status-tone.ts` (`StatusTone` + `statusToneBadgeVariant()`), `badge.tsx` got `success`/`warning` variants, and every domain status (`roster-panel`, `members-admin-panel`, `membership-invite-inbox`, `staff-invites-admin-panel`) is now a `<Badge>` with the correct tone — no more bare-text statuses, no more `roster-panel` payment badges all rendering `outline`.
2. **Adopt shadcn components per surface** — Done: `table`/`select`/`badge`/`checkbox`/`radio-group`/`textarea` landed across every Admin panel and the auth flows (roster, attendance, leads, members, plans, staff-invites, login, Google callback, create-gym, data-grants, membership-invite inbox); `dialog`/`dropdown-menu` installed but not yet consumed by a screen.
3. **Module ownership split** with Iqbal, then feature branches + PRs — now unblocked on the tooling side: the last shared hotspot (`e2e-fixtures.ts`) is split per module.
4. ~~Embed `gymOrgId` / `gymName` in the session~~ — **no longer needed for latency**: the gym lookup is cached client-side by TanStack, so navigation no longer re-pays it. Still an option if the *first* load's sequential hop matters (would need HMAC signing first — ADR-0010 work is stashed, not landed).

**Product:**

6. Assign trainer / trainer list when Postman exposes a list endpoint.
7. Deploy gym-backend with `GOOGLE_OAUTH_REDIRECT_ORIGINS` + Supabase redirect URL for web Google callback.
8. ~~Optional: deeper renewals UX (filters, member name join)~~ — **Done.** Rebuilt as a
   queue + rail desk: roster join for names/phone/email (no new endpoint — the roster
   rides along in the screen payload like the attendance desk), window/payment/search
   filters, a money summary strip, `tel:`/WhatsApp/`mailto:` contact actions, and a real
   amount input replacing the `price / 2` guess for partial payments. See
   `docs/progress/2026-08-20-renewals-desk-work-queue-layout.md`.
9. **Audit the other modules against the desk layout** — roster, attendance, leads, plans,
   membership-invites, staff-invites, auth. Consistency within each module's current
   scope; no scope expansion, no palette decisions.
10. Optional: confirm Google-lane `/auth/refresh` compatibility with an actual browser OAuth round-trip (curl-verified for OTP-lane on `2026-08-16`; Google-lane inferred, not directly hit).

## Log

Entries live one-per-file in [`docs/progress/`](progress/), named
`YYYY-MM-DD-<slug>.md` — newest sorts last by filename.

**Why one file per entry:** this file used to be appended at the top by every
contributor, so it conflicted on every parallel change (ADR-0007). Add a new
file; never edit an old one.

