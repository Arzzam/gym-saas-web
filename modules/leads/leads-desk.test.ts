import { describe, expect, it } from 'vitest';

import {
    buildLeadRows,
    filterLeadRows,
    followUpUrgency,
    followUpUrgencyTone,
    formatFollowUp,
    summarizeLeads,
} from '@/modules/leads/leads-desk';
import type { Lead } from '@/modules/leads/leads-ports';

const TODAY = '2026-08-20';

function lead(overrides: Partial<Lead> = {}): Lead {
    return {
        id: 'lead-1',
        gymOrgId: 'gym-1',
        name: 'Walk-in Prospect',
        phone: '9876543210',
        source: 'walk-in',
        interest: 'trial',
        notes: null,
        status: 'NEW',
        followUpDate: null,
        createdBy: 'user-1',
        convertedMembershipInviteId: null,
        createdAt: '2026-08-08T00:00:00.000Z',
        updatedAt: '2026-08-08T00:00:00.000Z',
        ...overrides,
    };
}

describe('followUpUrgency', () => {
    it('separates late, today and upcoming', () => {
        expect(followUpUrgency('2026-08-18', TODAY)).toBe('overdue');
        expect(followUpUrgency(TODAY, TODAY)).toBe('today');
        expect(followUpUrgency('2026-08-25', TODAY)).toBe('upcoming');
    });

    it('treats no date as unscheduled, not as late', () => {
        expect(followUpUrgency(null, TODAY)).toBe('unscheduled');
    });
});

describe('followUpUrgencyTone', () => {
    it('never reaches for danger — no CRM state denies anyone access', () => {
        expect(followUpUrgencyTone('overdue')).toBe('warning');
        expect(followUpUrgencyTone('today')).toBe('warning');
        expect(followUpUrgencyTone('upcoming')).toBe('neutral');
        expect(followUpUrgencyTone('unscheduled')).toBe('neutral');
    });
});

describe('formatFollowUp', () => {
    it('says what the Admin owes, in days', () => {
        expect(formatFollowUp('2026-08-19', TODAY)).toBe('Follow-up due yesterday');
        expect(formatFollowUp('2026-08-16', TODAY)).toBe('Follow-up 4 days overdue');
        expect(formatFollowUp(TODAY, TODAY)).toBe('Follow up today');
        expect(formatFollowUp('2026-08-21', TODAY)).toBe('Follow up tomorrow');
        expect(formatFollowUp('2026-08-24', TODAY)).toBe('Follow up in 4 days');
        expect(formatFollowUp(null, TODAY)).toBe('No follow-up set');
    });
});

describe('buildLeadRows', () => {
    it('orders by who is owed a call, not by capture date', () => {
        const rows = buildLeadRows(
            [
                lead({ id: 'none', name: 'No Date', followUpDate: null }),
                lead({ id: 'upcoming', name: 'Later', followUpDate: '2026-08-28' }),
                lead({ id: 'overdue', name: 'Late', followUpDate: '2026-08-12' }),
                lead({ id: 'today', name: 'Now', followUpDate: TODAY }),
            ],
            TODAY,
        );

        expect(rows.map((row) => row.lead.id)).toEqual(['overdue', 'today', 'upcoming', 'none']);
    });

    it('breaks a tie on the earlier follow-up date', () => {
        const rows = buildLeadRows(
            [
                lead({ id: 'b', name: 'B', followUpDate: '2026-08-14' }),
                lead({ id: 'a', name: 'A', followUpDate: '2026-08-11' }),
            ],
            TODAY,
        );

        expect(rows.map((row) => row.lead.id)).toEqual(['a', 'b']);
    });
});

describe('filterLeadRows', () => {
    const rows = buildLeadRows(
        [
            lead({ id: '1', name: 'Walk-in Prospect', phone: '9876543210', interest: 'trial' }),
            lead({ id: '2', name: 'Priya Nair', phone: '9812345678', source: 'instagram', interest: 'zumba' }),
        ],
        TODAY,
    );

    it('matches a phone number, which is what an Admin on a call actually has', () => {
        expect(filterLeadRows(rows, '9812345678').map((row) => row.lead.name)).toEqual(['Priya Nair']);
    });

    it('matches name, source and interest, case-insensitively', () => {
        expect(filterLeadRows(rows, 'pRiYa')).toHaveLength(1);
        expect(filterLeadRows(rows, 'instagram')).toHaveLength(1);
        expect(filterLeadRows(rows, 'ZUMBA')).toHaveLength(1);
    });

    it('returns everything for an empty or whitespace query', () => {
        expect(filterLeadRows(rows, '')).toHaveLength(2);
        expect(filterLeadRows(rows, '   ')).toHaveLength(2);
    });
});

describe('summarizeLeads', () => {
    it('counts stages but deliberately not follow-ups — the API owns that list', () => {
        const rows = buildLeadRows(
            [
                lead({ id: '1', status: 'NEW' }),
                lead({ id: '2', status: 'TRIAL' }),
                lead({ id: '3', status: 'TRIAL' }),
                lead({ id: '4', status: 'CONVERTED' }),
            ],
            TODAY,
        );

        expect(summarizeLeads(rows)).toEqual({ total: 4, inTrial: 2, converted: 1 });
    });
});
