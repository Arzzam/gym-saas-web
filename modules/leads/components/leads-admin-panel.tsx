'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { ErrorNotice } from '@/components/admin/error-notice';
import { MetricStrip, type Metric } from '@/components/admin/metric-strip';
import { WorkQueue, WorkQueueLayout, WorkQueueRow } from '@/components/admin/work-queue-layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import { cn } from '@/lib/utils';
import { LeadCaptureDialog } from '@/modules/leads/components/lead-capture-dialog';
import { LeadDetailRail } from '@/modules/leads/components/lead-detail-rail';
import {
    buildLeadRows,
    filterLeadRows,
    followUpUrgencyTone,
    summarizeLeads,
    type LeadRow,
} from '@/modules/leads/leads-desk';
import { useChangeLeadStatus, useDeleteLead, useLeadsPage } from '@/modules/leads/leads-hooks';
import { isLeadStageMuted, leadStatusLabel, leadStatusTone } from '@/modules/leads/leads-labels';
import type { LeadStatus } from '@/modules/leads/leads-ports';

type LeadsAdminPanelProps = {
    gymName: string;
    statusFilter: LeadStatus | 'ALL';
    /**
     * Resolved on the server so "follow up in 3 days" is computed from one
     * clock — otherwise SSR and hydration can straddle UTC midnight.
     */
    today: string;
};

export function LeadsAdminPanel({ gymName, statusFilter, today }: LeadsAdminPanelProps) {
    // Hydrated from the page's server prefetch — same query key (ADR-0011).
    const { data, error: listQueryError } = useLeadsPage(statusFilter);

    // Status change and delete are owned *here*, not in the rail: an optimistic
    // delete unmounts the rail, which would destroy a mutation hook living
    // inside it — taking the failure message with it.
    const changeStatus = useChangeLeadStatus(statusFilter);
    const deleteLead = useDeleteLead(statusFilter);
    const rowActionsPending = changeStatus.isPending || deleteLead.isPending;

    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const followUpsDue = data?.dueFollowUps.length ?? 0;
    const rows = useMemo(() => buildLeadRows(data?.leads ?? [], today), [data?.leads, today]);
    const visible = useMemo(() => filterLeadRows(rows, query), [rows, query]);
    const summary = useMemo(() => summarizeLeads(rows), [rows]);

    // Derived, not stored: a search that hides the selected lead falls back to
    // the top of the queue instead of leaving a stale rail behind.
    const selected: LeadRow | null = visible.find((row) => row.lead.id === selectedId) ?? visible[0] ?? null;

    const metrics: Metric[] = [
        { label: 'Leads', value: String(summary.total), hint: gymName },
        {
            label: 'Follow-ups due',
            // From the API's own due-follow-ups list, not counted off the rows:
            // it is gym-wide, so the number does not change when the Admin
            // switches stage tabs.
            value: String(followUpsDue),
            // Owed calls need attention; nothing here denies anyone access.
            tone: followUpsDue > 0 ? 'warning' : 'neutral',
            hint: followUpsDue > 0 ? 'across all stages' : 'nothing owed',
        },
        { label: 'In trial', value: String(summary.inTrial) },
        { label: 'Converted', value: String(summary.converted), tone: summary.converted > 0 ? 'positive' : undefined },
    ];

    const message = listQueryError?.message ?? changeStatus.error?.message ?? deleteLead.error?.message ?? null;

    return (
        <div className="space-y-4">
            <ErrorNotice message={message} />

            <WorkQueueLayout
                selectedKey={selected?.lead.id ?? null}
                railLabel="Selected lead"
                summary={<MetricStrip metrics={metrics} label="Pipeline summary" />}
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
                                placeholder="Search name, phone, source or interest"
                                aria-label="Search leads"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </div>
                        <LeadCaptureDialog />
                    </div>
                }
                queue={
                    visible.length === 0 ? (
                        <div className="rounded-(--radius-panel) border border-(--color-border)/80 bg-(--color-surface) p-8 text-center shadow-(--shadow-panel)">
                            <p className="text-sm font-medium text-(--color-fg)">
                                {rows.length === 0 ? 'No leads yet' : 'No leads match this search'}
                            </p>
                            <p className="mt-1 text-sm text-(--color-fg-muted)">
                                {rows.length === 0
                                    ? 'Capture a walk-in with the button above.'
                                    : 'Clear the search, or switch the stage filter.'}
                            </p>
                        </div>
                    ) : (
                        <WorkQueue label="Lead pipeline">
                            {visible.map((row) => (
                                <WorkQueueRow
                                    key={row.lead.id}
                                    tone={followUpUrgencyTone(row.urgency)}
                                    selected={row.lead.id === selected?.lead.id}
                                    onSelect={() => setSelectedId(row.lead.id)}
                                    selectLabel={`Open ${row.lead.name}`}
                                    title={row.lead.name}
                                    meta={
                                        <>
                                            {row.lead.phone} · {row.followUpLabel}
                                            {row.lead.interest ? ` · ${row.lead.interest}` : ''}
                                        </>
                                    }
                                    trailing={
                                        <Badge
                                            variant={statusToneBadgeVariant(leadStatusTone(row.lead.status))}
                                            className={cn(isLeadStageMuted(row.lead.status) && 'opacity-60')}
                                        >
                                            {leadStatusLabel(row.lead.status)}
                                        </Badge>
                                    }
                                />
                            ))}
                        </WorkQueue>
                    )
                }
                rail={
                    <LeadDetailRail
                        row={selected}
                        basePlans={data?.basePlans ?? []}
                        addonPlans={data?.addonPlans ?? []}
                        onStatusChange={(leadId, status) => changeStatus.mutate({ leadId, status })}
                        onDelete={(leadId) => deleteLead.mutate({ leadId })}
                        rowActionsPending={rowActionsPending}
                    />
                }
            />
        </div>
    );
}
