'use client';

import { ErrorNotice } from '@/components/admin/error-notice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import {
    membershipPaymentStatusLabel,
    membershipPaymentStatusTone,
} from '@/modules/membership-invites/membership-invites-labels';
import { useActiveRoster, useOffboardMember, useSetCheckInBlock } from '@/modules/roster/roster-hooks';

export function RosterPanel() {
    // Hydrated from the page's server prefetch — same query key (ADR-0011).
    const { data: members = [], error: listQueryError } = useActiveRoster();
    const setCheckInBlock = useSetCheckInBlock();
    const offboardMember = useOffboardMember();

    const isPending = setCheckInBlock.isPending || offboardMember.isPending;
    const listError = listQueryError?.message ?? null;
    const error = setCheckInBlock.error?.message ?? offboardMember.error?.message ?? null;

    const active = members.filter((member) => member.status === 'ACTIVE');

    function handleOffboard(membershipId: string) {
        offboardMember.mutate({ membershipId });
    }

    function handleCheckInBlock(membershipId: string, blocked: boolean) {
        setCheckInBlock.mutate({ membershipId, blocked });
    }

    return (
        <section className="space-y-3" aria-labelledby="roster-heading">
            <div>
                <h2 id="roster-heading" className="text-sm font-semibold text-(--color-fg)">
                    Active roster
                </h2>
                <p className="mt-1 text-sm text-(--color-fg-muted)">
                    Payment badges are informational. Check-in block is a manual safety valve — entitlement still
                    follows subscription dates.
                </p>
            </div>

            <ErrorNotice message={error ?? listError} />

            {active.length === 0 ? (
                <p className="text-sm text-(--color-fg-muted)">No active members yet. Accepted invites appear here.</p>
            ) : (
                <div className="overflow-hidden rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface)">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-(--color-border) text-xs tracking-wide text-(--color-fg-muted) uppercase hover:bg-transparent">
                                <TableHead className="px-4 py-3 text-(--color-fg-muted)">Member</TableHead>
                                <TableHead className="px-4 py-3 text-(--color-fg-muted)">Payment</TableHead>
                                <TableHead className="px-4 py-3 text-(--color-fg-muted)">Check-in</TableHead>
                                <TableHead className="px-4 py-3 text-(--color-fg-muted)">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {active.map((member) => (
                                <TableRow key={member.membershipId} className="border-(--color-border)">
                                    <TableCell className="px-4 py-3 whitespace-normal">
                                        <p className="font-medium text-(--color-fg)">{member.clientName}</p>
                                        <p className="text-xs text-(--color-fg-muted)">
                                            {member.clientEmail}
                                            {member.clientPhone ? ` · ${member.clientPhone}` : ''}
                                        </p>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge
                                            variant={
                                                member.basePaymentStatus
                                                    ? statusToneBadgeVariant(
                                                          membershipPaymentStatusTone(member.basePaymentStatus),
                                                      )
                                                    : 'outline'
                                            }
                                        >
                                            {member.basePaymentStatus
                                                ? membershipPaymentStatusLabel(member.basePaymentStatus)
                                                : '—'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge
                                            variant={statusToneBadgeVariant(
                                                member.checkInBlocked ? 'danger' : 'neutral',
                                            )}
                                            data-testid={`check-in-status-${member.membershipId}`}
                                        >
                                            {member.checkInBlocked ? 'Blocked' : 'Allowed'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 whitespace-normal">
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                disabled={isPending}
                                                onClick={() =>
                                                    handleCheckInBlock(member.membershipId, !member.checkInBlocked)
                                                }
                                            >
                                                {member.checkInBlocked ? 'Unblock check-in' : 'Block check-in'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                disabled={isPending}
                                                onClick={() => handleOffboard(member.membershipId)}
                                            >
                                                Offboard
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </section>
    );
}
