'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { ErrorNotice } from '@/components/admin/error-notice';
import { MetricStrip, type Metric } from '@/components/admin/metric-strip';
import { SegmentedFilter, type Segment } from '@/components/admin/segmented-filter';
import { WorkQueue, WorkQueueLayout, WorkQueueRow } from '@/components/admin/work-queue-layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useShallowSearchParam } from '@/hooks/use-shallow-search-param';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import { InviteDetailRail } from '@/modules/membership-invites/components/invite-detail-rail';
import { MemberInviteDialog } from '@/modules/membership-invites/components/member-invite-dialog';
import {
    useMembershipInvitesPage,
    useRevokeMembershipInvite,
} from '@/modules/membership-invites/membership-invites-hooks';
import {
    formatInviteExpiry,
    membershipInviteStatusLabel,
    membershipInviteStatusTone,
    membershipPaymentStatusLabel,
    membershipPaymentStatusTone,
} from '@/modules/membership-invites/membership-invites-labels';
import { MemberDetailRail } from '@/modules/roster/components/member-detail-rail';
import {
    buildInviteRows,
    buildMemberRows,
    filterInviteRows,
    filterMemberRows,
    memberRowTone,
    summarizeMembers,
    type InviteRow,
    type MemberRow,
    type MemberScope,
} from '@/modules/roster/roster-desk';
import { useActiveRoster, useOffboardMember, useSetCheckInBlock } from '@/modules/roster/roster-hooks';

/**
 * One desk for everyone connected to the gym.
 *
 * This page used to stack three panels: a seven-field invite form, an invites
 * list, and the roster table — so the roster, the thing an Admin actually opens
 * this page for, started two screens down.
 *
 * Members and invites stay **separate query keys** (they are mutated
 * independently — a check-in block must not refetch invites), but they share
 * one queue via a scope filter, because an Admin looking for a person should
 * not have to know which list that person is currently in.
 */

type MembersDeskPanelProps = {
    initialScope: MemberScope;
};

const SCOPE_LABEL: Record<MemberScope, string> = {
    members: 'Members',
    invites: 'Invites',
};

export function MembersDeskPanel({ initialScope }: MembersDeskPanelProps) {
    // Hydrated from the page's server prefetch — same query keys (ADR-0011).
    const { data: members = [], error: rosterError } = useActiveRoster();
    const { data: inviteData, error: invitesError } = useMembershipInvitesPage();

    // Owned here, not in the rails: offboard and revoke both remove their row,
    // which unmounts the rail and would take the mutation's error with it.
    const setCheckInBlock = useSetCheckInBlock();
    const offboardMember = useOffboardMember();
    const revokeInvite = useRevokeMembershipInvite();
    const rowActionsPending = setCheckInBlock.isPending || offboardMember.isPending || revokeInvite.isPending;

    const [scope, setScope] = useShallowSearchParam<MemberScope>('scope', initialScope, 'members');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const invites = useMemo(() => inviteData?.invites ?? [], [inviteData]);
    const basePlans = inviteData?.basePlans ?? [];
    const addonPlans = inviteData?.addonPlans ?? [];

    const memberRows = useMemo(() => buildMemberRows(members), [members]);
    const inviteRows = useMemo(() => buildInviteRows(invites), [invites]);
    const summary = useMemo(() => summarizeMembers(memberRows, inviteRows), [memberRows, inviteRows]);

    const visibleMembers = useMemo(() => filterMemberRows(memberRows, query), [memberRows, query]);
    const visibleInvites = useMemo(() => filterInviteRows(inviteRows, query), [inviteRows, query]);

    // Derived, not stored: switching scope or searching falls back to the top
    // of whichever queue is showing rather than leaving a stale rail behind.
    const selectedMember: MemberRow | null =
        visibleMembers.find((row) => row.member.membershipId === selectedId) ?? visibleMembers[0] ?? null;
    const selectedInvite: InviteRow | null =
        visibleInvites.find((row) => row.invite.id === selectedId) ?? visibleInvites[0] ?? null;

    function planName(planId: string): string {
        const plan = basePlans.find((item) => item.id === planId) ?? addonPlans.find((item) => item.id === planId);
        return plan?.name ?? planId.slice(0, 8);
    }

    const segments: Segment<MemberScope>[] = [
        { value: 'members', label: SCOPE_LABEL.members, count: memberRows.length },
        { value: 'invites', label: SCOPE_LABEL.invites, count: inviteRows.length },
    ];

    const metrics: Metric[] = [
        { label: 'Members', value: String(summary.activeMembers), hint: 'active today' },
        {
            label: 'Owing',
            value: String(summary.owing),
            // Money owed needs attention; it never denies access on its own.
            tone: summary.owing > 0 ? 'warning' : 'neutral',
        },
        {
            label: 'Blocked',
            value: String(summary.blocked),
            // The one state that actually denies access.
            tone: summary.blocked > 0 ? 'danger' : 'neutral',
        },
        { label: 'Pending invites', value: String(summary.pendingInvites) },
    ];

    const message =
        rosterError?.message ??
        invitesError?.message ??
        setCheckInBlock.error?.message ??
        offboardMember.error?.message ??
        revokeInvite.error?.message ??
        null;

    const showingMembers = scope === 'members';
    const isEmpty = showingMembers ? visibleMembers.length === 0 : visibleInvites.length === 0;
    const hasAny = showingMembers ? memberRows.length > 0 : inviteRows.length > 0;

    return (
        <div className="space-y-4">
            <ErrorNotice message={message} />

            <WorkQueueLayout
                selectedKey={
                    showingMembers ? (selectedMember?.member.membershipId ?? null) : (selectedInvite?.invite.id ?? null)
                }
                railLabel={showingMembers ? 'Selected member' : 'Selected invite'}
                summary={<MetricStrip metrics={metrics} label="Members summary" />}
                toolbar={
                    <div className="flex flex-wrap items-center gap-2">
                        <SegmentedFilter
                            segments={segments}
                            value={scope}
                            onChange={(next) => {
                                setScope(next);
                                // Ids do not carry across the two lists.
                                setSelectedId(null);
                            }}
                            label="Show members or invites"
                        />
                        <div className="relative min-w-48 flex-1">
                            <Search
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--color-fg-muted)"
                            />
                            <Input
                                type="search"
                                className="pl-8"
                                placeholder="Search name, email or phone"
                                aria-label="Search members"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </div>
                        <MemberInviteDialog basePlans={basePlans} addonPlans={addonPlans} />
                    </div>
                }
                queue={
                    isEmpty ? (
                        <EmptyQueue scope={scope} hasAny={hasAny} hasPlans={basePlans.length > 0} />
                    ) : showingMembers ? (
                        <WorkQueue label="Members">
                            {visibleMembers.map((row) => (
                                <WorkQueueRow
                                    key={row.member.membershipId}
                                    tone={memberRowTone(row.member)}
                                    selected={row.member.membershipId === selectedMember?.member.membershipId}
                                    onSelect={() => setSelectedId(row.member.membershipId)}
                                    selectLabel={`Open ${row.member.clientName}`}
                                    title={row.member.clientName}
                                    meta={row.member.clientPhone ?? row.member.clientEmail}
                                    trailing={
                                        <>
                                            {row.member.checkInBlocked ? (
                                                <Badge variant="destructive">Blocked</Badge>
                                            ) : null}
                                            {row.member.basePaymentStatus ? (
                                                <Badge
                                                    variant={statusToneBadgeVariant(
                                                        membershipPaymentStatusTone(row.member.basePaymentStatus),
                                                    )}
                                                >
                                                    {membershipPaymentStatusLabel(row.member.basePaymentStatus)}
                                                </Badge>
                                            ) : null}
                                        </>
                                    }
                                />
                            ))}
                        </WorkQueue>
                    ) : (
                        <WorkQueue label="Membership invites">
                            {visibleInvites.map((row) => (
                                <WorkQueueRow
                                    key={row.invite.id}
                                    tone={row.invite.status === 'EXPIRED' ? 'warning' : 'neutral'}
                                    selected={row.invite.id === selectedInvite?.invite.id}
                                    onSelect={() => setSelectedId(row.invite.id)}
                                    selectLabel={`Open ${row.invite.inviteeName}`}
                                    title={row.invite.inviteeName}
                                    meta={
                                        <>
                                            {row.invite.invitedEmail} · expires{' '}
                                            {formatInviteExpiry(row.invite.expiresAt)}
                                        </>
                                    }
                                    trailing={
                                        <Badge
                                            variant={statusToneBadgeVariant(
                                                membershipInviteStatusTone(row.invite.status),
                                            )}
                                        >
                                            {membershipInviteStatusLabel(row.invite.status)}
                                        </Badge>
                                    }
                                />
                            ))}
                        </WorkQueue>
                    )
                }
                rail={
                    showingMembers ? (
                        <MemberDetailRail
                            row={selectedMember}
                            onSetCheckInBlock={(membershipId, blocked) =>
                                setCheckInBlock.mutate({ membershipId, blocked })
                            }
                            onOffboard={(membershipId) => offboardMember.mutate({ membershipId })}
                            rowActionsPending={rowActionsPending}
                        />
                    ) : (
                        <InviteDetailRail
                            row={selectedInvite}
                            planName={planName}
                            onRevoke={(membershipInviteId) => revokeInvite.mutate({ membershipInviteId })}
                            rowActionsPending={rowActionsPending}
                        />
                    )
                }
            />
        </div>
    );
}

function EmptyQueue({ scope, hasAny, hasPlans }: { scope: MemberScope; hasAny: boolean; hasPlans: boolean }) {
    const title = hasAny
        ? `No ${scope} match this search`
        : scope === 'members'
          ? 'No active members yet'
          : 'No invites yet';

    const description = hasAny
        ? 'Clear the search to see everyone.'
        : scope === 'members'
          ? 'Members appear here once they accept an invite.'
          : hasPlans
            ? 'Invite someone with the button above.'
            : 'Create an available membership under Plans before inviting anyone.';

    return (
        <div className="rounded-(--radius-panel) border border-(--color-border)/80 bg-(--color-surface) p-8 text-center shadow-(--shadow-panel)">
            <p className="text-sm font-medium text-(--color-fg)">{title}</p>
            <p className="mt-1 text-sm text-(--color-fg-muted)">{description}</p>
        </div>
    );
}
