import type { StatusTone } from '@/lib/ui/status-tone';
import type { MembershipInvite } from '@/modules/membership-invites/membership-invites-ports';
import type { RosterMember } from '@/modules/roster/roster-ports';

/**
 * Pure derivations for the members desk.
 *
 * The desk shows two different populations — people who are members, and people
 * who have been asked to become one — so the view-model covers both. They are
 * separate query keys and separate entities; what they share is that an Admin
 * looking for "a person connected to this gym" should not have to know which
 * list that person is currently in.
 */

export type MemberScope = 'members' | 'invites';

export function parseMemberScope(raw: string | null | undefined): MemberScope {
    return raw === 'invites' ? 'invites' : 'members';
}

export type MemberRow = {
    member: RosterMember;
};

/**
 * Blocked check-in is the app's one genuinely access-denying state
 * (`docs/ui-design-system.md` §3), so it is the only thing that lifts a member
 * off `neutral`. Payment does **not**: entitlement follows subscription dates,
 * and an unpaid member still trains (`000-project-context.mdc`).
 */
export function memberRowTone(member: RosterMember): StatusTone {
    return member.checkInBlocked ? 'danger' : 'neutral';
}

/** Blocked members first — they are the ones an Admin has to deal with. */
function byBlockedThenName(a: MemberRow, b: MemberRow): number {
    if (a.member.checkInBlocked !== b.member.checkInBlocked) {
        return a.member.checkInBlocked ? -1 : 1;
    }
    return a.member.clientName.localeCompare(b.member.clientName);
}

export function buildMemberRows(members: readonly RosterMember[]): MemberRow[] {
    return members
        .filter((member) => member.status === 'ACTIVE')
        .map((member) => ({ member }))
        .sort(byBlockedThenName);
}

export function filterMemberRows(rows: readonly MemberRow[], query: string): MemberRow[] {
    const q = query.trim().toLowerCase();
    if (!q) {
        return [...rows];
    }
    return rows.filter((row) =>
        [row.member.clientName, row.member.clientEmail, row.member.clientPhone].some((field) =>
            field?.toLowerCase().includes(q),
        ),
    );
}

export type InviteRow = {
    invite: MembershipInvite;
};

/**
 * Pending invites first, then everything settled. A `PENDING` invite is the
 * only one an Admin can still act on; accepted and revoked ones are history.
 */
function byPendingThenName(a: InviteRow, b: InviteRow): number {
    const aPending = a.invite.status === 'PENDING';
    const bPending = b.invite.status === 'PENDING';
    if (aPending !== bPending) {
        return aPending ? -1 : 1;
    }
    return a.invite.inviteeName.localeCompare(b.invite.inviteeName);
}

export function buildInviteRows(invites: readonly MembershipInvite[]): InviteRow[] {
    return invites.map((invite) => ({ invite })).sort(byPendingThenName);
}

export function filterInviteRows(rows: readonly InviteRow[], query: string): InviteRow[] {
    const q = query.trim().toLowerCase();
    if (!q) {
        return [...rows];
    }
    return rows.filter((row) =>
        [row.invite.inviteeName, row.invite.invitedEmail, row.invite.inviteePhone].some((field) =>
            field?.toLowerCase().includes(q),
        ),
    );
}

export type MembersSummary = {
    activeMembers: number;
    blocked: number;
    pendingInvites: number;
    owing: number;
};

export function summarizeMembers(memberRows: readonly MemberRow[], inviteRows: readonly InviteRow[]): MembersSummary {
    return {
        activeMembers: memberRows.length,
        blocked: memberRows.filter((row) => row.member.checkInBlocked).length,
        pendingInvites: inviteRows.filter((row) => row.invite.status === 'PENDING').length,
        // `basePaymentStatus` is null when the roster row carries no billing
        // snapshot; that is unknown, not unpaid, so it does not count as owing.
        owing: memberRows.filter(
            (row) => row.member.basePaymentStatus === 'unpaid' || row.member.basePaymentStatus === 'partial',
        ).length,
    };
}
