'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { getJson } from '@/lib/query/api-fetch';
import {
    changeLeadStatusAction,
    createLeadAction,
    deleteLeadAction,
    updateLeadAction,
} from '@/modules/leads/leads-actions';
import { leadErrorMessage } from '@/modules/leads/leads-errors';
import type { LeadStatus } from '@/modules/leads/leads-ports';
import { leadsKeys } from '@/modules/leads/leads-query-keys';
import type { LeadsPageData } from '@/modules/leads/leads-queries';

/**
 * CRM pipeline client hooks (ADR-0011). Mutations call the existing
 * `'use server'` actions; TanStack owns cache, optimistic write and rollback.
 */

type LeadsPageKey = ReturnType<typeof leadsKeys.page>;

async function fetchLeadsPage(statusFilter: LeadStatus | 'ALL'): Promise<LeadsPageData> {
    const query = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
    return getJson<LeadsPageData>(`/api/leads${query}`, leadErrorMessage('NETWORK_OR_UNKNOWN'));
}

export function useLeadsPage(statusFilter: LeadStatus | 'ALL') {
    return useQuery({
        queryKey: leadsKeys.page(statusFilter),
        queryFn: () => fetchLeadsPage(statusFilter),
    });
}

async function applyOptimistic(
    queryClient: QueryClient,
    key: LeadsPageKey,
    update: (data: LeadsPageData) => LeadsPageData,
): Promise<{ previous: LeadsPageData | undefined }> {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<LeadsPageData>(key);
    if (previous) {
        queryClient.setQueryData<LeadsPageData>(key, update(previous));
    }
    return { previous };
}

function rollback(
    queryClient: QueryClient,
    key: LeadsPageKey,
    context: { previous: LeadsPageData | undefined } | undefined,
) {
    if (context?.previous) {
        queryClient.setQueryData<LeadsPageData>(key, context.previous);
    }
}

export function useCreateLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            name: string;
            phone: string;
            email?: string;
            source?: string;
            interest?: string;
            notes?: string;
        }) => {
            const result = await createLeadAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.all }),
    });
}

/** Full-row save. Not optimistic: the API may normalise phone//follow-up and returns warnings. */
export function useUpdateLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            leadId: string;
            name: string;
            phone: string;
            email?: string;
            source?: string;
            interest?: string;
            notes?: string;
            followUpDate?: string | null;
        }) => {
            const result = await updateLeadAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.all }),
    });
}

export function useChangeLeadStatus(statusFilter: LeadStatus | 'ALL') {
    const queryClient = useQueryClient();
    const key = leadsKeys.page(statusFilter);

    return useMutation({
        mutationFn: async (input: { leadId: string; status: LeadStatus }) => {
            const result = await changeLeadStatusAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onMutate: (input) =>
            applyOptimistic(queryClient, key, (data) => ({
                ...data,
                leads: data.leads.map((lead) => (lead.id === input.leadId ? { ...lead, status: input.status } : lead)),
            })),
        onError: (_error, _input, context) => rollback(queryClient, key, context),
        onSettled: () => queryClient.invalidateQueries({ queryKey: leadsKeys.all }),
    });
}

export function useDeleteLead(statusFilter: LeadStatus | 'ALL') {
    const queryClient = useQueryClient();
    const key = leadsKeys.page(statusFilter);

    return useMutation({
        mutationFn: async (input: { leadId: string }) => {
            const result = await deleteLeadAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        // Drops the lead from the pipeline *and* the due-follow-ups panel —
        // both live in this one cache entry.
        onMutate: (input) =>
            applyOptimistic(queryClient, key, (data) => ({
                leads: data.leads.filter((lead) => lead.id !== input.leadId),
                dueFollowUps: data.dueFollowUps.filter((lead) => lead.id !== input.leadId),
            })),
        onError: (_error, _input, context) => rollback(queryClient, key, context),
        onSettled: () => queryClient.invalidateQueries({ queryKey: leadsKeys.all }),
    });
}
