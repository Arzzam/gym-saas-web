/**
 * India-first money rendering. The API returns whole-rupee integers as price
 * snapshots (`000-project-context.mdc`: render the snapshot, never recompute),
 * so there are no fractional amounts to show and no rounding decision to make
 * here — this formats, it does not do arithmetic on prices.
 */
const RUPEES = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
    return RUPEES.format(amount);
}
