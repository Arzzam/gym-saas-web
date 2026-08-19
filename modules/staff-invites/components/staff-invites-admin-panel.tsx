'use client';

import { useState, type SubmitEvent } from 'react';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import {
    formatInviteExpiry,
    staffInviteRoleLabel,
    staffInviteStatusLabel,
    staffInviteStatusTone,
} from '@/modules/staff-invites/staff-invites-labels';
import {
    useCreateStaffInvite,
    useGymStaffInvites,
    useRevokeStaffInvite,
} from '@/modules/staff-invites/staff-invites-hooks';
import type { StaffInviteTargetRole } from '@/modules/staff-invites/staff-invites-ports';

type StaffInvitesAdminPanelProps = {
    gymName: string;
};

export function StaffInvitesAdminPanel({ gymName }: StaffInvitesAdminPanelProps) {
    const [staffCode, setStaffCode] = useState('');
    const [targetRole, setTargetRole] = useState<StaffInviteTargetRole>('TRAINER');

    // Hydrated from the page's server prefetch — same query key (ADR-0011).
    const { data: invites = [], error: listQueryError } = useGymStaffInvites();
    const createInvite = useCreateStaffInvite();
    const revokeInvite = useRevokeStaffInvite();

    const isPending = createInvite.isPending || revokeInvite.isPending;
    const listError = listQueryError?.message ?? null;
    const error = createInvite.error?.message ?? revokeInvite.error?.message ?? null;

    function handleCreate(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        createInvite.mutate({ staffCode, targetRole }, { onSuccess: () => setStaffCode('') });
    }

    function handleRevoke(inviteId: string) {
        revokeInvite.mutate({ inviteId });
    }

    return (
        <section className="space-y-4" aria-labelledby="staff-invites-heading">
            <div>
                <p className="text-xs font-medium tracking-wide text-(--color-fg-muted) uppercase">Gym organization</p>
                <h2 id="staff-invites-heading" className="mt-1 text-lg font-semibold tracking-tight text-(--color-fg)">
                    {gymName}
                </h2>
                <p className="mt-1 text-sm text-(--color-fg-muted)">
                    Invite Staff to this gym with their staff code. Trainers are unlimited; Admins are capped by the
                    API.
                </p>
            </div>

            <form
                onSubmit={handleCreate}
                className="space-y-4 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-panel)"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="invitee-staff-code" className="block text-sm font-medium text-(--color-fg)">
                            Staff code
                        </label>
                        <Input
                            id="invitee-staff-code"
                            name="staffCode"
                            required
                            value={staffCode}
                            onChange={(event) => setStaffCode(event.target.value)}
                            className="mt-2"
                            placeholder="STF-XXXX"
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <label htmlFor="invite-target-role" className="block text-sm font-medium text-(--color-fg)">
                            Role
                        </label>
                        <Select
                            value={targetRole}
                            onValueChange={(value) => setTargetRole(value as StaffInviteTargetRole)}
                            name="targetRole"
                        >
                            <SelectTrigger id="invite-target-role" className="mt-2 w-full">
                                <SelectValue>
                                    {(value: StaffInviteTargetRole) => staffInviteRoleLabel(value)}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TRAINER">Trainer</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {error ? (
                    <p role="alert" className="text-sm text-(--color-danger)">
                        {error}
                    </p>
                ) : null}
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Sending…' : 'Send invite'}
                </Button>
            </form>

            <div className="rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) shadow-(--shadow-panel)">
                <div className="border-b border-(--color-border)/80 px-5 py-3">
                    <h3 className="text-sm font-medium text-(--color-fg)">Invites for {gymName}</h3>
                </div>
                {listError ? (
                    <p role="alert" className="px-5 py-4 text-sm text-(--color-danger)">
                        {listError}
                    </p>
                ) : invites.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-(--color-fg-muted)">
                        No staff invites yet. Enter a staff code above to invite a Trainer or Admin.
                    </p>
                ) : (
                    <ul className="divide-y divide-(--color-border)/70">
                        {invites.map((invite) => (
                            <li
                                key={invite.id}
                                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0 space-y-1">
                                    <p className="text-sm font-medium text-(--color-fg)">{gymName}</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm text-(--color-fg-muted)">
                                            {staffInviteRoleLabel(invite.targetRole)}
                                        </p>
                                        <Badge variant={statusToneBadgeVariant(staffInviteStatusTone(invite.status))}>
                                            {staffInviteStatusLabel(invite.status)}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-(--color-fg-muted)">
                                        Expires {formatInviteExpiry(invite.expiresAt)}
                                    </p>
                                </div>
                                {invite.status === 'PENDING' ? (
                                    <ConfirmActionDialog
                                        trigger={<Button type="button" variant="ghost" className="shrink-0 text-xs" />}
                                        title={`Revoke this ${staffInviteRoleLabel(invite.targetRole)} invite?`}
                                        description="The invite stops working immediately and the staff member can no longer accept it. You can issue a fresh invite to the same staff code afterwards."
                                        confirmLabel="Revoke invite"
                                        disabled={isPending}
                                        onConfirm={() => handleRevoke(invite.id)}
                                    >
                                        Revoke
                                    </ConfirmActionDialog>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
