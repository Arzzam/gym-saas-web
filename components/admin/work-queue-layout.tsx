'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { statusToneDotClass, type StatusTone } from '@/lib/ui/status-tone';

/**
 * The Admin "desk" shape: a skimmable queue on the left, a detail rail that
 * stays put on the right. Chrome only — it holds no domain logic and knows
 * nothing about renewals, leads or attendance, so a second module adopts it by
 * passing different children rather than by copying it (open/closed).
 *
 * Everything here is token-indirected, so a palette swap in
 * `lib/theme/crm-tokens.css` restyles every consumer without touching this file
 * (`docs/ui-design-system.md` §1).
 *
 * Responsive: two columns at `lg` and up. Below that the rail stacks under the
 * queue and `selectedKey` scrolls it into view on selection, so a tap on a
 * phone doesn't leave the detail twenty rows down. Queue rows are still built
 * to be independently actionable — the rail is context, never the only place an
 * action lives. (A `Sheet` presentation for small screens is the known next
 * step; it needs the rail mounted twice, which is why it isn't here yet.)
 */

type WorkQueueLayoutProps = {
    /** Chrome strip above the queue — glass is allowed here, not in the queue (`docs/ui-theme.md`). */
    summary?: ReactNode;
    /** Filters and search. Sits above the queue and outside it, so it survives a loading swap. */
    toolbar?: ReactNode;
    queue: ReactNode;
    rail: ReactNode;
    /** Names the rail region for screen readers, e.g. "Selected member". */
    railLabel: string;
    /** Changing this scrolls the rail into view below `lg`. Pass the selected row's id. */
    selectedKey?: string | null;
};

export function WorkQueueLayout({
    summary,
    toolbar,
    queue,
    rail,
    railLabel,
    selectedKey = null,
}: WorkQueueLayoutProps) {
    const railRef = useRef<HTMLElement | null>(null);
    const previousKey = useRef<string | null>(selectedKey);

    useEffect(() => {
        if (previousKey.current === selectedKey) {
            return;
        }
        previousKey.current = selectedKey;
        // First paint already shows a default selection; only a real user
        // selection should move the viewport, and only where the rail is
        // off-screen (below the `lg` breakpoint the columns collapse).
        const stacked = window.matchMedia('(max-width: 1023px)').matches;
        if (stacked && selectedKey) {
            railRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [selectedKey]);

    return (
        <div className="space-y-4">
            {summary}
            {toolbar}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
                <div className="min-w-0">{queue}</div>
                <aside
                    ref={railRef}
                    aria-label={railLabel}
                    className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto"
                >
                    {rail}
                </aside>
            </div>
        </div>
    );
}

/** The queue container. Solid and dense on purpose — decoration belongs in `summary`. */
export function WorkQueue({ children, label }: { children: ReactNode; label: string }) {
    return (
        <ul
            aria-label={label}
            className="divide-y divide-(--color-border)/70 overflow-hidden rounded-(--radius-panel) border border-(--color-border)/80 bg-(--color-surface) shadow-(--shadow-panel)"
        >
            {children}
        </ul>
    );
}

type WorkQueueRowProps = {
    /** Urgency, on the shared semantic scale — never a bespoke colour. */
    tone: StatusTone;
    title: ReactNode;
    meta: ReactNode;
    /** Right-hand side: badges and per-row actions. Stays clickable over the row overlay. */
    trailing?: ReactNode;
    selected?: boolean;
    onSelect: () => void;
    /** Accessible name for the whole-row select control, e.g. "Open Ada Client". */
    selectLabel: string;
};

export function WorkQueueRow({
    tone,
    title,
    meta,
    trailing,
    selected = false,
    onSelect,
    selectLabel,
}: WorkQueueRowProps) {
    return (
        <li
            className={cn(
                'relative transition',
                selected ? 'bg-(--color-canvas-accent)' : 'hover:bg-(--color-canvas-accent)/50',
            )}
        >
            {/*
             * The whole row selects, but rows also carry their own action
             * buttons — and a <button> cannot nest inside a <button>. So the
             * select control is an overlay behind the content, and only the
             * trailing actions re-enable pointer events above it.
             */}
            <button
                type="button"
                onClick={onSelect}
                aria-label={selectLabel}
                aria-current={selected ? 'true' : undefined}
                className="absolute inset-0 z-0 cursor-pointer rounded-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)"
            />
            <div className="pointer-events-none relative z-10 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                    <span
                        aria-hidden
                        className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-(--radius-pill)', statusToneDotClass(tone))}
                    />
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-(--color-fg)">{title}</div>
                        <div className="mt-0.5 text-xs text-(--color-fg-muted)">{meta}</div>
                    </div>
                </div>
                {trailing ? (
                    <div className="pointer-events-auto flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        {trailing}
                    </div>
                ) : null}
            </div>
        </li>
    );
}

/** A titled block inside the rail, so every consumer's rail stacks the same way. */
export function WorkQueueRailSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-2">
            <h3 className="text-xs font-medium tracking-wide text-(--color-fg-muted) uppercase">{title}</h3>
            {children}
        </section>
    );
}

/** The rail's own panel surface. Solid — the rail is dense data, not chrome. */
export function WorkQueueRailPanel({ children }: { children: ReactNode }) {
    return (
        <div className="space-y-4 rounded-(--radius-panel) border border-(--color-border)/80 bg-(--color-surface) p-4 shadow-(--shadow-panel)">
            {children}
        </div>
    );
}
