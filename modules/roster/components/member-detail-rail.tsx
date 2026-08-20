'use client';

import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { ContactActions } from '@/components/admin/contact-actions';
import { WorkQueueRailPanel, WorkQueueRailSection } from '@/components/admin/work-queue-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import {
    membershipPaymentStatusLabel,
    membershipPaymentStatusTone,
} from '@/modules/membership-invites/membership-invites-labels';
import type { MemberRow } from '@/modules/roster/roster-desk';
import { MemberCoachSection } from '@/modules/roster/components/member-coach-section';
import { ClientSubscriptionLines } from '@/modules/subscriptions/components/client-subscription-lines';

/**
 * One member, with everything the roster table used to hide.
 *
 * The table showed four columns — name, payment, check-in, actions — and the
 * member's phone, join date and actual subscription lines were nowhere. The
 * rail carries them, plus the two actions, so an Admin fielding "what am I
 * paying for?" at the counter can answer it without leaving the page.
 *
 * Scope: gym-owned data only. Progress, nutrition and wearables are
 * CLIENT-owned and need a DataGrant (`000-project-context.mdc`), so there is
 * nothing of that kind here to leak.
 *
 * Both mutations are passed down rather than owned here: offboarding unmounts
 * this component, which would take the mutation and its error with it.
 */

type MemberDetailRailProps = {
    row: MemberRow | null;
    onSetCheckInBlock: (membershipId: string, blocked: boolean) => void;
    onOffboard: (membershipId: string) => void;
    rowActionsPending: boolean;
};

function formatJoined(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function MemberDetailRail({ row, onSetCheckInBlock, onOffboard, rowActionsPending }: MemberDetailRailProps) {
    if (!row) {
        return (
            <WorkQueueRailPanel>
                <p className="text-sm text-(--color-fg-muted)">
                    Select a member to see their plan, reach them, or change their check-in access.
                </p>
            </WorkQueueRailPanel>
        );
    }

    const { member } = row;

    return (
        <WorkQueueRailPanel>
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 text-base font-semibold break-words text-(--color-fg)">
                        {member.clientName}
                    </h2>
                    {member.basePaymentStatus ? (
                        <Badge variant={statusToneBadgeVariant(membershipPaymentStatusTone(member.basePaymentStatus))}>
                            {membershipPaymentStatusLabel(member.basePaymentStatus)}
                        </Badge>
                    ) : null}
                </div>
                {member.checkInBlocked ? <Badge variant="destructive">Check-in blocked</Badge> : null}
                <p className="truncate text-xs text-(--color-fg-muted)">
                    {member.clientEmail} · joined {formatJoined(member.joinedAt)}
                </p>
            </div>

            <ContactActions phone={member.clientPhone} email={member.clientEmail} />

            <WorkQueueRailSection title="Subscriptions">
                <ClientSubscriptionLines clientUserId={member.clientUserId} />
            </WorkQueueRailSection>

            {/* Keyed on the membership so the picker resets to this member's
                coach instead of keeping the previous selection. */}
            <MemberCoachSection key={member.membershipId} member={member} disabled={rowActionsPending} />

            <WorkQueueRailSection title="Check-in access">
                {member.checkInBlocked ? (
                    // Restoring access needs no ceremony.
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={rowActionsPending}
                        onClick={() => onSetCheckInBlock(member.membershipId, false)}
                    >
                        Unblock check-in
                    </Button>
                ) : (
                    <ConfirmActionDialog
                        trigger={<Button type="button" variant="outline" className="w-full" />}
                        title={`Block check-in for ${member.clientName}?`}
                        description="They will be turned away at the desk even though their subscription dates are still valid. This is a manual override, not a billing consequence — you can unblock at any time."
                        confirmLabel="Block check-in"
                        destructive={false}
                        disabled={rowActionsPending}
                        onConfirm={() => onSetCheckInBlock(member.membershipId, true)}
                    >
                        Block check-in
                    </ConfirmActionDialog>
                )}
                <p className="text-xs text-(--color-fg-muted)">
                    {/* The rule this control is most often misread as enforcing. */}A block is a manual safety valve.
                    Unpaid members are not blocked automatically — entitlement follows subscription dates.
                </p>
            </WorkQueueRailSection>

            <WorkQueueRailSection title="Danger zone">
                <ConfirmActionDialog
                    trigger={<Button type="button" variant="destructive" className="w-full" />}
                    title={`Offboard ${member.clientName}?`}
                    description="They stop appearing on the roster and can no longer be marked in at the desk. Their attendance and billing history is kept."
                    confirmLabel="Offboard"
                    disabled={rowActionsPending}
                    onConfirm={() => onOffboard(member.membershipId)}
                >
                    Offboard member
                </ConfirmActionDialog>
            </WorkQueueRailSection>
        </WorkQueueRailPanel>
    );
}
