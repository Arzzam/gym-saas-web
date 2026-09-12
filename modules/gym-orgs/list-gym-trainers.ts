import type { GymOrgsReader } from '@/modules/gym-orgs/gym-orgs-ports';

export type ListGymTrainersDeps = {
    gymOrgs: GymOrgsReader;
};

/** Staff who can coach at this gym, for the roster's trainer picker. */
export function createListGymTrainers(deps: ListGymTrainersDeps) {
    return async function listGymTrainers(input: {
        accessToken: string;
        gymOrgId: string;
        limit?: number;
        offset?: number;
    }) {
        return deps.gymOrgs.listTrainers(input);
    };
}
