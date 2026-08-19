import type { StatusTone } from '@/lib/ui/status-tone';
import type { RenewalDueItem, Subscription } from '@/modules/subscriptions/subscriptions-ports';

/**
 * Pure derivations for the renewals desk. Nothing here talks to the network and
 * nothing here re-derives entitlement — it reframes the dates and money the API
 * already returned into the terms an Admin actually thinks in at the counter.
 *
 * Dates are compared as plain `YYYY-MM-DD` strings in UTC, matching how the
 * rest of the app builds its windows. A gym-timezone-aware "today" is a real
 * follow-up, but it belongs everywhere at once, not only here.
 */

export type RenewalUrgency = 'overdue' | 'today' | 'soon' | 'later' | 'unscheduled';

const MS_PER_DAY = 86_400_000;

export function isoToday(): string {
    return new Date().toISOString().slice(0, 10);
}

export function isoDateOffset(days: number, from: string = isoToday()): string {
    const date = new Date(`${from}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/** Whole days from `today` to `endDate`; negative once the window has closed. */
export function daysUntil(endDate: string, today: string = isoToday()): number {
    const end = Date.parse(`${endDate}T00:00:00.000Z`);
    const now = Date.parse(`${today}T00:00:00.000Z`);
    return Math.round((end - now) / MS_PER_DAY);
}

export function renewalUrgency(endDate: string | null, today: string = isoToday()): RenewalUrgency {
    if (!endDate) {
        // A line whose start was never triggered has no end date yet
        // (`startSource: FIRST_ATTENDANCE`). It is not late — it has not begun.
        return 'unscheduled';
    }
    const days = daysUntil(endDate, today);
    if (days < 0) {
        return 'overdue';
    }
    if (days === 0) {
        return 'today';
    }
    return days <= 7 ? 'soon' : 'later';
}

/**
 * `overdue` is the one urgency that earns `danger`, and it earns it on the
 * *dates* — the subscription window has closed, so entitlement has genuinely
 * lapsed (`000-project-context.mdc`). This is not the payment scale: an unpaid
 * member whose dates are still open stays `warning` and still trains
 * (`docs/ui-design-system.md` §3). The dot reads time; the badge reads money.
 */
export function renewalUrgencyTone(urgency: RenewalUrgency): StatusTone {
    switch (urgency) {
        case 'overdue':
            return 'danger';
        case 'today':
        case 'soon':
            return 'warning';
        case 'later':
        case 'unscheduled':
            return 'neutral';
    }
}

export function formatRenewalDue(endDate: string | null, today: string = isoToday()): string {
    if (!endDate) {
        return 'Not started yet';
    }
    const days = daysUntil(endDate, today);
    if (days < 0) {
        const late = Math.abs(days);
        return late === 1 ? 'Expired yesterday' : `Expired ${late} days ago`;
    }
    if (days === 0) {
        return 'Ends today';
    }
    if (days === 1) {
        return 'Ends tomorrow';
    }
    return `Ends in ${days} days`;
}

/** What the gym is still owed on one line. Never negative — an overpayment is not a debt. */
export function outstandingAmount(item: Pick<Subscription, 'priceAmount' | 'amountPaid'>): number {
    return Math.max(0, item.priceAmount - item.amountPaid);
}

export type RenewalsSummary = {
    count: number;
    billed: number;
    collected: number;
    outstanding: number;
    unsettledCount: number;
};

/** The money question an owner opens this screen to answer. */
export function summarizeRenewals(items: readonly RenewalDueItem[]): RenewalsSummary {
    return items.reduce<RenewalsSummary>(
        (acc, item) => {
            const due = outstandingAmount(item);
            return {
                count: acc.count + 1,
                billed: acc.billed + item.priceAmount,
                collected: acc.collected + item.amountPaid,
                outstanding: acc.outstanding + due,
                unsettledCount: acc.unsettledCount + (due > 0 ? 1 : 0),
            };
        },
        { count: 0, billed: 0, collected: 0, outstanding: 0, unsettledCount: 0 },
    );
}
