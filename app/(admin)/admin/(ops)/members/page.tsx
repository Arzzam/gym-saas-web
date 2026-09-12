import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { WorkQueueSkeleton } from '@/components/admin/work-queue-skeleton';
import { getSession, isStaffSession } from '@/lib/auth/session';
import { getQueryClient } from '@/lib/query/query-client';
import { gymOrgsKeys } from '@/modules/gym-orgs/gym-orgs-query-keys';
import { listGymTrainersForGym } from '@/modules/gym-orgs/gym-orgs-queries';
import { listStaffGymOrgs } from '@/modules/gym-orgs/list-staff-gym-orgs';
import { membershipInvitesKeys } from '@/modules/membership-invites/membership-invites-query-keys';
import { listMembershipInvitesPageForGym } from '@/modules/membership-invites/membership-invites-queries';
import { AssignedMembersPanel } from '@/modules/roster/components/assigned-members-panel';
import { MembersDeskPanel } from '@/modules/roster/components/members-desk-panel';
import { parseMemberScope, type MemberScope } from '@/modules/roster/roster-desk';
import { rosterKeys } from '@/modules/roster/roster-query-keys';
import { listActiveRosterForGym, listMyAssignedMembersForGym } from '@/modules/roster/roster-queries';

type MembersWorkspaceProps = {
    accessToken: string;
    roleCode: string;
    scope: MemberScope;
};

/**
 * ADMIN (and every other non-TRAINER staff role): the members desk — invites,
 * roster and trainer picker, prefetched in parallel but kept as **separate
 * query keys**: they are mutated independently, so a check-in block should not
 * refetch the invite list (and vice versa), and the roster's optimistic writes
 * stay a map over a plain `RosterMember[]`.
 *
 * TRAINER: assigned clients only (Postman `List My Assigned Members`) — a
 * trainer never sees the full roster or the invite queue.
 */
async function MembersWorkspace({ accessToken, roleCode, scope }: MembersWorkspaceProps) {
    const gymOrgs = await listStaffGymOrgs(accessToken);
    const gym = gymOrgs[0];
    if (!gym) {
        return null;
    }

    // Only TRAINER gets the assigned-only list; every other staff role sees the full roster.
    const isTrainerScoped = roleCode === 'TRAINER';
    const queryClient = getQueryClient();

    if (isTrainerScoped) {
        await queryClient.prefetchQuery({
            queryKey: rosterKeys.assigned(),
            queryFn: () => listMyAssignedMembersForGym({ accessToken, gymOrgId: gym.id }),
        });

        return (
            <HydrationBoundary state={dehydrate(queryClient)}>
                <AssignedMembersPanel />
            </HydrationBoundary>
        );
    }

    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: membershipInvitesKeys.list(),
            queryFn: () => listMembershipInvitesPageForGym({ accessToken, gymOrgId: gym.id }),
        }),
        queryClient.prefetchQuery({
            queryKey: rosterKeys.active(),
            queryFn: () => listActiveRosterForGym({ accessToken, gymOrgId: gym.id }),
        }),
        // Trainers are needed by the rail's coach picker; prefetched so it
        // paints with the member rather than fetching on first selection.
        queryClient.prefetchQuery({
            queryKey: gymOrgsKeys.trainers(),
            queryFn: () => listGymTrainersForGym({ accessToken, gymOrgId: gym.id }),
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

    const isTrainerScoped = session.roleCode === 'TRAINER';
    const scope = parseMemberScope((await searchParams).scope);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg) md:text-3xl">Members</h1>
                <p className="mt-2 max-w-2xl text-sm text-(--color-fg-muted)">
                    {isTrainerScoped
                        ? 'Clients assigned to you for coaching. Open Profile to view shared vitals and progress.'
                        : 'Everyone connected to this gym — members on the roster, and the people you have invited. Payment badges are informational; entitlement follows subscription dates.'}
                </p>
            </div>

            <Suspense fallback={<WorkQueueSkeleton />}>
                <MembersWorkspace accessToken={session.accessToken} roleCode={session.roleCode} scope={scope} />
            </Suspense>
        </div>
    );
}
