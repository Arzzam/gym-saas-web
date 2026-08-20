import type { Locator, Page } from '@playwright/test';

export class CrmPage {
    readonly page: Page;
    readonly heading: Locator;
    readonly statusTabs: Locator;
    readonly search: Locator;
    readonly captureTrigger: Locator;
    readonly queue: Locator;
    readonly rows: Locator;
    readonly rail: Locator;
    readonly summary: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole('heading', { name: 'Leads', exact: true });
        this.statusTabs = page.getByRole('navigation', { name: 'Filter leads by status' });
        this.search = page.getByRole('searchbox', { name: 'Search leads' });
        // `exact` is load-bearing: a row's overlay button is labelled `Open <name>`,
        // and the capture spec's own lead is named "E2E Capture Lead" — a substring
        // match resolves to both and fails the click on strict mode.
        this.captureTrigger = page.getByRole('button', { name: 'Capture lead', exact: true });
        this.queue = page.getByRole('list', { name: 'Lead pipeline' });
        this.rows = this.queue.getByRole('listitem');
        this.rail = page.getByRole('complementary', { name: 'Selected lead' });
        this.summary = page.getByRole('region', { name: 'Pipeline summary' });
    }

    async goto() {
        await this.page.goto('/admin/crm');
    }

    statusTab(label: string): Locator {
        return this.statusTabs.getByRole('link', { name: label, exact: true });
    }

    row(name: string): Locator {
        return this.rows.filter({ hasText: name });
    }

    /** Selecting a row is what loads the rail — every detail action goes through here. */
    async selectRow(name: string) {
        await this.queue.getByRole('button', { name: `Open ${name}`, exact: true }).click();
    }

    /** Capture is a dialog now, not a permanent form above the pipeline. */
    async captureLead(name: string, phone: string) {
        await this.captureTrigger.click();
        const dialog = this.page.getByRole('dialog');
        await dialog.getByLabel('Name', { exact: true }).fill(name);
        await dialog.getByLabel('Phone', { exact: true }).fill(phone);
        await dialog.getByRole('button', { name: 'Create lead' }).click();
    }

    /**
     * The stage `Select` is a Base UI combobox: the trigger sits in the rail but
     * its popup is portalled to the document, so the option click is scoped to
     * the page rather than the rail.
     */
    async setStage(leadName: string, stageLabel: string) {
        await this.rail.getByRole('combobox', { name: `Stage for ${leadName}` }).click();
        await this.page.getByRole('option', { name: stageLabel, exact: true }).click();
    }

    get deleteButton(): Locator {
        return this.rail.getByRole('button', { name: 'Delete lead', exact: true });
    }
}
