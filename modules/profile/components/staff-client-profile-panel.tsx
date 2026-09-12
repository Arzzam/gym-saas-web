'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { formatProfileMeasure, profileGenderLabel } from '@/modules/profile/profile-labels';
import { useStaffClientProfile } from '@/modules/profile/profile-hooks';

function hasAnyProfileValue(profile: {
    heightCm: number | null;
    weightKg: number | null;
    bmi: number | null;
    dob: string | null;
    gender: string | null;
    medicalNotes: string | null;
}): boolean {
    return (
        profile.heightCm != null ||
        profile.weightKg != null ||
        profile.bmi != null ||
        Boolean(profile.dob) ||
        Boolean(profile.gender) ||
        Boolean(profile.medicalNotes)
    );
}

export function StaffClientProfilePanel({ clientUserId }: { clientUserId: string }) {
    const { data, error, isPending } = useStaffClientProfile(clientUserId);

    if (error && !data) {
        return (
            <p role="alert" className="text-sm text-(--color-danger)">
                {error.message}
            </p>
        );
    }

    if (isPending || !data) {
        return <p className="text-sm text-(--color-fg-muted)">Loading profile…</p>;
    }

    if (data.status === 'not_shared') {
        return (
            <EmptyState
                title="Profile"
                description="Member has not shared profile details with this gym. Ask them to keep DOB, height, and weight filled on their profile."
            />
        );
    }

    const profile = data.data;
    const isEmpty = !hasAnyProfileValue(profile);

    return (
        <section
            className="space-y-3 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-panel)"
            aria-labelledby="staff-profile-heading"
        >
            <div>
                <h2 id="staff-profile-heading" className="text-lg font-semibold tracking-tight text-(--color-fg)">
                    Profile
                </h2>
                <p className="mt-1 text-sm text-(--color-fg-muted)">
                    Only fields this member has granted. Ungranted fields stay blank.
                </p>
            </div>
            {isEmpty ? (
                <p className="text-sm text-(--color-fg-muted)">
                    Shared, but no values yet. Ask the member to save height, weight, or date of birth on{' '}
                    <span className="text-(--color-fg)">Client → Profile</span>.
                </p>
            ) : (
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                        <dt className="text-xs tracking-wide text-(--color-fg-muted) uppercase">Height</dt>
                        <dd className="mt-1 text-(--color-fg)">{formatProfileMeasure(profile.heightCm, 'cm')}</dd>
                    </div>
                    <div>
                        <dt className="text-xs tracking-wide text-(--color-fg-muted) uppercase">Weight</dt>
                        <dd className="mt-1 text-(--color-fg)">{formatProfileMeasure(profile.weightKg, 'kg')}</dd>
                    </div>
                    <div>
                        <dt className="text-xs tracking-wide text-(--color-fg-muted) uppercase">BMI</dt>
                        <dd className="mt-1 text-(--color-fg)">{profile.bmi ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs tracking-wide text-(--color-fg-muted) uppercase">Date of birth</dt>
                        <dd className="mt-1 text-(--color-fg)">{profile.dob ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs tracking-wide text-(--color-fg-muted) uppercase">Gender</dt>
                        <dd className="mt-1 text-(--color-fg)">
                            {profile.gender ? profileGenderLabel(profile.gender) : '—'}
                        </dd>
                    </div>
                    <div className="md:col-span-2">
                        <dt className="text-xs tracking-wide text-(--color-fg-muted) uppercase">Medical notes</dt>
                        <dd className="mt-1 text-(--color-fg)">{profile.medicalNotes ?? '—'}</dd>
                    </div>
                </dl>
            )}
        </section>
    );
}
