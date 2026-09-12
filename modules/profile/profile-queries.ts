import { createAppServices } from '@/lib/api/composition';
import { ApiClientError } from '@/lib/api/errors';
import type { GrantAware } from '@/modules/profile/profile-grant';
import { isGrantMissing } from '@/modules/profile/profile-errors';
import type { ClientProfile, ProgressLog } from '@/modules/profile/profile-ports';

async function asGrantAware<T>(run: () => Promise<T>): Promise<GrantAware<T>> {
    try {
        return { status: 'ok', data: await run() };
    } catch (error) {
        if (error instanceof ApiClientError && isGrantMissing(error.code)) {
            return { status: 'not_shared' };
        }
        throw error;
    }
}

export async function getMyProfileForSession(input: { accessToken: string }): Promise<ClientProfile> {
    const { getMyProfile } = createAppServices();
    const { profile } = await getMyProfile({ accessToken: input.accessToken });
    return profile;
}

export async function listMyProgressLogsForSession(input: { accessToken: string }): Promise<ProgressLog[]> {
    const { listMyProgressLogs } = createAppServices();
    const { progressLogs } = await listMyProgressLogs({
        accessToken: input.accessToken,
        limit: 20,
        offset: 0,
    });
    return progressLogs.items;
}

export async function getStaffClientProfileForGym(input: {
    accessToken: string;
    gymOrgId: string;
    clientUserId: string;
}): Promise<GrantAware<ClientProfile>> {
    const { getStaffClientProfile } = createAppServices();
    return asGrantAware(async () => {
        const { profile } = await getStaffClientProfile(input);
        return profile;
    });
}

export async function listStaffClientProgressLogsForGym(input: {
    accessToken: string;
    gymOrgId: string;
    clientUserId: string;
}): Promise<GrantAware<ProgressLog[]>> {
    const { listStaffClientProgressLogs } = createAppServices();
    return asGrantAware(async () => {
        const { progressLogs } = await listStaffClientProgressLogs({
            ...input,
            // Match Postman default page size for List Staff Client Progress Logs.
            limit: 20,
            offset: 0,
        });
        return progressLogs.items;
    });
}
