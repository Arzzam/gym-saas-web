import { createAppServices } from '@/lib/api/composition';
import type { GymTrainer } from '@/modules/gym-orgs/gym-orgs-ports';

/**
 * Server-side read for the trainer picker (ADR-0011).
 *
 * Takes an explicit `gymOrgId` resolved from the session by the caller's gate;
 * it never reads a tenant id from request input. Unwraps the paged envelope
 * into a flat list — the picker has no pagination UI of its own, so a single
 * generous page (100) covers every gym's staff roster.
 */
export async function listGymTrainersForGym(input: { accessToken: string; gymOrgId: string }): Promise<GymTrainer[]> {
    const { listGymTrainers } = createAppServices();
    const { trainers } = await listGymTrainers({
        accessToken: input.accessToken,
        gymOrgId: input.gymOrgId,
        limit: 100,
        offset: 0,
    });
    return trainers.items;
}
