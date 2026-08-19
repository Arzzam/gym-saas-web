import { expect, test } from './fixtures/pages.fixture';

/**
 * `e2eAttendances` is shared across Playwright workers (`lib/api/e2e/store.ts`),
 * so the one spec that marks somebody in owns a member no other spec touches —
 * Priya Sharma — and nothing here asserts an absolute check-in count.
 */
test.describe('Attendance desk', () => {
    test('the member list is the queue, ready to mark', async ({ staffAdmin, attendancePage, page }) => {
        await staffAdmin.moduleLink('Attendance').click();
        await expect(page).toHaveURL(/\/admin\/attendance/);
        await expect(attendancePage.heading).toBeVisible();

        const ada = attendancePage.memberRow('Ada Client');
        await expect(ada).toBeVisible();
        // One interaction to mark someone: no dropdown, no separate submit.
        await expect(ada.getByRole('button', { name: 'Mark in' })).toBeVisible();
    });

    test('search narrows the member list', async ({ staffAdmin, attendancePage }) => {
        await staffAdmin.moduleLink('Attendance').click();

        await attendancePage.search.fill('rahul');
        await expect(attendancePage.memberRow('Rahul Menon')).toBeVisible();
        await expect(attendancePage.memberRow('Ada Client')).toHaveCount(0);

        await attendancePage.search.fill('nobody-by-this-name');
        await expect(attendancePage.rows).toHaveCount(0);
        await expect(attendancePage.page.getByText('No members match this search')).toBeVisible();
    });

    test('marking a member in shows their arrival instead of offering it again', async ({
        staffAdmin,
        attendancePage,
    }) => {
        await staffAdmin.moduleLink('Attendance').click();

        // Scoped to Priya so a parallel worker's roster row cannot be hit.
        await attendancePage.search.fill('priya');
        const priya = attendancePage.memberRow('Priya Sharma');
        await expect(priya.getByRole('button', { name: 'Mark in' })).toBeVisible();

        await attendancePage.markIn('Priya Sharma');

        // The row reports the arrival rather than staying markable — the old
        // desk had no way to show this, so double-marking was the only way to
        // find out someone was already in.
        await expect(priya.getByText('Checked in', { exact: true })).toBeVisible();
        await expect(priya).toContainText('desk');
        await expect(priya.getByRole('button', { name: 'Mark in' })).toHaveCount(0);

        await expect(attendancePage.rail).toContainText('Priya Sharma');
    });
});
