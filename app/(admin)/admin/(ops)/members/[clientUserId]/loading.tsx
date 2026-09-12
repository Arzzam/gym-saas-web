import { PageHeaderSkeleton } from '@/components/admin/page-header-skeleton';

export default function Loading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <div className="animate-pulse space-y-3 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-5">
                <div className="h-5 w-28 rounded bg-(--color-border)" />
                <div className="h-4 w-full max-w-md rounded bg-(--color-border)" />
            </div>
        </div>
    );
}
