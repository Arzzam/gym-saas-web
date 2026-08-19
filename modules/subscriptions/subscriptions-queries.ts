import { createAppServices } from '@/lib/api/composition';
import type { MembershipPlan } from '@/modules/plans/plans-ports';
import type { RosterMember } from '@/modules/roster/roster-ports';
import type { RenewalDueItem, Subscription } from '@/modules/subscriptions/subscriptions-ports';

export type RenewalsDeskData = {
    renewals: RenewalDueItem[];
    members: RosterMember[];
    /** The catalog, so a renewal can name the plan behind its `planId`. */
    plans: MembershipPlan[];
};

/**
 * Server-side read for the renewals desk (ADR-0011).
 *
 * `renewals-due` returns `clientUserId` and nothing else about the person, so
 * the roster rides along to resolve names, emails and phone numbers — the same
 * shape `attendance-queries.ts` already uses for the desk picker. Joining here
 * rather than in the panel means one cache entry per window instead of two
 * lists the client has to keep in step.
 *
 * ACTIVE only, deliberately: the roster is here to name people the Admin should
 * still be chasing. An offboarded member's line falls back to a short id rather
 * than silently resurrecting them into the queue.
 *
 * The plan catalog rides along for the same reason the roster does: a renewal
 * carries a `planId` and a price snapshot but no plan name, so without it the
 * desk can only say "Membership" where the Admin needs "Quarterly Membership".
 * A gym's catalog is a handful of rows and it is fetched in parallel, so this
 * costs nothing the screen was not already waiting on.
 */
export async function listRenewalsDeskForGym(input: {
    accessToken: string;
    gymOrgId: string;
    onOrAfter: string;
    onOrBefore: string;
}): Promise<RenewalsDeskData> {
    const { listRenewalsDue, listRosterMembers, listPlans } = createAppServices();
    const [renewalPage, roster, planPage] = await Promise.all([
        listRenewalsDue(input),
        listRosterMembers({ accessToken: input.accessToken, gymOrgId: input.gymOrgId, status: 'ACTIVE' }),
        listPlans({ accessToken: input.accessToken, gymOrgId: input.gymOrgId }),
    ]);
    return { renewals: renewalPage.renewals.items, members: roster.members, plans: planPage.plans.items };
}

/** Lazy rail read: every line this client holds, fetched only once a row is selected. */
export async function listClientSubscriptionsForGym(input: {
    accessToken: string;
    gymOrgId: string;
    clientUserId: string;
}): Promise<Subscription[]> {
    const { listClientSubscriptions } = createAppServices();
    const { subscriptions } = await listClientSubscriptions(input);
    return subscriptions;
}
