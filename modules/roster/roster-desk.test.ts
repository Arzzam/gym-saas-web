import { describe, expect, it } from 'vitest';

import type { MembershipInvite } from '@/modules/membership-invites/membership-invites-ports';
import {
    buildInviteRows,
    buildMemberRows,
    filterInviteRows,
    filterMemberRows,
    memberRowTone,
    parseMemberScope,
    summarizeMembers,
} from '@/modules/roster/roster-desk';
import type { RosterMember } from '@/modules/roster/roster-ports';

function member(overrides: Partial<RosterMember> = {}): RosterMember {
    return {
        membershipId: 'mem-1',
        clientUserId: 'client-1',
        gymOrgId: 'gym-1',
        status: 'ACTIVE',
        checkInBlocked: false,
        assignedTrainerId: null,
        clientName: 'Ada Client',
        clientEmail: 'ada@example.com',
        clientPhone: '+919876500001',
        joinedAt: '2026-07-01T00:00:00.000Z',
        leftAt: null,
        basePaymentStatus: 'paid',
        baseAmountPaid: 999,
        basePriceAmount: 999,
        ...overrides,
    };
}

function invite(overrides: Partial<MembershipInvite> = {}): MembershipInvite {
    return {
        id: 'inv-1',
        gymOrgId: 'gym-1',
        invitedEmail: 'alex@example.com',
        invitedUserId: null,
        inviteeName: 'Alex Client',
        inviteePhone: null,
        basePlanId: 'plan-1',
        basePaymentStatus: 'unpaid',
        addonPlanId: null,
        addonPaymentStatus: null,
        status: 'PENDING',
        expiresAt: '2026-08-30T00:00:00.000Z',
        createdBy: 'staff-1',
        acceptedAt: null,
        acceptedMembershipId: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('parseMemberScope', () => {
    it('defaults to members for anything but an explicit invites scope', () => {
        expect(parseMemberScope('invites')).toBe('invites');
        expect(parseMemberScope('members')).toBe('members');
        expect(parseMemberScope('nonsense')).toBe('members');
        expect(parseMemberScope(null)).toBe('members');
    });
});

describe('memberRowTone', () => {
    it('reserves danger for the one state that actually denies access', () => {
        expect(memberRowTone(member({ checkInBlocked: true }))).toBe('danger');
    });

    it('leaves an unpaid member neutral, because they still train', () => {
        // Entitlement follows subscription dates, not payment status.
        expect(memberRowTone(member({ basePaymentStatus: 'unpaid' }))).toBe('neutral');
    });
});

describe('buildMemberRows', () => {
    it('drops anyone no longer active', () => {
        const rows = buildMemberRows([
            member({ membershipId: 'in' }),
            member({ membershipId: 'out', status: 'INACTIVE' }),
        ]);
        expect(rows.map((row) => row.member.membershipId)).toEqual(['in']);
    });

    it('puts blocked members first, since they are the ones needing a decision', () => {
        const rows = buildMemberRows([
            member({ membershipId: 'ok', clientName: 'Aaa Fine' }),
            member({ membershipId: 'blocked', clientName: 'Zzz Blocked', checkInBlocked: true }),
        ]);

        expect(rows.map((row) => row.member.membershipId)).toEqual(['blocked', 'ok']);
    });
});

describe('filterMemberRows', () => {
    const rows = buildMemberRows([
        member(),
        member({
            membershipId: 'mem-2',
            clientName: 'Rahul Menon',
            clientEmail: 'rahul@example.com',
            clientPhone: '+919876500002',
        }),
    ]);

    it('matches name, email and phone case-insensitively', () => {
        expect(filterMemberRows(rows, 'rAhUl')).toHaveLength(1);
        expect(filterMemberRows(rows, 'ada@')).toHaveLength(1);
        expect(filterMemberRows(rows, '9876500002')).toHaveLength(1);
    });

    it('returns everyone for a blank query', () => {
        expect(filterMemberRows(rows, '  ')).toHaveLength(2);
    });
});

describe('buildInviteRows', () => {
    it('puts pending invites first — they are the only actionable ones', () => {
        const rows = buildInviteRows([
            invite({ id: 'done', inviteeName: 'Aaa Accepted', status: 'ACCEPTED' }),
            invite({ id: 'open', inviteeName: 'Zzz Pending', status: 'PENDING' }),
        ]);

        expect(rows.map((row) => row.invite.id)).toEqual(['open', 'done']);
    });
});

describe('filterInviteRows', () => {
    it('matches the invitee name and email', () => {
        const rows = buildInviteRows([
            invite(),
            invite({ id: 'inv-2', inviteeName: 'Priya', invitedEmail: 'p@x.com' }),
        ]);

        expect(filterInviteRows(rows, 'alex')).toHaveLength(1);
        expect(filterInviteRows(rows, 'p@x')).toHaveLength(1);
    });
});

describe('summarizeMembers', () => {
    it('counts blocked and owing separately, and only pending invites', () => {
        const memberRows = buildMemberRows([
            member({ membershipId: '1', basePaymentStatus: 'paid' }),
            member({ membershipId: '2', basePaymentStatus: 'unpaid' }),
            member({ membershipId: '3', basePaymentStatus: 'partial', checkInBlocked: true }),
            // A roster row with no billing snapshot is unknown, not unpaid.
            member({ membershipId: '4', basePaymentStatus: null }),
        ]);
        const inviteRows = buildInviteRows([invite({ id: 'a' }), invite({ id: 'b', status: 'REVOKED' })]);

        expect(summarizeMembers(memberRows, inviteRows)).toEqual({
            activeMembers: 4,
            blocked: 1,
            pendingInvites: 1,
            owing: 2,
        });
    });
});
