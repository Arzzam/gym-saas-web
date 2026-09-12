/** Calm copy for roster API errors. */
const ROSTER_ERROR_COPY: Record<string, string> = {
    AUTHENTICATION_FAILED: 'Your session expired. Sign in again.',
    FORBIDDEN: 'You need Admin access at this gym to manage the roster.',
    PLAN_FORBIDDEN: 'You need Admin access at this gym to manage the roster.',
    NOT_FOUND: 'That membership was not found.',
    CLIENT_MEMBERSHIP_INVALID_TRANSITION: 'That membership cannot be updated in its current state.',
    // The API's own rule, said in the Admin's terms rather than echoed raw.
    COACHING_ADDON_REQUIRED: 'This member needs an in-date Trainer coaching add-on before a coach can be assigned.',
    TRAINER_NOT_FOUND: "That trainer is no longer on this gym's staff.",
    GYM_ORG_ADMIN_FORBIDDEN: 'You need Admin access at this gym to manage the roster.',
    ROSTER_FORBIDDEN: 'You need a live trainer profile at this gym to see assigned members.',
    VALIDATION_ERROR: 'Check the member details and try again.',
    NETWORK_OR_UNKNOWN: 'Could not reach the server. Check your connection.',
};

export function rosterErrorMessage(code: string, fallbackMessage?: string): string {
    return ROSTER_ERROR_COPY[code] ?? fallbackMessage ?? 'Something went wrong. Please try again.';
}
