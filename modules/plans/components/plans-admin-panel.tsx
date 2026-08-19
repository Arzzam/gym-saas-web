'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { ErrorNotice } from '@/components/admin/error-notice';
import { MetricStrip, type Metric } from '@/components/admin/metric-strip';
import { WorkQueue, WorkQueueLayout, WorkQueueRow } from '@/components/admin/work-queue-layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/ui/format-money';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import { PlanCreateDialog } from '@/modules/plans/components/plan-create-dialog';
import { PlanDetailRail } from '@/modules/plans/components/plan-detail-rail';
import {
    buildPlanRows,
    filterPlanRows,
    planStatusTone,
    summarizePlans,
    type PlanRow,
} from '@/modules/plans/plans-desk';
import { useDeletePlan, usePlans, useSetPlanActive } from '@/modules/plans/plans-hooks';
import { formatPlanDuration, planCapabilityLabel, planKindLabel } from '@/modules/plans/plans-labels';
import type { MembershipPlan, PlanKind } from '@/modules/plans/plans-ports';

type PlansAdminPanelProps = {
    gymName: string;
    kindFilter: PlanKind | 'ALL';
};

/** The plan's own terms, as a member would hear them: "₹999 · 30 days". */
function termLabel(plan: MembershipPlan): string {
    return `${formatMoney(plan.price)} · ${formatPlanDuration(plan.durationDays)}`;
}

export function PlansAdminPanel({ gymName, kindFilter }: PlansAdminPanelProps) {
    // Hydrated from the page's server prefetch — same query key (ADR-0011).
    const { data: plans = [], error: listQueryError } = usePlans(kindFilter);

    // Both mutations are owned here, not in the rail: a delete unmounts the
    // rail, which would take its mutation and error message with it.
    const setPlanActive = useSetPlanActive(kindFilter);
    const deletePlan = useDeletePlan(kindFilter);
    const rowActionsPending = setPlanActive.isPending || deletePlan.isPending;

    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const rows = useMemo(() => buildPlanRows(plans, termLabel), [plans]);
    const visible = useMemo(() => filterPlanRows(rows, query), [rows, query]);
    const summary = useMemo(() => summarizePlans(rows), [rows]);

    // Derived, not stored: a search that hides the selected plan falls back to
    // the top of the catalog rather than leaving a stale rail behind.
    const selected: PlanRow | null = visible.find((row) => row.plan.id === selectedId) ?? visible[0] ?? null;

    const metrics: Metric[] = [
        { label: 'Plans', value: String(summary.total), hint: gymName },
        {
            label: 'Available',
            value: String(summary.active),
            tone: summary.active > 0 ? 'positive' : 'warning',
            hint: summary.active > 0 ? 'sellable today' : 'nothing to invite onto',
        },
        { label: 'Memberships', value: String(summary.memberships) },
        { label: 'Add-ons', value: String(summary.addons) },
    ];

    const message = listQueryError?.message ?? setPlanActive.error?.message ?? deletePlan.error?.message ?? null;

    return (
        <div className="space-y-4">
            <ErrorNotice message={message} />

            <WorkQueueLayout
                selectedKey={selected?.plan.id ?? null}
                railLabel="Selected plan"
                summary={<MetricStrip metrics={metrics} label="Catalog summary" />}
                toolbar={
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-48 flex-1">
                            <Search
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--color-fg-muted)"
                            />
                            <Input
                                type="search"
                                className="pl-8"
                                placeholder="Search plans"
                                aria-label="Search plans"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </div>
                        <PlanCreateDialog />
                    </div>
                }
                queue={
                    visible.length === 0 ? (
                        <div className="rounded-(--radius-panel) border border-(--color-border)/80 bg-(--color-surface) p-8 text-center shadow-(--shadow-panel)">
                            <p className="text-sm font-medium text-(--color-fg)">
                                {rows.length === 0 ? 'No plans yet' : 'No plans match this search'}
                            </p>
                            <p className="mt-1 text-sm text-(--color-fg-muted)">
                                {rows.length === 0
                                    ? 'Create a membership or an add-on to start inviting members.'
                                    : 'Clear the search, or switch the type filter.'}
                            </p>
                        </div>
                    ) : (
                        <WorkQueue label="Plan catalog">
                            {visible.map((row) => (
                                <WorkQueueRow
                                    key={row.plan.id}
                                    tone={planStatusTone(row.plan)}
                                    selected={row.plan.id === selected?.plan.id}
                                    onSelect={() => setSelectedId(row.plan.id)}
                                    selectLabel={`Open ${row.plan.name}`}
                                    title={row.plan.name}
                                    meta={
                                        <>
                                            <span className="tabular-nums">{row.termLabel}</span> ·{' '}
                                            {planKindLabel(row.plan.kind)}
                                            {row.plan.kind === 'ADDON'
                                                ? ` · ${planCapabilityLabel(row.plan.capability)}`
                                                : ''}
                                        </>
                                    }
                                    trailing={
                                        row.plan.active ? null : (
                                            <Badge variant={statusToneBadgeVariant(planStatusTone(row.plan))}>
                                                Retired
                                            </Badge>
                                        )
                                    }
                                />
                            ))}
                        </WorkQueue>
                    )
                }
                rail={
                    <PlanDetailRail
                        row={selected}
                        kindFilter={kindFilter}
                        onToggleActive={(plan) => setPlanActive.mutate({ planId: plan.id, active: !plan.active })}
                        onDelete={(planId) => deletePlan.mutate({ planId })}
                        rowActionsPending={rowActionsPending}
                    />
                }
            />
        </div>
    );
}
