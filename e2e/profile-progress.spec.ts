import { expect, test } from './fixtures/pages.fixture';

test.describe('Profile and progress', () => {
    test('CLIENT can view and save their own profile', async ({ clientProfile }) => {
        await expect(clientProfile.heading).toBeVisible();
        await expect(clientProfile.detailsHeading).toBeVisible();
        await expect(clientProfile.progressHeading).toBeVisible();
        await expect(clientProfile.page).toHaveURL(/\/client\/profile/);
        await expect(clientProfile.heightInput).toHaveValue('170');
        await clientProfile.page.getByLabel('Weight (kg)').first().fill('69');
        await clientProfile.saveProfileButton.click();
        await expect(clientProfile.page.getByText('Profile saved.')).toBeVisible();
    });

    test('Admin sees granted profile vitals and not-shared progress for Ada', async ({
        staffAdmin,
        membersPage,
        page,
    }) => {
        await staffAdmin.moduleLink('Members').click();
        await expect(membersPage.memberRow('Ada Client')).toBeVisible();
        await membersPage.select('Ada Client');
        await membersPage.profileLink().click();
        await expect(page).toHaveURL(/\/admin\/members\/e2e-client-roster-1/);
        await expect(page.getByRole('heading', { name: 'Ada Client' })).toBeVisible();
        await expect(page.getByText('165 cm')).toBeVisible();
        await expect(page.getByText('60 kg')).toBeVisible();
        await expect(page.getByText('Old ankle sprain')).toHaveCount(0);
        await expect(page.getByText('Member has not shared progress with this gym.')).toBeVisible();
    });
});
