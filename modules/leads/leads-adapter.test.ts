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

const CONVERT_BODY = {
    lead: {
        ...LEAD_BODY.lead,
        status: 'CONVERTED',
        convertedMembershipInviteId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    },
    membershipInvite: {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        gymOrgId: 'gym-1',
        invitedEmail: 'priya@example.com',
        invitedUserId: null,
        inviteeName: 'Priya Walk-in',
        inviteePhone: '9876543210',
        basePlanId: 'plan-1',
        basePaymentStatus: 'paid',
        addonPlanId: null,
        addonPaymentStatus: null,
        status: 'PENDING',
        expiresAt: '2026-09-18T00:00:00.000Z',
        createdBy: 'user-1',
        acceptedAt: null,
        acceptedMembershipId: null,
        createdAt: '2026-08-19T00:00:00.000Z',
        updatedAt: '2026-08-19T00:00:00.000Z',
    },
};

describe('leadsAdapter.convert', () => {
    it('parses the 201 envelope into a converted lead and an invite id', async () => {
        const adapter = createLeadsAdapter(stubHttp(CONVERT_BODY));

        const { lead, membershipInviteId } = await adapter.convert({
            accessToken: 't',
            gymOrgId: 'gym-1',
            leadId: 'lead-1',
            body: { basePlanId: 'plan-1', basePaymentStatus: 'paid' },
        });

        expect(lead.status).toBe('CONVERTED');
        expect(lead.convertedMembershipInviteId).toBe('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
        // The narrow result — not the full invite the CRM never renders.
        expect(membershipInviteId).toBe('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
    });

    it('sends the add-on pair only when both halves are given', async () => {
        const calls: Call[] = [];
        const adapter = createLeadsAdapter(stubHttp(CONVERT_BODY, calls));

        await adapter.convert({
            accessToken: 't',
            gymOrgId: 'gym-1',
            leadId: 'lead-1',
            body: { basePlanId: 'plan-1', basePaymentStatus: 'paid', addonPlanId: 'addon-1' },
        });

        expect(calls[0].body).not.toHaveProperty('addonPlanId');
        expect(calls[0].body).not.toHaveProperty('addonPaymentStatus');
    });

    it('rejects a body with no invite in it', async () => {
        const adapter = createLeadsAdapter(stubHttp({ lead: LEAD_BODY.lead }));

        await expect(
            adapter.convert({
                accessToken: 't',
                gymOrgId: 'gym-1',
                leadId: 'lead-1',
                body: { basePlanId: 'plan-1', basePaymentStatus: 'paid' },
            }),
        ).rejects.toThrow();
    });
});
