/** Named Gym Backend paths for Profile & Progress — adapters only. */
export const endpoints = {
    meProfile: '/me/profile',
    meProgressLogs: '/me/progress-logs',
    gymOrgClientProfile: (gymOrgId: string, clientUserId: string) =>
        `/gym-orgs/${encodeURIComponent(gymOrgId)}/clients/${encodeURIComponent(clientUserId)}/profile`,
    gymOrgClientProgressLogs: (gymOrgId: string, clientUserId: string) =>
        `/gym-orgs/${encodeURIComponent(gymOrgId)}/clients/${encodeURIComponent(clientUserId)}/progress-logs`,
} as const;
