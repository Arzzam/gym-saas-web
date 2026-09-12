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
import { Textarea } from '@/components/ui/textarea';
import { useCreateLead } from '@/modules/leads/leads-hooks';

/**
 * Capture moved out of the page and into a dialog.
 *
 * It used to be a permanent five-field form pinned above the pipeline, which
 * meant the list an Admin came to read started below the fold. Capture is
 * frequent but brief; the pipeline is what the screen is for. One click to
 * open costs less than pushing every lead down the page all day.
 *
 * Name and phone are the only required fields — a walk-in is captured mid
 * conversation, and anything else can be filled in from the rail later.
 */
export function LeadCaptureDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button type="button" size="sm" />}>
                <Plus aria-hidden />
                Capture lead
            </DialogTrigger>
            <DialogContent>
                {/* Remounts per open so a cancelled capture never leaves half a
                    previous prospect in the fields. */}
                {open ? <CaptureForm onDone={() => setOpen(false)} /> : null}
            </DialogContent>
        </Dialog>
    );
}

function CaptureForm({ onDone }: { onDone: () => void }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [source, setSource] = useState('walk-in');
    const [interest, setInterest] = useState('trial');
    const [notes, setNotes] = useState('');

    const createLead = useCreateLead();
    const error = createLead.error?.message ?? null;
    const warning = createLead.data?.ok ? (createLead.data.warning ?? null) : null;

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        createLead.mutate(
            { name, phone, email: email || undefined, source, interest, notes: notes || undefined },
            // Closes only on success: a failed capture keeps the typed details
            // on screen with the reason, instead of losing a walk-in's number.
            { onSuccess: () => onDone() },
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
                <DialogTitle>Capture lead</DialogTitle>
                <DialogDescription>Name and phone are enough — the rest can follow.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field id="lead-name" label="Name">
                    <Input
                        id="lead-name"
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Walk-in Prospect"
                    />
                </Field>
                <Field id="lead-phone" label="Phone">
                    <Input
                        id="lead-phone"
                        required
                        inputMode="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="9876543210"
                    />
                </Field>
                <div className="sm:col-span-2">
                    {/* Optional here, but it is the address a membership invite
                        goes to — capturing it now saves asking at convert time. */}
                    <Field id="lead-email" label="Email" optional>
                        <Input
                            id="lead-email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="prospect@example.com"
                        />
                    </Field>
                </div>
                <Field id="lead-source" label="Source">
                    <Input id="lead-source" value={source} onChange={(event) => setSource(event.target.value)} />
                </Field>
                <Field id="lead-interest" label="Interest">
                    <Input id="lead-interest" value={interest} onChange={(event) => setInterest(event.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                    <Field id="lead-notes" label="Notes" optional>
                        <Textarea
                            id="lead-notes"
                            rows={2}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Asked about evening batch"
                        />
                    </Field>
                </div>
            </div>

            {error ? (
                <p role="alert" className="text-sm text-(--color-danger)">
                    {error}
                </p>
            ) : null}
            {warning ? (
                <p role="status" className="text-sm text-(--color-fg-muted)">
                    {warning}
                </p>
            ) : null}

            <DialogFooter>
                <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
                <Button type="submit" disabled={createLead.isPending}>
                    {createLead.isPending ? 'Saving…' : 'Create lead'}
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
