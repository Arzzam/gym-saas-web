/**
 * Playwright fixture adapter for the subscriptions module (`GYM_SAAS_E2E_FIXTURES=1`).
 * Shared state lives in `lib/api/e2e/store.ts`; bound in `subscriptions-services.ts`.
 */
import { ApiClientError } from '@/lib/api/errors';
import type {
    RenewalDueItem,
    Subscription,
    SubscriptionsReader,
    SubscriptionsWriter,
} from '@/modules/subscriptions/subscriptions-ports';
import { E2E_GYM_ID, e2eRenewals } from '@/lib/api/e2e/store';

export function createE2eSubscriptionsAdapter(): SubscriptionsReader & SubscriptionsWriter {
    return {
        async listRenewalsDue({ gymOrgId, onOrBefore, onOrAfter, limit = 50, offset = 0 }) {
            if (gymOrgId !== E2E_GYM_ID) {
                return {
                    renewals: { items: [], total: 0, limit, offset },
                };
            }
            let items = e2eRenewals.filter((item) => item.gymOrgId === gymOrgId);
            if (onOrAfter) {
                items = items.filter((item) => item.endDate && item.endDate >= onOrAfter);
            }
            if (onOrBefore) {
                items = items.filter((item) => item.endDate && item.endDate <= onOrBefore);
            }
            return {
                renewals: {
                    items: items.slice(offset, offset + limit),
                    total: items.length,
                    limit,
                    offset,
                },
            };
        },

        async listClientSubscriptions({ gymOrgId, clientUserId }) {
            const subscriptions: Subscription[] = e2eRenewals
                .filter((item) => item.gymOrgId === gymOrgId && item.clientUserId === clientUserId)
                .map((item) => ({ ...item }));
            return { subscriptions };
        },

        async updatePayment({ gymOrgId, subscriptionId, body }) {
            const idx = e2eRenewals.findIndex((item) => item.id === subscriptionId && item.gymOrgId === gymOrgId);
            if (idx < 0) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            if (body.paymentStatus === 'partial' && body.amountPaid === undefined) {
                throw new ApiClientError({
                    code: 'VALIDATION_ERROR',
                    message: 'Partial payment requires amountPaid',
                    status: 422,
                });
            }
            const updated: RenewalDueItem = {
                ...e2eRenewals[idx],
                paymentStatus: body.paymentStatus,
                amountPaid: body.amountPaid ?? (body.paymentStatus === 'paid' ? e2eRenewals[idx].priceAmount : 0),
                updatedAt: '2026-08-11T11:00:00.000Z',
            };
            e2eRenewals[idx] = updated;
            const subscription: Subscription = { ...updated };
            return { subscription };
        },
    };
}
