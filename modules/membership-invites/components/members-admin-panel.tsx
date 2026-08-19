'use client';

import { useState, type SubmitEvent } from 'react';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { ErrorNotice } from '@/components/admin/error-notice';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import {
    formatInviteExpiry,
    membershipInviteStatusLabel,
    membershipInviteStatusTone,
    membershipPaymentStatusLabel,
    membershipPaymentStatusTone,
} from '@/modules/membership-invites/membership-invites-labels';
import {
    useCreateMembershipInvite,
    useMembershipInvitesPage,
    useRevokeMembershipInvite,
} from '@/modules/membership-invites/membership-invites-hooks';
import type { MembershipPaymentStatus } from '@/modules/membership-invites/membership-invites-ports';

const PAYMENT_OPTIONS: MembershipPaymentStatus[] = ['unpaid', 'paid', 'partial'];

export function MembersAdminPanel() {
    const [inviteeName, setInviteeName] = useState('');
    const [invitedEmail, setInvitedEmail] = useState('');
    const [inviteePhone, setInviteePhone] = useState('');
    const [basePlanIdOverride, setBasePlanIdOverride] = useState<string | null>(null);
    const [basePaymentStatus, setBasePaymentStatus] = useState<MembershipPaymentStatus>('unpaid');
    const [addonPlanId, setAddonPlanId] = useState('');
    const [addonPaymentStatus, setAddonPaymentStatus] = useState<MembershipPaymentStatus>('unpaid');

    // Hydrated from the page's server prefetch — same query key (ADR-0011).
    const { data, error: listQueryError } = useMembershipInvitesPage();
    const invites = data?.invites ?? [];
    const basePlans = data?.basePlans ?? [];
    const addonPlans = data?.addonPlans ?? [];

    const createInvite = useCreateMembershipInvite();
    const revokeInvite = useRevokeMembershipInvite();
    const isPending = createInvite.isPending || revokeInvite.isPending;
    const listError = listQueryError?.message ?? null;
    const error = createInvite.error?.message ?? revokeInvite.error?.message ?? null;

    // Defaults to the first base plan, but only until the user picks one —
    // the list arrives asynchronously now, so this cannot be seeded into
    // useState at mount the way it was when plans came in as a prop.
    const basePlanId = basePlanIdOverride ?? basePlans[0]?.id ?? '';

    function planName(planId: string): string {
        const plan = basePlans.find((item) => item.id === planId) ?? addonPlans.find((item) => item.id === planId);
        return plan?.name ?? planId.slice(0, 8);
    }

    function handleCreate(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        createInvite.mutate(
            {
                inviteeName,
                invitedEmail,
                inviteePhone: inviteePhone || undefined,
                basePlanId,
                basePaymentStatus,
                addonPlanId: addonPlanId || undefined,
                addonPaymentStatus: addonPlanId ? addonPaymentStatus : undefined,
            },
            {
                onSuccess: () => {
                    setInviteeName('');
                    setInvitedEmail('');
                    setInviteePhone('');
                    setAddonPlanId('');
                },
            },
        );
    }

    function handleRevoke(membershipInviteId: string) {
        revokeInvite.mutate({ membershipInviteId });
    }

    return (
        <div className="space-y-6">
            <ErrorNotice message={error ?? listError} />

            <section className="rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-4 shadow-(--shadow-panel) md:p-6">
                <h2 className="text-sm font-semibold text-(--color-fg)">Invite member</h2>
                {basePlans.length === 0 ? (
                    <p className="mt-3 text-sm text-(--color-fg-muted)">
                        Create an active Base plan under Plans before sending a membership invite.
                    </p>
                ) : (
                    <form className="mt-4 space-y-3" onSubmit={handleCreate}>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="block text-sm">
                                <span className="font-medium text-(--color-fg)">Name</span>
                                <Input
                                    className="mt-1"
                                    value={inviteeName}
                                    onChange={(event) => setInviteeName(event.target.value)}
                                    placeholder="Alex Client"
                                    required
                                    disabled={isPending}
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-(--color-fg)">Email</span>
                                <Input
                                    type="email"
                                    className="mt-1"
                                    value={invitedEmail}
                                    onChange={(event) => setInvitedEmail(event.target.value)}
                                    placeholder="alex.client@example.com"
                                    required
                                    disabled={isPending}
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-(--color-fg)">Phone (optional)</span>
                                <Input
                                    className="mt-1"
                                    value={inviteePhone}
                                    onChange={(event) => setInviteePhone(event.target.value)}
                                    placeholder="+15551234567"
                                    disabled={isPending}
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-(--color-fg)">Base plan</span>
                                <Select
                                    value={basePlanId}
                                    onValueChange={(value) => setBasePlanIdOverride(value ?? '')}
                                    disabled={isPending}
                                >
                                    <SelectTrigger className="mt-1 w-full" aria-label="Base plan">
                                        <SelectValue>
                                            {(value: string) => (value ? planName(value) : 'Select a base plan')}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {basePlans.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                                {plan.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-(--color-fg)">Base payment</span>
                                <Select
                                    value={basePaymentStatus}
                                    onValueChange={(value) => setBasePaymentStatus(value as MembershipPaymentStatus)}
                                    disabled={isPending}
                                >
                                    <SelectTrigger className="mt-1 w-full" aria-label="Base payment">
                                        <SelectValue>
                                            {(value: MembershipPaymentStatus) => membershipPaymentStatusLabel(value)}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_OPTIONS.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {membershipPaymentStatusLabel(status)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-(--color-fg)">Add-on (optional)</span>
                                <Select
                                    value={addonPlanId || 'none'}
                                    onValueChange={(value) => setAddonPlanId(!value || value === 'none' ? '' : value)}
                                    disabled={isPending || addonPlans.length === 0}
                                >
                                    <SelectTrigger className="mt-1 w-full" aria-label="Add-on plan">
                                        <SelectValue>
                                            {(value: string) => (value === 'none' ? 'None' : planName(value))}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {addonPlans.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                                {plan.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </label>
                            {addonPlanId ? (
                                <label className="block text-sm">
                                    <span className="font-medium text-(--color-fg)">Add-on payment</span>
                                    <Select
                                        value={addonPaymentStatus}
                                        onValueChange={(value) =>
                                            setAddonPaymentStatus(value as MembershipPaymentStatus)
                                        }
                                        disabled={isPending}
                                    >
                                        <SelectTrigger className="mt-1 w-full" aria-label="Add-on payment">
                                            <SelectValue>
                                                {(value: MembershipPaymentStatus) =>
                                                    membershipPaymentStatusLabel(value)
                                                }
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_OPTIONS.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {membershipPaymentStatusLabel(status)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </label>
                            ) : null}
                        </div>
                        <Button type="submit" disabled={isPending || !basePlanId}>
                            {isPending ? 'Sending…' : 'Send membership invite'}
                        </Button>
                    </form>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-(--color-fg)">Membership invites</h2>
                {invites.length === 0 ? (
                    <p className="text-sm text-(--color-fg-muted)">No membership invites yet.</p>
                ) : (
                    <ul className="divide-y divide-(--color-border) rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface)">
                        {invites.map((invite) => (
                            <li
                                key={invite.id}
                                className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
                            >
                                <div className="min-w-0 space-y-1">
                                    <p className="font-medium text-(--color-fg)">{invite.inviteeName}</p>
                                    <p className="truncate text-sm text-(--color-fg-muted)">
                                        {invite.invitedEmail}
                                        {invite.inviteePhone ? ` · ${invite.inviteePhone}` : ''}
                                    </p>
                                    <p className="text-xs text-(--color-fg-muted)">
                                        {planName(invite.basePlanId)}
                                        {invite.addonPlanId ? ` · + ${planName(invite.addonPlanId)}` : ''}
                                        {' · expires '}
                                        {formatInviteExpiry(invite.expiresAt)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant={statusToneBadgeVariant(
                                            membershipPaymentStatusTone(invite.basePaymentStatus),
                                        )}
                                    >
                                        {membershipPaymentStatusLabel(invite.basePaymentStatus)}
                                    </Badge>
                                    <Badge variant={statusToneBadgeVariant(membershipInviteStatusTone(invite.status))}>
                                        {membershipInviteStatusLabel(invite.status)}
                                    </Badge>
                                    {invite.status === 'PENDING' ? (
                                        <ConfirmActionDialog
                                            trigger={<Button type="button" variant="secondary" />}
                                            title={`Revoke the invite for ${invite.invitedEmail}?`}
                                            description="Their invite link stops working immediately. You can send a fresh invite to the same address afterwards."
                                            confirmLabel="Revoke invite"
                                            disabled={isPending}
                                            onConfirm={() => handleRevoke(invite.id)}
                                        >
                                            Revoke
                                        </ConfirmActionDialog>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
