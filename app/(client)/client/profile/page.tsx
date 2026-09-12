import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { getSession, isClientSession } from '@/lib/auth/session';
import { getQueryClient } from '@/lib/query/query-client';
import { ClientProfilePanel } from '@/modules/profile/components/client-profile-panel';
import { ClientProgressPanel } from '@/modules/profile/components/client-progress-panel';
import { profileKeys } from '@/modules/profile/profile-query-keys';
import { getMyProfileForSession, listMyProgressLogsForSession } from '@/modules/profile/profile-queries';

async function ClientProfileWorkspace({ accessToken }: { accessToken: string }) {
    const queryClient = getQueryClient();
    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: profileKeys.me(),
            queryFn: () => getMyProfileForSession({ accessToken }),
        }),
        queryClient.prefetchQuery({
            queryKey: profileKeys.meLogs(),
            queryFn: () => listMyProgressLogsForSession({ accessToken }),
        }),
    ]);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="space-y-6">
                <ClientProfilePanel />
                <ClientProgressPanel />
            </div>
        </HydrationBoundary>
    );
}

export default async function ClientProfilePage() {
    const session = await getSession();
    if (!session || !isClientSession(session)) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg)">Profile</h1>
                <p className="mt-1 text-sm text-(--color-fg-muted)">
                    Height, weight, and progress are yours. Gyms only see what you share under Data sharing.
                </p>
            </div>

            <Suspense fallback={<ClientProfileSkeleton />}>
                <ClientProfileWorkspace accessToken={session.accessToken} />
            </Suspense>
        </div>
    );
}

function ClientProfileSkeleton() {
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
