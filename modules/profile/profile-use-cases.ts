import type { ProfileReader, ProfileWriter } from '@/modules/profile/profile-ports';

export function createGetMyProfile(deps: { profile: ProfileReader }) {
    return async function getMyProfile(input: { accessToken: string }) {
        return deps.profile.getMyProfile(input);
    };
}

export function createUpdateMyProfile(deps: { profile: ProfileWriter }) {
    return async function updateMyProfile(input: Parameters<ProfileWriter['updateMyProfile']>[0]) {
        return deps.profile.updateMyProfile(input);
    };
}

export function createListMyProgressLogs(deps: { profile: ProfileReader }) {
    return async function listMyProgressLogs(input: Parameters<ProfileReader['listMyProgressLogs']>[0]) {
        return deps.profile.listMyProgressLogs(input);
    };
}

export function createUpsertMyProgressLog(deps: { profile: ProfileWriter }) {
    return async function upsertMyProgressLog(input: Parameters<ProfileWriter['upsertMyProgressLog']>[0]) {
        return deps.profile.upsertMyProgressLog(input);
    };
}

export function createGetStaffClientProfile(deps: { profile: ProfileReader }) {
    return async function getStaffClientProfile(input: Parameters<ProfileReader['getStaffClientProfile']>[0]) {
        return deps.profile.getStaffClientProfile(input);
    };
}

export function createListStaffClientProgressLogs(deps: { profile: ProfileReader }) {
    return async function listStaffClientProgressLogs(
        input: Parameters<ProfileReader['listStaffClientProgressLogs']>[0],
    ) {
        return deps.profile.listStaffClientProgressLogs(input);
    };
}
