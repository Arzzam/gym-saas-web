'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { MetricStrip, type Metric } from '@/components/admin/metric-strip';
import {
    WorkQueue,
    WorkQueueLayout,
    WorkQueueRailPanel,
    WorkQueueRailSection,
    WorkQueueRow,
} from '@/components/admin/work-queue-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAttendanceDay, useDeskMarkAttendance } from '@/modules/attendance/attendance-hooks';
import {
    buildDeskRows,
    filterDeskRows,
    formatCheckInTime,
    summarizeDesk,
    type DeskMemberRow,
} from '@/modules/attendance/attendance-desk';

type AttendanceAdminPanelProps = {
    gymOrgId: string;
    day: string;
};

/**
 * Search-to-act front desk.
 *
 * The old flow was three interactions to mark one person: type into a search
 * box, open a `<Select>`, pick the name, then press a submit button. It also
 * could not show that someone was already marked, so the only way to find out
 * was to mark them again.
 *
 * Now the member list *is* the queue: type a few letters, press Mark on the
 * row. Already-marked members stay in the list showing their arrival time
 * rather than vanishing, so the desk can see at a glance who is in.
 */
export function AttendanceAdminPanel({ gymOrgId, day }: AttendanceAdminPanelProps) {
    const { data, error: listQueryError } = useAttendanceDay(day);
    const deskMark = useDeskMarkAttendance(day, gymOrgId);

    const [query, setQuery] = useState('');

    const rows = useMemo(
        () => buildDeskRows(data?.members ?? [], data?.attendances ?? []),
        [data?.members, data?.attendances],
    );
    const visible = useMemo(() => filterDeskRows(rows, query), [rows, query]);
    const summary = useMemo(() => summarizeDesk(rows), [rows]);

    const metrics: Metric[] = [
        { label: 'Checked in', value: String(summary.checkedIn), tone: summary.checkedIn > 0 ? 'positive' : undefined },
        { label: 'Active members', value: String(summary.activeMembers) },
        { label: 'Self check-ins', value: String(summary.selfCheckIns) },
        { label: 'Desk marks', value: String(summary.deskMarks) },
    ];

    const message = deskMark.error?.message ?? listQueryError?.message ?? null;

    return (
        <div className="space-y-4">
            {message ? (
                <p
                    className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-danger)"
                    role="alert"
                >
                    {message}
                </p>
            ) : null}

            <WorkQueueLayout
                railLabel="Today's attendance"
                summary={<MetricStrip metrics={metrics} label="Attendance summary" />}
                toolbar={
                    <div className="relative min-w-48 flex-1">
                        <Search
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--color-fg-muted)"
                        />
                        <Input
                            type="search"
                            className="pl-8"
                            placeholder="Search name, email or phone"
                            aria-label="Search members"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            // The desk's first action every time someone walks in.
                            autoFocus
                        />
                    </div>
                }
                queue={
                    visible.length === 0 ? (
                        <div className="rounded-(--radius-panel) border border-(--color-border)/80 bg-(--color-surface) p-8 text-center shadow-(--shadow-panel)">
                            <p className="text-sm font-medium text-(--color-fg)">
                                {rows.length === 0 ? 'No active members yet' : 'No members match this search'}
                            </p>
                            <p className="mt-1 text-sm text-(--color-fg-muted)">
                                {rows.length === 0
                                    ? 'Accepted membership invites appear here.'
                                    : 'Clear the search to see everyone.'}
                            </p>
                        </div>
                    ) : (
                        <WorkQueue label="Members">
                            {visible.map((row) => (
                                <DeskRow
                                    key={row.member.membershipId}
                                    row={row}
                                    disabled={deskMark.isPending}
                                    onMark={() => deskMark.mutate({ clientUserId: row.member.clientUserId })}
                                />
                            ))}
                        </WorkQueue>
                    )
                }
                rail={<TodayRail rows={rows} day={day} />}
            />
        </div>
    );
}

function DeskRow({ row, disabled, onMark }: { row: DeskMemberRow; disabled: boolean; onMark: () => void }) {
    const { checkedInAt } = row;

    if (checkedInAt) {
        return (
            <WorkQueueRow
                // Present is `positive`. A member who has not arrived is simply
                // inert, not a problem — most members are out most of the day.
                tone="positive"
                title={row.member.clientName}
                meta={`In at ${formatCheckInTime(checkedInAt)} · ${row.checkedInBy === 'ADMIN' ? 'desk' : 'self'}`}
                trailing={<Badge variant="success">Checked in</Badge>}
            />
        );
    }

    return (
        <WorkQueueRow
            tone="neutral"
            // There is no detail to open here, so the whole row *is* the action
            // the Admin came to take: click anywhere on it to mark them in.
            onSelect={disabled ? undefined : onMark}
            selectLabel={`Mark ${row.member.clientName} in`}
            title={row.member.clientName}
            meta={row.member.clientEmail}
            trailing={
                <Button type="button" size="sm" disabled={disabled} onClick={onMark}>
                    Mark in
                </Button>
            }
        />
    );
}

function TodayRail({ rows, day }: { rows: readonly DeskMemberRow[]; day: string }) {
    // Most recent arrival first — the rail is a log, read newest-down.
    const present = rows
        .filter((row) => row.checkedInAt)
        .sort((a, b) => (b.checkedInAt ?? '').localeCompare(a.checkedInAt ?? ''));

    return (
        <WorkQueueRailPanel>
            <div>
                <h2 className="text-base font-semibold text-(--color-fg)">Today</h2>
                <p className="text-xs text-(--color-fg-muted)">{day}</p>
            </div>

            <WorkQueueRailSection title={`In the gym (${present.length})`}>
                {present.length === 0 ? (
                    <p className="text-sm text-(--color-fg-muted)">
                        Nobody has checked in yet. Marks appear here as they arrive.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {present.map(({ member, checkedInAt }) => (
                            <li
                                key={member.membershipId}
                                className="flex items-center justify-between gap-3 rounded-(--radius-control) border border-(--color-border)/70 px-3 py-2"
                            >
                                <span className="min-w-0 truncate text-sm text-(--color-fg)">{member.clientName}</span>
                                <span className="shrink-0 text-xs text-(--color-fg-muted) tabular-nums">
                                    {checkedInAt ? formatCheckInTime(checkedInAt) : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </WorkQueueRailSection>
        </WorkQueueRailPanel>
    );
}
