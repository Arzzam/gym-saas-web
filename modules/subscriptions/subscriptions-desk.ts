import type { RosterMember } from '@/modules/roster/roster-ports';
import type { RenewalDueItem, SubscriptionPaymentStatus } from '@/modules/subscriptions/subscriptions-ports';
import {
    formatRenewalDue,
    isoDateOffset,
    isoToday,
    outstandingAmount,
    renewalUrgency,
    type RenewalUrgency,
} from '@/modules/subscriptions/subscriptions-labels';

/**
 * The renewals desk view-model: the join, the windows, and the filtering — all
 * pure, so the panel renders and never decides. Kept out of the component so
 * the rules that matter (who a row belongs to, what counts as due, what the
 * window means) are unit-testable without a DOM.
 */

/**
 * Which half of the filter state is server-owned matters:
 *
 * - **Window** is a real query parameter on `renewals-due`, so it lives in the
 *   URL and re-runs the fetch. It is also part of the query key.
 * - **Payment and search** narrow a list already in hand. They stay in the URL
 *   too (`state-management.mdc` §2 — filters are shareable), but they never
 *   refetch; a colleague opening the link sees the same screen.
 */
export type RenewalWindowValue = 'overdue' | 'today' | 'week' | 'month';

export type RenewalWindow = {
    value: RenewalWindowValue;
    label: string;
    onOrAfter: string;
    onOrBefore: string;
};

const WINDOW_VALUES: readonly RenewalWindowValue[] = ['overdue', 'today', 'week', 'month'];

export const DEFAULT_RENEWAL_WINDOW: RenewalWindowValue = 'week';

export function isRenewalWindowValue(value: string | null | undefined): value is RenewalWindowValue {
    return !!value && (WINDOW_VALUES as readonly string[]).includes(value);
}

export function parseRenewalWindow(raw: string | null | undefined): RenewalWindowValue {
    return isRenewalWindowValue(raw) ? raw : DEFAULT_RENEWAL_WINDOW;
}

/**
 * `overdue` looks back 90 days rather than forever: an Admin chases last
 * month's lapsed members, not a member who left in 2024. Everything else looks
 * forward from today.
 */
export function renewalWindow(value: RenewalWindowValue, today: string = isoToday()): RenewalWindow {
    switch (value) {
        case 'overdue':
            return {
                value,
                label: 'Overdue',
                onOrAfter: isoDateOffset(-90, today),
                onOrBefore: isoDateOffset(-1, today),
            };
        case 'today':
            return { value, label: 'Today', onOrAfter: today, onOrBefore: today };
        case 'week':
            return { value, label: 'Next 7 days', onOrAfter: today, onOrBefore: isoDateOffset(7, today) };
        case 'month':
            return { value, label: 'Next 30 days', onOrAfter: today, onOrBefore: isoDateOffset(30, today) };
    }
}

export const RENEWAL_WINDOWS: readonly RenewalWindowValue[] = WINDOW_VALUES;

export type RenewalPaymentFilter = 'all' | SubscriptionPaymentStatus;

const PAYMENT_FILTERS: readonly RenewalPaymentFilter[] = ['all', 'unpaid', 'partial', 'paid'];

export const RENEWAL_PAYMENT_FILTERS = PAYMENT_FILTERS;

export function parseRenewalPaymentFilter(raw: string | null | undefined): RenewalPaymentFilter {
    return raw && (PAYMENT_FILTERS as readonly string[]).includes(raw) ? (raw as RenewalPaymentFilter) : 'all';
}

/** One queue row: the billing line plus whoever it belongs to. */
export type RenewalRow = {
    renewal: RenewalDueItem;
    /** `null` when the client is no longer on the ACTIVE roster — say so, don't invent a name. */
    member: RosterMember | null;
    displayName: string;
    urgency: RenewalUrgency;
    dueLabel: string;
    outstanding: number;
};

/** Falls back to a short id so an unresolved row is still identifiable, never blank. */
function displayNameFor(member: RosterMember | null, clientUserId: string): string {
    return member?.clientName ?? `Member ${clientUserId.slice(0, 8)}`;
}

export function buildRenewalRows(
    renewals: readonly RenewalDueItem[],
    members: readonly RosterMember[],
    today: string = isoToday(),
): RenewalRow[] {
    const byClientId = new Map(members.map((member) => [member.clientUserId, member]));
    return renewals
        .map((renewal) => {
            const member = byClientId.get(renewal.clientUserId) ?? null;
            return {
                renewal,
                member,
                displayName: displayNameFor(member, renewal.clientUserId),
                urgency: renewalUrgency(renewal.endDate, today),
                dueLabel: formatRenewalDue(renewal.endDate, today),
                outstanding: outstandingAmount(renewal),
            };
        })
        .sort(sortByUrgencyThenName);
}

const URGENCY_ORDER: Record<RenewalUrgency, number> = {
    overdue: 0,
    today: 1,
    soon: 2,
    later: 3,
    unscheduled: 4,
};

/** Most urgent first — the queue is a to-do list, so its order is the priority. */
function sortByUrgencyThenName(a: RenewalRow, b: RenewalRow): number {
    const byUrgency = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (byUrgency !== 0) {
        return byUrgency;
    }
    const byDate = (a.renewal.endDate ?? '').localeCompare(b.renewal.endDate ?? '');
    return byDate !== 0 ? byDate : a.displayName.localeCompare(b.displayName);
}

export function filterRenewalRows(
    rows: readonly RenewalRow[],
    filters: { payment: RenewalPaymentFilter; query: string },
): RenewalRow[] {
    const query = filters.query.trim().toLowerCase();
    return rows.filter((row) => {
        if (filters.payment !== 'all' && row.renewal.paymentStatus !== filters.payment) {
            return false;
        }
        if (!query) {
            return true;
        }
        // Phone is searchable because an Admin often has the number, not the
        // spelling — a walk-in's name gets typed differently every time.
        return [row.displayName, row.member?.clientEmail, row.member?.clientPhone].some((field) =>
            field?.toLowerCase().includes(query),
        );
    });
}
