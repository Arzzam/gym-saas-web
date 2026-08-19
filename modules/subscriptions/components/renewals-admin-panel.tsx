'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { ErrorNotice } from '@/components/admin/error-notice';
import { MetricStrip, type Metric } from '@/components/admin/metric-strip';
import { SegmentedFilter, type Segment } from '@/components/admin/segmented-filter';
import { WorkQueue, WorkQueueLayout, WorkQueueRow } from '@/components/admin/work-queue-layout';
import { Input } from '@/components/ui/input';
import { useShallowSearchParam } from '@/hooks/use-shallow-search-param';
import { formatMoney } from '@/lib/ui/format-money';
import {
    buildRenewalRows,
    filterRenewalRows,
    RENEWAL_PAYMENT_FILTERS,
    type RenewalPaymentFilter,
    type RenewalRow,
} from '@/modules/subscriptions/subscriptions-desk';
import { useRenewalsDesk, useUpdateSubscriptionPayment } from '@/modules/subscriptions/subscriptions-hooks';
import {
    renewalUrgencyTone,
    subscriptionKindLabel,
    summarizeRenewals,
} from '@/modules/subscriptions/subscriptions-labels';
import { RenewalMemberRail } from '@/modules/subscriptions/components/renewal-member-rail';
import { RenewalPaymentActions } from '@/modules/subscriptions/components/renewal-payment-actions';

type RenewalsAdminPanelProps = {
    onOrAfter: string;
    onOrBefore: string;
    /**
     * Resolved on the server and passed down so "ends in 3 days" is computed
     * from one clock. Deriving it in the client would let SSR and hydration
     * straddle UTC midnight and disagree about what day it is.
     */
    today: string;
    initialPayment: RenewalPaymentFilter;
};

const PAYMENT_LABEL: Record<RenewalPaymentFilter, string> = {
    all: 'All',
    unpaid: 'Unpaid',
    partial: 'Partial',
    paid: 'Paid',
};

export function RenewalsAdminPanel({ onOrAfter, onOrBefore, today, initialPayment }: RenewalsAdminPanelProps) {
    // Hydrated from the page's server prefetch — same query key (ADR-0011).
    const { data, error: listQueryError } = useRenewalsDesk(onOrAfter, onOrBefore);
    const updatePayment = useUpdateSubscriptionPayment(onOrAfter, onOrBefore);

    const [payment, setPayment] = useShallowSearchParam<RenewalPaymentFilter>('payment', initialPayment, 'all');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const rows = useMemo(
        () => buildRenewalRows(data?.renewals ?? [], data?.members ?? [], today),
        [data?.renewals, data?.members, today],
    );
    const visible = useMemo(() => filterRenewalRows(rows, { payment, query }), [rows, payment, query]);
    const summary = useMemo(() => summarizeRenewals(visible.map((row) => row.renewal)), [visible]);

    const paymentCounts = useMemo(
        () =>
            rows.reduce<Record<string, number>>(
                (acc, row) => ({ ...acc, [row.renewal.paymentStatus]: (acc[row.renewal.paymentStatus] ?? 0) + 1 }),
                {},
            ),
        [rows],
    );

    // Derived, not stored: a filter change that hides the selected row falls
    // back to the top of the queue instead of leaving an empty rail behind.
    const selected: RenewalRow | null = visible.find((row) => row.renewal.id === selectedId) ?? visible[0] ?? null;

    const segments: Segment<RenewalPaymentFilter>[] = RENEWAL_PAYMENT_FILTERS.map((value) => ({
        value,
        label: PAYMENT_LABEL[value],
        count: value === 'all' ? rows.length : (paymentCounts[value] ?? 0),
    }));

    const metrics: Metric[] = [
        { label: 'Renewals', value: String(summary.count), hint: 'in this window' },
        { label: 'Billed', value: formatMoney(summary.billed) },
        { label: 'Collected', value: formatMoney(summary.collected), tone: 'positive' },
        {
            label: 'Outstanding',
            value: formatMoney(summary.outstanding),
            // Money owed needs attention; it never denies access on its own.
            tone: summary.outstanding > 0 ? 'warning' : 'neutral',
            hint: summary.unsettledCount > 0 ? `${summary.unsettledCount} to collect` : 'all settled',
        },
    ];

    const message = updatePayment.error?.message ?? listQueryError?.message ?? null;

    return (
        <div className="space-y-4">
            <ErrorNotice message={message} />

            <WorkQueueLayout
                selectedKey={selected?.renewal.id ?? null}
                railLabel="Selected member"
                summary={<MetricStrip metrics={metrics} label="Renewals summary" />}
                toolbar={
                    <div className="flex flex-wrap items-center gap-2">
                        <SegmentedFilter
                            segments={segments}
                            value={payment}
                            onChange={setPayment}
                            label="Filter renewals by payment"
                        />
                        <div className="relative min-w-48 flex-1">
                            <Search
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--color-fg-muted)"
                            />
                            <Input
                                type="search"
                                className="pl-8"
                                placeholder="Search name, email or phone"
                                aria-label="Search renewals"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </div>
                    </div>
                }
                queue={
                    visible.length === 0 ? (
                        <div className="rounded-(--radius-panel) border border-(--color-border)/80 bg-(--color-surface) p-8 text-center shadow-(--shadow-panel)">
                            <p className="text-sm font-medium text-(--color-fg)">
                                {rows.length === 0 ? 'Nothing due in this window' : 'No renewals match these filters'}
                            </p>
                            <p className="mt-1 text-sm text-(--color-fg-muted)">
                                {rows.length === 0
                                    ? 'Widen the window above to look further ahead, or check the overdue tab.'
                                    : 'Clear the search or switch back to All.'}
                            </p>
                        </div>
                    ) : (
                        <WorkQueue label="Renewals due">
                            {visible.map((row) => (
                                <WorkQueueRow
                                    key={row.renewal.id}
                                    tone={renewalUrgencyTone(row.urgency)}
                                    selected={row.renewal.id === selected?.renewal.id}
                                    onSelect={() => setSelectedId(row.renewal.id)}
                                    selectLabel={`Open ${row.displayName}`}
                                    title={row.displayName}
                                    meta={
                                        <>
                                            {row.dueLabel} · {subscriptionKindLabel(row.renewal.kind)} ·{' '}
                                            <span className="tabular-nums">{formatMoney(row.renewal.priceAmount)}</span>
                                            {row.outstanding > 0 && row.outstanding !== row.renewal.priceAmount ? (
                                                <>
                                                    {' · '}
                                                    <span className="tabular-nums">
                                                        {formatMoney(row.outstanding)}
                                                    </span>{' '}
                                                    left
                                                </>
                                            ) : null}
                                        </>
                                    }
                                    trailing={
                                        <RenewalPaymentActions
                                            item={row.renewal}
                                            disabled={updatePayment.isPending}
                                            onUpdate={(update) => updatePayment.mutate(update)}
                                        />
                                    }
                                />
                            ))}
                        </WorkQueue>
                    )
                }
                rail={<RenewalMemberRail row={selected} />}
            />
        </div>
    );
}
