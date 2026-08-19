'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import {
    formatInviteExpiry,
    membershipInviteStatusLabel,
    membershipInviteStatusTone,
    membershipPaymentStatusLabel,
    membershipPaymentStatusTone,
} from '@/modules/membership-invites/membership-invites-labels';
import { useAcceptMembershipInvite, useClientHome } from '@/modules/membership-invites/membership-invites-hooks';
import type {
    OptionalClassGrant,
    OptionalProfileAttribute,
} from '@/modules/membership-invites/membership-invites-ports';

const PROFILE_OPTIONS: { value: OptionalProfileAttribute; label: string }[] = [
    { value: 'GENDER', label: 'Gender' },
    { value: 'MEDICAL_NOTES', label: 'Medical notes' },
];

const GRANT_OPTIONS: { value: OptionalClassGrant; label: string }[] = [
    { value: 'PROGRESS', label: 'Progress' },
    { value: 'CALORIES', label: 'Calories' },
    { value: 'WEARABLES', label: 'Wearables' },
    { value: 'DIET_PLANS', label: 'Diet plans' },
    { value: 'WORKOUT_PLANS', label: 'Workout plans' },
];

export function MembershipInviteInbox() {
    const [profileAttrs, setProfileAttrs] = useState<OptionalProfileAttribute[]>([]);
    const [classGrants, setClassGrants] = useState<OptionalClassGrant[]>([]);

    // Hydrated from the page's server prefetch — same query key (ADR-0011).
    const { data, error: listQueryError } = useClientHome();
    const invites = data?.invites ?? [];
    const acceptInvite = useAcceptMembershipInvite();

    const isPending = acceptInvite.isPending;
    const listError = listQueryError?.message ?? null;
    const error = acceptInvite.error?.message ?? null;
    const success = acceptInvite.isSuccess ? 'Membership accepted. You are now a member of this gym.' : null;

    const pending = invites.filter((invite) => invite.status === 'PENDING');

    function toggleProfile(value: OptionalProfileAttribute) {
        setProfileAttrs((current) =>
            current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
        );
    }

    function toggleGrant(value: OptionalClassGrant) {
        setClassGrants((current) =>
            current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
        );
    }

    function handleAccept(membershipInviteId: string) {
        acceptInvite.mutate({
            membershipInviteId,
            optionalProfileAttributes: profileAttrs,
            optionalClassGrants: classGrants,
        });
    }

    return (
        <section
            className="space-y-4 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-panel)"
            aria-labelledby="membership-invite-inbox-heading"
        >
            <div>
                <h2
                    id="membership-invite-inbox-heading"
                    className="text-lg font-semibold tracking-tight text-(--color-fg)"
                >
                    Gym invites
                </h2>
                <p className="mt-1 text-sm text-(--color-fg-muted)">
                    Accept with the same email the gym invited. Date of birth, height, and weight are always shared;
                    extra sharing is optional.
                </p>
            </div>

            {listError ? (
                <p role="alert" className="text-sm text-(--color-danger)">
                    {listError}
                </p>
            ) : null}
            {error ? (
                <p role="alert" className="text-sm text-(--color-danger)">
                    {error}
                </p>
            ) : null}
            {success ? (
                <p role="status" className="text-sm text-(--color-fg)">
                    {success}
                </p>
            ) : null}

            {!listError && pending.length === 0 ? (
                <p className="text-sm text-(--color-fg-muted)">
                    No pending gym invites. Ask the desk to invite this email.
                </p>
            ) : null}

            {pending.length > 0 ? (
                <ul className="space-y-4">
                    {pending.map((invite) => (
                        <li
                            key={invite.id}
                            className="space-y-4 rounded-(--radius-control) border border-(--color-border)/80 px-4 py-4"
                        >
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-(--color-fg)">
                                    {invite.gym?.name ?? 'Gym invite'}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={statusToneBadgeVariant(membershipInviteStatusTone(invite.status))}>
                                        {membershipInviteStatusLabel(invite.status)}
                                    </Badge>
                                    <Badge
                                        variant={statusToneBadgeVariant(
                                            membershipPaymentStatusTone(invite.basePaymentStatus),
                                        )}
                                    >
                                        Base {membershipPaymentStatusLabel(invite.basePaymentStatus)}
                                    </Badge>
                                </div>
                                <p className="text-xs text-(--color-fg-muted)">
                                    Invited as {invite.inviteeName} · expires {formatInviteExpiry(invite.expiresAt)}
                                </p>
                            </div>

                            <fieldset className="space-y-2">
                                <legend className="text-xs font-medium tracking-wide text-(--color-fg-muted) uppercase">
                                    Optional profile
                                </legend>
                                <div className="flex flex-wrap gap-3">
                                    {PROFILE_OPTIONS.map((option) => (
                                        <label
                                            key={option.value}
                                            className="flex items-center gap-2 text-sm text-(--color-fg)"
                                        >
                                            <Checkbox
                                                checked={profileAttrs.includes(option.value)}
                                                onCheckedChange={() => toggleProfile(option.value)}
                                                disabled={isPending}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <fieldset className="space-y-2">
                                <legend className="text-xs font-medium tracking-wide text-(--color-fg-muted) uppercase">
                                    Optional sharing
                                </legend>
                                <div className="flex flex-wrap gap-3">
                                    {GRANT_OPTIONS.map((option) => (
                                        <label
                                            key={option.value}
                                            className="flex items-center gap-2 text-sm text-(--color-fg)"
                                        >
                                            <Checkbox
                                                checked={classGrants.includes(option.value)}
                                                onCheckedChange={() => toggleGrant(option.value)}
                                                disabled={isPending}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <Button type="button" disabled={isPending} onClick={() => handleAccept(invite.id)}>
                                {isPending ? 'Accepting…' : 'Accept membership'}
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}
