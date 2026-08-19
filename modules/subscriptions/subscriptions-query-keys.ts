/** Query-key factory for the renewals desk (ADR-0011). */
export const subscriptionsKeys = {
    all: ['subscriptions'] as const,
    /** The window is part of the key: changing the date filter is a different list, not a refetch. */
    renewalsDue: (onOrAfter: string, onOrBefore: string) =>
        [...subscriptionsKeys.all, 'renewals-due', onOrAfter, onOrBefore] as const,
    /** One client's lines, fetched lazily by the detail rail. */
    client: (clientUserId: string) => [...subscriptionsKeys.all, 'client', clientUserId] as const,
};
