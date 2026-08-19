'use client';

import { useState, type SubmitEvent } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateMembershipInvite } from '@/modules/membership-invites/membership-invites-hooks';
import { membershipPaymentStatusLabel } from '@/modules/membership-invites/membership-invites-labels';
import type { MembershipPaymentStatus } from '@/modules/membership-invites/membership-invites-ports';
import type { MembershipPlan } from '@/modules/plans/plans-ports';

const PAYMENT_OPTIONS: MembershipPaymentStatus[] = ['unpaid', 'paid', 'partial'];

/**
 * Inviting a member is the one long form on this screen — name, email, phone,
 * base plan, payment, optional add-on and its payment. As a permanent panel it
 * pushed the roster an Admin reads all day below the fold; as a dialog it costs
 * one click on the rarer action.
 */
export function MemberInviteDialog({
    basePlans,
    addonPlans,
}: {
    basePlans: readonly MembershipPlan[];
    addonPlans: readonly MembershipPlan[];
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger disabled={basePlans.length === 0} render={<Button type="button" size="sm" />}>
                <Plus aria-hidden />
                Invite member
            </DialogTrigger>
            <DialogContent>
                {/* Remounts per open so a cancelled invite leaves nothing behind. */}
                {open ? (
                    <InviteForm basePlans={basePlans} addonPlans={addonPlans} onDone={() => setOpen(false)} />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function InviteForm({
    basePlans,
    addonPlans,
    onDone,
}: {
    basePlans: readonly MembershipPlan[];
    addonPlans: readonly MembershipPlan[];
    onDone: () => void;
}) {
    const [inviteeName, setInviteeName] = useState('');
    const [invitedEmail, setInvitedEmail] = useState('');
    const [inviteePhone, setInviteePhone] = useState('');
    const [basePlanId, setBasePlanId] = useState(basePlans[0]?.id ?? '');
    const [basePaymentStatus, setBasePaymentStatus] = useState<MembershipPaymentStatus>('unpaid');
    const [addonPlanId, setAddonPlanId] = useState('');
    const [addonPaymentStatus, setAddonPaymentStatus] = useState<MembershipPaymentStatus>('unpaid');

    const createInvite = useCreateMembershipInvite();
    const error = createInvite.error?.message ?? null;

    function planName(planId: string): string {
        const plan = basePlans.find((item) => item.id === planId) ?? addonPlans.find((item) => item.id === planId);
        return plan?.name ?? planId.slice(0, 8);
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
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
            // Closes only on success: a rejected invite keeps the typed email
            // on screen with the reason.
            { onSuccess: () => onDone() },
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
                <DialogTitle>Invite member</DialogTitle>
                <DialogDescription>
                    They join once they accept. Subscription dates start then, not now.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field id="invite-name" label="Name">
                    <Input
                        id="invite-name"
                        required
                        value={inviteeName}
                        onChange={(event) => setInviteeName(event.target.value)}
                        placeholder="Alex Client"
                    />
                </Field>
                <Field id="invite-email" label="Email">
                    <Input
                        id="invite-email"
                        type="email"
                        required
                        value={invitedEmail}
                        onChange={(event) => setInvitedEmail(event.target.value)}
                        placeholder="alex.client@example.com"
                    />
                </Field>
                <Field id="invite-phone" label="Phone" optional>
                    <Input
                        id="invite-phone"
                        inputMode="tel"
                        value={inviteePhone}
                        onChange={(event) => setInviteePhone(event.target.value)}
                        placeholder="+919876500000"
                    />
                </Field>
                <Field id="invite-base-plan" label="Membership">
                    <Select value={basePlanId} onValueChange={(value) => setBasePlanId(value ?? '')}>
                        <SelectTrigger id="invite-base-plan" className="w-full" aria-label="Membership">
                            {/* Base UI shows the raw id without a render-prop. */}
                            <SelectValue>
                                {(value: string) => (value ? planName(value) : 'Select a membership')}
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
                </Field>
                <Field id="invite-base-payment" label="Membership payment">
                    <Select
                        value={basePaymentStatus}
                        onValueChange={(value) => setBasePaymentStatus(value as MembershipPaymentStatus)}
                    >
                        <SelectTrigger id="invite-base-payment" className="w-full" aria-label="Membership payment">
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
                </Field>
                <Field id="invite-addon" label="Add-on" optional>
                    <Select
                        value={addonPlanId || 'none'}
                        onValueChange={(value) => setAddonPlanId(!value || value === 'none' ? '' : value)}
                        disabled={addonPlans.length === 0}
                    >
                        <SelectTrigger id="invite-addon" className="w-full" aria-label="Add-on">
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
                </Field>
                {addonPlanId ? (
                    <Field id="invite-addon-payment" label="Add-on payment">
                        <Select
                            value={addonPaymentStatus}
                            onValueChange={(value) => setAddonPaymentStatus(value as MembershipPaymentStatus)}
                        >
                            <SelectTrigger id="invite-addon-payment" className="w-full" aria-label="Add-on payment">
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
                    </Field>
                ) : null}
            </div>

            {error ? (
                <p role="alert" className="text-sm text-(--color-danger)">
                    {error}
                </p>
            ) : null}

            <DialogFooter>
                <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
                <Button type="submit" disabled={createInvite.isPending || !basePlanId}>
                    {createInvite.isPending ? 'Sending…' : 'Send invite'}
                </Button>
            </DialogFooter>
        </form>
    );
}

function Field({
    id,
    label,
    optional = false,
    children,
}: {
    id: string;
    label: string;
    optional?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-sm font-medium text-(--color-fg)">
                {label}
                {optional ? <span className="font-normal text-(--color-fg-muted)"> (optional)</span> : null}
            </label>
            {children}
        </div>
    );
}
