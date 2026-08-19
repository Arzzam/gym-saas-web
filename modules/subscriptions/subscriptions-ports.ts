/**
 * Subscriptions / renewals — Postman Subscriptions folder.
 * Authz: Auth + STAFF session + gym tenant; API enforces ADMIN.
 * No DataGrant — billing snapshots are gym-owned.
 */

export type SubscriptionKind = 'BASE' | 'ADDON';

export type SubscriptionPaymentStatus = 'paid' | 'unpaid' | 'partial';

export type Subscription = {
    id: string;
    clientMembershipId: string;
    gymOrgId: string;
    planId: string;
    kind: SubscriptionKind;
    capability: string | null;
    priceAmount: number;
    durationDays: number;
    startDate: string | null;
    endDate: string | null;
    startSource: string | null;
    paymentStatus: SubscriptionPaymentStatus;
    amountPaid: number;
    createdAt: string;
    updatedAt: string;
};

export type RenewalDueItem = Subscription & {
    clientUserId: string;
};

export type RenewalPage = {
    items: RenewalDueItem[];
    total: number;
    limit: number;
    offset: number;
};

export type UpdateSubscriptionPaymentInput = {
    paymentStatus: SubscriptionPaymentStatus;
    amountPaid?: number;
};

export type SubscriptionsReader = {
    listRenewalsDue: (input: {
        accessToken: string;
        gymOrgId: string;
        onOrBefore?: string;
        onOrAfter?: string;
        limit?: number;
        offset?: number;
    }) => Promise<{ renewals: RenewalPage }>;

    /**
     * Every line (BASE + ADDONs) for one client, for the detail rail. Returns a
     * plain array, not a page — the API does not paginate this one.
     */
    listClientSubscriptions: (input: {
        accessToken: string;
        gymOrgId: string;
        clientUserId: string;
    }) => Promise<{ subscriptions: Subscription[] }>;
};

export type SubscriptionsWriter = {
    updatePayment: (input: {
        accessToken: string;
        gymOrgId: string;
        subscriptionId: string;
        body: UpdateSubscriptionPaymentInput;
    }) => Promise<{ subscription: Subscription }>;
};
