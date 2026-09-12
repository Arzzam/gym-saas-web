import { expect, test } from './fixtures/pages.fixture';

test.describe('Admin collapsible sidebar', () => {
    test('shows module labels when expanded and icons-only when collapsed', async ({ staffAdmin }) => {
        await test.step('Expanded: Renewals label is visible', async () => {
            await expect(staffAdmin.moduleLink('Renewals')).toBeVisible();
            await expect(staffAdmin.moduleLink('Renewals')).toHaveText('Renewals');
            await expect(staffAdmin.sidebarTrigger).toBeVisible();
            expect(await staffAdmin.sidebarState()).toBe('expanded');
        });

        await test.step('Collapse to icon rail', async () => {
            await staffAdmin.sidebarTrigger.click();
            expect(await staffAdmin.sidebarState()).toBe('collapsed');
            // Still reachable by its accessible name — shadcn clips the label visually
            // (icon-rail width) rather than removing it, and shows it again as a tooltip.
            await expect(staffAdmin.moduleLink('Renewals')).toBeVisible();
        });

        await test.step('Expand again restores labels', async () => {
            await staffAdmin.sidebarTrigger.click();
            expect(await staffAdmin.sidebarState()).toBe('expanded');
            await expect(staffAdmin.moduleLink('Renewals')).toHaveText('Renewals');
        });
    });

    test('navigates to Settings from the sidebar', async ({ staffAdmin, page }) => {
        await staffAdmin.moduleLink('Settings').click();
        await expect(page).toHaveURL(/\/admin\/settings/);
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    });

    test('mobile header opens the sidebar drawer, brand lives inside it', async ({ staffAdmin, page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.getByRole('button', { name: 'Profile options' })).toBeVisible();
        await expect(staffAdmin.sidebarTrigger).toBeVisible();
        await expect(page.getByRole('link', { name: 'Yeah Buddy' })).toHaveCount(0);

        await staffAdmin.sidebarTrigger.click();
        await expect(page.getByRole('link', { name: 'Yeah Buddy' })).toBeVisible();
        // The mobile drawer is a modal Sheet, not a `complementary` landmark, so query it
        // directly rather than through `staffAdmin.sidebar` (desktop-only aria-label/role).
        const renewals = page.getByRole('link', { name: 'Renewals', exact: true });
        await expect(renewals).toBeVisible();
        await expect(renewals).toHaveText('Renewals');
    });

    test('signs out via Profile options → Sign out', async ({ staffAdmin: _staffAdmin, page }) => {
        await page.getByRole('button', { name: 'Profile options' }).click();
        await page.getByRole('menuitem', { name: 'Sign out' }).click();
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe('Staff without gym', () => {
    test('lands on Settings-only shell instead of Admin modules', async ({ staffNoGym, page }) => {
        await expect(page).toHaveURL(/\/admin\/settings/);
        await expect(staffNoGym.heading).toBeVisible();
        await expect(staffNoGym.createGymHeading).toBeVisible();
        await expect(staffNoGym.gymName).toBeVisible();
        await expect(page.getByRole('complementary', { name: 'Admin modules' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Renewals' })).toHaveCount(0);
    });
});
