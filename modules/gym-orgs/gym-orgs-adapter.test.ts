import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * Mirrors create response parse rules in gym-orgs-adapter (Postman 201 example).
 * Keeps the create/list schema split from regressing.
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

describe('POST /gym-orgs create response schema', () => {
    it('accepts Postman 201 body without isOwner', () => {
        const raw = {
            gymOrg: {
                id: '33333333-3333-4333-8333-333333333333',
                name: 'North Star Fitness',
                address: null,
                contactPhone: null,
                contactEmail: 'hello@example.com',
                logoUrl: null,
                timezone: 'Asia/Kolkata',
                ownerUserId: '22222222-2222-4222-8222-222222222222',
                createdAt: '2026-08-03T00:00:00.000Z',
                updatedAt: '2026-08-03T00:00:00.000Z',
            },
        };

        const parsed = createSchema.parse(raw);
        expect(parsed.gymOrg.name).toBe('North Star Fitness');
        expect(parsed.gymOrg.isOwner).toBeUndefined();
    });

    it('rejects missing name', () => {
        expect(() =>
            createSchema.parse({
                gymOrg: {
                    id: '1',
                    timezone: 'Asia/Kolkata',
                },
            }),
        ).toThrow();
    });
});

const gymTrainerSchema = z.object({
    trainerProfileId: z.string().min(1),
    userId: z.string().min(1),
    name: z.string().min(1),
    email: z.string().min(1),
    staffCode: z.string().nullable(),
    bio: z.string().nullable(),
    isAdmin: z.boolean(),
});

const trainersEnvelopeSchema = z.object({
    trainers: z.object({
        items: z.array(gymTrainerSchema),
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
    }),
});

describe('GET /gym-orgs/:gymOrgId/trainers envelope (Postman 200)', () => {
    it('accepts List Gym Trainers example items', () => {
        const parsed = trainersEnvelopeSchema.parse({
            trainers: {
                items: [
                    {
                        trainerProfileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                        userId: '22222222-2222-4222-8222-222222222222',
                        gymOrgId: '33333333-3333-4333-8333-333333333333',
                        name: 'Owner Admin',
                        email: 'owner@example.com',
                        staffCode: 'STAFF-AB12',
                        bio: null,
                        isAdmin: true,
                        createdAt: '2026-08-08T12:00:00.000Z',
                    },
                ],
                total: 1,
                limit: 20,
                offset: 0,
            },
        });
        expect(parsed.trainers.items[0]?.trainerProfileId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
        expect(parsed.trainers.items[0]?.isAdmin).toBe(true);
    });
});
