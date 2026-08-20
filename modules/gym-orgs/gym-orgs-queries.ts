import { createAppServices } from '@/lib/api/composition';
import type { GymTrainer } from '@/modules/gym-orgs/gym-orgs-ports';

/**
 * Server-side read for the trainer picker (ADR-0011).
 *
 * Takes an explicit `gymOrgId` resolved from the session by the caller's gate;
 * it never reads a tenant id from request input.
 */
export async function listGymTrainersForGym(input: { accessToken: string; gymOrgId: string }): Promise<GymTrainer[]> {
    const { listGymTrainers } = createAppServices();
    const { trainers } = await listGymTrainers(input);
    return trainers;
}
