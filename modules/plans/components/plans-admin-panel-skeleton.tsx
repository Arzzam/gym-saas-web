import { WorkQueueSkeleton } from '@/components/admin/work-queue-skeleton';

/** Suspense fallback for the plan catalog — the shared queue/rail skeleton. */
export function PlansAdminPanelSkeleton() {
    return <WorkQueueSkeleton />;
}
