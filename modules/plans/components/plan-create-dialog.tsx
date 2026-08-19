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
import { useCreatePlan } from '@/modules/plans/plans-hooks';
import { planKindOptionLabel } from '@/modules/plans/plans-labels';
import type { PlanKind } from '@/modules/plans/plans-ports';

/**
 * Creating a plan is a rare, deliberate act — a gym sets its catalog up once
 * and edits it occasionally — so it does not deserve a permanent form above
 * the catalog an Admin reads far more often.
 */
export function PlanCreateDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button type="button" size="sm" />}>
                <Plus aria-hidden />
                New plan
            </DialogTrigger>
            <DialogContent>
                {/* Remounts per open so a cancelled draft never persists. */}
                {open ? <CreateForm onDone={() => setOpen(false)} /> : null}
            </DialogContent>
        </Dialog>
    );
}

function CreateForm({ onDone }: { onDone: () => void }) {
    const [name, setName] = useState('');
    const [kind, setKind] = useState<PlanKind>('BASE');
    const [durationDays, setDurationDays] = useState('30');
    const [price, setPrice] = useState('999');

    const createPlan = useCreatePlan();
    const error = createPlan.error?.message ?? null;

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        createPlan.mutate(
            { name, kind, durationDays: Number(durationDays), price: Number(price) },
            // Closes only on success, so a rejected plan keeps its details and
            // the reason on screen.
            { onSuccess: () => onDone() },
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
                <DialogTitle>New plan</DialogTitle>
                <DialogDescription>What a member buys, and for how long.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
                <Field id="plan-name" label="Name">
                    <Input
                        id="plan-name"
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Quarterly Membership"
                    />
                </Field>
                <Field id="plan-kind" label="Type">
                    <Select value={kind} onValueChange={(value) => setKind(value as PlanKind)}>
                        <SelectTrigger id="plan-kind" className="w-full" aria-label="Type">
                            {/* Base UI shows the raw value without a render-prop. */}
                            <SelectValue>{(value: PlanKind) => planKindOptionLabel(value)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="BASE">{planKindOptionLabel('BASE')}</SelectItem>
                            <SelectItem value="ADDON">{planKindOptionLabel('ADDON')}</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field id="plan-duration" label="Duration (days)">
                        <Input
                            id="plan-duration"
                            type="number"
                            min={1}
                            required
                            value={durationDays}
                            onChange={(event) => setDurationDays(event.target.value)}
                        />
                    </Field>
                    <Field id="plan-price" label="Price (INR)">
                        <Input
                            id="plan-price"
                            type="number"
                            min={0}
                            required
                            value={price}
                            onChange={(event) => setPrice(event.target.value)}
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
                <Button type="submit" disabled={createPlan.isPending}>
                    {createPlan.isPending ? 'Creating…' : 'Create plan'}
                </Button>
            </DialogFooter>
        </form>
    );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-sm font-medium text-(--color-fg)">
                {label}
            </label>
            {children}
        </div>
    );
}
