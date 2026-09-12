import type { Locator, Page } from '@playwright/test';

export class ClientProfilePage {
    readonly page: Page;
    readonly heading: Locator;
    readonly detailsHeading: Locator;
    readonly progressHeading: Locator;
    readonly saveProfileButton: Locator;
    readonly saveProgressButton: Locator;
    readonly heightInput: Locator;
    readonly homeNav: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole('heading', { name: 'Profile', exact: true });
        this.detailsHeading = page.getByRole('heading', { name: 'Your details', exact: true });
        this.progressHeading = page.getByRole('heading', { name: 'Progress', exact: true });
        this.saveProfileButton = page.getByRole('button', { name: 'Save profile' });
        this.saveProgressButton = page.getByRole('button', { name: 'Save progress' });
        this.heightInput = page.getByLabel('Height (cm)');
        this.homeNav = page.getByRole('complementary', { name: 'Member modules' }).getByRole('link', {
            name: 'Home',
            exact: true,
        });
    }

    async goto() {
        await this.page.goto('/client/profile');
    }
}
