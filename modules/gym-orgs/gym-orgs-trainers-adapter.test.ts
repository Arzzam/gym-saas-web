import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@/lib/api/client';
import { createGymOrgsAdapter } from '@/modules/gym-orgs/gym-orgs-adapter';

/**
 * Exercises the real adapter against the Postman `List Gym Trainers` body.
 *
 * The thing worth pinning is the two ids: `trainerProfileId` is what a
 * membership's `assignedTrainerId` holds and what `Assign Trainer` expects,
 * while `userId` is the person's account. Swapping them silently assigns
 * nobody, and nothing downstream would throw.
 */
function stubHttp(response: unknown, calls: string[] = []): HttpClient {
    return {
        request: async <T>({ path }: { path: string }) => {
            calls.push(path);
            return response as T;
        },
    };
}

const POSTMAN_BODY = {
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
};

describe('gymOrgsAdapter.listTrainers', () => {
    it('unwraps the paged envelope into a flat list', async () => {
        const adapter = createGymOrgsAdapter(stubHttp(POSTMAN_BODY));

        const { trainers } = await adapter.listTrainers({ accessToken: 't', gymOrgId: 'gym-1' });

        expect(trainers).toHaveLength(1);
        expect(trainers[0].trainerProfileId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
        expect(trainers[0].userId).toBe('22222222-2222-4222-8222-222222222222');
        expect(trainers[0].name).toBe('Owner Admin');
        expect(trainers[0].isAdmin).toBe(true);
    });

    it('scopes the request to the gym it was given', async () => {
        const calls: string[] = [];
        const adapter = createGymOrgsAdapter(stubHttp(POSTMAN_BODY, calls));

        await adapter.listTrainers({ accessToken: 't', gymOrgId: 'gym-42' });

        expect(calls[0]).toContain('/gym-orgs/gym-42/trainers');
    });

    it('defaults the optional fields the API may omit', async () => {
        const adapter = createGymOrgsAdapter(
            stubHttp({
                trainers: {
                    items: [
                        {
                            trainerProfileId: 'p1',
                            userId: 'u1',
                            name: 'Minimal Trainer',
                            email: 'min@example.com',
                        },
                    ],
                },
            }),
        );

        const { trainers } = await adapter.listTrainers({ accessToken: 't', gymOrgId: 'gym-1' });

        expect(trainers[0].staffCode).toBeNull();
        expect(trainers[0].bio).toBeNull();
        expect(trainers[0].isAdmin).toBe(false);
        // Falls back to the gym the caller asked about, never left undefined.
        expect(trainers[0].gymOrgId).toBe('gym-1');
    });

    it('rejects a body missing the ids the assign call depends on', async () => {
        const adapter = createGymOrgsAdapter(
            stubHttp({ trainers: { items: [{ name: 'No ids', email: 'x@example.com' }] } }),
        );

        await expect(adapter.listTrainers({ accessToken: 't', gymOrgId: 'gym-1' })).rejects.toThrow();
    });
});
