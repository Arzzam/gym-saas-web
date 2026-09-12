'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import {
    membershipPaymentStatusLabel,
    membershipPaymentStatusTone,
} from '@/modules/membership-invites/membership-invites-labels';
import { useMyAssignedMembers } from '@/modules/roster/roster-hooks';

/** Trainer view: clients assigned to the signed-in trainer profile. */
export function AssignedMembersPanel(): ReactElement {
    const { data: members = [], error: listQueryError } = useMyAssignedMembers();
    const active = members.filter((member) => member.status === 'ACTIVE');

    return (
        <section className="space-y-3" aria-labelledby="assigned-members-heading">
            <div>
                <h2 id="assigned-members-heading" className="text-sm font-semibold text-(--color-fg)">
                    Your assigned clients
                </h2>
                <p className="mt-1 text-sm text-(--color-fg-muted)">
                    Members an Admin assigned to you. Open Profile for grant-aware vitals and progress.
                </p>
            </div>

            {listQueryError ? (
                <p
                    className="rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-danger)"
                    role="alert"
                >
                    {listQueryError.message}
                </p>
            ) : null}

            {active.length === 0 ? (
                <p className="text-sm text-(--color-fg-muted)">
                    No clients assigned to you yet. Ask an Admin to assign members from the roster.
                </p>
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
                                        >
                                            {member.checkInBlocked ? 'Blocked' : 'Allowed'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Link
                                            href={`/admin/members/${member.clientUserId}`}
                                            className={buttonVariants({ variant: 'secondary' })}
                                        >
                                            Profile
                                        </Link>
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
