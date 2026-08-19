'use client';

import { useState, type ReactElement, type ReactNode } from 'react';

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

/**
 * A confirm step for an action that cannot be undone from the UI.
 *
 * Every destructive Admin action used to fire on a single click: offboarding a
 * member, deleting a plan or a lead, revoking an invite, blocking someone's
 * check-in. None of them has an undo, and several sit inches from a button the
 * Admin presses all day — Delete is next to Deactivate in the plan catalog, and
 * Offboard is next to Block check-in on the roster.
 *
 * What makes this worth a dialog rather than a toast-with-undo is that the
 * writes go to the API immediately; there is nothing to hold back and reverse.
 *
 * The copy is the point, so it is required rather than defaulted:
 * `description` must say what actually happens to the gym — "they stop
 * appearing on the roster and at the desk", not "this action cannot be
 * undone". A generic warning teaches people to click through it.
 */
type ConfirmActionDialogProps = {
    /**
     * The element the trigger renders as — a bare `<Button variant=… />` with no
     * children. Base UI's `render` swaps the trigger for it, and `children`
     * below become its label, so callers do not have to wire an onClick.
     */
    trigger: ReactElement;
    /** The trigger's label. */
    children: ReactNode;
    title: string;
    /** What this does to the gym's data, in the Admin's terms. */
    description: ReactNode;
    /** Verb on the confirm button: "Offboard", "Delete plan". Never "OK". */
    confirmLabel: string;
    onConfirm: () => void;
    disabled?: boolean;
    /**
     * `false` for a reversible-but-serious action (blocking check-in), which
     * gets a normal button rather than the destructive treatment.
     */
    destructive?: boolean;
};

export function ConfirmActionDialog({
    trigger,
    children,
    title,
    description,
    confirmLabel,
    onConfirm,
    disabled = false,
    destructive = true,
}: ConfirmActionDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger disabled={disabled} render={trigger}>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    {/* Cancel first and focused-by-default: the safe path should
                        be the one a hurried Enter press takes. */}
                    <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
                    <Button
                        type="button"
                        variant={destructive ? 'destructive' : 'default'}
                        disabled={disabled}
                        onClick={() => {
                            setOpen(false);
                            onConfirm();
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
