import type { Locator, Page } from '@playwright/test';

export class MembersPage {
    readonly page: Page;
    readonly heading: Locator;
    readonly scopeFilter: Locator;
    readonly search: Locator;
    readonly inviteTrigger: Locator;
    readonly memberQueue: Locator;
    readonly inviteQueue: Locator;
    readonly rail: Locator;
    readonly summary: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole('heading', { name: 'Members', exact: true });
        this.scopeFilter = page.getByRole('group', { name: 'Show members or invites' });
        this.search = page.getByRole('searchbox', { name: 'Search members' });
        this.inviteTrigger = page.getByRole('button', { name: 'Invite member' });
        // `exact` matters: role-name matching is substring by default, and
        // "Members" is a prefix of "Membership invites".
        this.memberQueue = page.getByRole('list', { name: 'Members', exact: true });
        this.inviteQueue = page.getByRole('list', { name: 'Membership invites', exact: true });
        this.rail = page.getByRole('complementary', { name: /Selected (member|invite)/ });
        this.summary = page.getByRole('region', { name: 'Members summary' });
    }

    async goto() {
        await this.page.goto('/admin/members');
    }

    /** Segment buttons carry a trailing count, so match on the leading label. */
    scope(label: string): Locator {
        return this.scopeFilter.getByRole('button', { name: new RegExp(`^${label}`) });
    }

    memberRow(name: string): Locator {
        return this.memberQueue.getByRole('listitem').filter({ hasText: name });
    }

    inviteRow(name: string): Locator {
        return this.inviteQueue.getByRole('listitem').filter({ hasText: name });
    }

    /** Selecting a row is what loads the rail — every detail action goes through here. */
    async select(name: string) {
        await this.page.getByRole('button', { name: `Open ${name}` }).click();
    }
}
