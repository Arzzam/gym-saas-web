'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getJson } from '@/lib/query/api-fetch';
import { updateSubscriptionPaymentAction } from '@/modules/subscriptions/subscriptions-actions';
import { subscriptionErrorMessage } from '@/modules/subscriptions/subscriptions-errors';
import type { Subscription, SubscriptionPaymentStatus } from '@/modules/subscriptions/subscriptions-ports';
import type { RenewalsDeskData } from '@/modules/subscriptions/subscriptions-queries';
import { subscriptionsKeys } from '@/modules/subscriptions/subscriptions-query-keys';

/** Renewals desk client hooks (ADR-0011). */

export function useRenewalsDesk(onOrAfter: string, onOrBefore: string) {
    return useQuery({
        queryKey: subscriptionsKeys.renewalsDue(onOrAfter, onOrBefore),
        queryFn: () =>
            getJson<RenewalsDeskData>(
                `/api/subscriptions/renewals?onOrAfter=${onOrAfter}&onOrBefore=${onOrBefore}`,
                subscriptionErrorMessage('NETWORK_OR_UNKNOWN'),
            ),
    });
}

/**
 * The detail rail's lines for one client. Not prefetched on the server: which
 * row the Admin opens is unknowable at render time, and prefetching every
 * client in the window would be one request per row for data most of them
 * never look at.
 */
export function useClientSubscriptions(clientUserId: string | null) {
    return useQuery({
        queryKey: subscriptionsKeys.client(clientUserId ?? ''),
        enabled: !!clientUserId,
        queryFn: async () => {
            const { subscriptions } = await getJson<{ subscriptions: Subscription[] }>(
                `/api/subscriptions/clients/${encodeURIComponent(clientUserId ?? '')}`,
                subscriptionErrorMessage('NETWORK_OR_UNKNOWN'),
            );
            return subscriptions;
        },
    });
}

export function useUpdateSubscriptionPayment(onOrAfter: string, onOrBefore: string) {
    const queryClient = useQueryClient();
    const key = subscriptionsKeys.renewalsDue(onOrAfter, onOrBefore);

    return useMutation({
        mutationFn: async (input: {
            subscriptionId: string;
            paymentStatus: SubscriptionPaymentStatus;
            amountPaid: number;
        }) => {
            const result = await updateSubscriptionPaymentAction(input);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return result;
        },
        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<RenewalsDeskData>(key);
            if (previous) {
                queryClient.setQueryData<RenewalsDeskData>(key, {
                    ...previous,
                    renewals: previous.renewals.map((item) =>
                        item.id === input.subscriptionId
                            ? { ...item, paymentStatus: input.paymentStatus, amountPaid: input.amountPaid }
                            : item,
                    ),
                });
            }
            return { previous };
        },
        onError: (_error, _input, context) => {
            if (context?.previous) {
                queryClient.setQueryData<RenewalsDeskData>(key, context.previous);
            }
        },
        // `subscriptionsKeys.all` covers the open rail too: the line just paid
        // is one of the client's lines, so the rail would otherwise keep
        // showing the pre-payment figure next to a row that already updated.
        onSettled: () => queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all }),
    });
}
