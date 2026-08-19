import { test as base, expect } from '@playwright/test';

import { encodeClientSessionCookie } from './client-session';
import { encodeStaffSessionCookie, encodeStaffSessionCookieNoGym } from './staff-session';
import { AdminShellPage } from '../pages/admin-shell.page';
import { AttendancePage } from '../pages/attendance.page';
import { ClientHomePage } from '../pages/client-home.page';
import { ConfirmDialog } from '../pages/confirm-dialog.page';
import { CrmPage } from '../pages/crm.page';
import { LoginPage } from '../pages/login.page';
import { MembersPage } from '../pages/members.page';
import { PlansPage } from '../pages/plans.page';
import { RenewalsPage } from '../pages/renewals.page';
import { SettingsPage } from '../pages/settings.page';

type Pages = {
    loginPage: LoginPage;
    adminShellPage: AdminShellPage;
    clientHomePage: ClientHomePage;
    settingsPage: SettingsPage;
    membersPage: MembersPage;
    attendancePage: AttendancePage;
    renewalsPage: RenewalsPage;
    crmPage: CrmPage;
    plansPage: PlansPage;
    confirmDialog: ConfirmDialog;
};

type AuthFixtures = {
    /** Staff cookie + gym affiliation; lands on Admin Operations. */
    staffAdmin: AdminShellPage;
    /** Staff cookie, zero gyms; lands on Settings-only first-run. */
    staffNoGym: SettingsPage;
    /** Client cookie; Member home. */
    clientHome: ClientHomePage;
};

export const test = base.extend<Pages & AuthFixtures>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },

    adminShellPage: async ({ page }, use) => {
        await use(new AdminShellPage(page));
    },

    clientHomePage: async ({ page }, use) => {
        await use(new ClientHomePage(page));
    },

    confirmDialog: async ({ page }, use) => {
        await use(new ConfirmDialog(page));
    },

    settingsPage: async ({ page }, use) => {
        await use(new SettingsPage(page));
    },

    membersPage: async ({ page }, use) => {
        await use(new MembersPage(page));
    },

    attendancePage: async ({ page }, use) => {
        await use(new AttendancePage(page));
    },

    renewalsPage: async ({ page }, use) => {
        await use(new RenewalsPage(page));
    },

    crmPage: async ({ page }, use) => {
        await use(new CrmPage(page));
    },

    plansPage: async ({ page }, use) => {
        await use(new PlansPage(page));
    },

    staffAdmin: async ({ context, page }, use) => {
        // No `sidebar_state` cookie means the shell defaults to expanded (SSR-known, no flash).
        await context.addCookies([encodeStaffSessionCookie()]);
        const shell = new AdminShellPage(page);
        await shell.gotoDashboard();
        await shell.expectShellReady();
        await use(shell);
    },

    staffNoGym: async ({ context, page }, use) => {
        await context.addCookies([encodeStaffSessionCookieNoGym()]);
        const settings = new SettingsPage(page);
        await page.goto('/admin');
        await use(settings);
    },

    clientHome: async ({ context, page }, use) => {
        await context.addCookies([encodeClientSessionCookie()]);
        const home = new ClientHomePage(page);
        await home.goto();
        await use(home);
    },
});

export { expect };
