import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { getSession, isStaffSession } from '@/lib/auth/session';
import { getQueryClient } from '@/lib/query/query-client';
import { listStaffGymOrgs } from '@/modules/gym-orgs/list-staff-gym-orgs';
import { WorkQueueSkeleton } from '@/components/admin/work-queue-skeleton';
import { membershipInvitesKeys } from '@/modules/membership-invites/membership-invites-query-keys';
import { listMembershipInvitesPageForGym } from '@/modules/membership-invites/membership-invites-queries';
import { MembersDeskPanel } from '@/modules/roster/components/members-desk-panel';
import { parseMemberScope, type MemberScope } from '@/modules/roster/roster-desk';
import { rosterKeys } from '@/modules/roster/roster-query-keys';
import { listActiveRosterForGym } from '@/modules/roster/roster-queries';

/**
 * Invites and roster are prefetched in parallel but kept as **separate query
 * keys**: they are mutated independently, so a check-in block should not
 * refetch the invite list (and vice versa).
 */
async function MembersWorkspace({ accessToken, scope }: { accessToken: string; scope: MemberScope }) {
    const gymOrgs = await listStaffGymOrgs(accessToken);
    const gym = gymOrgs[0];
    if (!gym) {
        // Unreachable in practice: (ops)/layout.tsx redirects 0-gym Staff to Settings.
        return null;
    }

    const queryClient = getQueryClient();
    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: membershipInvitesKeys.list(),
            queryFn: () => listMembershipInvitesPageForGym({ accessToken, gymOrgId: gym.id }),
        }),
        queryClient.prefetchQuery({
            queryKey: rosterKeys.active(),
            queryFn: () => listActiveRosterForGym({ accessToken, gymOrgId: gym.id }),
        }),
    ]);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <MembersDeskPanel initialScope={scope} />
        </HydrationBoundary>
    );
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
        return null;
    }

    const scope = parseMemberScope((await searchParams).scope);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg) md:text-3xl">Members</h1>
                <p className="mt-2 max-w-2xl text-sm text-(--color-fg-muted)">
                    Everyone connected to this gym — members on the roster, and the people you have invited. Payment
                    badges are informational; entitlement follows subscription dates.
                </p>
            </div>

            <Suspense fallback={<WorkQueueSkeleton />}>
                <MembersWorkspace accessToken={session.accessToken} scope={scope} />
            </Suspense>
        </div>
    );
}
