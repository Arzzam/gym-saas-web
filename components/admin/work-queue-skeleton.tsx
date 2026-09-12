import { RAIL_GRID_CLASS, type RailWidth } from '@/components/admin/rail-width';
import { cn } from '@/lib/utils';

/**
 * Suspense fallback for any `WorkQueueLayout` screen. Mirrors that layout's
 * metric strip, toolbar and queue/rail grid so nothing shifts when real data
 * streams in (ADR-0009). `summary` and `railWidth` exist so a screen that
 * opted out of the metric strip, or widened its rail, does not shift either —
 * a skeleton that guesses the wrong shape is the shift it was meant to prevent.
 *
 * Shared rather than written per module for the reason skeletons usually rot:
 * a skeleton that drifts from its layout is worse than none, and two copies
 * drift twice. Grey bars only — never duplicated copy, never a placeholder row
 * that could be mistaken for a real person.
 */
export function WorkQueueSkeleton({
    rows = 3,
    summary = true,
    railWidth = 'default',
}: {
    rows?: number;
    summary?: boolean;
    railWidth?: RailWidth;
}) {
    return (
        <div className="space-y-4" aria-hidden="true">
            {summary ? (
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-panel) border border-(--color-border)/60 bg-(--color-border)/60 sm:grid-cols-4">
                    {[0, 1, 2, 3].map((cell) => (
                        <div key={cell} className="space-y-2 bg-(--color-surface) px-4 py-3">
                            <div className="h-3 w-16 animate-pulse rounded bg-(--color-border)" />
                            <div className="h-5 w-20 animate-pulse rounded bg-(--color-border)" />
                        </div>
                    ))}
                </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
                <div className="h-9 w-64 animate-pulse rounded-(--radius-pill) bg-(--color-border)" />
                <div className="h-9 min-w-48 flex-1 animate-pulse rounded-(--radius-control) bg-(--color-border)" />
            </div>

            <div className={cn('grid gap-4 lg:items-start', RAIL_GRID_CLASS[railWidth])}>
                <ul className="divide-y divide-(--color-border)/70 overflow-hidden rounded-(--radius-panel) border border-(--color-border)/80 bg-(--color-surface) shadow-(--shadow-panel)">
                    {Array.from({ length: rows }, (_, row) => (
                        <li key={row} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="space-y-2">
                                <div className="h-3.5 w-36 animate-pulse rounded bg-(--color-border)" />
                                <div className="h-3 w-56 animate-pulse rounded bg-(--color-border)" />
                            </div>
                            <div className="flex gap-2">
                                <div className="h-6 w-16 animate-pulse rounded-(--radius-pill) bg-(--color-border)" />
                                <div className="h-7 w-20 animate-pulse rounded-(--radius-control) bg-(--color-border)" />
                            </div>
                        </li>
                    ))}
                </ul>

                <div className="space-y-3 rounded-(--radius-panel) border border-(--color-border)/80 bg-(--color-surface) p-4 shadow-(--shadow-panel)">
                    <div className="h-5 w-32 animate-pulse rounded bg-(--color-border)" />
                    <div className="h-8 w-full animate-pulse rounded-(--radius-control) bg-(--color-border)" />
                    <div className="h-24 w-full animate-pulse rounded-(--radius-control) bg-(--color-border)" />
                </div>
            </div>
        </div>
    );
}
