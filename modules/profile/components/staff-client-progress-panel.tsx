'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { GrantAware } from '@/modules/profile/profile-grant';
import { useStaffClientProgressLogs } from '@/modules/profile/profile-hooks';
import { formatProfileMeasure } from '@/modules/profile/profile-labels';
import type { ProgressLog } from '@/modules/profile/profile-ports';
import { normalizeProgressLogList } from '@/modules/profile/profile-progress-list';

type StaffClientProgressPanelProps = {
    clientUserId: string;
    /** RSC prefetch — keeps the table visible even if client refetch lags. */
    initial?: GrantAware<ProgressLog[]>;
};

export function StaffClientProgressPanel({ clientUserId, initial }: StaffClientProgressPanelProps) {
    const { data, error, isPending, isFetching, refetch } = useStaffClientProgressLogs(clientUserId, initial);

    if (isPending && !data) {
        return <p className="text-sm text-(--color-fg-muted)">Loading progress…</p>;
    }

    if (error && !data) {
        return (
            <div className="space-y-2" role="alert">
                <p className="text-sm text-(--color-danger)">{error.message}</p>
                <button
                    type="button"
                    className="text-sm text-(--color-fg) underline-offset-4 hover:underline"
                    onClick={() => void refetch()}
                >
                    Try again
                </button>
            </div>
        );
    }

    // Missing cache is loading — never treat as "not shared".
    if (!data) {
        return <p className="text-sm text-(--color-fg-muted)">Loading progress…</p>;
    }

    if (data.status === 'not_shared') {
        return (
            <EmptyState
                title="Progress"
                description="Member has not shared progress with this gym. Ask them to enable Progress under Data sharing on their Home screen."
            />
        );
    }

    const logs = normalizeProgressLogList(data.data);

    return (
        <section
            className="space-y-3 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-panel)"
            aria-labelledby="staff-progress-heading"
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 id="staff-progress-heading" className="text-lg font-semibold tracking-tight text-(--color-fg)">
                        Progress
                    </h2>
                    <p className="mt-1 text-sm text-(--color-fg-muted)">
                        Weight history this member has shared
                        {logs.length > 0 ? ` · ${logs.length} log${logs.length === 1 ? '' : 's'}` : ''}.
                    </p>
                </div>
                <button
                    type="button"
                    className="text-sm text-(--color-fg-muted) underline-offset-4 hover:text-(--color-fg) hover:underline"
                    onClick={() => void refetch()}
                    disabled={isFetching}
                >
                    {isFetching ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {logs.length === 0 ? (
                <p className="text-sm text-(--color-fg-muted)">
                    Progress is shared, but there are no logs yet. Ask the member to save a weight entry on Client →
                    Profile.
                </p>
            ) : (
                <div className="overflow-hidden rounded-(--radius-panel) border border-(--color-border)">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-(--color-border) text-xs tracking-wide text-(--color-fg-muted) uppercase hover:bg-transparent">
                                <TableHead className="px-4 py-3 text-(--color-fg-muted)">Date</TableHead>
                                <TableHead className="px-4 py-3 text-(--color-fg-muted)">Weight</TableHead>
                                <TableHead className="px-4 py-3 text-(--color-fg-muted)">BMI</TableHead>
                                <TableHead className="px-4 py-3 text-(--color-fg-muted)">Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id} className="border-(--color-border)">
                                    <TableCell className="px-4 py-3">{log.logDate}</TableCell>
                                    <TableCell className="px-4 py-3">
                                        {formatProfileMeasure(log.weightKg, 'kg')}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">{log.bmi ?? '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-(--color-fg-muted)">
                                        {log.notes ?? '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </section>
    );
}
