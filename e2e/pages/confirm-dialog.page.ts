import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The shared destructive-action confirm step (`ConfirmActionDialog`).
 *
 * Worth a POM for one reason: while this dialog is open Base UI marks the rest
 * of the page `aria-hidden`, so **every `getByRole` query against the page
 * behind it returns nothing**. A spec that clicks a destructive button and then
 * asserts `toHaveCount(0)` on the row will pass whether or not the action ever
 * ran — it is measuring the dialog, not the delete. `confirm()` waits for the
 * dialog to close before returning, so assertions after it see the real page.
 */
export class ConfirmDialog {
    readonly page: Page;
    readonly dialog: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dialog = page.getByRole('dialog');
    }

    /** Presses the confirm button and waits for the page to come back. */
    async confirm(confirmLabel: string) {
        await this.dialog.getByRole('button', { name: confirmLabel, exact: true }).click();
        await expect(this.dialog).toHaveCount(0);
    }

    async cancel() {
        await this.dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(this.dialog).toHaveCount(0);
    }

    async expectTitle(title: string | RegExp) {
        await expect(this.dialog).toContainText(title);
    }
}
