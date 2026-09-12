import type { HttpClient } from '@/lib/api/client';
import { areE2eFixturesEnabled } from '@/lib/api/e2e/store';
import { createE2eGymOrgsAdapter } from '@/modules/gym-orgs/gym-orgs-e2e-fixtures';
import { createCreateGymOrg } from '@/modules/gym-orgs/create-gym-org';
import { createGymOrgsAdapter } from '@/modules/gym-orgs/gym-orgs-adapter';
import { createListGymOrgs } from '@/modules/gym-orgs/list-gym-orgs';
import { createListGymTrainers } from '@/modules/gym-orgs/list-gym-trainers';

/** Binds the gym-orgs port to its adapter and use-cases (ADR-0007). */
export function gymOrgsServices(http: HttpClient) {
    const gymOrgs = areE2eFixturesEnabled() ? createE2eGymOrgsAdapter() : createGymOrgsAdapter(http);
    return {
        gymOrgs,
        listGymOrgs: createListGymOrgs({ gymOrgs }),
        listGymTrainers: createListGymTrainers({ gymOrgs }),
        createGymOrg: createCreateGymOrg({ gymOrgs }),
    };
}
