# 2026-08-27 — Sign-in screen redesign

The auth screen was a single narrow card centred on the canvas — functional but
unbranded, and it said nothing about what the product is.

## What changed

Split-screen auth, the standard SaaS pattern: a tinted brand/value panel beside
a plain-surface form column.

- `modules/auth/components/auth-hero-panel.tsx` — brand mark, headline, three
  capability rows (memberships/renewals, front-desk attendance, consent-gated
  progress), and a trust line. Hidden below `lg`.
- `modules/auth/components/auth-brand-mark.tsx` — shared tile + wordmark; the
  form column shows it below `lg` where the hero is hidden.
- `app/(auth)/layout.tsx` — two-column grid; form column is `--color-surface`
  so the split reads without a floating card.
- `login-form.tsx` — dropped the card chrome (flat-on-flat), 44px controls,
  mail-prefixed email field, large letter-spaced OTP field with a "Check your
  inbox" header, selected-state styling on the lane options, Google brand mark
  on the OAuth button, and a quiet back affordance.
- `app/globals.css` — `.auth-hero` reuses the `.admin-shell` glow recipe;
  `.auth-hero-grid` adds a masked blueprint texture.

## Constraints held

- Tokens only. The single literal-colour exception is Google's logo, which is a
  third-party brand mark and must not shift with `data-theme` (commented).
- Every accessible name the login POM depends on is unchanged — all 15 login
  E2E specs pass untouched.

## Note for later

Each step now returns a keyed `<form>`. Without the key React reused the node
across steps and `transition-all` smeared the previous step's button colours
into the next one's.
