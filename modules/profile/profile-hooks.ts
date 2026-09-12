'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { BffError, getJson } from '@/lib/query/api-fetch';
import { updateMyProfileAction, upsertMyProgressLogAction } from '@/modules/profile/profile-actions';
import { isGrantMissing, profileErrorMessage } from '@/modules/profile/profile-errors';
import type { GrantAware } from '@/modules/profile/profile-grant';
import type { ClientProfile, ProgressLog } from '@/modules/profile/profile-ports';
import { normalizeProgressLogList } from '@/modules/profile/profile-progress-list';
import { profileKeys } from '@/modules/profile/profile-query-keys';

async function fetchGrantAware<TEnvelope, TData>(
    path: string,
    pick: (body: TEnvelope) => TData,
): Promise<GrantAware<TData>> {
    try {
        const body = await getJson<TEnvelope>(path, profileErrorMessage('NETWORK_OR_UNKNOWN'));
        return { status: 'ok', data: pick(body) };
    } catch (error) {
        if (error instanceof BffError && isGrantMissing(error.code)) {
            return { status: 'not_shared' };
        }
        throw error;
    }
}

export function useMyProfile() {
    return useQuery({
        queryKey: profileKeys.me(),
        queryFn: async () => {
            const { profile } = await getJson<{ profile: ClientProfile }>(
                '/api/me/profile',
                profileErrorMessage('NETWORK_OR_UNKNOWN'),
            );
            return profile;
        },
    });
}

export function useMyProgressLogs() {
    return useQuery({
        queryKey: profileKeys.meLogs(),
        queryFn: async () => {
            const body = await getJson<{ progressLogs: unknown }>(
                '/api/me/progress-logs',
                profileErrorMessage('NETWORK_OR_UNKNOWN'),
            );
            return normalizeProgressLogList(body.progressLogs);
        },
    });
}

export function useStaffClientProfile(clientUserId: string) {
    return useQuery({
        queryKey: profileKeys.staffClient(clientUserId),
        // Always recheck — clients may have just saved profile/progress in another tab.
        staleTime: 0,
        queryFn: () =>
            fetchGrantAware<{ profile: ClientProfile }, ClientProfile>(
                `/api/gym-orgs/clients/${encodeURIComponent(clientUserId)}/profile`,
                (body) => body.profile,
            ),
    });
}

export function useStaffClientProgressLogs(clientUserId: string, initial?: GrantAware<ProgressLog[]>) {
    return useQuery({
        queryKey: profileKeys.staffClientLogs(clientUserId),
        staleTime: 0,
        initialData: initial,
        queryFn: () =>
            fetchGrantAware<{ progressLogs: unknown }, ProgressLog[]>(
                `/api/gym-orgs/clients/${encodeURIComponent(clientUserId)}/progress-logs`,
                (body) => normalizeProgressLogList(body.progressLogs),
            ),
    });
}

export function useUpdateMyProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            heightCm: string;
            weightKg: string;
            dob: string;
            gender: string;
            medicalNotes: string;
        }) => {
            const result = await updateMyProfileAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: profileKeys.all });
        },
    });
}

export function useUpsertMyProgressLog() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { logDate: string; weightKg: string; notes: string }) => {
            const result = await upsertMyProgressLogAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: profileKeys.all });
        },
    });
}
