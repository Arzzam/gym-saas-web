import { describe, expect, it } from 'vitest';

import { buildDeskRows, filterDeskRows, summarizeDesk } from '@/modules/attendance/attendance-desk';
import type { Attendance } from '@/modules/attendance/attendance-ports';
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

function attendance(overrides: Partial<Attendance> = {}): Attendance {
    return {
        id: 'att-1',
        clientUserId: 'client-1',
        gymOrgId: 'gym-1',
        occurredAt: '2026-08-20T07:30:00.000Z',
        recordedBy: 'ADMIN',
        recorderUserId: 'staff-1',
        createdAt: '2026-08-20T07:30:00.000Z',
        baseStarted: false,
        ...overrides,
    };
}

describe('buildDeskRows', () => {
    it('marks who is already in, and how they got marked', () => {
        const [row] = buildDeskRows([member()], [attendance({ recordedBy: 'CLIENT' })]);

        expect(row.checkedInAt).toBe('2026-08-20T07:30:00.000Z');
        expect(row.checkedInBy).toBe('CLIENT');
    });

    it('leaves a member who has not arrived with no check-in', () => {
        const [row] = buildDeskRows([member()], []);

        expect(row.checkedInAt).toBeNull();
        expect(row.checkedInBy).toBeNull();
    });

    it('keeps the earliest arrival when a member is recorded twice', () => {
        // A self check-in followed by a desk mark is normal; the desk cares
        // when they arrived, not how many rows the API holds.
        const [row] = buildDeskRows(
            [member()],
            [
                attendance({ id: 'late', occurredAt: '2026-08-20T09:00:00.000Z', recordedBy: 'ADMIN' }),
                attendance({ id: 'early', occurredAt: '2026-08-20T06:15:00.000Z', recordedBy: 'CLIENT' }),
            ],
        );

        expect(row.checkedInAt).toBe('2026-08-20T06:15:00.000Z');
        expect(row.checkedInBy).toBe('CLIENT');
    });

    it('puts members the desk can still act on first', () => {
        const rows = buildDeskRows(
            [
                member({ membershipId: 'in', clientUserId: 'client-1', clientName: 'Aaa In' }),
                member({ membershipId: 'out', clientUserId: 'client-2', clientName: 'Zzz Out' }),
            ],
            [attendance({ clientUserId: 'client-1' })],
        );

        // Alphabetically 'Aaa In' sorts first, but they are already marked.
        expect(rows.map((row) => row.member.clientName)).toEqual(['Zzz Out', 'Aaa In']);
    });

    it('ignores attendance for someone not on the roster', () => {
        const rows = buildDeskRows([member()], [attendance({ clientUserId: 'stranger' })]);

        expect(rows).toHaveLength(1);
        expect(rows[0].checkedInAt).toBeNull();
    });
});

describe('filterDeskRows', () => {
    const rows = buildDeskRows(
        [
            member(),
            member({
                membershipId: 'mem-2',
                clientUserId: 'client-2',
                clientName: 'Rahul Menon',
                clientEmail: 'rahul@example.com',
                clientPhone: '+919876500002',
            }),
        ],
        [],
    );

    it('matches name, email and phone case-insensitively', () => {
        expect(filterDeskRows(rows, 'rAhUl')).toHaveLength(1);
        expect(filterDeskRows(rows, 'ada@')).toHaveLength(1);
        expect(filterDeskRows(rows, '9876500002')).toHaveLength(1);
    });

    it('returns everyone for a blank query', () => {
        expect(filterDeskRows(rows, '  ')).toHaveLength(2);
    });
});

describe('summarizeDesk', () => {
    it('splits self check-ins from desk marks', () => {
        const rows = buildDeskRows(
            [
                member({ membershipId: 'a', clientUserId: 'client-1' }),
                member({ membershipId: 'b', clientUserId: 'client-2' }),
                member({ membershipId: 'c', clientUserId: 'client-3' }),
            ],
            [
                attendance({ clientUserId: 'client-1', recordedBy: 'CLIENT' }),
                attendance({ clientUserId: 'client-2', recordedBy: 'ADMIN' }),
            ],
        );

        expect(summarizeDesk(rows)).toEqual({
            activeMembers: 3,
            checkedIn: 2,
            selfCheckIns: 1,
            deskMarks: 1,
        });
    });
});
