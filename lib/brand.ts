/** Product identity in one place — a rename or mark change is a single edit. */
export const BRAND_NAME = 'Yeah Buddy';

/** Tile initials for the square brand mark in sidebars and the auth shell. */
export const BRAND_INITIALS = 'YB';

/**
 * Decorative only. Always render with `aria-hidden` so the accessible name
 * stays the plain product name — screen readers should not announce
 * "flexed biceps", and E2E selectors match on the name alone.
 */
export const BRAND_EMOJI = '💪';
