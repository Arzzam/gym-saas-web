import { describe, expect, it } from 'vitest';

import { buildPlanRows, filterPlanRows, planStatusTone, summarizePlans } from '@/modules/plans/plans-desk';
import type { MembershipPlan } from '@/modules/plans/plans-ports';

function plan(overrides: Partial<MembershipPlan> = {}): MembershipPlan {
    return {
        id: 'plan-1',
        gymOrgId: 'gym-1',
        name: 'Monthly Membership',
        kind: 'BASE',
        capability: null,
        durationDays: 30,
        price: 999,
        active: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        ...overrides,
    };
}

const format = {
    term: (item: MembershipPlan) => `${item.durationDays}d`,
    price: (item: MembershipPlan) => `${item.price} rupees`,
};

describe('planStatusTone', () => {
    it('treats a retired plan as neutral, not a warning', () => {
        // Retiring is a deliberate Admin decision, the same reasoning that
        // keeps a revoked invite neutral — not a fault to be corrected.
        expect(planStatusTone(plan({ active: true }))).toBe('positive');
        expect(planStatusTone(plan({ active: false }))).toBe('neutral');
    });
});

describe('buildPlanRows', () => {
    it('puts sellable plans above retired ones', () => {
        const rows = buildPlanRows(
            [
                plan({ id: 'retired', name: 'Aaa Retired', active: false }),
                plan({ id: 'active', name: 'Zzz Active', active: true }),
            ],
            format,
        );

        // Alphabetically the retired one sorts first; availability wins.
        expect(rows.map((row) => row.plan.id)).toEqual(['active', 'retired']);
    });

    it('sorts alphabetically within a group', () => {
        const rows = buildPlanRows([plan({ id: 'q', name: 'Quarterly' }), plan({ id: 'a', name: 'Annual' })], format);

        expect(rows.map((row) => row.plan.id)).toEqual(['a', 'q']);
    });

    it('renders term and price through the formatters the caller supplies', () => {
        const [row] = buildPlanRows([plan({ price: 1499, durationDays: 90 })], format);
        expect(row.termLabel).toBe('90d');
        expect(row.priceLabel).toBe('1499 rupees');
    });
});

describe('filterPlanRows', () => {
    const rows = buildPlanRows([plan({ id: '1', name: 'Monthly' }), plan({ id: '2', name: 'PT Coaching' })], format);

    it('matches a plan name case-insensitively', () => {
        expect(filterPlanRows(rows, 'pt CoAcH').map((row) => row.plan.id)).toEqual(['2']);
    });

    it('returns everything for a blank query', () => {
        expect(filterPlanRows(rows, '   ')).toHaveLength(2);
    });
});

describe('summarizePlans', () => {
    it('counts what is sellable separately from what exists', () => {
        const rows = buildPlanRows(
            [
                plan({ id: '1', kind: 'BASE', active: true }),
                plan({ id: '2', kind: 'BASE', active: false }),
                plan({ id: '3', kind: 'ADDON', capability: 'TRAINER_COACHING', active: true }),
            ],
            format,
        );

        expect(summarizePlans(rows)).toEqual({ total: 3, active: 2, memberships: 2, addons: 1 });
    });
});
