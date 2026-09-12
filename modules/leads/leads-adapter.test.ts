import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { HttpClient } from '@/lib/api/client';
import { createLeadsAdapter } from '@/modules/leads/leads-adapter';

const leadSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    phone: z.string().min(1),
    status: z.enum(['NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST']),
});

describe('Leads response schemas (Postman tip 7a2d9bf)', () => {
    it('parses create lead core shape', () => {
        const lead = leadSchema.parse({
            id: 'lead-1',
            name: 'Walk-in Prospect',
            phone: '9876543210',
            status: 'NEW',
        });
        expect(lead.status).toBe('NEW');
    });
});

type Call = { path: string; method?: string; body?: unknown };

function stubHttp(response: unknown, calls: Call[] = []): HttpClient {
    return {
        request: async <T>({ path, method, body }: { path: string; method?: string; body?: unknown }) => {
            calls.push({ path, method, body });
            return response as T;
        },
    };
}

const LEAD_BODY = {
    lead: {
        id: 'lead-1',
        gymOrgId: 'gym-1',
        name: 'Priya Walk-in',
        phone: '9876543210',
        email: 'priya@example.com',
        source: 'Instagram',
        interest: 'Personal training trial',
        notes: null,
        status: 'NEW',
        followUpDate: null,
        createdBy: 'user-1',
        convertedMembershipInviteId: null,
        createdAt: '2026-08-18T00:00:00.000Z',
        updatedAt: '2026-08-18T00:00:00.000Z',
    },
    warnings: [],
};

/**
 * Email is the address `Convert Lead` falls back to when the Admin does not
 * override it, so a lead that silently dropped it would send every conversion
 * down the 422 `LEAD_EMAIL_REQUIRED` path for no reason.
 */
describe('leadsAdapter — the lead email', () => {
    it('reads through from the API', async () => {
        const adapter = createLeadsAdapter(stubHttp(LEAD_BODY));

        const { lead } = await adapter.create({
            accessToken: 't',
            gymOrgId: 'gym-1',
            body: { name: 'Priya Walk-in', phone: '9876543210', email: 'priya@example.com' },
        });

        expect(lead.email).toBe('priya@example.com');
    });

    it('is sent on create and on update', async () => {
        const calls: Call[] = [];
        const adapter = createLeadsAdapter(stubHttp(LEAD_BODY, calls));

        await adapter.create({
            accessToken: 't',
            gymOrgId: 'gym-1',
            body: { name: 'Priya Walk-in', phone: '9876543210', email: 'priya@example.com' },
        });
        await adapter.update({
            accessToken: 't',
            gymOrgId: 'gym-1',
            leadId: 'lead-1',
            body: { email: 'changed@example.com' },
        });

        expect(calls[0].body).toMatchObject({ email: 'priya@example.com' });
        expect(calls[1].body).toEqual({ email: 'changed@example.com' });
    });

    it('normalizes a lead the API returns without one', async () => {
        const adapter = createLeadsAdapter(stubHttp({ lead: { ...LEAD_BODY.lead, email: undefined }, warnings: [] }));

        const { lead } = await adapter.create({
            accessToken: 't',
            gymOrgId: 'gym-1',
            body: { name: 'Walk-in', phone: '9876543210' },
        });

        // Never `undefined` downstream — the convert dialog branches on null.
        expect(lead.email).toBeNull();
    });
});
