import type { ReactElement } from 'react';

type MemberAssignmentSummaryProps = {
    memberEmail: string | null;
    assignedTrainerLabel: string;
};

/** Server-resolved assignment chrome for member detail (no client trainers fetch). */
export function MemberAssignmentSummary({
    memberEmail,
    assignedTrainerLabel,
}: MemberAssignmentSummaryProps): ReactElement {
    return (
        <section
            className="rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-panel)"
            aria-labelledby="member-assignment-heading"
        >
            <h2 id="member-assignment-heading" className="text-lg font-semibold tracking-tight text-(--color-fg)">
                Assignment
            </h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                    <dt className="text-xs tracking-wide text-(--color-fg-muted) uppercase">Assigned trainer</dt>
                    <dd className="mt-1 text-(--color-fg)">{assignedTrainerLabel}</dd>
                </div>
                <div>
                    <dt className="text-xs tracking-wide text-(--color-fg-muted) uppercase">Member email</dt>
                    <dd className="mt-1 text-(--color-fg)">{memberEmail ?? '—'}</dd>
                </div>
            </dl>
        </section>
    );
}
