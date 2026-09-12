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
import { InvitePlanFields, inviteAddonFields } from '@/modules/membership-invites/components/invite-plan-fields';
import { useCreateMembershipInvite } from '@/modules/membership-invites/membership-invites-hooks';
import type { MembershipPaymentStatus } from '@/modules/membership-invites/membership-invites-ports';
import type { MembershipPlan } from '@/modules/plans/plans-ports';

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

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        createInvite.mutate(
            {
                inviteeName,
                invitedEmail,
                inviteePhone: inviteePhone || undefined,
                basePlanId,
                basePaymentStatus,
                ...inviteAddonFields(addonPlanId, addonPaymentStatus),
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
                <InvitePlanFields
                    basePlans={basePlans}
                    addonPlans={addonPlans}
                    idPrefix="invite"
                    basePlanId={basePlanId}
                    onBasePlanChange={setBasePlanId}
                    basePaymentStatus={basePaymentStatus}
                    onBasePaymentChange={setBasePaymentStatus}
                    addonPlanId={addonPlanId}
                    onAddonPlanChange={setAddonPlanId}
                    addonPaymentStatus={addonPaymentStatus}
                    onAddonPaymentChange={setAddonPaymentStatus}
                />
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
