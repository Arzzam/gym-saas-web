import { expect, test } from './fixtures/pages.fixture';

/**
 * The fixture store is shared by every Playwright worker (`lib/api/e2e/store.ts`),
 * so the two specs that change a payment each own a member nobody else touches
 * — Vikram Rao and Neha Iyer. Everything else asserts on values no mutation can
 * move: names, ordering by end date, and billed amounts.
 */
test.describe('Renewals desk', () => {
    test('Admin sees who is due, by name, most urgent first', async ({ staffAdmin, renewalsPage, page }) => {
        await staffAdmin.moduleLink('Renewals').click();
        await expect(page).toHaveURL(/\/admin\/renewals/);
        await expect(renewalsPage.heading).toBeVisible();

        // Names, not client ids — the join against the roster is the point.
        await expect(renewalsPage.row('Ada Client')).toBeVisible();
        await expect(renewalsPage.row('Rahul Menon')).toBeVisible();

        // Ada ends tomorrow; everyone else is further out.
        await expect(renewalsPage.rows.first()).toContainText('Ada Client');
        await expect(renewalsPage.rows.first()).toContainText('Ends tomorrow');

        // Which membership, not just "Membership" — a gym with monthly,
        // quarterly and annual plans is the normal case.
        await expect(renewalsPage.rows.first()).toContainText('Monthly · 30 days');
        await expect(renewalsPage.row('Priya Sharma')).toContainText('PT Coaching · Trainer coaching');
    });

    test('money strip totals what the window has billed', async ({ staffAdmin, renewalsPage }) => {
        await staffAdmin.moduleLink('Renewals').click();
        // 999 + 1499 + 799 + 1200 + 2000. Prices are snapshots and never move,
        // so this holds however the mutating specs interleave.
        await expect(renewalsPage.summary).toContainText('₹6,497');
        await expect(renewalsPage.summary).toContainText('in this window');
    });

    test('selecting a row puts the member in the rail with a way to reach them', async ({
        staffAdmin,
        renewalsPage,
    }) => {
        await staffAdmin.moduleLink('Renewals').click();
        await renewalsPage.selectRow('Rahul Menon');

        await expect(renewalsPage.rail).toContainText('Rahul Menon');
        await expect(renewalsPage.rail).toContainText('rahul@example.com');
        await expect(renewalsPage.rail.getByRole('link', { name: 'Call' })).toHaveAttribute(
            'href',
            'tel:+919876500002',
        );
        await expect(renewalsPage.rail.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
            'href',
            'https://wa.me/919876500002',
        );
        // Partial line: ₹1,499 billed, ₹500 in, ₹999 still owed.
        await expect(renewalsPage.rail).toContainText('₹999');
    });

    test('a member with no phone gets email only, not a dead tel: link', async ({ staffAdmin, renewalsPage }) => {
        await staffAdmin.moduleLink('Renewals').click();
        await renewalsPage.selectRow('Priya Sharma');

        await expect(renewalsPage.rail).toContainText('Priya Sharma');
        await expect(renewalsPage.rail.getByRole('link', { name: 'Email' })).toBeVisible();
        await expect(renewalsPage.rail.getByRole('link', { name: 'Call' })).toHaveCount(0);
    });

    test('payment filter and search narrow the queue', async ({ staffAdmin, renewalsPage }) => {
        await staffAdmin.moduleLink('Renewals').click();

        await renewalsPage.paymentSegment('Paid').click();
        await expect(renewalsPage.row('Priya Sharma')).toBeVisible();
        await expect(renewalsPage.row('Rahul Menon')).toHaveCount(0);

        await renewalsPage.paymentSegment('All').click();
        await expect(renewalsPage.row('Rahul Menon')).toBeVisible();

        await renewalsPage.search.fill('priya');
        await expect(renewalsPage.rows).toHaveCount(1);
        await expect(renewalsPage.row('Priya Sharma')).toBeVisible();
    });

    test('the payment filter survives a reload, because it lives in the URL', async ({
        staffAdmin,
        renewalsPage,
        page,
    }) => {
        await staffAdmin.moduleLink('Renewals').click();
        await renewalsPage.paymentSegment('Partial').click();
        await expect(page).toHaveURL(/payment=partial/);

        await page.reload();
        await expect(renewalsPage.row('Rahul Menon')).toBeVisible();
        await expect(renewalsPage.row('Priya Sharma')).toHaveCount(0);
    });

    test('switching the window refetches and keeps the tabs clickable', async ({ staffAdmin, renewalsPage, page }) => {
        await staffAdmin.moduleLink('Renewals').click();
        await renewalsPage.windowTab('Today').click();
        await expect(page).toHaveURL(/window=today/);

        // Nothing ends today in the fixtures — the empty state must explain that,
        // not read as an error.
        await expect(page.getByText('Nothing due in this window')).toBeVisible();
        await expect(renewalsPage.windowTab('Next 7 days')).toBeVisible();
    });

    test('marking paid settles the row in one tap', async ({ staffAdmin, renewalsPage }) => {
        await staffAdmin.moduleLink('Renewals').click();

        const vikram = renewalsPage.row('Vikram Rao');
        await vikram.getByRole('button', { name: 'Mark paid' }).click();

        await expect(vikram.getByText('Paid', { exact: true })).toBeVisible();
        // Settled rows offer a correction, not another payment button.
        await expect(vikram.getByRole('button', { name: 'Undo' })).toBeVisible();
    });

    test('a part payment asks for the amount instead of guessing it', async ({ staffAdmin, renewalsPage, page }) => {
        await staffAdmin.moduleLink('Renewals').click();

        const neha = renewalsPage.row('Neha Iyer');
        await neha.getByRole('button', { name: 'Part paid…' }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText('Billed ₹2,000');

        const save = dialog.getByRole('button', { name: 'Save payment' });
        await expect(save).toBeDisabled();

        await dialog.getByLabel('Amount received').fill('800');
        await expect(dialog).toContainText('₹1,200 still outstanding');
        await save.click();

        await expect(dialog).toHaveCount(0);
        await expect(neha.getByText('Partial', { exact: true })).toBeVisible();
        await expect(neha).toContainText('₹1,200 left');
    });
});
