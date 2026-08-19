import type { Locator, Page } from '@playwright/test';

export class AttendancePage {
    readonly page: Page;
    readonly heading: Locator;
    readonly search: Locator;
    readonly queue: Locator;
    readonly rows: Locator;
    readonly rail: Locator;
    readonly summary: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole('heading', { name: 'Attendance', exact: true });
        this.search = page.getByRole('searchbox', { name: 'Search members' });
        this.queue = page.getByRole('list', { name: 'Members' });
        this.rows = this.queue.getByRole('listitem');
        this.rail = page.getByRole('complementary', { name: "Today's attendance" });
        this.summary = page.getByRole('region', { name: 'Attendance summary' });
    }

    async goto() {
        await this.page.goto('/admin/attendance');
    }

    memberRow(name: string): Locator {
        return this.rows.filter({ hasText: name });
    }

    /** Search-to-act: type, then press Mark on the row. No dropdown, no submit. */
    async markIn(name: string) {
        await this.memberRow(name).getByRole('button', { name: 'Mark in' }).click();
    }
}
