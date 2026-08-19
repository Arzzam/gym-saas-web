'use client';

import { Badge } from '@/components/ui/badge';
import { ContactActions } from '@/components/admin/contact-actions';
import { ClientSubscriptionLines } from '@/modules/subscriptions/components/client-subscription-lines';
import { WorkQueueRailPanel, WorkQueueRailSection } from '@/components/admin/work-queue-layout';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/ui/format-money';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import type { RenewalRow } from '@/modules/subscriptions/subscriptions-desk';

/**
 * Who the selected row belongs to, and everything the Admin needs to act on it
 * without leaving the screen.
 *
 * Scope is deliberate: this shows **gym-owned billing and contact data only**.
 * Progress, nutrition and wearable data are CLIENT-owned and need a DataGrant
 * (`000-project-context.mdc`) — a renewals screen is exactly the kind of place
 * that would casually leak them, so there is nothing here to leak.
 */

/**
 * A label/value pair in the rail. `money` is not decoration: it turns on
 * tabular figures so the ₹ column lines up on its digits. A date phrase like
 * "Ends in 5 days" is not money and must not get them — fixed-width digits in
 * running prose read as a typo.
 */
function RailFact({ label, value, money = false }: { label: string; value: string; money?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-(--color-fg-muted)">{label}</span>
            <span className={cn(money ? 'font-medium text-(--color-fg) tabular-nums' : 'text-(--color-fg-muted)')}>
                {value}
            </span>
        </div>
    );
}

export function RenewalMemberRail({ row }: { row: RenewalRow | null }) {
    if (!row) {
        return (
            <WorkQueueRailPanel>
                <p className="text-sm text-(--color-fg-muted)">
                    Select a renewal to see who it belongs to and how to reach them.
                </p>
            </WorkQueueRailPanel>
        );
    }

    const { member, renewal } = row;

    return (
        <WorkQueueRailPanel>
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 text-base font-semibold break-words text-(--color-fg)">{row.displayName}</h2>
                    {member ? (
                        <Badge variant={statusToneBadgeVariant(member.status === 'ACTIVE' ? 'positive' : 'neutral')}>
                            {member.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Badge>
                    ) : null}
                </div>
                {member?.checkInBlocked ? (
                    // The one genuinely access-denying state on this screen.
                    <Badge variant="destructive">Check-in blocked</Badge>
                ) : null}
                {member ? (
                    <p className="truncate text-xs text-(--color-fg-muted)">{member.clientEmail}</p>
                ) : (
                    <p className="text-xs text-(--color-fg-muted)">
                        No longer on the active roster — contact details are not available.
                    </p>
                )}
            </div>

            <ContactActions phone={member?.clientPhone} email={member?.clientEmail} />

            <WorkQueueRailSection title="This renewal">
                <div className="space-y-1">
                    <RailFact label={row.planLabel} value={row.dueLabel} />
                    <RailFact label="Billed" value={formatMoney(renewal.priceAmount)} money />
                    <RailFact label="Paid" value={formatMoney(renewal.amountPaid)} money />
                    <RailFact label="Outstanding" value={formatMoney(row.outstanding)} money />
                </div>
            </WorkQueueRailSection>

            <WorkQueueRailSection title="All lines">
                <ClientSubscriptionLines clientUserId={renewal.clientUserId} />
            </WorkQueueRailSection>
        </WorkQueueRailPanel>
    );
}
