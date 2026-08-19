'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/ui/format-money';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import {
    membershipPaymentStatusLabel,
    membershipPaymentStatusTone,
} from '@/modules/membership-invites/membership-invites-labels';
import { outstandingAmount } from '@/modules/subscriptions/subscriptions-labels';
import type { RenewalDueItem, SubscriptionPaymentStatus } from '@/modules/subscriptions/subscriptions-ports';

export type PaymentUpdate = {
    subscriptionId: string;
    paymentStatus: SubscriptionPaymentStatus;
    amountPaid: number;
};

type RenewalPaymentActionsProps = {
    item: RenewalDueItem;
    disabled: boolean;
    onUpdate: (update: PaymentUpdate) => void;
};

/**
 * Collecting money is the whole job of this screen, so the common case — "they
 * paid the full amount" — is one tap, and only a genuinely partial payment
 * costs a dialog.
 *
 * The dialog exists because the amount is real data the Admin has and the app
 * does not. The previous version guessed `priceAmount / 2`, which wrote a
 * number nobody had agreed to into a billing record; the API has always
 * required `amountPaid` for a partial (`subscriptions-actions.ts`), so the
 * guess was covering for a missing input, not simplifying one.
 */
export function RenewalPaymentActions({ item, disabled, onUpdate }: RenewalPaymentActionsProps) {
    const [partialOpen, setPartialOpen] = useState(false);
    const owed = outstandingAmount(item);

    return (
        <>
            <Badge variant={statusToneBadgeVariant(membershipPaymentStatusTone(item.paymentStatus))}>
                {membershipPaymentStatusLabel(item.paymentStatus)}
            </Badge>

            {owed > 0 ? (
                <>
                    <Button
                        type="button"
                        size="sm"
                        disabled={disabled}
                        onClick={() =>
                            onUpdate({
                                subscriptionId: item.id,
                                paymentStatus: 'paid',
                                amountPaid: item.priceAmount,
                            })
                        }
                    >
                        Mark paid
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        onClick={() => setPartialOpen(true)}
                    >
                        Part paid…
                    </Button>
                </>
            ) : (
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() =>
                        onUpdate({
                            subscriptionId: item.id,
                            paymentStatus: 'unpaid',
                            amountPaid: 0,
                        })
                    }
                >
                    Undo
                </Button>
            )}

            <PartialPaymentDialog
                item={item}
                open={partialOpen}
                onOpenChange={setPartialOpen}
                disabled={disabled}
                onUpdate={onUpdate}
            />
        </>
    );
}

function PartialPaymentDialog({
    item,
    open,
    onOpenChange,
    disabled,
    onUpdate,
}: {
    item: RenewalDueItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    disabled: boolean;
    onUpdate: (update: PaymentUpdate) => void;
}) {
    const [amount, setAmount] = useState(String(item.amountPaid || ''));
    const parsed = Number(amount);
    const valid = amount.trim() !== '' && Number.isFinite(parsed) && parsed > 0 && parsed <= item.priceAmount;

    function submit() {
        if (!valid) {
            return;
        }
        // Paying the whole price through this dialog is a full payment, not a
        // "partial" one that happens to add up — the record should say so.
        onUpdate({
            subscriptionId: item.id,
            paymentStatus: parsed >= item.priceAmount ? 'paid' : 'partial',
            amountPaid: parsed,
        });
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record a part payment</DialogTitle>
                    <DialogDescription>
                        Billed {formatMoney(item.priceAmount)}. Enter what the member has actually handed over.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-1.5">
                    <label htmlFor={`amount-${item.id}`} className="text-sm font-medium text-(--color-fg)">
                        Amount received
                    </label>
                    <Input
                        id={`amount-${item.id}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={item.priceAmount}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                submit();
                            }
                        }}
                    />
                    <p className="text-xs text-(--color-fg-muted)">
                        {valid
                            ? `${formatMoney(Math.max(0, item.priceAmount - parsed))} still outstanding after this.`
                            : `Enter an amount between ${formatMoney(1)} and ${formatMoney(item.priceAmount)}.`}
                    </p>
                </div>

                <DialogFooter>
                    <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
                    <Button type="button" disabled={disabled || !valid} onClick={submit}>
                        Save payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
