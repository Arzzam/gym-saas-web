'use client';

import { useQuery } from '@tanstack/react-query';

import { getJson } from '@/lib/query/api-fetch';
import { gymOrgErrorMessage } from '@/modules/gym-orgs/gym-orgs-errors';
import type { GymTrainer } from '@/modules/gym-orgs/gym-orgs-ports';
import { gymOrgsKeys } from '@/modules/gym-orgs/gym-orgs-query-keys';

/** Live trainer_profiles at the session gym — GET /gym-orgs/:id/trainers via BFF. */
export function useGymTrainers() {
    return useQuery({
        queryKey: gymOrgsKeys.trainers(),
        queryFn: async () => {
            const { trainers } = await getJson<{ trainers: GymTrainer[] }>(
                '/api/gym-orgs/trainers',
                gymOrgErrorMessage('NETWORK_OR_UNKNOWN'),
            );
            return trainers;
        },
    });
}
