import { describe, expect, it } from 'vitest';

import type { RenewalDueItem } from '@/modules/subscriptions/subscriptions-ports';
import {
    daysUntil,
    formatRenewalDue,
    isoDateOffset,
    outstandingAmount,
    renewalUrgency,
    renewalUrgencyTone,
    summarizeRenewals,
} from '@/modules/subscriptions/subscriptions-labels';

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

describe('date maths', () => {
    it('counts whole days forward and backward from today', () => {
        expect(daysUntil('2026-08-21', TODAY)).toBe(1);
        expect(daysUntil(TODAY, TODAY)).toBe(0);
        expect(daysUntil('2026-08-18', TODAY)).toBe(-2);
    });

    it('offsets across a month boundary', () => {
        expect(isoDateOffset(15, TODAY)).toBe('2026-09-04');
        expect(isoDateOffset(-21, TODAY)).toBe('2026-07-30');
    });
});

describe('renewalUrgency', () => {
    it('separates overdue, today and the next seven days', () => {
        expect(renewalUrgency('2026-08-19', TODAY)).toBe('overdue');
        expect(renewalUrgency(TODAY, TODAY)).toBe('today');
        expect(renewalUrgency('2026-08-27', TODAY)).toBe('soon');
    });

    it('treats day eight as later, not soon', () => {
        expect(renewalUrgency('2026-08-27', TODAY)).toBe('soon');
        expect(renewalUrgency('2026-08-28', TODAY)).toBe('later');
    });

    it('calls a line with no end date unscheduled, never overdue', () => {
        // `startSource: FIRST_ATTENDANCE` — the member has not shown up yet, so
        // the window has not opened. Nothing is late.
        expect(renewalUrgency(null, TODAY)).toBe('unscheduled');
    });
});

describe('renewalUrgencyTone', () => {
    it('reserves danger for a window that has actually closed', () => {
        expect(renewalUrgencyTone('overdue')).toBe('danger');
    });

    it('keeps everything still running on the warning/neutral side', () => {
        expect(renewalUrgencyTone('today')).toBe('warning');
        expect(renewalUrgencyTone('soon')).toBe('warning');
        expect(renewalUrgencyTone('later')).toBe('neutral');
        expect(renewalUrgencyTone('unscheduled')).toBe('neutral');
    });
});

describe('formatRenewalDue', () => {
    it('speaks in days, not ISO dates', () => {
        expect(formatRenewalDue('2026-08-19', TODAY)).toBe('Expired yesterday');
        expect(formatRenewalDue('2026-08-15', TODAY)).toBe('Expired 5 days ago');
        expect(formatRenewalDue(TODAY, TODAY)).toBe('Ends today');
        expect(formatRenewalDue('2026-08-21', TODAY)).toBe('Ends tomorrow');
        expect(formatRenewalDue('2026-08-24', TODAY)).toBe('Ends in 4 days');
        expect(formatRenewalDue(null, TODAY)).toBe('Not started yet');
    });
});

describe('outstandingAmount', () => {
    it('is the unpaid remainder', () => {
        expect(outstandingAmount({ priceAmount: 1000, amountPaid: 400 })).toBe(600);
    });

    it('never reports a negative debt when a member overpays', () => {
        expect(outstandingAmount({ priceAmount: 1000, amountPaid: 1200 })).toBe(0);
    });
});

describe('summarizeRenewals', () => {
    it('adds up billed, collected and outstanding across the window', () => {
        const summary = summarizeRenewals([
            renewal({ id: 'a', priceAmount: 1000, amountPaid: 0 }),
            renewal({ id: 'b', priceAmount: 1500, amountPaid: 500, paymentStatus: 'partial' }),
            renewal({ id: 'c', priceAmount: 800, amountPaid: 800, paymentStatus: 'paid' }),
        ]);

        expect(summary).toEqual({
            count: 3,
            billed: 3300,
            collected: 1300,
            outstanding: 2000,
            unsettledCount: 2,
        });
    });

    it('reports zeroes rather than NaN for an empty window', () => {
        expect(summarizeRenewals([])).toEqual({
            count: 0,
            billed: 0,
            collected: 0,
            outstanding: 0,
            unsettledCount: 0,
        });
    });
});
