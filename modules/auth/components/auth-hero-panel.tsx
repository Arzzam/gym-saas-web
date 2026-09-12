import { CalendarCheck, HeartPulse, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { AuthBrandMark } from '@/modules/auth/components/auth-brand-mark';

type AuthHighlight = {
    icon: LucideIcon;
    title: string;
    description: string;
};

/** What the product actually does — no claims the MVP cannot back up. */
const AUTH_HIGHLIGHTS: ReadonlyArray<AuthHighlight> = [
    {
        icon: HeartPulse,
        title: 'Memberships and renewals',
        description: 'One roster for active, expiring, and lapsed members, with plan and payment status in view.',
    },
    {
        icon: CalendarCheck,
        title: 'Front-desk attendance',
        description: 'Check members in at the desk and see who trained today without leaving the dashboard.',
    },
    {
        icon: ShieldCheck,
        title: 'Progress shared on consent',
        description: 'Weight, calories, and wearables stay private to the member until they choose to share.',
    },
];

/**
 * Left panel of the auth split screen. Calm ops mood — no photography, no
 * hype metrics. Hidden below `lg`, where the form takes the full viewport.
 */
export function AuthHeroPanel(): ReactElement {
    return (
        <aside className="auth-hero relative hidden overflow-hidden border-r border-(--color-border) lg:block lg:p-12 xl:p-16">
            <div className="auth-hero-grid pointer-events-none absolute inset-0" aria-hidden />

            <div className="relative mx-auto flex h-full w-full max-w-lg flex-col justify-between">
                <AuthBrandMark />

                <div>
                    <p className="text-[2rem] leading-[1.15] font-semibold tracking-tight text-balance text-(--color-fg) xl:text-[2.25rem]">
                        Everything your gym runs on, in one calm workspace.
                    </p>
                    <p className="mt-4 text-[0.9375rem] leading-relaxed text-(--color-fg-muted)">
                        Memberships, renewals, attendance, and coaching — for the front desk and for members.
                    </p>

                    <ul className="mt-10 space-y-6">
                        {AUTH_HIGHLIGHTS.map((highlight) => (
                            <AuthHighlightRow key={highlight.title} highlight={highlight} />
                        ))}
                    </ul>
                </div>

                <p className="flex items-center gap-2 text-xs text-(--color-fg-muted)">
                    <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                    Passwordless email codes. Health data stays consent-gated.
                </p>
            </div>
        </aside>
    );
}

function AuthHighlightRow({ highlight }: { highlight: AuthHighlight }): ReactElement {
    const Icon = highlight.icon;
    return (
        <li className="flex gap-4">
            <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-(--color-border) bg-(--color-surface) text-(--color-fg) shadow-(--shadow-nav)"
                aria-hidden
            >
                <Icon className="size-4" />
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-medium text-(--color-fg)">{highlight.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-(--color-fg-muted)">
                    {highlight.description}
                </span>
            </span>
        </li>
    );
}
