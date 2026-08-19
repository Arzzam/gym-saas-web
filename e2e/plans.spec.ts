import { expect, test } from './fixtures/pages.fixture';

/** Probe written onto `window`; survives a soft nav, wiped by a document reload. */
type NavProbeWindow = Window & typeof globalThis & { __navProbe?: true };

/**
 * `e2ePlans` is shared across Playwright workers (`lib/api/e2e/store.ts`), so
 * the specs that mutate a plan create their own and clean up after themselves.
 * The two seeded plans (Monthly, PT Coaching) are read-only here — the renewals
 * desk names them, so retiring one would change what that spec sees.
 */
test.describe('Plan catalog', () => {
    test('changing the kind filter is a soft navigation, not a full page reload', async ({
        staffAdmin,
        plansPage,
        page,
    }) => {
        await staffAdmin.moduleLink('Plans').click();
        await expect(plansPage.heading).toBeVisible();
        await expect(plansPage.queue).toBeVisible();

        await page.evaluate(() => {
            (window as NavProbeWindow).__navProbe = true;
        });

        await plansPage.filterTab('Membership').click();
        await expect(page).toHaveURL(/kind=BASE/);
        await expect(plansPage.queue).toBeVisible();

        // A raw <a> here would tear down and re-hydrate the whole app on every
        // filter click — the regression this guards against.
        const survivedNavigation = await page.evaluate(() => (window as NavProbeWindow).__navProbe === true);
        expect(survivedNavigation).toBe(true);
    });

    test('the catalog shows what a member would be sold', async ({ staffAdmin, plansPage }) => {
        await staffAdmin.moduleLink('Plans').click();

        const monthly = plansPage.planRow('Monthly');
        await expect(monthly).toContainText('₹999 · 30 days');
        await expect(monthly).toContainText('Membership');
        await expect(plansPage.planRow('PT Coaching')).toContainText('Trainer coaching');
    });

    test('Admin can edit a plan name and price, which the table never allowed', async ({
        staffAdmin,
        plansPage,
        confirmDialog,
    }) => {
        await staffAdmin.moduleLink('Plans').click();

        const original = 'E2E Editable';
        await plansPage.createPlan(original, '60', '1799');
        await expect(plansPage.planRow(original)).toBeVisible();

        await plansPage.selectPlan(original);
        await expect(plansPage.rail).toContainText(original);

        const renamed = 'E2E Renamed';
        await plansPage.rail.getByLabel('Name', { exact: true }).fill(renamed);
        await plansPage.rail.getByLabel('Price (INR)', { exact: true }).fill('2099');
        await plansPage.rail.getByRole('button', { name: 'Save changes' }).click();

        // Optimistic: the row reflects the edit without a reload.
        await expect(plansPage.planRow(renamed)).toContainText('₹2,099 · 60 days');
        await expect(plansPage.planRow(original)).toHaveCount(0);

        // Clean up after itself — the fixture store is shared.
        await plansPage.selectPlan(renamed);
        await plansPage.deleteButton.click();
        await confirmDialog.confirm('Delete plan');
        await expect(plansPage.planRow(renamed)).toHaveCount(0);
    });

    test('Admin can retire a plan and bring it back', async ({ staffAdmin, plansPage, confirmDialog }) => {
        await staffAdmin.moduleLink('Plans').click();

        const name = 'E2E Retirable';
        await plansPage.createPlan(name, '30', '499');
        await plansPage.selectPlan(name);

        await plansPage.toggleActiveButton.click();
        await expect(plansPage.planRow(name)).toContainText('Retired');

        await plansPage.selectPlan(name);
        await plansPage.toggleActiveButton.click();
        await expect(plansPage.planRow(name)).not.toContainText('Retired');

        await plansPage.deleteButton.click();
        await confirmDialog.confirm('Delete plan');
        await expect(plansPage.planRow(name)).toHaveCount(0);
    });

    test('deleting asks first, and cancelling leaves the plan alone', async ({
        staffAdmin,
        plansPage,
        confirmDialog,
    }) => {
        await staffAdmin.moduleLink('Plans').click();

        const name = 'E2E Cancellable';
        await plansPage.createPlan(name, '30', '299');
        await plansPage.selectPlan(name);

        await plansPage.deleteButton.click();
        await confirmDialog.expectTitle(`Delete ${name}?`);
        await confirmDialog.cancel();
        await expect(plansPage.planRow(name)).toBeVisible();

        await plansPage.deleteButton.click();
        await confirmDialog.confirm('Delete plan');
        await expect(plansPage.planRow(name)).toHaveCount(0);
    });
});
