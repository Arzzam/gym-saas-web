import { expect, test } from './fixtures/pages.fixture';

/**
 * The fixture store is shared by every Playwright worker
 * (`lib/api/e2e/store.ts`), so the capture/delete round trip below uses a
 * test-only name and cleans up after itself, and nothing here asserts an
 * absolute row count.
 */
test.describe('CRM desk', () => {
    test('the pipeline reads as a call list', async ({ staffAdmin, crmPage, page }) => {
        await staffAdmin.moduleLink('Leads').click();
        await expect(page).toHaveURL(/\/admin\/crm/);
        await expect(crmPage.heading).toBeVisible();

        // The seeded lead's follow-up is in the past, so it is chased first.
        const prospect = crmPage.row('Walk-in Prospect');
        await expect(prospect).toBeVisible();
        await expect(prospect).toContainText('overdue');
        await expect(prospect.getByText('New', { exact: true })).toBeVisible();
    });

    test('selecting a lead opens their details and a way to call them', async ({ staffAdmin, crmPage }) => {
        await staffAdmin.moduleLink('Leads').click();
        await crmPage.selectRow('Walk-in Prospect');

        await expect(crmPage.rail).toContainText('Walk-in Prospect');
        await expect(crmPage.rail.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:9876543210');
        await expect(crmPage.rail.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
            'href',
            'https://wa.me/9876543210',
        );
        // The edit form lives in the rail now — one form, not one per row.
        await expect(crmPage.rail.getByLabel('Notes', { exact: true })).toBeVisible();
    });

    test('search narrows the pipeline', async ({ staffAdmin, crmPage }) => {
        await staffAdmin.moduleLink('Leads').click();

        await crmPage.search.fill('walk-in');
        await expect(crmPage.row('Walk-in Prospect')).toBeVisible();

        await crmPage.search.fill('nobody-by-this-name');
        await expect(crmPage.rows).toHaveCount(0);
        await expect(crmPage.page.getByText('No leads match this search')).toBeVisible();
    });

    test('Admin can capture a lead, move its stage, and delete it', async ({ staffAdmin, crmPage, confirmDialog }) => {
        await staffAdmin.moduleLink('Leads').click();

        const name = 'E2E Capture Lead';
        await crmPage.captureLead(name, '9998887770');
        await expect(crmPage.row(name)).toBeVisible();

        await crmPage.selectRow(name);
        await expect(crmPage.rail).toContainText(name);

        // Stage change reflects immediately — optimistic, no reload.
        await crmPage.setStage(name, 'Contacted');
        await expect(crmPage.row(name).getByText('Contacted', { exact: true })).toBeVisible();

        // Delete removes the row optimistically and leaves the rail on the
        // next lead rather than on a ghost.
        await crmPage.deleteButton.click();
        await confirmDialog.confirm('Delete lead');
        await expect(crmPage.row(name)).toHaveCount(0);
        await expect(crmPage.rail).not.toContainText(name);
    });

    test('capture is a dialog, so the pipeline stays on screen', async ({ staffAdmin, crmPage, page }) => {
        await staffAdmin.moduleLink('Leads').click();

        await expect(crmPage.queue).toBeVisible();
        await crmPage.captureTrigger.click();

        const dialog = page.getByRole('dialog');
        await expect(dialog.getByLabel('Name', { exact: true })).toBeVisible();

        await dialog.getByRole('button', { name: 'Cancel' }).click();
        await expect(dialog).toHaveCount(0);
        await expect(crmPage.queue).toBeVisible();
    });

    test('converting a lead creates a pending membership invite', async ({ staffAdmin, crmPage, membersPage }) => {
        await staffAdmin.moduleLink('Leads').click();

        const name = 'E2E Convert Lead';
        await crmPage.captureLead(name, '9997776655', 'e2e-convert-lead@example.com');
        await crmPage.selectRow(name);

        await crmPage.convertLead({ plan: 'Monthly', payment: 'Paid', addon: 'PT Coaching' });

        // The pipeline reflects it immediately — no unassign, so this is one-way.
        await expect(crmPage.rail).toContainText('Converted');
        await expect(crmPage.row(name).getByText('Converted', { exact: true })).toBeVisible();
        await expect(crmPage.convertTrigger).toHaveCount(0);

        // And a real invite exists for someone to accept — not just a label.
        await staffAdmin.moduleLink('Members').click();
        await membersPage.scope('Invites').click();
        await expect(membersPage.inviteRow(name)).toBeVisible();
        await expect(membersPage.inviteRow(name)).toContainText('e2e-convert-lead@example.com');
    });

    test('a lost lead cannot be converted, and the UI never offers it', async ({ staffAdmin, crmPage }) => {
        await staffAdmin.moduleLink('Leads').click();

        const name = 'E2E Lost Lead';
        await crmPage.captureLead(name, '9995554433');
        await crmPage.selectRow(name);
        await crmPage.setStage(name, 'Lost');

        // Not a post-submit error: the trigger the API would refuse is not there
        // to click, the same way the members desk never asks for a coach it
        // already knows the add-on rule will refuse.
        await expect(crmPage.convertTrigger).toHaveCount(0);
        await expect(crmPage.rail.getByText('A lost lead cannot be converted.')).toBeVisible();
    });

    test('converting a lead with no email on file requires one before it can submit', async ({
        staffAdmin,
        crmPage,
    }) => {
        await staffAdmin.moduleLink('Leads').click();

        // The seeded lead has no email — exactly the case Convert has to handle.
        await crmPage.selectRow('Walk-in Prospect');
        await crmPage.convertTrigger.click();

        const dialog = crmPage.page.getByRole('dialog');
        await dialog.getByRole('combobox', { name: 'Membership', exact: true }).click();
        await crmPage.page.getByRole('option', { name: 'Monthly', exact: true }).click();
        await expect(dialog.getByRole('button', { name: 'Convert lead' })).toBeDisabled();

        await dialog.getByLabel('Email', { exact: true }).fill('walkin@example.com');
        await expect(dialog.getByRole('button', { name: 'Convert lead' })).toBeEnabled();

        // Cancel rather than submit — this is a shared fixture other workers read.
        await dialog.getByRole('button', { name: 'Cancel' }).click();
    });
});
