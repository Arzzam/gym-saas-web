/** Calm copy for gym-orgs API errors (list trainers shares Admin-at-gym authz). */
const GYM_ORG_ERROR_COPY: Record<string, string> = {
    AUTHENTICATION_FAILED: 'Your session expired. Sign in again.',
    FORBIDDEN: 'You need Admin access at this gym to view this list.',
    GYM_ORG_ADMIN_FORBIDDEN: 'You need Admin access at this gym to view this list.',
    VALIDATION_ERROR: 'Check the details and try again.',
    NETWORK_OR_UNKNOWN: 'Could not reach the server. Check your connection.',
};

export function gymOrgErrorMessage(code: string, fallbackMessage?: string): string {
    return GYM_ORG_ERROR_COPY[code] ?? fallbackMessage ?? 'Something went wrong. Please try again.';
}
