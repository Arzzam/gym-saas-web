import { expect, test } from './fixtures/pages.fixture';

test.describe('Members roster', () => {
    test('Admin sees roster member and can toggle check-in block', async ({
        staffAdmin,
        membersPage,
        confirmDialog,
        page,
    }) => {
        await staffAdmin.moduleLink('Members').click();
        await expect(page).toHaveURL(/\/admin\/members/);
        await expect(membersPage.heading).toBeVisible();
        await expect(membersPage.rosterHeading).toBeVisible();
        await expect(page.getByText('Ada Client')).toBeVisible();
        await expect(page.getByText('Allowed').first()).toBeVisible();

        await membersPage.blockCheckInButton.first().click();
        await confirmDialog.confirm('Block check-in');
        await expect(page.getByText('Blocked').first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Unblock check-in' }).first()).toBeVisible();

        // Restore for other specs that share the in-process E2E fixture state.
        await page.getByRole('button', { name: 'Unblock check-in' }).first().click();
        await expect(page.getByText('Allowed').first()).toBeVisible();
    });

    test('offboarding asks first, and cancelling leaves the member alone', async ({
        staffAdmin,
        membersPage,
        confirmDialog,
        page,
    }) => {
        await staffAdmin.moduleLink('Members').click();

        // Deepa is this spec's own member — see `lib/api/e2e/store.ts`.
        const deepa = membersPage.memberRow('Deepa Rao');
        await expect(deepa).toBeVisible();

        await deepa.getByRole('button', { name: 'Offboard' }).click();
        await confirmDialog.expectTitle('Offboard Deepa Rao?');
        // The copy has to say what happens to the gym, not "cannot be undone".
        await confirmDialog.expectTitle(/no longer be marked in at the desk/);
        await confirmDialog.cancel();
        await expect(deepa).toBeVisible();

        await deepa.getByRole('button', { name: 'Offboard' }).click();
        await confirmDialog.confirm('Offboard');
        await expect(page.getByRole('row').filter({ hasText: 'Deepa Rao' })).toHaveCount(0);
    });
});
