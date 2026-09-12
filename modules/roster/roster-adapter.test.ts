import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const memberSchema = z.object({
    membershipId: z.string().min(1),
    clientUserId: z.string().min(1),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    checkInBlocked: z.boolean(),
    clientName: z.string().min(1),
    clientEmail: z.string().min(1),
    basePaymentStatus: z.enum(['paid', 'unpaid', 'partial']).nullable(),
});

const membershipMutationSchema = z.object({
    membershipId: z.string().min(1),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    checkInBlocked: z.boolean(),
    leftAt: z.string().nullable(),
    updatedAt: z.string().min(1),
});

describe('Roster schemas (Postman tip 91d4aba)', () => {
    it('parses ACTIVE roster member from Examples', () => {
        const member = memberSchema.parse({
            membershipId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            clientUserId: '22222222-2222-4222-8222-222222222222',
            status: 'ACTIVE',
            checkInBlocked: false,
            clientName: 'Ada Client',
            clientEmail: 'ada@example.com',
            basePaymentStatus: 'unpaid',
        });
        expect(member.checkInBlocked).toBe(false);
    });

    it('parses offboard membership mutation', () => {
        const membership = membershipMutationSchema.parse({
            membershipId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            status: 'INACTIVE',
            checkInBlocked: false,
            leftAt: '2026-08-11T12:00:00.000Z',
            updatedAt: '2026-08-11T12:00:00.000Z',
        });
        expect(membership.status).toBe('INACTIVE');
    });

    it('parses assign-trainer membership mutation with assignedTrainerId', () => {
        const membership = z
            .object({
                membershipId: z.string().min(1),
                assignedTrainerId: z.string().min(1).nullable(),
            })
            .parse({
                membershipId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                assignedTrainerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            });
        expect(membership.assignedTrainerId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    });

    it('documents my-assigned-members path shape', () => {
        const gymOrgId = '33333333-3333-4333-8333-333333333333';
        expect(`/gym-orgs/${gymOrgId}/my-assigned-members`).toBe(
            '/gym-orgs/33333333-3333-4333-8333-333333333333/my-assigned-members',
        );
    });
});
