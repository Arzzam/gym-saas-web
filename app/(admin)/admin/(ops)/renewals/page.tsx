import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { FilterTabs, type FilterTab } from '@/components/admin/filter-tabs';
import { getSession, isStaffSession } from '@/lib/auth/session';
import { getQueryClient } from '@/lib/query/query-client';
import { listStaffGymOrgs } from '@/modules/gym-orgs/list-staff-gym-orgs';
import { RenewalsAdminPanel } from '@/modules/subscriptions/components/renewals-admin-panel';
import { RenewalsAdminPanelSkeleton } from '@/modules/subscriptions/components/renewals-admin-panel-skeleton';
import {
    parseRenewalPaymentFilter,
    parseRenewalWindow,
    RENEWAL_WINDOWS,
    renewalWindow,
    type RenewalPaymentFilter,
    type RenewalWindow,
} from '@/modules/subscriptions/subscriptions-desk';
import { isoToday } from '@/modules/subscriptions/subscriptions-labels';
import { subscriptionsKeys } from '@/modules/subscriptions/subscriptions-query-keys';
import { listRenewalsDeskForGym } from '@/modules/subscriptions/subscriptions-queries';

/** Prefetches the renewals window server-side, then hands the warm cache to TanStack (ADR-0011). */
async function RenewalsInbox({
    accessToken,
    dateWindow,
    today,
    payment,
}: {
    accessToken: string;
    dateWindow: RenewalWindow;
    today: string;
    payment: RenewalPaymentFilter;
}) {
    const gymOrgs = await listStaffGymOrgs(accessToken);
    const gym = gymOrgs[0];
    if (!gym) {
        // Unreachable in practice: (ops)/layout.tsx redirects 0-gym Staff to Settings.
        return null;
    }

    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: subscriptionsKeys.renewalsDue(dateWindow.onOrAfter, dateWindow.onOrBefore),
        queryFn: () =>
            listRenewalsDeskForGym({
                accessToken,
                gymOrgId: gym.id,
                onOrAfter: dateWindow.onOrAfter,
                onOrBefore: dateWindow.onOrBefore,
            }),
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <RenewalsAdminPanel
                onOrAfter={dateWindow.onOrAfter}
                onOrBefore={dateWindow.onOrBefore}
                today={today}
                initialPayment={payment}
            />
        </HydrationBoundary>
    );
}

export default async function RenewalsPage({
    searchParams,
}: {
    searchParams: Promise<{ window?: string; payment?: string }>;
}) {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
        return null;
    }

    const params = await searchParams;
    const today = isoToday();
    const windowValue = parseRenewalWindow(params.window);
    const dateWindow = renewalWindow(windowValue, today);
    const payment = parseRenewalPaymentFilter(params.payment);

    /**
     * The window is a `<Link>`, not a client toggle: it is a real query
     * parameter on `renewals-due`, so changing it changes what the server
     * fetches. Payment and search narrow the list in hand and stay client-side
     * (`subscriptions-desk.ts`). Tabs live here, above the <Suspense> boundary,
     * so they stay on screen and clickable while the new window streams in.
     */
    const tabs: FilterTab[] = RENEWAL_WINDOWS.map((value) => ({
        value,
        label: renewalWindow(value, today).label,
        href: `/admin/renewals?window=${value}`,
    }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg) md:text-3xl">Renewals</h1>
                <p className="mt-2 max-w-2xl text-sm text-(--color-fg-muted)">
                    Who is due, what they owe, and how to reach them. Payment badges nudge — they never lock check-in.
                </p>
            </div>

            <FilterTabs tabs={tabs} activeValue={windowValue} label="Filter renewals by window" />

            <Suspense key={windowValue} fallback={<RenewalsAdminPanelSkeleton />}>
                <RenewalsInbox
                    accessToken={session.accessToken}
                    dateWindow={dateWindow}
                    today={today}
                    payment={payment}
                />
            </Suspense>
        </div>
    );
}
