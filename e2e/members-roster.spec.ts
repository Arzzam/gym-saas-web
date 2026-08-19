import { expect, test } from './fixtures/pages.fixture';

/**
 * The fixture store is shared across Playwright workers
 * (`lib/api/e2e/store.ts`), so the specs that mutate a member each own one:
 * Deepa Rao for offboarding, Vikram Rao for the check-in block.
 */
test.describe('Members desk', () => {
    test('the roster is the queue, and a member opens in the rail', async ({ staffAdmin, membersPage, page }) => {
        await staffAdmin.moduleLink('Members').click();
        await expect(page).toHaveURL(/\/admin\/members/);
        await expect(membersPage.heading).toBeVisible();

        await expect(membersPage.memberRow('Ada Client')).toBeVisible();
        await membersPage.select('Ada Client');

        // Detail the four-column table never showed: phone, join date, and the
        // member's actual subscription lines.
        await expect(membersPage.rail).toContainText('Ada Client');
        await expect(membersPage.rail).toContainText('joined');
        await expect(membersPage.rail.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+919876500001');
        await expect(membersPage.rail.getByText('Subscriptions')).toBeVisible();
    });

    test('search narrows the roster', async ({ staffAdmin, membersPage }) => {
        await staffAdmin.moduleLink('Members').click();

        await membersPage.search.fill('rahul');
        await expect(membersPage.memberRow('Rahul Menon')).toBeVisible();
        await expect(membersPage.memberRow('Ada Client')).toHaveCount(0);
    });

    test('the scope filter swaps members for invites, and survives a reload', async ({
        staffAdmin,
        membersPage,
        page,
    }) => {
        await staffAdmin.moduleLink('Members').click();

        await membersPage.scope('Invites').click();
        await expect(page).toHaveURL(/scope=invites/);
        await expect(membersPage.inviteRow('Alex Client')).toBeVisible();
        await expect(membersPage.memberQueue).toHaveCount(0);

        await page.reload();
        await expect(membersPage.inviteRow('Alex Client')).toBeVisible();

        // The invite rail says what an invite is for, not what a member is.
        await membersPage.select('Alex Client');
        await expect(membersPage.rail).toContainText('alex.client@example.com');
        await expect(membersPage.rail).toContainText('Invited onto');
    });

    test('blocking check-in asks first and can be undone', async ({ staffAdmin, membersPage, confirmDialog }) => {
        await staffAdmin.moduleLink('Members').click();

        // Vikram is this spec's own member — see `lib/api/e2e/store.ts`.
        await membersPage.search.fill('vikram');
        await membersPage.select('Vikram Rao');

        await membersPage.rail.getByRole('button', { name: 'Block check-in' }).click();
        await confirmDialog.confirm('Block check-in');
        await expect(membersPage.memberRow('Vikram Rao').getByText('Blocked', { exact: true })).toBeVisible();

        // Restoring access needs no confirmation.
        await membersPage.rail.getByRole('button', { name: 'Unblock check-in' }).click();
        await expect(membersPage.memberRow('Vikram Rao').getByText('Blocked', { exact: true })).toHaveCount(0);
    });

    test('offboarding asks first, and cancelling leaves the member alone', async ({
        staffAdmin,
        membersPage,
        confirmDialog,
    }) => {
        await staffAdmin.moduleLink('Members').click();

        await membersPage.search.fill('deepa');
        await membersPage.select('Deepa Rao');

        await membersPage.rail.getByRole('button', { name: 'Offboard member' }).click();
        await confirmDialog.expectTitle('Offboard Deepa Rao?');
        // The copy has to say what happens to the gym, not "cannot be undone".
        await confirmDialog.expectTitle(/no longer be marked in at the desk/);
        await confirmDialog.cancel();
        await expect(membersPage.memberRow('Deepa Rao')).toBeVisible();

        await membersPage.rail.getByRole('button', { name: 'Offboard member' }).click();
        await confirmDialog.confirm('Offboard');
        await expect(membersPage.memberRow('Deepa Rao')).toHaveCount(0);
    });
});
