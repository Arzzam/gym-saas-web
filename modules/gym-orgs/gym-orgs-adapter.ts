import { z } from 'zod';

import { endpoints } from '@/modules/gym-orgs/gym-orgs-endpoints';
import type { HttpClient } from '@/lib/api/client';
import type { GymOrgsReader, GymOrgsWriter, GymTrainer } from '@/modules/gym-orgs/gym-orgs-ports';

/** GET /gym-orgs list item — includes isOwner. */
const gymOrgSummarySchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    timezone: z.string().min(1),
    isOwner: z.boolean(),
});

const listSchema = z.object({
    gymOrgs: z.array(gymOrgSummarySchema),
});

/**
 * POST /gym-orgs 201 body — Postman: no `isOwner` on create detail
 * (ownerUserId + timestamps instead).
 */
const createGymOrgDetailSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    timezone: z.string().min(1),
    ownerUserId: z.string().optional(),
    address: z.string().nullable().optional(),
    contactPhone: z.string().nullable().optional(),
    contactEmail: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    isOwner: z.boolean().optional(),
});

const createSchema = z.object({
    gymOrg: createGymOrgDetailSchema,
});

const gymTrainerSchema = z.object({
    trainerProfileId: z.string().min(1),
    userId: z.string().min(1),
    gymOrgId: z.string().min(1).optional(),
    name: z.string().min(1),
    email: z.string().min(1),
    staffCode: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    isAdmin: z.boolean(),
    createdAt: z.string().min(1).optional(),
});

/** Paged envelope, unlike the flat `gymOrgs` list above. */
const trainersEnvelopeSchema = z.object({
    trainers: z.object({
        items: z.array(gymTrainerSchema),
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
    }),
});

function trainersQuery(input: { limit?: number; offset?: number }): string {
    const params = new URLSearchParams();
    if (input.limit !== undefined) {
        params.set('limit', String(input.limit));
    }
    if (input.offset !== undefined) {
        params.set('offset', String(input.offset));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

function normalizeTrainer(raw: z.infer<typeof gymTrainerSchema>, gymOrgId: string): GymTrainer {
    return {
        trainerProfileId: raw.trainerProfileId,
        userId: raw.userId,
        gymOrgId: raw.gymOrgId ?? gymOrgId,
        name: raw.name,
        email: raw.email,
        staffCode: raw.staffCode ?? null,
        bio: raw.bio ?? null,
        isAdmin: raw.isAdmin,
        createdAt: raw.createdAt ?? null,
    };
}

export function createGymOrgsAdapter(http: HttpClient): GymOrgsReader & GymOrgsWriter {
    return {
        async list({ accessToken }) {
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgs,
                method: 'GET',
                accessToken,
            });
            return listSchema.parse(raw);
        },

        async listTrainers({ accessToken, gymOrgId, limit, offset }) {
            const raw = await http.request<unknown>({
                path: `${endpoints.gymOrgTrainers(gymOrgId)}${trainersQuery({ limit, offset })}`,
                method: 'GET',
                accessToken,
            });
            const parsed = trainersEnvelopeSchema.parse(raw);
            return {
                trainers: {
                    items: parsed.trainers.items.map((item) => normalizeTrainer(item, gymOrgId)),
                    total: parsed.trainers.total,
                    limit: parsed.trainers.limit,
                    offset: parsed.trainers.offset,
                },
            };
        },

        async create({ accessToken, body }) {
            const payload: Record<string, unknown> = {
                name: body.name,
                timezone: body.timezone ?? 'Asia/Kolkata',
            };
            if (body.address !== undefined) {
                payload.address = body.address;
            }
            if (body.contactPhone !== undefined) {
                payload.contactPhone = body.contactPhone;
            }
            if (body.contactEmail !== undefined) {
                payload.contactEmail = body.contactEmail;
            }
            if (body.logoUrl !== undefined) {
                payload.logoUrl = body.logoUrl;
            }

            const raw = await http.request<unknown>({
                path: endpoints.gymOrgs,
                method: 'POST',
                accessToken,
                body: payload,
            });
            const parsed = createSchema.parse(raw);
            return {
                gymOrg: {
                    ...parsed.gymOrg,
                    // Creator is owner; list endpoint exposes isOwner explicitly.
                    isOwner: parsed.gymOrg.isOwner ?? true,
                },
            };
        },
    };
}
