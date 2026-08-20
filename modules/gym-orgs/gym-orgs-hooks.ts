'use client';

import { useQuery } from '@tanstack/react-query';

import { getJson } from '@/lib/query/api-fetch';
import type { GymTrainer } from '@/modules/gym-orgs/gym-orgs-ports';
import { gymOrgsKeys } from '@/modules/gym-orgs/gym-orgs-query-keys';
import { rosterErrorMessage } from '@/modules/roster/roster-errors';

/** Gym-org client hooks (ADR-0011). */
export function useGymTrainers() {
    return useQuery({
        queryKey: gymOrgsKeys.trainers(),
        queryFn: async () => {
            const { trainers } = await getJson<{ trainers: GymTrainer[] }>(
                '/api/gym-orgs/trainers',
                rosterErrorMessage('NETWORK_OR_UNKNOWN'),
            );
            return trainers;
        },
    });
}
