'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { getJson } from '@/lib/query/api-fetch';
import { assignTrainerAction, offboardMemberAction, setCheckInBlockAction } from '@/modules/roster/roster-actions';
import { rosterErrorMessage } from '@/modules/roster/roster-errors';
import type { RosterMember } from '@/modules/roster/roster-ports';
import { rosterKeys } from '@/modules/roster/roster-query-keys';

/** Roster client hooks (ADR-0011). Mutations call the existing `'use server'` actions. */

export function useActiveRoster() {
    return useQuery({
        queryKey: rosterKeys.active(),
        queryFn: async () => {
            const { members } = await getJson<{ members: RosterMember[] }>(
                '/api/roster',
                rosterErrorMessage('NETWORK_OR_UNKNOWN'),
            );
            return members;
        },
    });
}

async function applyOptimistic(
    queryClient: QueryClient,
    update: (members: RosterMember[]) => RosterMember[],
): Promise<{ previous: RosterMember[] | undefined }> {
    const key = rosterKeys.active();
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<RosterMember[]>(key);
    if (previous) {
        queryClient.setQueryData<RosterMember[]>(key, update(previous));
    }
    return { previous };
}

function rollback(queryClient: QueryClient, context: { previous: RosterMember[] | undefined } | undefined) {
    if (context?.previous) {
        queryClient.setQueryData<RosterMember[]>(rosterKeys.active(), context.previous);
    }
}

/** Check-in block is a manual Admin safety valve — entitlement still follows subscription dates. */
export function useSetCheckInBlock() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { membershipId: string; blocked: boolean }) => {
            const result = await setCheckInBlockAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onMutate: (input) =>
            applyOptimistic(queryClient, (members) =>
                members.map((member) =>
                    member.membershipId === input.membershipId ? { ...member, checkInBlocked: input.blocked } : member,
                ),
            ),
        onError: (_error, _input, context) => rollback(queryClient, context),
        onSettled: () => queryClient.invalidateQueries({ queryKey: rosterKeys.all }),
    });
}

/**
 * Not optimistic. The API can refuse with `COACHING_ADDON_REQUIRED`, and
 * showing the coach as assigned before the server agrees would tell the Admin
 * a member is coached when they are not — the one thing this control exists to
 * get right.
 */
export function useAssignTrainer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { membershipId: string; trainerProfileId: string }) => {
            const result = await assignTrainerAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: rosterKeys.all }),
    });
}

export function useOffboardMember() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { membershipId: string }) => {
            const result = await offboardMemberAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        // The panel renders ACTIVE members only, so offboarding removes the row.
        onMutate: (input) =>
            applyOptimistic(queryClient, (members) =>
                members.filter((member) => member.membershipId !== input.membershipId),
            ),
        onError: (_error, _input, context) => rollback(queryClient, context),
        onSettled: () => queryClient.invalidateQueries({ queryKey: rosterKeys.all }),
    });
}
