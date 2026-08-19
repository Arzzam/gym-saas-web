import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { FilterTabs, type FilterTab } from '@/components/admin/filter-tabs';
import { getSession, isStaffSession } from '@/lib/auth/session';
import { getQueryClient } from '@/lib/query/query-client';
import { listStaffGymOrgs } from '@/modules/gym-orgs/list-staff-gym-orgs';
import { PlansAdminPanel } from '@/modules/plans/components/plans-admin-panel';
import { PlansAdminPanelSkeleton } from '@/modules/plans/components/plans-admin-panel-skeleton';
import type { PlanKind } from '@/modules/plans/plans-ports';
import { planKindLabel } from '@/modules/plans/plans-labels';
import { plansKeys } from '@/modules/plans/plans-query-keys';
import { listPlansForGym } from '@/modules/plans/plans-queries';

type PlansPageProps = {
    searchParams: Promise<{ kind?: string }>;
};

/** Labels come from `planKindLabel` so the tabs cannot drift from the rows below them. */
const KIND_TABS: readonly FilterTab[] = [
    { value: 'ALL', label: 'All', href: '/admin/plans' },
    { value: 'BASE', label: planKindLabel('BASE'), href: '/admin/plans?kind=BASE' },
    { value: 'ADDON', label: planKindLabel('ADDON'), href: '/admin/plans?kind=ADDON' },
];

function parseKind(raw: string | undefined): PlanKind | 'ALL' {
    if (raw === 'BASE' || raw === 'ADDON') {
        return raw;
    }
    return 'ALL';
}

/**
 * Prefetches the catalog server-side so first paint ships with data (no
 * load-time spinner), then hands the warm cache to TanStack via
 * <HydrationBoundary>. The client hooks reuse the identical `plansKeys.list`
 * key, so they hydrate instead of refetching.
 *
 * Still behind <Suspense> per ADR-0009: the await below is a backend round
 * trip, and the page shell must not block on it.
 */
async function PlansCatalog({ accessToken, kindFilter }: { accessToken: string; kindFilter: PlanKind | 'ALL' }) {
    const gymOrgs = await listStaffGymOrgs(accessToken);
    const gym = gymOrgs[0];
    if (!gym) {
        // Unreachable in practice: (ops)/layout.tsx redirects 0-gym Staff to Settings.
        return null;
    }

    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: plansKeys.list(kindFilter),
        queryFn: () => listPlansForGym({ accessToken, gymOrgId: gym.id, kindFilter }),
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <PlansAdminPanel gymName={gym.name} kindFilter={kindFilter} />
        </HydrationBoundary>
    );
}

export default async function PlansPage({ searchParams }: PlansPageProps) {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
        return null;
    }

    const params = await searchParams;
    const kindFilter = parseKind(params.kind);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg) md:text-3xl">Plans</h1>
                <p className="mt-2 max-w-2xl text-sm text-(--color-fg-muted)">
                    Memberships and add-ons (Trainer coaching). Unpaid members stay entitled unless you manually block
                    check-in later.
                </p>
            </div>

            <FilterTabs tabs={KIND_TABS} activeValue={kindFilter} label="Filter plans by kind" />

            <Suspense key={kindFilter} fallback={<PlansAdminPanelSkeleton />}>
                <PlansCatalog accessToken={session.accessToken} kindFilter={kindFilter} />
            </Suspense>
        </div>
    );
}
