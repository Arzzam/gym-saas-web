import type { MembershipPlan, PlanCapability, PlanKind } from '@/modules/plans/plans-ports';

/**
 * The single source of wording for `BASE | ADDON`.
 *
 * This enum had grown four spellings — `planKindLabel` said "Base", the plan
 * form's own helper said "Base membership", `subscriptionKindLabel` in the
 * subscriptions module said "Membership", and the catalog's filter tabs
 * hardcoded "Base"/"Add-ons". One enum, four words for it, so the plan an Admin
 * created as a "Base membership" showed up on the renewals desk as something
 * apparently different.
 *
 * `BASE` is now **"Membership"** everywhere. "Base" is our schema's word, not a
 * gym owner's: what they are selling is a membership, and the thing that makes
 * it "base" — that add-ons hang off it — is already obvious from the add-ons
 * sitting next to it.
 *
 * Subscriptions imports these rather than keeping a parallel copy, the same way
 * it already imports the payment-status labels from membership-invites.
 */
export function planKindLabel(kind: PlanKind): string {
    switch (kind) {
        case 'BASE':
            return 'Membership';
        case 'ADDON':
            return 'Add-on';
    }
}

export function planCapabilityLabel(capability: PlanCapability | null): string {
    if (!capability) {
        return '—';
    }
    switch (capability) {
        case 'TRAINER_COACHING':
            return 'Trainer coaching';
    }
}

/**
 * Fuller wording for a picker, where the Admin is choosing what a plan *is*
 * rather than reading a list of plans they already recognise. Same words as
 * `planKindLabel`, extended — never a different noun.
 */
export function planKindOptionLabel(kind: PlanKind): string {
    switch (kind) {
        case 'BASE':
            return 'Membership — the plan a member pays for';
        case 'ADDON':
            return 'Add-on — Trainer coaching';
    }
}

export function formatPlanDuration(days: number): string {
    if (days === 30) {
        return '30 days';
    }
    if (days === 365) {
        return '365 days';
    }
    return `${days} days`;
}

/**
 * What a member is actually on, in one phrase: the plan's own name plus its
 * term. "Quarterly Membership · 90 days" tells an Admin which of their plans
 * this is; "Membership" alone does not, and a gym with monthly, quarterly and
 * annual plans is the normal case rather than the exception.
 *
 * `plan` is nullable because the renewals desk resolves it by `planId` against
 * the catalog and a deleted plan will not be found. Falling back to the kind
 * keeps the row readable instead of blanking it — the subscription is a price
 * snapshot and stays valid even when the plan behind it is gone.
 */
export function describePlan(
    plan: Pick<MembershipPlan, 'name' | 'kind' | 'capability' | 'durationDays'> | null,
    fallbackKind: PlanKind,
): string {
    if (!plan) {
        return planKindLabel(fallbackKind);
    }
    const term = formatPlanDuration(plan.durationDays);
    if (plan.kind === 'ADDON' && plan.capability) {
        return `${plan.name} · ${planCapabilityLabel(plan.capability)} · ${term}`;
    }
    return `${plan.name} · ${term}`;
}
