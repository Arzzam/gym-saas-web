import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { FilterTabs, type FilterTab } from '@/components/admin/filter-tabs';
import { getSession, isStaffSession } from '@/lib/auth/session';
import { getQueryClient } from '@/lib/query/query-client';
import { listStaffGymOrgs } from '@/modules/gym-orgs/list-staff-gym-orgs';
import { LeadsAdminPanel } from '@/modules/leads/components/leads-admin-panel';
import { LeadsAdminPanelSkeleton } from '@/modules/leads/components/leads-admin-panel-skeleton';
import { isoToday } from '@/modules/leads/leads-desk';
import { LEAD_STATUSES, leadStatusLabel } from '@/modules/leads/leads-labels';
import type { LeadStatus } from '@/modules/leads/leads-ports';
import { leadsKeys } from '@/modules/leads/leads-query-keys';
import { listLeadsPageForGym } from '@/modules/leads/leads-queries';

type CrmPageProps = {
    searchParams: Promise<{ status?: string }>;
};

const STATUS_TABS: readonly FilterTab[] = [
    { value: 'ALL', label: 'All', href: '/admin/crm' },
    ...LEAD_STATUSES.map((status) => ({
        value: status,
        label: leadStatusLabel(status),
        href: `/admin/crm?status=${status}`,
    })),
];

function parseStatus(raw: string | undefined): LeadStatus | 'ALL' {
    if (raw === 'NEW' || raw === 'CONTACTED' || raw === 'TRIAL' || raw === 'CONVERTED' || raw === 'LOST') {
        return raw;
    }
    return 'ALL';
}

/** Prefetches the pipeline server-side, then hands the warm cache to TanStack (ADR-0011). */
async function LeadsPipeline({
    accessToken,
    statusFilter,
    today,
}: {
    accessToken: string;
    statusFilter: LeadStatus | 'ALL';
    today: string;
}) {
    const gymOrgs = await listStaffGymOrgs(accessToken);
    const gym = gymOrgs[0];
    if (!gym) {
        // Unreachable in practice: (ops)/layout.tsx redirects 0-gym Staff to Settings.
        return null;
    }

    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: leadsKeys.page(statusFilter),
        queryFn: () => listLeadsPageForGym({ accessToken, gymOrgId: gym.id, statusFilter }),
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <LeadsAdminPanel gymName={gym.name} statusFilter={statusFilter} today={today} />
        </HydrationBoundary>
    );
}

export default async function CrmPage({ searchParams }: CrmPageProps) {
    // Only cookie + searchParams work here — no API calls, so this shell
    // streams immediately and the skeleton paints without waiting on the
    // backend. The gym lookup lives inside <LeadsData>.
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
        return null;
    }

    const params = await searchParams;
    const statusFilter = parseStatus(params.status);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg) md:text-3xl">Leads</h1>
                <p className="mt-2 max-w-2xl text-sm text-(--color-fg-muted)">
                    Your call list, ordered by who is owed a follow-up. Pick a lead to reach them, move their stage, or
                    edit their details.
                </p>
            </div>

            <FilterTabs tabs={STATUS_TABS} activeValue={statusFilter} label="Filter leads by status" />

            {/* Keyed so switching filters shows the skeleton rather than
                silently holding the previous filter's rows on screen. */}
            <Suspense key={statusFilter} fallback={<LeadsAdminPanelSkeleton />}>
                <LeadsPipeline accessToken={session.accessToken} statusFilter={statusFilter} today={isoToday()} />
            </Suspense>
        </div>
    );
}
