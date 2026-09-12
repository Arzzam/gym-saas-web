import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { getSession, isClientSession } from '@/lib/auth/session';
import { getQueryClient } from '@/lib/query/query-client';
import { DataGrantsPanels } from '@/modules/membership-invites/components/data-grants-panels';
import { MembershipInviteInbox } from '@/modules/membership-invites/components/membership-invite-inbox';
import { clientHomeKeys } from '@/modules/membership-invites/membership-invites-query-keys';
import { getClientHomeForSession } from '@/modules/membership-invites/membership-invites-queries';

/**
 * Prefetches the invite inbox + per-gym grants server-side, then hands the warm
 * cache to TanStack (ADR-0011). Both child panels read the same query key, so
 * accepting an invite refreshes the inbox and reveals that gym's sharing panel
 * from a single invalidation.
 */
async function ClientHome({ accessToken }: { accessToken: string }) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: clientHomeKeys.page(),
        queryFn: () => getClientHomeForSession({ accessToken }),
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <MembershipInviteInbox />
            <DataGrantsPanels />
        </HydrationBoundary>
    );
}

export default async function ClientHomePage() {
    const session = await getSession();
    if (!session || !isClientSession(session)) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg)">Member home</h1>
                <p className="mt-1 text-sm text-(--color-fg-muted)">
                    Accept a gym invite to start your membership. Profile and progress live under Profile.
                </p>
            </div>

            <Suspense fallback={<ClientHomeSkeleton />}>
                <ClientHome accessToken={session.accessToken} />
            </Suspense>
        </div>
    );
}

function ClientHomeSkeleton() {
    return (
        <div className="space-y-6" aria-hidden="true">
            {[0, 1].map((panel) => (
                <div
                    key={panel}
                    className="animate-pulse space-y-3 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-panel)"
                >
                    <div className="h-5 w-32 rounded bg-(--color-border)" />
                    <div className="h-4 w-full max-w-md rounded bg-(--color-border)" />
                    <div className="h-9 w-28 rounded-md bg-(--color-border)" />
                </div>
            ))}
        </div>
    );
}
