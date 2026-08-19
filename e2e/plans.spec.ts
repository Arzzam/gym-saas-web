import { expect, test } from './fixtures/pages.fixture';

/** Probe written onto `window`; survives a soft nav, wiped by a document reload. */
type NavProbeWindow = Window & typeof globalThis & { __navProbe?: true };

test.describe('Plan catalog', () => {
    test('changing the kind filter is a soft navigation, not a full page reload', async ({
        staffAdmin,
        plansPage,
        page,
    }) => {
        await staffAdmin.moduleLink('Plans').click();
        await expect(plansPage.heading).toBeVisible();
        await expect(plansPage.catalogHeading).toBeVisible();

        await page.evaluate(() => {
            (window as NavProbeWindow).__navProbe = true;
        });

        await plansPage.filterTab('Membership').click();
        await expect(page).toHaveURL(/kind=BASE/);
        await expect(plansPage.catalogHeading).toBeVisible();

        // A raw <a> here would tear down and re-hydrate the whole app on every
        // filter click — the regression this guards against.
        const survivedNavigation = await page.evaluate(() => (window as NavProbeWindow).__navProbe === true);
        expect(survivedNavigation).toBe(true);
    });

    test('Admin can toggle a plan active state instantly', async ({ staffAdmin, plansPage, page }) => {
        await staffAdmin.moduleLink('Plans').click();
        await expect(page).toHaveURL(/\/admin\/plans/);
        await expect(plansPage.heading).toBeVisible();
        await expect(plansPage.catalogHeading).toBeVisible();

        // Toggles the seeded add-on (not the seeded membership plan, which the
        // Members invite form depends on being active) and restores it, same
        // convention as members-roster.spec.ts's check-in-block restore.
        const addon = 'PT Coaching';
        await expect(plansPage.toggleButton(addon)).toHaveText('Deactivate');

        await plansPage.toggleButton(addon).click();
        await expect(plansPage.toggleButton(addon)).toHaveText('Activate');
        await expect(plansPage.planRow(addon)).toContainText('Inactive');

        await plansPage.toggleButton(addon).click();
        await expect(plansPage.toggleButton(addon)).toHaveText('Deactivate');
        await expect(plansPage.planRow(addon)).not.toContainText('Inactive');
    });

    test('Admin can create and delete a plan, after confirming', async ({
        staffAdmin,
        plansPage,
        confirmDialog,
        page,
    }) => {
        await staffAdmin.moduleLink('Plans').click();
        await expect(page).toHaveURL(/\/admin\/plans/);

        const name = 'E2E Quarterly';
        await plansPage.createBasePlan(name, '90', '2499');

        const row = plansPage.planRow(name);
        await expect(row).toBeVisible();

        // Cancelling must leave the plan alone — this is the whole point of
        // the confirm step, so it is asserted before the happy path.
        await plansPage.deleteButton(name).click();
        await confirmDialog.expectTitle(`Delete ${name}?`);
        await confirmDialog.cancel();
        await expect(row).toBeVisible();

        // Confirming removes the row optimistically, without a full reload.
        await plansPage.deleteButton(name).click();
        await confirmDialog.confirm('Delete plan');
        await expect(row).toHaveCount(0);
    });
});
