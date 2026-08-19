import { WorkQueueSkeleton } from '@/components/admin/work-queue-skeleton';

/** Suspense fallback for the CRM desk — the shared queue/rail skeleton. */
export function LeadsAdminPanelSkeleton() {
    return <WorkQueueSkeleton />;
}
