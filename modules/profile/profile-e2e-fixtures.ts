/**
 * Playwright fixture adapter for Profile & Progress (`GYM_SAAS_E2E_FIXTURES=1`).
 */
import { ApiClientError } from '@/lib/api/errors';
import {
    E2E_CLIENT_TOKEN,
    E2E_GYM_ID,
    e2eClientProfiles,
    e2eProgressLogs,
    e2eRosterMembers,
    e2eStaffClientGrants,
    isoDateOffset,
} from '@/lib/api/e2e/store';
import { computeProfileBmi } from '@/modules/profile/profile-bmi';
import type { ClientProfile, ProfileReader, ProfileWriter, ProgressLog } from '@/modules/profile/profile-ports';

function clientUserIdForToken(accessToken: string): string {
    if (accessToken !== E2E_CLIENT_TOKEN) {
        throw new ApiClientError({
            code: 'USERS_FORBIDDEN',
            message: 'Not allowed to access this user data',
            status: 403,
        });
    }
    return 'e2e-client-1';
}

function ensureProfile(userId: string): ClientProfile {
    const existing = e2eClientProfiles.get(userId);
    if (existing) {
        return existing;
    }
    const created: ClientProfile = {
        userId,
        heightCm: null,
        weightKg: null,
        dob: null,
        gender: null,
        medicalNotes: null,
        bmi: null,
        createdAt: '2026-08-08T12:00:00.000Z',
        updatedAt: '2026-08-11T10:05:00.000Z',
    };
    e2eClientProfiles.set(userId, created);
    return created;
}

function filterStaffProfile(profile: ClientProfile, attributes: string[]): ClientProfile {
    const hasHeight = attributes.includes('HEIGHT');
    const hasWeight = attributes.includes('WEIGHT');
    const heightCm = hasHeight ? profile.heightCm : null;
    const weightKg = hasWeight ? profile.weightKg : null;
    return {
        ...profile,
        heightCm,
        weightKg,
        dob: attributes.includes('DOB') ? profile.dob : null,
        gender: attributes.includes('GENDER') ? profile.gender : null,
        medicalNotes: attributes.includes('MEDICAL_NOTES') ? profile.medicalNotes : null,
        bmi: hasHeight && hasWeight ? profile.bmi : null,
    };
}

export function createE2eProfileAdapter(): ProfileReader & ProfileWriter {
    return {
        async getMyProfile({ accessToken }) {
            const userId = clientUserIdForToken(accessToken);
            return { profile: ensureProfile(userId) };
        },

        async updateMyProfile({ accessToken, body }) {
            const userId = clientUserIdForToken(accessToken);
            const current = ensureProfile(userId);
            const next: ClientProfile = {
                ...current,
                heightCm: body.heightCm,
                weightKg: body.weightKg,
                dob: body.dob,
                gender: body.gender,
                medicalNotes: body.medicalNotes,
                bmi: computeProfileBmi(body.heightCm, body.weightKg),
                updatedAt: '2026-08-19T12:00:00.000Z',
            };
            e2eClientProfiles.set(userId, next);
            if (body.weightKg !== null) {
                const logDate = isoDateOffset(0);
                const existingIdx = e2eProgressLogs.findIndex(
                    (item) => item.clientUserId === userId && item.logDate === logDate,
                );
                const log: ProgressLog = {
                    id: existingIdx >= 0 ? e2eProgressLogs[existingIdx].id : `progress-e2e-${userId}-${logDate}`,
                    clientUserId: userId,
                    logDate,
                    weightKg: body.weightKg,
                    bmi: next.bmi,
                    notes: existingIdx >= 0 ? e2eProgressLogs[existingIdx].notes : null,
                    createdAt: '2026-08-19T12:00:00.000Z',
                };
                if (existingIdx >= 0) {
                    e2eProgressLogs[existingIdx] = log;
                } else {
                    e2eProgressLogs.unshift(log);
                }
            }
            return { profile: next };
        },

        async listMyProgressLogs({ accessToken, limit = 20, offset = 0 }) {
            const userId = clientUserIdForToken(accessToken);
            const items = e2eProgressLogs.filter((item) => item.clientUserId === userId);
            return {
                progressLogs: {
                    items: items.slice(offset, offset + limit),
                    total: items.length,
                    limit,
                    offset,
                },
            };
        },

        async upsertMyProgressLog({ accessToken, body }) {
            const userId = clientUserIdForToken(accessToken);
            const profile = ensureProfile(userId);
            const bmi = computeProfileBmi(profile.heightCm, body.weightKg);
            const existingIdx = e2eProgressLogs.findIndex(
                (item) => item.clientUserId === userId && item.logDate === body.logDate,
            );
            const log: ProgressLog = {
                id: existingIdx >= 0 ? e2eProgressLogs[existingIdx].id : `progress-e2e-${userId}-${body.logDate}`,
                clientUserId: userId,
                logDate: body.logDate,
                weightKg: body.weightKg,
                bmi,
                notes: body.notes,
                createdAt: '2026-08-19T12:00:00.000Z',
            };
            if (existingIdx >= 0) {
                e2eProgressLogs[existingIdx] = log;
            } else {
                e2eProgressLogs.unshift(log);
            }
            if (body.weightKg !== null) {
                e2eClientProfiles.set(userId, {
                    ...profile,
                    weightKg: body.weightKg,
                    bmi: computeProfileBmi(profile.heightCm, body.weightKg),
                    updatedAt: '2026-08-19T12:00:00.000Z',
                });
            }
            return { progressLog: log };
        },

        async getStaffClientProfile({ gymOrgId, clientUserId }) {
            const member = e2eRosterMembers.find(
                (item) => item.gymOrgId === gymOrgId && item.clientUserId === clientUserId && item.status === 'ACTIVE',
            );
            const grants = e2eStaffClientGrants.get(`${gymOrgId}:${clientUserId}`);
            if (!member || !grants) {
                throw new ApiClientError({
                    code: 'USERS_FORBIDDEN',
                    message: 'No active membership or grants for this client at gym',
                    status: 403,
                });
            }
            return { profile: filterStaffProfile(ensureProfile(clientUserId), grants.profileAttributes) };
        },

        async listStaffClientProgressLogs({ gymOrgId, clientUserId, limit = 20, offset = 0 }) {
            if (gymOrgId !== E2E_GYM_ID) {
                throw new ApiClientError({
                    code: 'USERS_FORBIDDEN',
                    message: 'PROGRESS grant required to view client progress',
                    status: 403,
                });
            }
            const grants = e2eStaffClientGrants.get(`${gymOrgId}:${clientUserId}`);
            if (!grants?.classGrants.includes('PROGRESS')) {
                throw new ApiClientError({
                    code: 'USERS_FORBIDDEN',
                    message: 'PROGRESS grant required to view client progress',
                    status: 403,
                });
            }
            const items = e2eProgressLogs.filter((item) => item.clientUserId === clientUserId);
            return {
                progressLogs: {
                    items: items.slice(offset, offset + limit),
                    total: items.length,
                    limit,
                    offset,
                },
            };
        },
    };
}
