'use client';

import { useState, type SubmitEvent } from 'react';

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
import { InvitePlanFields } from '@/modules/membership-invites/components/invite-plan-fields';
import type { MembershipPaymentStatus } from '@/modules/membership-invites/membership-invites-ports';
import { useConvertLead } from '@/modules/leads/leads-hooks';
import type { Lead } from '@/modules/leads/leads-ports';
import type { MembershipPlan } from '@/modules/plans/plans-ports';

/**
 * Turns a lead into a membership invite (product-flows F11.4). This is the
 * only path to `CONVERTED` — the rail's stage picker no longer offers it — so
 * a lead in that stage always has a real invite behind it.
 *
 * Same shape as `MemberInviteDialog`, minus name/phone (the API reads those
 * off the lead) and plus `expiresAt`, which that dialog never exposed.
 */
export function LeadConvertDialog({
    lead,
    basePlans,
    addonPlans,
    disabled = false,
}: {
    lead: Lead;
    basePlans: readonly MembershipPlan[];
    addonPlans: readonly MembershipPlan[];
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);

    if (lead.status === 'CONVERTED') {
        return (
            <p className="text-xs text-(--color-fg-muted)">Already converted — the invite is on the members desk.</p>
        );
    }
    if (lead.status === 'LOST') {
        return (
            <p className="text-xs text-(--color-fg-muted)">
                A lost lead cannot be converted. Capture them again instead.
            </p>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                disabled={disabled || basePlans.length === 0}
                render={<Button type="button" variant="outline" className="w-full" />}
            >
                Convert to member
            </DialogTrigger>
            <DialogContent>
                {/* Remounts per open so a cancelled convert leaves nothing behind. */}
                {open ? (
                    <ConvertForm
                        lead={lead}
                        basePlans={basePlans}
                        addonPlans={addonPlans}
                        onDone={() => setOpen(false)}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function ConvertForm({
    lead,
    basePlans,
    addonPlans,
    onDone,
}: {
    lead: Lead;
    basePlans: readonly MembershipPlan[];
    addonPlans: readonly MembershipPlan[];
    onDone: () => void;
}) {
    // Prefilled from the lead, editable — F11.4. Blank stays blank when the
    // lead already has one: the API falls back to it, so re-sending it here
    // would just be a no-op that this state can skip.
    const [invitedEmail, setInvitedEmail] = useState('');
    const [basePlanId, setBasePlanId] = useState(basePlans[0]?.id ?? '');
    const [basePaymentStatus, setBasePaymentStatus] = useState<MembershipPaymentStatus>('unpaid');
    const [addonPlanId, setAddonPlanId] = useState('');
    const [addonPaymentStatus, setAddonPaymentStatus] = useState<MembershipPaymentStatus>('unpaid');
    const [expiresOn, setExpiresOn] = useState('');

    const convertLead = useConvertLead();
    const error = convertLead.error?.message ?? null;

    const email = invitedEmail.trim() || lead.email;
    const canSubmit = Boolean(basePlanId) && Boolean(email);

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        convertLead.mutate(
            {
                leadId: lead.id,
                invitedEmail: invitedEmail.trim() || undefined,
                basePlanId,
                basePaymentStatus,
                addonPlanId: addonPlanId || undefined,
                addonPaymentStatus: addonPlanId ? addonPaymentStatus : undefined,
                expiresAt: expiresOn ? `${expiresOn}T00:00:00.000Z` : undefined,
            },
            // Closes only on success: a refusal (already converted, lost, no
            // email) keeps the picked plan on screen with the reason.
            { onSuccess: () => onDone() },
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
                <DialogTitle>Convert {lead.name}</DialogTitle>
                <DialogDescription>
                    Creates a pending membership invite. {lead.name} joins once they accept — this does not create a
                    membership now.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <Field id="convert-email" label="Email" optional={Boolean(lead.email)}>
                        <Input
                            id="convert-email"
                            type="email"
                            required={!lead.email}
                            value={invitedEmail}
                            onChange={(event) => setInvitedEmail(event.target.value)}
                            placeholder={lead.email ?? 'prospect@example.com'}
                        />
                    </Field>
                </div>

                <InvitePlanFields
                    basePlans={basePlans}
                    addonPlans={addonPlans}
                    idPrefix="convert"
                    basePlanId={basePlanId}
                    onBasePlanChange={setBasePlanId}
                    basePaymentStatus={basePaymentStatus}
                    onBasePaymentChange={setBasePaymentStatus}
                    addonPlanId={addonPlanId}
                    onAddonPlanChange={setAddonPlanId}
                    addonPaymentStatus={addonPaymentStatus}
                    onAddonPaymentChange={setAddonPaymentStatus}
                />

                <div className="sm:col-span-2">
                    <Field id="convert-expires" label="Invite expires" optional>
                        <Input
                            id="convert-expires"
                            type="date"
                            value={expiresOn}
                            onChange={(event) => setExpiresOn(event.target.value)}
                        />
                    </Field>
                </div>
            </div>

            {error ? (
                <p role="alert" className="text-sm text-(--color-danger)">
                    {error}
                </p>
            ) : null}

            <DialogFooter>
                <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
                <Button type="submit" disabled={convertLead.isPending || !canSubmit}>
                    {convertLead.isPending ? 'Converting…' : 'Convert lead'}
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
