import { z } from 'zod';

import { endpoints } from '@/modules/leads/leads-endpoints';
import type { HttpClient } from '@/lib/api/client';
import type {
    ConvertLeadInput,
    CreateLeadInput,
    Lead,
    LeadStatus,
    LeadsReader,
    LeadsWriter,
    UpdateLeadInput,
} from '@/modules/leads/leads-ports';

const leadSchema = z.object({
    id: z.string().min(1),
    gymOrgId: z.string().min(1).optional(),
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    interest: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    status: z.enum(['NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST']),
    followUpDate: z.string().nullable().optional(),
    createdBy: z.string().min(1).optional(),
    convertedMembershipInviteId: z.string().nullable().optional(),
    createdAt: z.string().min(1).optional(),
    updatedAt: z.string().min(1).optional(),
});

const warningSchema = z.object({
    code: z.string().min(1),
    message: z.string().optional(),
});

const leadEnvelopeSchema = z.object({
    lead: leadSchema,
    warnings: z.array(warningSchema).optional().default([]),
});

const leadOnlyEnvelopeSchema = z.object({
    lead: leadSchema,
});

/**
 * `Convert Lead` 201. The invite is parsed rather than ignored — a body that
 * came back without one would mean the conversion did not do what it says, and
 * that should fail here, not silently downstream.
 */
const convertEnvelopeSchema = z.object({
    lead: leadSchema,
    membershipInvite: z.object({
        id: z.string().min(1),
    }),
});

const pageSchema = z.object({
    leads: z.object({
        items: z.array(leadSchema),
        total: z.number().int().nonnegative(),
        limit: z.number().int().positive(),
        offset: z.number().int().nonnegative(),
    }),
});

function pageQuery(input: { status?: LeadStatus; limit?: number; offset?: number }): string {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 50));
    params.set('offset', String(input.offset ?? 0));
    if (input.status) {
        params.set('status', input.status);
    }
    return params.toString();
}

function normalizeLead(raw: z.infer<typeof leadSchema>, gymOrgId: string): Lead {
    return {
        id: raw.id,
        gymOrgId: raw.gymOrgId ?? gymOrgId,
        name: raw.name,
        phone: raw.phone,
        email: raw.email ?? null,
        source: raw.source ?? null,
        interest: raw.interest ?? null,
        notes: raw.notes ?? null,
        status: raw.status,
        followUpDate: raw.followUpDate ?? null,
        createdBy: raw.createdBy ?? '',
        convertedMembershipInviteId: raw.convertedMembershipInviteId ?? null,
        createdAt: raw.createdAt ?? '',
        updatedAt: raw.updatedAt ?? '',
    };
}

export function createLeadsAdapter(http: HttpClient): LeadsReader & LeadsWriter {
    return {
        async list({ accessToken, gymOrgId, status, limit, offset }) {
            const raw = await http.request<unknown>({
                path: `${endpoints.gymOrgLeads(gymOrgId)}?${pageQuery({ status, limit, offset })}`,
                method: 'GET',
                accessToken,
            });
            const parsed = pageSchema.parse(raw);
            return {
                leads: {
                    ...parsed.leads,
                    items: parsed.leads.items.map((item) => normalizeLead(item, gymOrgId)),
                },
            };
        },

        async listDueFollowUps({ accessToken, gymOrgId, limit, offset }) {
            const raw = await http.request<unknown>({
                path: `${endpoints.gymOrgLeadDueFollowUps(gymOrgId)}?${pageQuery({ limit, offset })}`,
                method: 'GET',
                accessToken,
            });
            const parsed = pageSchema.parse(raw);
            return {
                leads: {
                    ...parsed.leads,
                    items: parsed.leads.items.map((item) => normalizeLead(item, gymOrgId)),
                },
            };
        },

        async get({ accessToken, gymOrgId, leadId }) {
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgLead(gymOrgId, leadId),
                method: 'GET',
                accessToken,
            });
            const parsed = leadOnlyEnvelopeSchema.parse(raw);
            return { lead: normalizeLead(parsed.lead, gymOrgId) };
        },

        async create({ accessToken, gymOrgId, body }) {
            const payload: CreateLeadInput = {
                name: body.name,
                phone: body.phone,
            };
            if (body.email !== undefined) {
                payload.email = body.email;
            }
            if (body.source !== undefined) {
                payload.source = body.source;
            }
            if (body.interest !== undefined) {
                payload.interest = body.interest;
            }
            if (body.notes !== undefined) {
                payload.notes = body.notes;
            }
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgLeads(gymOrgId),
                method: 'POST',
                accessToken,
                body: payload,
            });
            const parsed = leadEnvelopeSchema.parse(raw);
            return {
                lead: normalizeLead(parsed.lead, gymOrgId),
                warnings: parsed.warnings,
            };
        },

        async update({ accessToken, gymOrgId, leadId, body }) {
            const payload: UpdateLeadInput = {};
            if (body.name !== undefined) {
                payload.name = body.name;
            }
            if (body.phone !== undefined) {
                payload.phone = body.phone;
            }
            if (body.email !== undefined) {
                payload.email = body.email;
            }
            if (body.source !== undefined) {
                payload.source = body.source;
            }
            if (body.interest !== undefined) {
                payload.interest = body.interest;
            }
            if (body.notes !== undefined) {
                payload.notes = body.notes;
            }
            if (body.followUpDate !== undefined) {
                payload.followUpDate = body.followUpDate;
            }
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgLead(gymOrgId, leadId),
                method: 'PATCH',
                accessToken,
                body: payload,
            });
            const parsed = leadEnvelopeSchema.parse(raw);
            return {
                lead: normalizeLead(parsed.lead, gymOrgId),
                warnings: parsed.warnings,
            };
        },

        async changeStatus({ accessToken, gymOrgId, leadId, status }) {
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgLeadStatus(gymOrgId, leadId),
                method: 'PATCH',
                accessToken,
                body: { status },
            });
            const parsed = leadOnlyEnvelopeSchema.parse(raw);
            return { lead: normalizeLead(parsed.lead, gymOrgId) };
        },

        async convert({ accessToken, gymOrgId, leadId, body }) {
            const payload: ConvertLeadInput = {
                basePlanId: body.basePlanId,
                basePaymentStatus: body.basePaymentStatus,
            };
            if (body.invitedEmail) {
                payload.invitedEmail = body.invitedEmail;
            }
            // Both or neither — the API rejects a half-set add-on.
            if (body.addonPlanId && body.addonPaymentStatus) {
                payload.addonPlanId = body.addonPlanId;
                payload.addonPaymentStatus = body.addonPaymentStatus;
            }
            if (body.expiresAt) {
                payload.expiresAt = body.expiresAt;
            }
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgLeadConvert(gymOrgId, leadId),
                method: 'POST',
                accessToken,
                body: payload,
            });
            const parsed = convertEnvelopeSchema.parse(raw);
            return {
                lead: normalizeLead(parsed.lead, gymOrgId),
                membershipInviteId: parsed.membershipInvite.id,
            };
        },

        async softDelete({ accessToken, gymOrgId, leadId }) {
            await http.request<unknown>({
                path: endpoints.gymOrgLead(gymOrgId, leadId),
                method: 'DELETE',
                accessToken,
            });
        },
    };
}
