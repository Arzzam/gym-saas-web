/**
 * Playwright fixture adapter for the leads module (`GYM_SAAS_E2E_FIXTURES=1`).
 * Shared state lives in `lib/api/e2e/store.ts`; bound in `leads-services.ts`.
 */
import { ApiClientError } from '@/lib/api/errors';
import type { Lead, LeadsReader, LeadsWriter } from '@/modules/leads/leads-ports';
import { E2E_GYM_ID, e2eLeads, e2eMembershipInvites, e2eNextId } from '@/lib/api/e2e/store';
import type { MembershipInvite } from '@/modules/membership-invites/membership-invites-ports';

export function createE2eLeadsAdapter(): LeadsReader & LeadsWriter {
    return {
        async list({ gymOrgId, status, limit = 50, offset = 0 }) {
            if (gymOrgId !== E2E_GYM_ID) {
                return { leads: { items: [], total: 0, limit, offset } };
            }
            let items = [...e2eLeads];
            if (status) {
                items = items.filter((lead) => lead.status === status);
            }
            return {
                leads: {
                    items: items.slice(offset, offset + limit),
                    total: items.length,
                    limit,
                    offset,
                },
            };
        },

        async listDueFollowUps({ gymOrgId, limit = 50, offset = 0 }) {
            if (gymOrgId !== E2E_GYM_ID) {
                return { leads: { items: [], total: 0, limit, offset } };
            }
            const items = e2eLeads.filter(
                (lead) => lead.followUpDate && lead.status !== 'CONVERTED' && lead.status !== 'LOST',
            );
            return {
                leads: {
                    items: items.slice(offset, offset + limit),
                    total: items.length,
                    limit,
                    offset,
                },
            };
        },

        async get({ leadId }) {
            const lead = e2eLeads.find((item) => item.id === leadId);
            if (!lead) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            return { lead };
        },

        async create({ gymOrgId, body }) {
            const lead: Lead = {
                id: e2eNextId('lead-e2e-new'),
                gymOrgId,
                name: body.name,
                phone: body.phone,
                email: body.email ?? null,
                source: body.source ?? null,
                interest: body.interest ?? null,
                notes: body.notes ?? null,
                status: 'NEW',
                followUpDate: null,
                createdBy: 'e2e-user-1',
                convertedMembershipInviteId: null,
                createdAt: '2026-08-08T00:00:00.000Z',
                updatedAt: '2026-08-08T00:00:00.000Z',
            };
            e2eLeads.unshift(lead);
            return { lead, warnings: [] };
        },

        async update({ leadId, body }) {
            const idx = e2eLeads.findIndex((item) => item.id === leadId);
            if (idx < 0) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            const updated: Lead = {
                ...e2eLeads[idx],
                ...body,
                updatedAt: '2026-08-08T01:00:00.000Z',
            };
            e2eLeads[idx] = updated;
            return { lead: updated, warnings: [] };
        },

        async changeStatus({ leadId, status }) {
            const idx = e2eLeads.findIndex((item) => item.id === leadId);
            if (idx < 0) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            const updated: Lead = {
                ...e2eLeads[idx],
                status,
                updatedAt: '2026-08-08T01:00:00.000Z',
            };
            e2eLeads[idx] = updated;
            return { lead: updated };
        },

        /**
         * Mirrors the API's own preconditions rather than always succeeding — a
         * fixture that skipped them would let a spec "prove" a flow the real
         * endpoint rejects.
         */
        async convert({ gymOrgId, leadId, body }) {
            const idx = e2eLeads.findIndex((item) => item.id === leadId);
            if (idx < 0) {
                throw new ApiClientError({ code: 'NOT_FOUND', message: 'Not found', status: 404 });
            }
            const lead = e2eLeads[idx];
            if (lead.status === 'CONVERTED') {
                throw new ApiClientError({
                    code: 'LEAD_ALREADY_CONVERTED',
                    message: 'Lead has already been converted to a membership invite',
                    status: 409,
                });
            }
            if (lead.status === 'LOST') {
                throw new ApiClientError({
                    code: 'LEAD_NOT_CONVERTIBLE',
                    message: 'Lost leads cannot be converted; create a new lead for a re-inquiry',
                    status: 422,
                });
            }
            const invitedEmail = body.invitedEmail || lead.email;
            if (!invitedEmail) {
                throw new ApiClientError({
                    code: 'LEAD_EMAIL_REQUIRED',
                    message: 'An email is required to convert a lead; set it on the lead or pass invitedEmail',
                    status: 422,
                });
            }

            const invite: MembershipInvite = {
                id: e2eNextId('minvite-e2e-new'),
                gymOrgId,
                invitedEmail,
                invitedUserId: null,
                inviteeName: lead.name,
                inviteePhone: lead.phone,
                basePlanId: body.basePlanId,
                basePaymentStatus: body.basePaymentStatus,
                addonPlanId: body.addonPlanId ?? null,
                addonPaymentStatus: body.addonPaymentStatus ?? null,
                status: 'PENDING',
                expiresAt: body.expiresAt ?? '2026-09-18T00:00:00.000Z',
                createdBy: 'e2e-user-1',
                acceptedAt: null,
                acceptedMembershipId: null,
                createdAt: '2026-08-19T00:00:00.000Z',
                updatedAt: '2026-08-19T00:00:00.000Z',
            };
            e2eMembershipInvites.unshift(invite);

            const updated: Lead = {
                ...lead,
                email: invitedEmail,
                status: 'CONVERTED',
                convertedMembershipInviteId: invite.id,
                updatedAt: '2026-08-19T00:00:00.000Z',
            };
            e2eLeads[idx] = updated;

            return { lead: updated, membershipInviteId: invite.id };
        },

        async softDelete({ leadId }) {
            const idx = e2eLeads.findIndex((item) => item.id === leadId);
            if (idx < 0) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            e2eLeads.splice(idx, 1);
        },
    };
}
