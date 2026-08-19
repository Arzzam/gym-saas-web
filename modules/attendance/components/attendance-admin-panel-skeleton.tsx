import { WorkQueueSkeleton } from '@/components/admin/work-queue-skeleton';

/** Suspense fallback for the attendance desk — the shared queue/rail skeleton. */
export function AttendanceAdminPanelSkeleton() {
    return <WorkQueueSkeleton />;
}
