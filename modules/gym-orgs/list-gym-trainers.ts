import type { GymOrgsReader } from '@/modules/gym-orgs/gym-orgs-ports';

/** Staff who can coach at this gym, for the roster's trainer picker. */
export function createListGymTrainers(deps: { gymOrgs: GymOrgsReader }) {
    return async function listGymTrainers(input: { accessToken: string; gymOrgId: string }) {
        return deps.gymOrgs.listTrainers(input);
    };
}
