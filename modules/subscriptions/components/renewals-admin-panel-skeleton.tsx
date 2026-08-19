import { WorkQueueSkeleton } from '@/components/admin/work-queue-skeleton';

/** Suspense fallback for the renewals desk — the shared queue/rail skeleton. */
export function RenewalsAdminPanelSkeleton() {
    return <WorkQueueSkeleton />;
}
