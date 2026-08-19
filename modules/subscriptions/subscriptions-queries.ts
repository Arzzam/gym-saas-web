import { createAppServices } from '@/lib/api/composition';
import type { RosterMember } from '@/modules/roster/roster-ports';
import type { RenewalDueItem, Subscription } from '@/modules/subscriptions/subscriptions-ports';

export type RenewalsDeskData = {
    renewals: RenewalDueItem[];
    members: RosterMember[];
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
 */
export async function listRenewalsDeskForGym(input: {
    accessToken: string;
    gymOrgId: string;
    onOrAfter: string;
    onOrBefore: string;
}): Promise<RenewalsDeskData> {
    const { listRenewalsDue, listRosterMembers } = createAppServices();
    const [renewalPage, roster] = await Promise.all([
        listRenewalsDue(input),
        listRosterMembers({ accessToken: input.accessToken, gymOrgId: input.gymOrgId, status: 'ACTIVE' }),
    ]);
    return { renewals: renewalPage.renewals.items, members: roster.members };
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
