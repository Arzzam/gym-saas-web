import type { VariantProps } from 'class-variance-authority';

import type { badgeVariants } from '@/components/ui/badge';

/**
 * One semantic scale every domain status maps onto, so a colour means the same
 * thing on every screen (`docs/ui-design-system.md` §3). `warning` is not a
 * lesser `danger` — it is the tone for "needs attention, still functioning".
 * `danger` is reserved for states that actually deny access.
 */
export type StatusTone = 'neutral' | 'positive' | 'warning' | 'danger';

const TONE_BADGE_VARIANT: Record<StatusTone, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
    neutral: 'outline',
    positive: 'success',
    warning: 'warning',
    danger: 'destructive',
};

/** Maps a status tone to the `<Badge variant>` that renders it. */
export function statusToneBadgeVariant(tone: StatusTone) {
    return TONE_BADGE_VARIANT[tone];
}

const TONE_DOT_CLASS: Record<StatusTone, string> = {
    neutral: 'bg-(--color-fg-muted)',
    positive: 'bg-(--color-success)',
    warning: 'bg-(--color-warning)',
    danger: 'bg-(--color-danger)',
};

/**
 * Same scale as the badges, rendered as a queue-row urgency dot. Lives here
 * rather than in the layout primitive so a tone can never mean one colour on a
 * badge and another on a dot — retheming still touches only `crm-tokens.css`.
 */
export function statusToneDotClass(tone: StatusTone): string {
    return TONE_DOT_CLASS[tone];
}

/**
 * Membership invites and staff invites share one enum shape
 * (`PENDING` | `ACCEPTED` | `REVOKED` | `EXPIRED`) and therefore one tone
 * mapping — don't diverge them (`docs/ui-design-system.md` §3).
 */
export function inviteStatusTone(status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'): StatusTone {
    switch (status) {
        case 'PENDING':
            return 'neutral';
        case 'ACCEPTED':
            return 'positive';
        case 'EXPIRED':
            return 'warning';
        case 'REVOKED':
            // A deliberate Admin action, not a failure.
            return 'neutral';
    }
}
