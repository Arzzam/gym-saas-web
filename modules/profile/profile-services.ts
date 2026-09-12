import type { HttpClient } from '@/lib/api/client';
import { areE2eFixturesEnabled } from '@/lib/api/e2e/store';
import { createProfileAdapter } from '@/modules/profile/profile-adapter';
import { createE2eProfileAdapter } from '@/modules/profile/profile-e2e-fixtures';
import {
    createGetMyProfile,
    createGetStaffClientProfile,
    createListMyProgressLogs,
    createListStaffClientProgressLogs,
    createUpdateMyProfile,
    createUpsertMyProgressLog,
} from '@/modules/profile/profile-use-cases';

/** Binds the profile port to its adapter and use-cases (ADR-0007). */
export function profileServices(http: HttpClient) {
    const profile = areE2eFixturesEnabled() ? createE2eProfileAdapter() : createProfileAdapter(http);
    return {
        profile,
        getMyProfile: createGetMyProfile({ profile }),
        updateMyProfile: createUpdateMyProfile({ profile }),
        listMyProgressLogs: createListMyProgressLogs({ profile }),
        upsertMyProgressLog: createUpsertMyProgressLog({ profile }),
        getStaffClientProfile: createGetStaffClientProfile({ profile }),
        listStaffClientProgressLogs: createListStaffClientProgressLogs({ profile }),
    };
}
