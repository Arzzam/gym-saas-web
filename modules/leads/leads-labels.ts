import type { StatusTone } from '@/lib/ui/status-tone';
import type { LeadStatus } from '@/modules/leads/leads-ports';

/**
 * Pipeline position is **progress, not health** (`docs/ui-design-system.md` §3).
 * Colouring the middle stages would imply `TRIAL` is a warning, which is
 * nonsense — a trial is the process working. Only the two terminal stages carry
 * a tone, and `LOST` is neutral rather than danger: losing a lead is a normal
 * outcome, not a failure state the Admin must fix.
 */
export function leadStatusTone(status: LeadStatus): StatusTone {
    return status === 'CONVERTED' ? 'positive' : 'neutral';
}

/** §3 renders `LOST` at reduced emphasis so it recedes without turning red. */
export function isLeadStageMuted(status: LeadStatus): boolean {
    return status === 'LOST';
}

export function leadStatusLabel(status: LeadStatus): string {
    switch (status) {
        case 'NEW':
            return 'New';
        case 'CONTACTED':
            return 'Contacted';
        case 'TRIAL':
            return 'Trial';
        case 'CONVERTED':
            return 'Converted';
        case 'LOST':
            return 'Lost';
    }
}

export const LEAD_STATUSES: ReadonlyArray<LeadStatus> = ['NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST'];

/**
 * Stages the rail's picker may set directly. `CONVERTED` is deliberately
 * excluded: it is reachable only through `Convert lead`, which creates the
 * membership invite the status alone does not. `LEAD_STATUSES` stays whole —
 * the CRM's filter tabs still need to show and filter *for* converted leads.
 */
export const LEAD_STAGE_OPTIONS: ReadonlyArray<LeadStatus> = ['NEW', 'CONTACTED', 'TRIAL', 'LOST'];

export function formatLeadFollowUp(date: string | null): string {
    if (!date) {
        return 'No follow-up';
    }
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeZone: 'Asia/Kolkata',
    }).format(parsed);
}
