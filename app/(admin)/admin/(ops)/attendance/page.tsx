import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { getSession, isStaffSession } from '@/lib/auth/session';
import { getQueryClient } from '@/lib/query/query-client';
import { AttendanceAdminPanel } from '@/modules/attendance/components/attendance-admin-panel';
import { AttendanceAdminPanelSkeleton } from '@/modules/attendance/components/attendance-admin-panel-skeleton';
import { attendanceKeys } from '@/modules/attendance/attendance-query-keys';
import { listAttendanceDayForGym } from '@/modules/attendance/attendance-queries';
import { listStaffGymOrgs } from '@/modules/gym-orgs/list-staff-gym-orgs';

function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Prefetches the desk day server-side, then hands the warm cache to TanStack (ADR-0011). */
async function AttendanceDesk({ accessToken, day }: { accessToken: string; day: string }) {
    const gymOrgs = await listStaffGymOrgs(accessToken);
    const gym = gymOrgs[0];
    if (!gym) {
        // Unreachable in practice: (ops)/layout.tsx redirects 0-gym Staff to Settings.
        return null;
    }

    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: attendanceKeys.day(day),
        queryFn: () => listAttendanceDayForGym({ accessToken, gymOrgId: gym.id, day }),
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <AttendanceAdminPanel gymOrgId={gym.id} day={day} />
        </HydrationBoundary>
    );
}

export default async function AttendancePage() {
    const session = await getSession();
    if (!session || !isStaffSession(session)) {
        return null;
    }

    const day = todayIsoDate();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg) md:text-3xl">Attendance</h1>
                <p className="mt-2 max-w-2xl text-sm text-(--color-fg-muted)">
                    Search for whoever is at the door and mark them in. Entitlement follows subscription dates, not
                    payment status.
                </p>
            </div>

            <Suspense fallback={<AttendanceAdminPanelSkeleton />}>
                <AttendanceDesk accessToken={session.accessToken} day={day} />
            </Suspense>
        </div>
    );
}
