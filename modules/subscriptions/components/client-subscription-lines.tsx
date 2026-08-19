'use client';

import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/ui/format-money';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import {
    membershipPaymentStatusLabel,
    membershipPaymentStatusTone,
} from '@/modules/membership-invites/membership-invites-labels';
import { planKindLabel } from '@/modules/plans/plans-labels';
import { useClientSubscriptions } from '@/modules/subscriptions/subscriptions-hooks';
import { formatRenewalDue } from '@/modules/subscriptions/subscriptions-labels';
import type { Subscription } from '@/modules/subscriptions/subscriptions-ports';

/**
 * Every billing line one client holds, fetched lazily.
 *
 * Owned by the subscriptions module and consumed from two rails — the renewals
 * desk and the members roster. Sharing the component rather than the hook keeps
 * the fetch, the empty state and the money formatting in the module that owns
 * subscriptions, so a second consumer cannot render them a third way.
 *
 * Billing is gym-owned, so no DataGrant is involved (`subscriptions-ports.ts`).
 */
export function ClientSubscriptionLines({ clientUserId }: { clientUserId: string | null }) {
    const { data: lines, isPending, error } = useClientSubscriptions(clientUserId);

    if (error) {
        return <p className="text-sm text-(--color-fg-muted)">{error.message}</p>;
    }

    if (isPending) {
        return (
            <div className="space-y-2" aria-hidden>
                {[0, 1].map((placeholder) => (
                    <div
                        key={placeholder}
                        className="h-12 animate-pulse rounded-(--radius-control) bg-(--color-border)"
                    />
                ))}
            </div>
        );
    }

    if (!lines || lines.length === 0) {
        return (
            <p className="text-sm text-(--color-fg-muted)">
                No subscription lines yet. They appear once a membership invite is accepted.
            </p>
        );
    }

    return (
        <ul className="space-y-2">
            {lines.map((line) => (
                <SubscriptionLine key={line.id} line={line} />
            ))}
        </ul>
    );
}

function SubscriptionLine({ line }: { line: Subscription }) {
    return (
        <li className="flex items-center justify-between gap-3 rounded-(--radius-control) border border-(--color-border)/70 px-3 py-2">
            <div className="min-w-0">
                <p className="truncate text-sm text-(--color-fg)">
                    {planKindLabel(line.kind)}
                    {line.capability ? ` · ${line.capability.replace(/_/g, ' ').toLowerCase()}` : ''}
                </p>
                <p className="text-xs text-(--color-fg-muted)">{formatRenewalDue(line.endDate)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-(--color-fg-muted) tabular-nums">{formatMoney(line.priceAmount)}</span>
                <Badge variant={statusToneBadgeVariant(membershipPaymentStatusTone(line.paymentStatus))}>
                    {membershipPaymentStatusLabel(line.paymentStatus)}
                </Badge>
            </div>
        </li>
    );
}
