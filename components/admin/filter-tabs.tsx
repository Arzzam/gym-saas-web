import Link from 'next/link';

export type FilterTab = {
    value: string;
    label: string;
    href: string;
};

type FilterTabsProps = {
    tabs: readonly FilterTab[];
    activeValue: string;
    /** Names the tab group for screen readers, e.g. "Filter plans by kind". */
    label: string;
};

/**
 * Server-rendered filter tabs. Kept in the page shell (above the data
 * <Suspense>) rather than inside the panel so switching filters keeps the
 * tabs on screen and clickable while the new list streams in — otherwise the
 * tabs disappear into the skeleton on every filter change.
 *
 * Uses <Link> so a filter change is a soft navigation; a raw <a> would tear
 * down and re-hydrate the whole app on every click.
 */
export function FilterTabs({ tabs, activeValue, label }: FilterTabsProps) {
    return (
        <nav className="flex flex-wrap gap-2" aria-label={label}>
            {tabs.map((tab) => {
                const active = tab.value === activeValue;
                return (
                    <Link
                        key={tab.value}
                        href={tab.href}
                        aria-current={active ? 'page' : undefined}
                        className={`rounded-(--radius-control) px-3 py-1.5 text-sm font-medium ${
                            active
                                ? 'bg-(--color-accent) text-(--color-accent-fg)'
                                : 'border border-(--color-border) text-(--color-fg-muted) hover:text-(--color-fg)'
                        }`}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
