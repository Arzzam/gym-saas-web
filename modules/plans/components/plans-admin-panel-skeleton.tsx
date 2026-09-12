import { WorkQueueSkeleton } from '@/components/admin/work-queue-skeleton';

/**
 * Suspense fallback for the plan catalog. Matches this screen's own shape —
 * no metric strip, wide rail — so switching the kind filter does not shift the
 * layout under the pointer that clicked it.
 */
export function PlansAdminPanelSkeleton() {
    return <WorkQueueSkeleton summary={false} railWidth="wide" rows={2} />;
}
