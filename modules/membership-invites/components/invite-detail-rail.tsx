'use client';

import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { ContactActions } from '@/components/admin/contact-actions';
import { WorkQueueRailPanel, WorkQueueRailSection } from '@/components/admin/work-queue-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import {
    formatInviteExpiry,
    membershipInviteStatusLabel,
    membershipInviteStatusTone,
    membershipPaymentStatusLabel,
    membershipPaymentStatusTone,
} from '@/modules/membership-invites/membership-invites-labels';
import type { MembershipPaymentStatus } from '@/modules/membership-invites/membership-invites-ports';
import type { InviteRow } from '@/modules/roster/roster-desk';

/**
 * One invite. Genuinely thinner than a member — an invite is a name, a plan and
 * a deadline — so the rail says so plainly rather than padding itself out.
 *
 * Revoke is passed down: it removes the row, which would unmount this component
 * and take the mutation's error message with it (ADR-0011).
 */

type InviteDetailRailProps = {
    row: InviteRow | null;
    /** Resolves a `planId` to its catalog name; the invite carries only the id. */
    planName: (planId: string) => string;
    onRevoke: (membershipInviteId: string) => void;
    rowActionsPending: boolean;
};

export function InviteDetailRail({ row, planName, onRevoke, rowActionsPending }: InviteDetailRailProps) {
    if (!row) {
        return (
            <WorkQueueRailPanel>
                <p className="text-sm text-(--color-fg-muted)">Select an invite to see its plan and expiry.</p>
            </WorkQueueRailPanel>
        );
    }

    const { invite } = row;

    return (
        <WorkQueueRailPanel>
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 text-base font-semibold break-words text-(--color-fg)">
                        {invite.inviteeName}
                    </h2>
                    <Badge variant={statusToneBadgeVariant(membershipInviteStatusTone(invite.status))}>
                        {membershipInviteStatusLabel(invite.status)}
                    </Badge>
                </div>
                <p className="truncate text-xs text-(--color-fg-muted)">
                    {invite.invitedEmail} · expires {formatInviteExpiry(invite.expiresAt)}
                </p>
            </div>

            <ContactActions phone={invite.inviteePhone} email={invite.invitedEmail} />

            <WorkQueueRailSection title="Invited onto">
                <div className="space-y-2">
                    <PlanLine
                        label={planName(invite.basePlanId)}
                        payment={invite.basePaymentStatus}
                        kindLabel="Membership"
                    />
                    {invite.addonPlanId ? (
                        <PlanLine
                            label={planName(invite.addonPlanId)}
                            payment={invite.addonPaymentStatus}
                            kindLabel="Add-on"
                        />
                    ) : null}
                </div>
                <p className="text-xs text-(--color-fg-muted)">
                    {/* Says why a payment badge on a not-yet-member is meaningful. */}
                    Payment recorded up front. Subscription dates start when the invite is accepted, not now.
                </p>
            </WorkQueueRailSection>

            {invite.status === 'PENDING' ? (
                <WorkQueueRailSection title="Danger zone">
                    <ConfirmActionDialog
                        trigger={<Button type="button" variant="destructive" className="w-full" />}
                        title={`Revoke the invite for ${invite.invitedEmail}?`}
                        description="Their invite link stops working immediately. You can send a fresh invite to the same address afterwards."
                        confirmLabel="Revoke invite"
                        disabled={rowActionsPending}
                        onConfirm={() => onRevoke(invite.id)}
                    >
                        Revoke invite
                    </ConfirmActionDialog>
                </WorkQueueRailSection>
            ) : (
                <p className="text-sm text-(--color-fg-muted)">
                    {invite.status === 'ACCEPTED'
                        ? 'Accepted — they are on the Members list now.'
                        : 'This invite is settled; there is nothing left to do with it.'}
                </p>
            )}
        </WorkQueueRailPanel>
    );
}

function PlanLine({
    label,
    payment,
    kindLabel,
}: {
    label: string;
    payment: MembershipPaymentStatus | null;
    kindLabel: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-(--radius-control) border border-(--color-border)/70 px-3 py-2">
            <div className="min-w-0">
                <p className="truncate text-sm text-(--color-fg)">{label}</p>
                <p className="text-xs text-(--color-fg-muted)">{kindLabel}</p>
            </div>
            {payment ? (
                <Badge variant={statusToneBadgeVariant(membershipPaymentStatusTone(payment))}>
                    {membershipPaymentStatusLabel(payment)}
                </Badge>
            ) : null}
        </div>
    );
}
