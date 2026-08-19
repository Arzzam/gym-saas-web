'use client';

import { cn } from '@/lib/utils';

export type Segment<T extends string> = {
    value: T;
    label: string;
    /** Optional count shown after the label, e.g. how many rows the segment holds. */
    count?: number;
};

/**
 * A filter that narrows a list already in hand — no navigation, no refetch.
 * The `<Link>`-based `FilterTabs` stays the right choice for a filter that
 * changes what the server fetches; this is its client-side counterpart, so the
 * two are not interchangeable.
 */
export function SegmentedFilter<T extends string>({
    segments,
    value,
    onChange,
    label,
}: {
    segments: readonly Segment<T>[];
    value: T;
    onChange: (next: T) => void;
    label: string;
}) {
    return (
        <div
            role="group"
            aria-label={label}
            className="flex flex-wrap items-center gap-1 rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface) p-1"
        >
            {segments.map((segment) => {
                const active = segment.value === value;
                return (
                    <button
                        key={segment.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(segment.value)}
                        className={cn(
                            'rounded-(--radius-pill) px-3 py-1 text-xs font-medium transition',
                            active
                                ? 'bg-(--color-accent) text-(--color-accent-fg)'
                                : 'text-(--color-fg-muted) hover:text-(--color-fg)',
                        )}
                    >
                        {segment.label}
                        {segment.count === undefined ? null : (
                            <span className={cn('ml-1.5 tabular-nums', active ? 'opacity-70' : 'opacity-80')}>
                                {segment.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
