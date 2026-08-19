'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { getJson } from '@/lib/query/api-fetch';
import {
    createPlanAction,
    deletePlanAction,
    setPlanActiveAction,
    updatePlanAction,
} from '@/modules/plans/plans-actions';
import { planErrorMessage } from '@/modules/plans/plans-errors';
import type { MembershipPlan, PlanKind } from '@/modules/plans/plans-ports';
import { plansKeys } from '@/modules/plans/plans-query-keys';

/**
 * Plan catalog client hooks (ADR-0011).
 *
 * Mutations call the existing `'use server'` actions directly — the
 * auth → lane → tenant gate in `plans-actions.ts` is untouched. TanStack owns
 * only the cache: optimistic write, rollback, invalidation.
 */

type PlansListKey = ReturnType<typeof plansKeys.list>;

async function fetchPlans(kindFilter: PlanKind | 'ALL'): Promise<MembershipPlan[]> {
    const query = kindFilter === 'ALL' ? '' : `?kind=${kindFilter}`;
    const { plans } = await getJson<{ plans: MembershipPlan[] }>(
        `/api/plans${query}`,
        planErrorMessage('NETWORK_OR_UNKNOWN'),
    );
    return plans;
}

export function usePlans(kindFilter: PlanKind | 'ALL') {
    return useQuery({
        queryKey: plansKeys.list(kindFilter),
        queryFn: () => fetchPlans(kindFilter),
    });
}

/**
 * Shared optimistic scaffolding. Cancels in-flight refetches first — otherwise
 * a response that left before the optimistic write can land after it and
 * resurrect the stale row — then snapshots for rollback.
 */
async function applyOptimistic(
    queryClient: QueryClient,
    key: PlansListKey,
    update: (plans: MembershipPlan[]) => MembershipPlan[],
): Promise<{ previous: MembershipPlan[] | undefined }> {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<MembershipPlan[]>(key);
    if (previous) {
        queryClient.setQueryData<MembershipPlan[]>(key, update(previous));
    }
    return { previous };
}

function rollback(
    queryClient: QueryClient,
    key: PlansListKey,
    context: { previous: MembershipPlan[] | undefined } | undefined,
) {
    if (context?.previous) {
        queryClient.setQueryData<MembershipPlan[]>(key, context.previous);
    }
}

export function useSetPlanActive(kindFilter: PlanKind | 'ALL') {
    const queryClient = useQueryClient();
    const key = plansKeys.list(kindFilter);

    return useMutation({
        mutationFn: async (input: { planId: string; active: boolean }) => {
            const result = await setPlanActiveAction(input);
            // Server Actions return a typed result rather than throwing, but
            // TanStack needs a rejection to trigger onError/rollback.
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onMutate: (input) =>
            applyOptimistic(queryClient, key, (plans) =>
                plans.map((plan) => (plan.id === input.planId ? { ...plan, active: input.active } : plan)),
            ),
        onError: (_error, _input, context) => rollback(queryClient, key, context),
        onSettled: () => queryClient.invalidateQueries({ queryKey: plansKeys.all }),
    });
}

/**
 * Optimistic: name, term and price are exactly what the Admin typed, so the
 * row can show them immediately. Contrast `useCreatePlan`, which cannot be
 * optimistic because the server assigns the id and derived `capability`.
 */
export function useUpdatePlan(kindFilter: PlanKind | 'ALL') {
    const queryClient = useQueryClient();
    const key = plansKeys.list(kindFilter);

    return useMutation({
        mutationFn: async (input: { planId: string; name: string; durationDays: number; price: number }) => {
            const result = await updatePlanAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onMutate: (input) =>
            applyOptimistic(queryClient, key, (plans) =>
                plans.map((plan) =>
                    plan.id === input.planId
                        ? { ...plan, name: input.name, durationDays: input.durationDays, price: input.price }
                        : plan,
                ),
            ),
        onError: (_error, _input, context) => rollback(queryClient, key, context),
        onSettled: () => queryClient.invalidateQueries({ queryKey: plansKeys.all }),
    });
}

export function useDeletePlan(kindFilter: PlanKind | 'ALL') {
    const queryClient = useQueryClient();
    const key = plansKeys.list(kindFilter);

    return useMutation({
        mutationFn: async (input: { planId: string }) => {
            const result = await deletePlanAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onMutate: (input) =>
            applyOptimistic(queryClient, key, (plans) => plans.filter((plan) => plan.id !== input.planId)),
        onError: (_error, _input, context) => rollback(queryClient, key, context),
        onSettled: () => queryClient.invalidateQueries({ queryKey: plansKeys.all }),
    });
}

/**
 * No optimistic write: the server assigns the id, timestamps, and derived
 * `capability`, so a synthesised row would render with placeholder values and
 * then visibly swap. Invalidate and let the refetch supply the real row.
 */
export function useCreatePlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: { name: string; kind: PlanKind; durationDays: number; price: number }) => {
            const result = await createPlanAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: plansKeys.all }),
    });
}
