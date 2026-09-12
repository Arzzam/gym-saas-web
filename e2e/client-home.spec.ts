import { expect, test } from './fixtures/pages.fixture';

test.describe('Client home', () => {
    test('CLIENT session shows member home without Admin nav', async ({ clientHome }) => {
        await expect(clientHome.heading).toBeVisible();
        await expect(clientHome.inviteHeading).toBeVisible();
        await expect(clientHome.profileNav).toBeVisible();
        await expect(clientHome.page.getByLabel('Height (cm)')).toHaveCount(0);
        await expect(clientHome.memberSidebar).toBeVisible();
        await expect(clientHome.page.getByRole('complementary', { name: 'Admin modules' })).toHaveCount(0);
    });

    test('CLIENT can accept a pending membership invite and manage data grants', async ({ clientHome }) => {
        await expect(clientHome.acceptButton).toBeVisible();
        await clientHome.acceptButton.click();
        await expect(clientHome.page.getByText('Membership accepted')).toBeVisible();
        await expect(clientHome.dataSharingHeading).toBeVisible();
        await expect(clientHome.saveSharingButton).toBeVisible();
        await expect(clientHome.page.getByText('Always shared', { exact: true })).toBeVisible();
    });
});
