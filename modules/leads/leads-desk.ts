import type { StatusTone } from '@/lib/ui/status-tone';
import type { Lead } from '@/modules/leads/leads-ports';

/**
 * Pure derivations for the CRM desk — the mirror of `subscriptions-desk.ts`,
 * deliberately the same shape so the two screens stay legible to the same
 * reader. Nothing here touches the network.
 *
 * Dates are plain `YYYY-MM-DD` compared in UTC, matching the rest of the app.
 */

export type FollowUpUrgency = 'overdue' | 'today' | 'upcoming' | 'unscheduled';

const MS_PER_DAY = 86_400_000;

export function isoToday(): string {
    return new Date().toISOString().slice(0, 10);
}

export function daysUntil(date: string, today: string = isoToday()): number {
    return Math.round((Date.parse(`${date}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) / MS_PER_DAY);
}

export function followUpUrgency(followUpDate: string | null, today: string = isoToday()): FollowUpUrgency {
    if (!followUpDate) {
        return 'unscheduled';
    }
    const days = daysUntil(followUpDate, today);
    if (days < 0) {
        return 'overdue';
    }
    return days === 0 ? 'today' : 'upcoming';
}

/**
 * A missed follow-up is `warning`, never `danger`. `danger` is reserved for
 * states that deny access (§3), and no CRM state does — the worst case here is
 * a call the gym owes someone, which is "needs attention, still functioning".
 */
export function followUpUrgencyTone(urgency: FollowUpUrgency): StatusTone {
    return urgency === 'overdue' || urgency === 'today' ? 'warning' : 'neutral';
}

export function formatFollowUp(followUpDate: string | null, today: string = isoToday()): string {
    if (!followUpDate) {
        return 'No follow-up set';
    }
    const days = daysUntil(followUpDate, today);
    if (days < 0) {
        const late = Math.abs(days);
        return late === 1 ? 'Follow-up due yesterday' : `Follow-up ${late} days overdue`;
    }
    if (days === 0) {
        return 'Follow up today';
    }
    return days === 1 ? 'Follow up tomorrow' : `Follow up in ${days} days`;
}

export type LeadRow = {
    lead: Lead;
    urgency: FollowUpUrgency;
    followUpLabel: string;
};

const URGENCY_ORDER: Record<FollowUpUrgency, number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    unscheduled: 3,
};

/**
 * Ordered by who the gym owes a call, not by when the lead was captured. A
 * pipeline read top-to-bottom should be a call list.
 */
function byUrgencyThenDate(a: LeadRow, b: LeadRow): number {
    const byUrgency = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (byUrgency !== 0) {
        return byUrgency;
    }
    const byDate = (a.lead.followUpDate ?? '').localeCompare(b.lead.followUpDate ?? '');
    return byDate !== 0 ? byDate : a.lead.name.localeCompare(b.lead.name);
}

export function buildLeadRows(leads: readonly Lead[], today: string = isoToday()): LeadRow[] {
    return leads
        .map((lead) => ({
            lead,
            urgency: followUpUrgency(lead.followUpDate, today),
            followUpLabel: formatFollowUp(lead.followUpDate, today),
        }))
        .sort(byUrgencyThenDate);
}

export function filterLeadRows(rows: readonly LeadRow[], query: string): LeadRow[] {
    const q = query.trim().toLowerCase();
    if (!q) {
        return [...rows];
    }
    // Phone first in spirit: an Admin taking a call has the number on screen,
    // not the spelling of a name they heard once.
    return rows.filter((row) =>
        [row.lead.phone, row.lead.name, row.lead.source, row.lead.interest].some((field) =>
            field?.toLowerCase().includes(q),
        ),
    );
}

export type LeadsSummary = {
    total: number;
    inTrial: number;
    converted: number;
};

/**
 * Counts what is on screen. Deliberately **not** "follow-ups due" — the API
 * owns that rule and exposes it at `leads/due-follow-ups`, which is gym-wide
 * rather than scoped to the current stage tab. Recomputing it from the visible
 * rows would give a different answer on every tab and quietly re-derive a
 * business rule in the client (`000-project-context.mdc`).
 */
export function summarizeLeads(rows: readonly LeadRow[]): LeadsSummary {
    return rows.reduce<LeadsSummary>(
        (acc, row) => ({
            total: acc.total + 1,
            inTrial: acc.inTrial + (row.lead.status === 'TRIAL' ? 1 : 0),
            converted: acc.converted + (row.lead.status === 'CONVERTED' ? 1 : 0),
        }),
        { total: 0, inTrial: 0, converted: 0 },
    );
}
