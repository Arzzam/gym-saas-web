'use client';

import { useState, type SubmitEvent } from 'react';

import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { WorkQueueRailPanel, WorkQueueRailSection } from '@/components/admin/work-queue-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/ui/format-money';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import { planStatusTone, type PlanRow } from '@/modules/plans/plans-desk';
import { useUpdatePlan } from '@/modules/plans/plans-hooks';
import { planCapabilityLabel, planKindLabel } from '@/modules/plans/plans-labels';
import type { PlanKind } from '@/modules/plans/plans-ports';

/**
 * One plan, editable.
 *
 * The catalog could only ever toggle a plan active or delete it — a typo in a
 * name, or a price change, meant deleting the plan and recreating it, which
 * orphans every subscription snapshot pointing at the old id. `updatePlan` was
 * wired to the adapter the whole time; it just had no UI.
 *
 * `kind` is shown but never editable: turning a membership into an add-on would
 * change what every existing subscription on it means, and the API does not
 * accept it either.
 */

type PlanDetailRailProps = {
    row: PlanRow | null;
    kindFilter: PlanKind | 'ALL';
    onToggleActive: (plan: PlanRow['plan']) => void;
    onDelete: (planId: string) => void;
    rowActionsPending: boolean;
};

export function PlanDetailRail({ row, kindFilter, onToggleActive, onDelete, rowActionsPending }: PlanDetailRailProps) {
    if (!row) {
        return (
            <WorkQueueRailPanel>
                <p className="text-sm text-(--color-fg-muted)">
                    Select a plan to edit its name, term or price, or to retire it.
                </p>
            </WorkQueueRailPanel>
        );
    }

    const { plan } = row;

    return (
        <WorkQueueRailPanel>
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 text-base font-semibold break-words text-(--color-fg)">{plan.name}</h2>
                    <Badge variant={statusToneBadgeVariant(planStatusTone(plan))}>
                        {plan.active ? 'Active' : 'Retired'}
                    </Badge>
                </div>
                <p className="text-xs text-(--color-fg-muted)">
                    {planKindLabel(plan.kind)}
                    {plan.kind === 'ADDON' ? ` · ${planCapabilityLabel(plan.capability)}` : ''}
                </p>
            </div>

            {/* Keyed on the plan: without this the form keeps the previous
                plan's typed values when the selection moves. */}
            <PlanEditForm key={plan.id} row={row} kindFilter={kindFilter} disabled={rowActionsPending} />

            <WorkQueueRailSection title="Availability">
                <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={rowActionsPending}
                    onClick={() => onToggleActive(plan)}
                >
                    {plan.active ? 'Retire this plan' : 'Make available again'}
                </Button>
                <p className="text-xs text-(--color-fg-muted)">
                    {plan.active
                        ? 'Retiring hides it from new invites. Members already on it keep their subscription.'
                        : 'Retired plans stay here so members already on them keep their history.'}
                </p>
            </WorkQueueRailSection>

            {/*
             * Quiet, and fenced off by the rule above it. Retire is the action
             * an Admin almost always wants; delete was the heaviest element on
             * the page, and it is already behind a confirm dialog. The hairline
             * also stops "Retiring hides it…" reading as a caption for this
             * button — the two sat adjacent once "Danger zone" went away.
             */}
            <div className="border-t border-(--color-border)/70 pt-3">
                <ConfirmActionDialog
                    trigger={
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-(--color-danger) hover:bg-(--color-danger)/10 hover:text-(--color-danger)"
                        />
                    }
                    title={`Delete ${plan.name}?`}
                    description="It leaves the catalog and can no longer be sold. Members already on this plan keep their subscription and the price they were charged. Retiring it instead keeps it visible here."
                    confirmLabel="Delete plan"
                    disabled={rowActionsPending}
                    onConfirm={() => onDelete(plan.id)}
                >
                    Delete plan
                </ConfirmActionDialog>
            </div>
        </WorkQueueRailPanel>
    );
}

function PlanEditForm({
    row,
    kindFilter,
    disabled,
}: {
    row: PlanRow;
    kindFilter: PlanKind | 'ALL';
    disabled: boolean;
}) {
    const { plan } = row;
    const [name, setName] = useState(plan.name);
    const [durationDays, setDurationDays] = useState(String(plan.durationDays));
    const [price, setPrice] = useState(String(plan.price));

    // Safe to own here: a save never removes the row, so this component stays
    // mounted through the round trip and keeps its own error.
    const updatePlan = useUpdatePlan(kindFilter);
    const error = updatePlan.error?.message ?? null;

    function handleSave(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        updatePlan.mutate({
            planId: plan.id,
            name,
            durationDays: Number(durationDays),
            price: Number(price),
        });
    }

    return (
        <form onSubmit={handleSave}>
            <WorkQueueRailSection title="Details">
                <div className="space-y-3">
                    <RailField id={`plan-name-${plan.id}`} label="Name">
                        <Input
                            id={`plan-name-${plan.id}`}
                            required
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </RailField>
                    <div className="grid grid-cols-2 gap-2">
                        <RailField id={`plan-duration-${plan.id}`} label="Duration (days)">
                            <Input
                                id={`plan-duration-${plan.id}`}
                                type="number"
                                min={1}
                                required
                                value={durationDays}
                                onChange={(event) => setDurationDays(event.target.value)}
                            />
                        </RailField>
                        <RailField id={`plan-price-${plan.id}`} label="Price (INR)">
                            <Input
                                id={`plan-price-${plan.id}`}
                                type="number"
                                min={0}
                                required
                                value={price}
                                onChange={(event) => setPrice(event.target.value)}
                            />
                        </RailField>
                    </div>

                    <p className="text-xs text-(--color-fg-muted)">
                        {/* The rule an Admin most needs to know before touching a price. */}
                        Changing the price affects new subscriptions only. Members already on {formatMoney(
                            plan.price,
                        )}{' '}
                        keep that price until they renew.
                    </p>

                    {error ? (
                        <p role="alert" className="text-sm text-(--color-danger)">
                            {error}
                        </p>
                    ) : null}

                    <div className="flex items-center gap-2">
                        <Button type="submit" size="sm" disabled={disabled || updatePlan.isPending}>
                            {updatePlan.isPending ? 'Saving…' : 'Save changes'}
                        </Button>
                        {updatePlan.isSuccess ? (
                            <span role="status" className="text-xs text-(--color-fg-muted)">
                                Saved
                            </span>
                        ) : null}
                    </div>
                </div>
            </WorkQueueRailSection>
        </form>
    );
}

function RailField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-xs font-medium text-(--color-fg-muted)">
                {label}
            </label>
            {children}
        </div>
    );
}
