import type { StatusTone } from '@/lib/ui/status-tone';
import type { MembershipPlan } from '@/modules/plans/plans-ports';

/**
 * Pure derivations for the plan catalog desk — the same shape as the renewals,
 * CRM and attendance desk models, so all four read alike.
 *
 * The catalog is the one desk whose queue is not people. It earns the layout
 * anyway because a plan has editable fields the table never exposed: name,
 * term and price were reachable through `updatePlan` but had no UI.
 */

export type PlanRow = {
    plan: MembershipPlan;
    /** How long one term runs, e.g. "30 days". */
    termLabel: string;
    /** What a member on this plan pays, e.g. "₹999". */
    priceLabel: string;
};

/**
 * Rendering is injected so this module stays pure — and stays two fields
 * rather than one joined "₹999 · 30 days" string, because the catalog aligns
 * price under price and term under term. A dot-joined phrase cannot be a
 * column.
 */
export type PlanRowFormatters = {
    term: (plan: MembershipPlan) => string;
    price: (plan: MembershipPlan) => string;
};

/**
 * Inactive is `neutral`, not `warning`. Retiring a plan is a deliberate Admin
 * decision, the same reasoning that keeps a revoked invite neutral
 * (`docs/ui-design-system.md` §3) — it is not a fault to be corrected.
 */
export function planStatusTone(plan: MembershipPlan): StatusTone {
    return plan.active ? 'positive' : 'neutral';
}

/**
 * Active plans first: those are the ones an Admin sells from, and a retired
 * plan is kept for the history of members still on it rather than for daily
 * use. Alphabetical within each group so a catalog stays scannable.
 */
function byActiveThenName(a: PlanRow, b: PlanRow): number {
    if (a.plan.active !== b.plan.active) {
        return a.plan.active ? -1 : 1;
    }
    return a.plan.name.localeCompare(b.plan.name);
}

export function buildPlanRows(plans: readonly MembershipPlan[], format: PlanRowFormatters): PlanRow[] {
    return plans
        .map((plan) => ({ plan, termLabel: format.term(plan), priceLabel: format.price(plan) }))
        .sort(byActiveThenName);
}

export function filterPlanRows(rows: readonly PlanRow[], query: string): PlanRow[] {
    const q = query.trim().toLowerCase();
    if (!q) {
        return [...rows];
    }
    return rows.filter((row) => row.plan.name.toLowerCase().includes(q));
}

export type PlansSummary = {
    total: number;
    active: number;
    memberships: number;
    addons: number;
};

export function summarizePlans(rows: readonly PlanRow[]): PlansSummary {
    return rows.reduce<PlansSummary>(
        (acc, { plan }) => ({
            total: acc.total + 1,
            active: acc.active + (plan.active ? 1 : 0),
            memberships: acc.memberships + (plan.kind === 'BASE' ? 1 : 0),
            addons: acc.addons + (plan.kind === 'ADDON' ? 1 : 0),
        }),
        { total: 0, active: 0, memberships: 0, addons: 0 },
    );
}
