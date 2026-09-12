# 2026-08-27 — Rename to Yeah Buddy, and two fixes it surfaced

## Rename

Product display name is now **Yeah Buddy 💪** (tile initials `YB`):

- `app/layout.tsx` metadata title + description
- Admin sidebar brand (`app-sidebar.tsx`) and Client sidebar brand
- Auth brand mark (hero panel and the mobile form column)
- `e2e/admin-shell.spec.ts` brand link assertions

Name, initials, and emoji live in `lib/brand.ts` — the rename touched the same
string in four files, so the next change is one edit.

The emoji is `aria-hidden`: screen readers announce "Yeah Buddy", not "flexed
biceps", and E2E selectors keep matching on the plain name. It also renders
outside the sidebar's truncating span, whose `overflow: hidden` clipped the
taller glyph, and one step down in size so it sits inside the line box.

Left alone deliberately: the repo/package identity (`gym-saas-web`), the sibling
Postman repo, and `docs/` — those are project identifiers, not the app name.
Say the word if you want those renamed too.

## Sign out was broken (regression from `6ec42c4`)

`/logout` was a Server Component calling `clearSession()` during render. Next
does not allow cookie mutation there, so the route returned a server error and
Sign out never signed anyone out.

Replaced with the `signOutAction` Server Action that already existed: the
Profile menu item now runs it in a transition, and the `/logout` route is gone.
Dropped the stale "prefer navigating to /logout" comment on the action.

## Members roster vanished for non-ADMIN staff (regression from `6ec42c4`)

The ADMIN/TRAINER split on `/admin/members` and the member detail page gated on
`roleCode === 'ADMIN'`, so **every** staff role that was not exactly ADMIN —
including `STAFF_UNASSIGNED` — fell into the trainer branch and lost the full
roster, invites, and trainer picker.

Gate is now `roleCode === 'TRAINER'` for the assigned-only view, which is the
precise rule and restores the previous behaviour for other staff roles.

## Verification

`npm run verify` green (71 unit tests) and the full Playwright suite passes
36/36 — the first full E2E run since `6ec42c4`, which is why both regressions
had gone unnoticed.
