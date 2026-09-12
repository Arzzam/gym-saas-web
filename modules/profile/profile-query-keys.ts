/** Query-key factory for Profile & Progress (ADR-0011). */
export const profileKeys = {
    all: ['profile'] as const,
    me: () => [...profileKeys.all, 'me'] as const,
    meLogs: () => [...profileKeys.all, 'me', 'logs'] as const,
    staffClient: (clientUserId: string) => [...profileKeys.all, 'staff', clientUserId] as const,
    staffClientLogs: (clientUserId: string) => [...profileKeys.all, 'staff', clientUserId, 'logs'] as const,
};
