import { z } from 'zod';

import { endpoints } from '@/modules/subscriptions/subscriptions-endpoints';
import type { HttpClient } from '@/lib/api/client';
import type {
    Subscription,
    SubscriptionsReader,
    SubscriptionsWriter,
    UpdateSubscriptionPaymentInput,
} from '@/modules/subscriptions/subscriptions-ports';

const paymentStatusSchema = z.enum(['paid', 'unpaid', 'partial']);

const subscriptionSchema = z.object({
    id: z.string().min(1),
    clientMembershipId: z.string().min(1),
    gymOrgId: z.string().min(1).optional(),
    planId: z.string().min(1),
    kind: z.enum(['BASE', 'ADDON']),
    capability: z.string().nullable().optional(),
    priceAmount: z.number(),
    durationDays: z.number().int().positive(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    startSource: z.string().nullable().optional(),
    paymentStatus: paymentStatusSchema,
    amountPaid: z.number(),
    createdAt: z.string().min(1).optional(),
    updatedAt: z.string().min(1).optional(),
    clientUserId: z.string().min(1).optional(),
});

const subscriptionEnvelopeSchema = z.object({
    subscription: subscriptionSchema,
});

const clientSubscriptionsEnvelopeSchema = z.object({
    subscriptions: z.array(subscriptionSchema),
});

const renewalsPageSchema = z.object({
    renewals: z.object({
        items: z.array(subscriptionSchema),
        total: z.number().int().nonnegative(),
        limit: z.number().int().positive(),
        offset: z.number().int().nonnegative(),
    }),
});

function normalizeSubscription(raw: z.infer<typeof subscriptionSchema>, gymOrgId: string): Subscription {
    return {
        id: raw.id,
        clientMembershipId: raw.clientMembershipId,
        gymOrgId: raw.gymOrgId ?? gymOrgId,
        planId: raw.planId,
        kind: raw.kind,
        capability: raw.capability ?? null,
        priceAmount: raw.priceAmount,
        durationDays: raw.durationDays,
        startDate: raw.startDate ?? null,
        endDate: raw.endDate ?? null,
        startSource: raw.startSource ?? null,
        paymentStatus: raw.paymentStatus,
        amountPaid: raw.amountPaid,
        createdAt: raw.createdAt ?? '',
        updatedAt: raw.updatedAt ?? '',
    };
}

function renewalsQuery(input: { onOrBefore?: string; onOrAfter?: string; limit?: number; offset?: number }): string {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 50));
    params.set('offset', String(input.offset ?? 0));
    if (input.onOrBefore) {
        params.set('onOrBefore', input.onOrBefore);
    }
    if (input.onOrAfter) {
        params.set('onOrAfter', input.onOrAfter);
    }
    return params.toString();
}

export function createSubscriptionsAdapter(http: HttpClient): SubscriptionsReader & SubscriptionsWriter {
    return {
        async listRenewalsDue({ accessToken, gymOrgId, onOrBefore, onOrAfter, limit, offset }) {
            const raw = await http.request<unknown>({
                path: `${endpoints.gymOrgRenewalsDue(gymOrgId)}?${renewalsQuery({
                    onOrBefore,
                    onOrAfter,
                    limit,
                    offset,
                })}`,
                method: 'GET',
                accessToken,
            });
            const parsed = renewalsPageSchema.parse(raw);
            return {
                renewals: {
                    ...parsed.renewals,
                    items: parsed.renewals.items.map((item) => ({
                        ...normalizeSubscription(item, gymOrgId),
                        clientUserId: item.clientUserId ?? '',
                    })),
                },
            };
        },

        async listClientSubscriptions({ accessToken, gymOrgId, clientUserId }) {
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgClientSubscriptions(gymOrgId, clientUserId),
                method: 'GET',
                accessToken,
            });
            const parsed = clientSubscriptionsEnvelopeSchema.parse(raw);
            return {
                subscriptions: parsed.subscriptions.map((item) => normalizeSubscription(item, gymOrgId)),
            };
        },

        async updatePayment({ accessToken, gymOrgId, subscriptionId, body }) {
            const payload: UpdateSubscriptionPaymentInput = {
                paymentStatus: body.paymentStatus,
            };
            if (body.amountPaid !== undefined) {
                payload.amountPaid = body.amountPaid;
            }
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgSubscriptionPayment(gymOrgId, subscriptionId),
                method: 'PATCH',
                accessToken,
                body: payload,
            });
            const parsed = subscriptionEnvelopeSchema.parse(raw);
            return {
                subscription: normalizeSubscription(parsed.subscription, gymOrgId),
            };
        },
    };
}
