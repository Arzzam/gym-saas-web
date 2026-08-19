import type { Locator, Page } from '@playwright/test';

export class PlansPage {
    readonly page: Page;
    readonly heading: Locator;
    readonly kindTabs: Locator;
    readonly search: Locator;
    readonly createTrigger: Locator;
    readonly queue: Locator;
    readonly rows: Locator;
    readonly rail: Locator;
    readonly summary: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole('heading', { name: 'Plans', exact: true });
        this.kindTabs = page.getByRole('navigation', { name: 'Filter plans by kind' });
        this.search = page.getByRole('searchbox', { name: 'Search plans' });
        this.createTrigger = page.getByRole('button', { name: 'New plan' });
        this.queue = page.getByRole('list', { name: 'Plan catalog' });
        this.rows = this.queue.getByRole('listitem');
        this.rail = page.getByRole('complementary', { name: 'Selected plan' });
        this.summary = page.getByRole('region', { name: 'Catalog summary' });
    }

    async goto() {
        await this.page.goto('/admin/plans');
    }

    filterTab(label: string): Locator {
        return this.kindTabs.getByRole('link', { name: label, exact: true });
    }

    planRow(name: string): Locator {
        return this.rows.filter({ hasText: name });
    }

    /** Selecting a row is what loads the rail — every detail action goes through here. */
    async selectPlan(name: string) {
        await this.queue.getByRole('button', { name: `Open ${name}` }).click();
    }

    /** Create is a dialog now, not a permanent form above the catalog. */
    async createPlan(name: string, durationDays: string, price: string) {
        await this.createTrigger.click();
        const dialog = this.page.getByRole('dialog');
        await dialog.getByLabel('Name', { exact: true }).fill(name);
        await dialog.getByLabel('Duration (days)', { exact: true }).fill(durationDays);
        await dialog.getByLabel('Price (INR)', { exact: true }).fill(price);
        await dialog.getByRole('button', { name: 'Create plan' }).click();
    }

    /** Availability and delete live in the rail, so the plan must be selected first. */
    get toggleActiveButton(): Locator {
        return this.rail.getByRole('button', { name: /Retire this plan|Make available again/ });
    }

    get deleteButton(): Locator {
        return this.rail.getByRole('button', { name: 'Delete plan', exact: true });
    }
}
