import type { Attendance } from '@/modules/attendance/attendance-ports';
import type { RosterMember } from '@/modules/roster/roster-ports';

/**
 * Pure derivations for the front desk. Same shape as `subscriptions-desk.ts`
 * and `leads-desk.ts` on purpose — three screens, one way of reading a queue.
 *
 * The thing this file exists for is `checkedInAt`: the old desk had no way to
 * show that someone was already marked, so the only way to find out was to
 * mark them again and read the list afterwards.
 */

export type DeskMemberRow = {
    member: RosterMember;
    /** ISO timestamp of their first check-in today, or `null` if they are not in yet. */
    checkedInAt: string | null;
    /** How that check-in was recorded — `null` when they are not in yet. */
    checkedInBy: Attendance['recordedBy'] | null;
};

/**
 * Earliest check-in wins. A member can appear more than once in a day (a self
 * check-in plus a desk mark, say); the desk cares when they arrived, not how
 * many rows the API holds for them.
 */
function earliest(a: Attendance, b: Attendance): Attendance {
    return a.occurredAt <= b.occurredAt ? a : b;
}

export function buildDeskRows(members: readonly RosterMember[], attendances: readonly Attendance[]): DeskMemberRow[] {
    const firstByClient = new Map<string, Attendance>();
    for (const item of attendances) {
        const existing = firstByClient.get(item.clientUserId);
        firstByClient.set(item.clientUserId, existing ? earliest(existing, item) : item);
    }

    return members
        .map((member) => {
            const attendance = firstByClient.get(member.clientUserId) ?? null;
            return {
                member,
                checkedInAt: attendance?.occurredAt ?? null,
                checkedInBy: attendance?.recordedBy ?? null,
            };
        })
        .sort(byPendingThenName);
}

/**
 * Not-yet-arrived first. The desk's job is marking people in, so the people it
 * can still act on belong at the top; already-marked members stay visible
 * underneath as confirmation rather than disappearing.
 */
function byPendingThenName(a: DeskMemberRow, b: DeskMemberRow): number {
    if (!a.checkedInAt !== !b.checkedInAt) {
        return a.checkedInAt ? 1 : -1;
    }
    return a.member.clientName.localeCompare(b.member.clientName);
}

export function filterDeskRows(rows: readonly DeskMemberRow[], query: string): DeskMemberRow[] {
    const q = query.trim().toLowerCase();
    if (!q) {
        return [...rows];
    }
    return rows.filter((row) =>
        [row.member.clientName, row.member.clientEmail, row.member.clientPhone].some((field) =>
            field?.toLowerCase().includes(q),
        ),
    );
}

export type DeskSummary = {
    activeMembers: number;
    checkedIn: number;
    selfCheckIns: number;
    deskMarks: number;
};

export function summarizeDesk(rows: readonly DeskMemberRow[]): DeskSummary {
    return rows.reduce<DeskSummary>(
        (acc, row) => ({
            activeMembers: acc.activeMembers + 1,
            checkedIn: acc.checkedIn + (row.checkedInAt ? 1 : 0),
            selfCheckIns: acc.selfCheckIns + (row.checkedInBy === 'CLIENT' ? 1 : 0),
            deskMarks: acc.deskMarks + (row.checkedInBy === 'ADMIN' ? 1 : 0),
        }),
        { activeMembers: 0, checkedIn: 0, selfCheckIns: 0, deskMarks: 0 },
    );
}

export function formatCheckInTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
