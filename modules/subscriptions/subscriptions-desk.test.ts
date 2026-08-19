import { describe, expect, it } from 'vitest';

import type { MembershipPlan } from '@/modules/plans/plans-ports';
import type { RosterMember } from '@/modules/roster/roster-ports';
import type { RenewalDueItem } from '@/modules/subscriptions/subscriptions-ports';
import {
    buildRenewalRows,
    filterRenewalRows,
    parseRenewalPaymentFilter,
    parseRenewalWindow,
    renewalWindow,
} from '@/modules/subscriptions/subscriptions-desk';

const TODAY = '2026-08-20';

function renewal(overrides: Partial<RenewalDueItem> = {}): RenewalDueItem {
    return {
        id: 'sub-1',
        clientMembershipId: 'mem-1',
        gymOrgId: 'gym-1',
        planId: 'plan-1',
        kind: 'BASE',
        capability: null,
        priceAmount: 1000,
        durationDays: 30,
        startDate: '2026-07-22',
        endDate: '2026-08-21',
        startSource: 'FIRST_ATTENDANCE',
        paymentStatus: 'unpaid',
        amountPaid: 0,
        createdAt: '2026-07-22T00:00:00.000Z',
        updatedAt: '2026-07-22T00:00:00.000Z',
        clientUserId: 'client-1',
        ...overrides,
    };
}

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
        basePaymentStatus: 'unpaid',
        baseAmountPaid: 0,
        basePriceAmount: 1000,
        ...overrides,
    };
}

function plan(overrides: Partial<MembershipPlan> = {}): MembershipPlan {
    return {
        id: 'plan-1',
        gymOrgId: 'gym-1',
        name: 'Monthly Membership',
        kind: 'BASE',
        capability: null,
        durationDays: 30,
        price: 1000,
        active: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('renewalWindow', () => {
    it('looks forward for the due windows', () => {
        expect(renewalWindow('today', TODAY)).toMatchObject({ onOrAfter: TODAY, onOrBefore: TODAY });
        expect(renewalWindow('week', TODAY)).toMatchObject({ onOrAfter: TODAY, onOrBefore: '2026-08-27' });
        expect(renewalWindow('month', TODAY)).toMatchObject({ onOrAfter: TODAY, onOrBefore: '2026-09-19' });
    });

    it('looks back for overdue, and stops at yesterday so today is not double-counted', () => {
        expect(renewalWindow('overdue', TODAY)).toMatchObject({
            onOrAfter: '2026-05-22',
            onOrBefore: '2026-08-19',
        });
    });
});

describe('filter parsing', () => {
    it('falls back to the default window for junk in the URL', () => {
        expect(parseRenewalWindow('month')).toBe('month');
        expect(parseRenewalWindow('decade')).toBe('week');
        expect(parseRenewalWindow(undefined)).toBe('week');
    });

    it('falls back to "all" for an unknown payment filter', () => {
        expect(parseRenewalPaymentFilter('partial')).toBe('partial');
        expect(parseRenewalPaymentFilter('owing')).toBe('all');
        expect(parseRenewalPaymentFilter(null)).toBe('all');
    });
});

describe('buildRenewalRows', () => {
    it('joins each renewal to its roster member', () => {
        const [row] = buildRenewalRows({ renewals: [renewal()], members: [member()], today: TODAY });

        expect(row.displayName).toBe('Ada Client');
        expect(row.member?.clientPhone).toBe('+919876500001');
        expect(row.dueLabel).toBe('Ends tomorrow');
        expect(row.outstanding).toBe(1000);
    });

    it('falls back to a short id when the client is off the active roster', () => {
        const [row] = buildRenewalRows({
            renewals: [renewal({ clientUserId: 'abcdef1234567890' })],
            members: [],
            today: TODAY,
        });

        expect(row.member).toBeNull();
        expect(row.displayName).toBe('Member abcdef12');
    });

    it('names the plan behind the line, so the Admin knows which membership this is', () => {
        const [row] = buildRenewalRows({
            renewals: [renewal({ planId: 'plan-q' })],
            members: [member()],
            plans: [plan({ id: 'plan-q', name: 'Quarterly Membership', durationDays: 90 })],
            today: TODAY,
        });

        expect(row.planLabel).toBe('Quarterly Membership · 90 days');
    });

    it('spells out an add-on capability', () => {
        const [row] = buildRenewalRows({
            renewals: [renewal({ planId: 'plan-pt', kind: 'ADDON' })],
            members: [member()],
            plans: [
                plan({
                    id: 'plan-pt',
                    name: 'Personal Training',
                    kind: 'ADDON',
                    capability: 'TRAINER_COACHING',
                }),
            ],
            today: TODAY,
        });

        expect(row.planLabel).toBe('Personal Training · Trainer coaching · 30 days');
    });

    it('falls back to the kind when the plan has been deleted from the catalog', () => {
        // The subscription is a price snapshot and stays valid; blanking the
        // row because the catalog moved on would lose a real renewal.
        const [row] = buildRenewalRows({
            renewals: [renewal({ planId: 'plan-gone' })],
            members: [member()],
            plans: [],
            today: TODAY,
        });

        expect(row.plan).toBeNull();
        expect(row.planLabel).toBe('Membership');
    });

    it('orders the queue by urgency, so the overdue line is the first thing read', () => {
        const rows = buildRenewalRows({
            renewals: [
                renewal({ id: 'later', endDate: '2026-09-10', clientUserId: 'c3' }),
                renewal({ id: 'overdue', endDate: '2026-08-14', clientUserId: 'c1' }),
                renewal({ id: 'soon', endDate: '2026-08-23', clientUserId: 'c2' }),
            ],
            members: [],
            today: TODAY,
        });

        expect(rows.map((row) => row.renewal.id)).toEqual(['overdue', 'soon', 'later']);
    });

    it('breaks an urgency tie on the earlier end date', () => {
        const rows = buildRenewalRows({
            renewals: [
                renewal({ id: 'day-6', endDate: '2026-08-26', clientUserId: 'c2' }),
                renewal({ id: 'day-2', endDate: '2026-08-22', clientUserId: 'c1' }),
            ],
            members: [],
            today: TODAY,
        });

        expect(rows.map((row) => row.renewal.id)).toEqual(['day-2', 'day-6']);
    });
});

describe('filterRenewalRows', () => {
    const rows = buildRenewalRows({
        renewals: [
            renewal({ id: 'unpaid', clientUserId: 'client-1' }),
            renewal({ id: 'partial', clientUserId: 'client-2', paymentStatus: 'partial', amountPaid: 400 }),
            renewal({ id: 'paid', clientUserId: 'client-3', paymentStatus: 'paid', amountPaid: 1000 }),
        ],
        members: [
            member(),
            member({
                clientUserId: 'client-2',
                clientName: 'Rahul Menon',
                clientEmail: 'rahul@example.com',
                clientPhone: '+919876500002',
            }),
            member({
                clientUserId: 'client-3',
                clientName: 'Priya Sharma',
                clientEmail: 'priya@example.com',
                clientPhone: null,
            }),
        ],
        today: TODAY,
    });

    it('narrows to one payment status', () => {
        const partial = filterRenewalRows(rows, { payment: 'partial', query: '' });
        expect(partial.map((row) => row.renewal.id)).toEqual(['partial']);
    });

    it('matches a name case-insensitively', () => {
        const found = filterRenewalRows(rows, { payment: 'all', query: 'rAhUl' });
        expect(found.map((row) => row.displayName)).toEqual(['Rahul Menon']);
    });

    it('matches on email and phone, because the Admin often has one and not the name', () => {
        expect(filterRenewalRows(rows, { payment: 'all', query: 'priya@' })).toHaveLength(1);
        expect(filterRenewalRows(rows, { payment: 'all', query: '9876500001' })).toHaveLength(1);
    });

    it('combines the payment filter with the search rather than replacing it', () => {
        expect(filterRenewalRows(rows, { payment: 'paid', query: 'rahul' })).toHaveLength(0);
        expect(filterRenewalRows(rows, { payment: 'paid', query: 'priya' })).toHaveLength(1);
    });

    it('ignores surrounding whitespace in the search box', () => {
        expect(filterRenewalRows(rows, { payment: 'all', query: '   ' })).toHaveLength(3);
    });
});
