'use client';

import { useState, type SubmitEvent } from 'react';

import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMoney } from '@/lib/ui/format-money';
import {
    formatPlanDuration,
    planCapabilityLabel,
    planKindLabel,
    planKindOptionLabel,
} from '@/modules/plans/plans-labels';
import { useCreatePlan, useDeletePlan, usePlans, useSetPlanActive } from '@/modules/plans/plans-hooks';
import type { MembershipPlan, PlanKind } from '@/modules/plans/plans-ports';

type PlansAdminPanelProps = {
    gymName: string;
    kindFilter: PlanKind | 'ALL';
};

export function PlansAdminPanel({ gymName, kindFilter }: PlansAdminPanelProps) {
    const [name, setName] = useState('');
    const [kind, setKind] = useState<PlanKind>('BASE');
    const [durationDays, setDurationDays] = useState('30');
    const [price, setPrice] = useState('999');

    // Hydrated from the page's server prefetch — same query key, so this
    // renders with data on first paint instead of fetching (ADR-0011).
    const { data: plans = [], error: listQueryError } = usePlans(kindFilter);
    const setPlanActive = useSetPlanActive(kindFilter);
    const deletePlan = useDeletePlan(kindFilter);
    const createPlan = useCreatePlan();

    const isPending = setPlanActive.isPending || deletePlan.isPending || createPlan.isPending;

    // Kept as two separate slots, matching the pre-migration props: a failed
    // list load renders inside the catalog panel, a failed write next to the
    // form. Mutation errors now live in TanStack, outside the component tree,
    // so a rolled-back row remounting can no longer discard them — the trap
    // that forced errors up to the parent under useOptimistic.
    const listError = listQueryError?.message ?? null;
    const error = createPlan.error?.message ?? setPlanActive.error?.message ?? deletePlan.error?.message ?? null;

    function handleCreate(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        createPlan.mutate(
            { name, kind, durationDays: Number(durationDays), price: Number(price) },
            {
                onSuccess: () => {
                    setName('');
                    setDurationDays('30');
                    setPrice(kind === 'ADDON' ? '1500' : '999');
                },
            },
        );
    }

    function handleToggle(plan: MembershipPlan) {
        setPlanActive.mutate({ planId: plan.id, active: !plan.active });
    }

    function handleDelete(planId: string) {
        deletePlan.mutate({ planId });
    }

    return (
        <div className="space-y-6">
            <form
                onSubmit={handleCreate}
                className="space-y-4 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-panel)"
            >
                <h2 className="text-sm font-medium text-(--color-fg)">Add plan</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="plan-name" className="block text-sm font-medium text-(--color-fg)">
                            Name
                        </label>
                        <Input
                            id="plan-name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-2"
                            placeholder={kind === 'ADDON' ? 'PT Coaching' : 'Monthly'}
                        />
                    </div>
                    <div>
                        <label htmlFor="plan-kind" className="block text-sm font-medium text-(--color-fg)">
                            Kind
                        </label>
                        <Select value={kind} onValueChange={(value) => setKind(value as PlanKind)}>
                            <SelectTrigger id="plan-kind" className="mt-2 w-full">
                                <SelectValue>{(value: PlanKind) => planKindOptionLabel(value)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BASE">{planKindOptionLabel('BASE')}</SelectItem>
                                <SelectItem value="ADDON">{planKindOptionLabel('ADDON')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="plan-duration" className="block text-sm font-medium text-(--color-fg)">
                            Duration (days)
                        </label>
                        <Input
                            id="plan-duration"
                            type="number"
                            min={1}
                            required
                            value={durationDays}
                            onChange={(e) => setDurationDays(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <label htmlFor="plan-price" className="block text-sm font-medium text-(--color-fg)">
                            Price (INR)
                        </label>
                        <Input
                            id="plan-price"
                            type="number"
                            min={0}
                            required
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                </div>
                {error ? (
                    <p role="alert" className="text-sm text-(--color-danger)">
                        {error}
                    </p>
                ) : null}
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving…' : 'Create plan'}
                </Button>
            </form>

            <div className="rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) shadow-(--shadow-panel)">
                <div className="border-b border-(--color-border)/80 px-5 py-3">
                    <h2 className="text-sm font-medium text-(--color-fg)">Catalog for {gymName}</h2>
                </div>
                {listError ? (
                    <p role="alert" className="px-5 py-4 text-sm text-(--color-danger)">
                        {listError}
                    </p>
                ) : plans.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-(--color-fg-muted)">
                        No plans yet. Create a membership or an add-on above.
                    </p>
                ) : (
                    <ul className="divide-y divide-(--color-border)/70">
                        {plans.map((plan) => (
                            <li
                                key={plan.id}
                                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0 space-y-1">
                                    <p className="text-sm font-medium text-(--color-fg)">
                                        {plan.name}
                                        <span className="mx-2 text-(--color-fg-muted)">·</span>
                                        <span className="font-normal text-(--color-fg-muted)">
                                            {planKindLabel(plan.kind)}
                                        </span>
                                    </p>
                                    <p className="text-xs text-(--color-fg-muted)">
                                        {formatMoney(plan.price)} · {formatPlanDuration(plan.durationDays)}
                                        {plan.kind === 'ADDON' ? ` · ${planCapabilityLabel(plan.capability)}` : ''}
                                        {plan.active ? '' : ' · Inactive'}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="text-xs"
                                        disabled={isPending}
                                        onClick={() => handleToggle(plan)}
                                    >
                                        {plan.active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                    <ConfirmActionDialog
                                        trigger={<Button type="button" variant="ghost" className="text-xs" />}
                                        title={`Delete ${plan.name}?`}
                                        description="It leaves the catalog and can no longer be sold. Members already on this plan keep their subscription and the price they were charged."
                                        confirmLabel="Delete plan"
                                        disabled={isPending}
                                        onConfirm={() => handleDelete(plan.id)}
                                    >
                                        Delete
                                    </ConfirmActionDialog>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
