'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { membershipPaymentStatusLabel } from '@/modules/membership-invites/membership-invites-labels';
import type { MembershipPaymentStatus } from '@/modules/membership-invites/membership-invites-ports';
import type { MembershipPlan } from '@/modules/plans/plans-ports';

const PAYMENT_OPTIONS: MembershipPaymentStatus[] = ['unpaid', 'paid', 'partial'];

/**
 * What a membership invite is *for* — the plan lines and what has been paid on
 * them. Shared by the two screens that create one: inviting a member from the
 * members desk, and converting a lead from the CRM.
 *
 * The four controls carry rules worth stating once. The add-on is a pair: the
 * API rejects a plan without its payment status and vice versa, so the payment
 * control only exists while an add-on is chosen, and `inviteAddonFields()`
 * below is how a caller turns that into a request body.
 *
 * Controlled on purpose — each dialog owns its own state and submits a
 * different shape (create-invite vs convert-lead), so this holds none.
 *
 * Returns bare `<Field>`s rather than a wrapper, so the caller's grid lays them
 * out beside its own fields.
 */

type InvitePlanFieldsProps = {
    basePlans: readonly MembershipPlan[];
    addonPlans: readonly MembershipPlan[];
    /** Keeps ids unique when two dialogs live in one tree. */
    idPrefix: string;
    basePlanId: string;
    onBasePlanChange: (planId: string) => void;
    basePaymentStatus: MembershipPaymentStatus;
    onBasePaymentChange: (status: MembershipPaymentStatus) => void;
    addonPlanId: string;
    onAddonPlanChange: (planId: string) => void;
    addonPaymentStatus: MembershipPaymentStatus;
    onAddonPaymentChange: (status: MembershipPaymentStatus) => void;
    disabled?: boolean;
};

/**
 * The add-on half of a create/convert body. Both ids must travel together or
 * the API answers 422, so neither caller assembles them by hand.
 */
export function inviteAddonFields(
    addonPlanId: string,
    addonPaymentStatus: MembershipPaymentStatus,
): { addonPlanId?: string; addonPaymentStatus?: MembershipPaymentStatus } {
    return addonPlanId ? { addonPlanId, addonPaymentStatus } : {};
}

export function InvitePlanFields({
    basePlans,
    addonPlans,
    idPrefix,
    basePlanId,
    onBasePlanChange,
    basePaymentStatus,
    onBasePaymentChange,
    addonPlanId,
    onAddonPlanChange,
    addonPaymentStatus,
    onAddonPaymentChange,
    disabled = false,
}: InvitePlanFieldsProps) {
    function planName(planId: string): string {
        const plan = basePlans.find((item) => item.id === planId) ?? addonPlans.find((item) => item.id === planId);
        return plan?.name ?? planId.slice(0, 8);
    }

    return (
        <>
            <Field id={`${idPrefix}-base-plan`} label="Membership">
                <Select value={basePlanId} onValueChange={(value) => onBasePlanChange(value ?? '')} disabled={disabled}>
                    <SelectTrigger id={`${idPrefix}-base-plan`} className="w-full" aria-label="Membership">
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
            <Field id={`${idPrefix}-base-payment`} label="Membership payment">
                <Select
                    value={basePaymentStatus}
                    onValueChange={(value) => onBasePaymentChange(value as MembershipPaymentStatus)}
                    disabled={disabled}
                >
                    <SelectTrigger id={`${idPrefix}-base-payment`} className="w-full" aria-label="Membership payment">
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
            <Field id={`${idPrefix}-addon`} label="Add-on" optional>
                {/* `'none'` sentinel: Base UI cannot hold an empty string cleanly. */}
                <Select
                    value={addonPlanId || 'none'}
                    onValueChange={(value) => onAddonPlanChange(!value || value === 'none' ? '' : value)}
                    disabled={disabled || addonPlans.length === 0}
                >
                    <SelectTrigger id={`${idPrefix}-addon`} className="w-full" aria-label="Add-on">
                        <SelectValue>{(value: string) => (value === 'none' ? 'None' : planName(value))}</SelectValue>
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
                <Field id={`${idPrefix}-addon-payment`} label="Add-on payment">
                    <Select
                        value={addonPaymentStatus}
                        onValueChange={(value) => onAddonPaymentChange(value as MembershipPaymentStatus)}
                        disabled={disabled}
                    >
                        <SelectTrigger id={`${idPrefix}-addon-payment`} className="w-full" aria-label="Add-on payment">
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
        </>
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
