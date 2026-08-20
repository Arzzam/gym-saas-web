import { z } from 'zod';

import { endpoints } from '@/modules/gym-orgs/gym-orgs-endpoints';
import type { HttpClient } from '@/lib/api/client';
import type { GymOrgsReader, GymOrgsWriter } from '@/modules/gym-orgs/gym-orgs-ports';

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

const trainerSchema = z.object({
    trainerProfileId: z.string().min(1),
    userId: z.string().min(1),
    gymOrgId: z.string().min(1).optional(),
    name: z.string().min(1),
    email: z.string().min(1),
    staffCode: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    isAdmin: z.boolean().optional(),
});

/** Paged envelope, unlike the flat `gymOrgs` list above. */
const trainersSchema = z.object({
    trainers: z.object({
        items: z.array(trainerSchema),
        total: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
    }),
});

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

        async listTrainers({ accessToken, gymOrgId, limit = 50, offset = 0 }) {
            const raw = await http.request<unknown>({
                path: `${endpoints.gymOrgTrainers(gymOrgId)}?limit=${limit}&offset=${offset}`,
                method: 'GET',
                accessToken,
            });
            const parsed = trainersSchema.parse(raw);
            return {
                trainers: parsed.trainers.items.map((item) => ({
                    trainerProfileId: item.trainerProfileId,
                    userId: item.userId,
                    gymOrgId: item.gymOrgId ?? gymOrgId,
                    name: item.name,
                    email: item.email,
                    staffCode: item.staffCode ?? null,
                    bio: item.bio ?? null,
                    isAdmin: item.isAdmin ?? false,
                })),
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
