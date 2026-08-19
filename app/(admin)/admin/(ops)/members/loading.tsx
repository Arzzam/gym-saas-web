import { PageHeaderSkeleton } from '@/components/admin/page-header-skeleton';
import { WorkQueueSkeleton } from '@/components/admin/work-queue-skeleton';

/**
 * Instant route-level fallback. Next prefetches this, so clicking "Members"
 * in the sidebar paints immediately instead of waiting for the RSC response.
 */
export default function Loading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <WorkQueueSkeleton />
        </div>
    );
}
