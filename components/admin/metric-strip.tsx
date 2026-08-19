import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { statusToneDotClass, type StatusTone } from '@/lib/ui/status-tone';

/**
 * The "how is the day going" strip that sits above a work queue. Chrome, not
 * data — it summarises what the queue already shows, so it is the one place on
 * an ops screen where a translucent surface is allowed (`ui-theme.mdc` bars
 * loud glass on *dense* screens; this strip is neither dense nor the record).
 * It reuses the shell header's own idiom (`--color-surface` at partial alpha +
 * `backdrop-blur`) rather than introducing a second treatment.
 *
 * Values use `tabular-nums` on the body face rather than the mono face. The
 * goal was only ever digit alignment, and Geist Mono gives a comma its own
 * full character cell — `₹6,497` reads as `₹6 , 497`. Tabular figures align
 * the columns without mangling the separator.
 */

export type Metric = {
    label: string;
    value: ReactNode;
    /** Optional one-line gloss under the value, e.g. "3 of 8 collected". */
    hint?: string;
    /** Draws the shared-scale dot. Omit for a plain count that carries no health meaning. */
    tone?: StatusTone;
};

export function MetricStrip({ metrics, label }: { metrics: readonly Metric[]; label: string }) {
    return (
        <section
            aria-label={label}
            className="grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-panel) border border-(--color-border)/60 bg-(--color-border)/60 shadow-(--shadow-panel) sm:grid-cols-4"
        >
            {metrics.map((metric) => (
                <div key={metric.label} className="bg-(--color-surface)/80 px-4 py-3 backdrop-blur-md">
                    <div className="flex items-center gap-1.5">
                        {metric.tone ? (
                            <span
                                aria-hidden
                                className={cn('h-1.5 w-1.5 rounded-(--radius-pill)', statusToneDotClass(metric.tone))}
                            />
                        ) : null}
                        <span className="text-xs text-(--color-fg-muted)">{metric.label}</span>
                    </div>
                    <p className="mt-1 text-lg leading-tight font-semibold text-(--color-fg) tabular-nums">
                        {metric.value}
                    </p>
                    {metric.hint ? <p className="mt-0.5 text-xs text-(--color-fg-muted)">{metric.hint}</p> : null}
                </div>
            ))}
        </section>
    );
}
