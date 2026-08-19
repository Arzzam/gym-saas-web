import type { Locator, Page } from '@playwright/test';

export class RenewalsPage {
    readonly page: Page;
    readonly heading: Locator;
    readonly windowTabs: Locator;
    readonly paymentFilter: Locator;
    readonly search: Locator;
    readonly queue: Locator;
    readonly rows: Locator;
    readonly rail: Locator;
    readonly summary: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole('heading', { name: 'Renewals', exact: true });
        this.windowTabs = page.getByRole('navigation', { name: 'Filter renewals by window' });
        this.paymentFilter = page.getByRole('group', { name: 'Filter renewals by payment' });
        this.search = page.getByRole('searchbox', { name: 'Search renewals' });
        this.queue = page.getByRole('list', { name: 'Renewals due' });
        this.rows = this.queue.getByRole('listitem');
        this.rail = page.getByRole('complementary', { name: 'Selected member' });
        this.summary = page.getByRole('region', { name: 'Renewals summary' });
    }

    async goto() {
        await this.page.goto('/admin/renewals');
    }

    windowTab(label: string): Locator {
        return this.windowTabs.getByRole('link', { name: label, exact: true });
    }

    /** Segment buttons carry a trailing count, so match on the leading label. */
    paymentSegment(label: string): Locator {
        return this.paymentFilter.getByRole('button', { name: new RegExp(`^${label}`) });
    }

    row(memberName: string): Locator {
        return this.rows.filter({ hasText: memberName });
    }

    async selectRow(memberName: string) {
        await this.queue.getByRole('button', { name: `Open ${memberName}` }).click();
    }
}
