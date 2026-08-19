/** Named Gym Backend paths for subscription lines + renewals. */
export const endpoints = {
    gymOrgRenewalsDue: (gymOrgId: string) => `/gym-orgs/${encodeURIComponent(gymOrgId)}/subscriptions/renewals-due`,
    gymOrgSubscriptionPayment: (gymOrgId: string, subscriptionId: string) =>
        `/gym-orgs/${encodeURIComponent(gymOrgId)}/subscriptions/${encodeURIComponent(subscriptionId)}/payment`,
    gymOrgClientSubscriptions: (gymOrgId: string, clientUserId: string) =>
        `/gym-orgs/${encodeURIComponent(gymOrgId)}/clients/${encodeURIComponent(clientUserId)}/subscriptions`,
} as const;
