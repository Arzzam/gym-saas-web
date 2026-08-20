/**
 * Playwright fixture adapter for the plans module (`GYM_SAAS_E2E_FIXTURES=1`).
 * Shared state lives in `lib/api/e2e/store.ts`; bound in `plans-services.ts`.
 */
import { ApiClientError } from '@/lib/api/errors';
import type { MembershipPlan, PlansReader, PlansWriter } from '@/modules/plans/plans-ports';
import { E2E_GYM_ID, e2ePlans, e2eNextId } from '@/lib/api/e2e/store';

export function createE2ePlansAdapter(): PlansReader & PlansWriter {
    return {
        async list({ gymOrgId, kind, active, limit = 50, offset = 0 }) {
            if (gymOrgId !== E2E_GYM_ID) {
                return { plans: { items: [], total: 0, limit, offset } };
            }
            let items = [...e2ePlans];
            if (kind) {
                items = items.filter((plan) => plan.kind === kind);
            }
            if (active !== undefined) {
                items = items.filter((plan) => plan.active === active);
            }
            return {
                plans: {
                    items: items.slice(offset, offset + limit),
                    total: items.length,
                    limit,
                    offset,
                },
            };
        },

        async get({ planId }) {
            const plan = e2ePlans.find((item) => item.id === planId);
            if (!plan) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            return { plan };
        },

        async create({ gymOrgId, body }) {
            const plan: MembershipPlan = {
                id: e2eNextId('plan-e2e-new'),
                gymOrgId,
                name: body.name,
                kind: body.kind,
                capability: body.kind === 'ADDON' ? 'TRAINER_COACHING' : null,
                durationDays: body.durationDays,
                price: body.price,
                active: true,
                createdAt: '2026-08-08T00:00:00.000Z',
                updatedAt: '2026-08-08T00:00:00.000Z',
            };
            e2ePlans.unshift(plan);
            return { plan };
        },

        async update({ planId, body }) {
            const idx = e2ePlans.findIndex((item) => item.id === planId);
            if (idx < 0) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            const updated: MembershipPlan = {
                ...e2ePlans[idx],
                ...body,
                updatedAt: '2026-08-08T01:00:00.000Z',
            };
            e2ePlans[idx] = updated;
            return { plan: updated };
        },

        async softDelete({ planId }) {
            const idx = e2ePlans.findIndex((item) => item.id === planId);
            if (idx < 0) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            e2ePlans.splice(idx, 1);
        },
    };
}
