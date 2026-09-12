/** Calm copy for CRM lead API errors. */
const LEAD_ERROR_COPY: Record<string, string> = {
    AUTHENTICATION_FAILED: 'Your session expired. Sign in again.',
    FORBIDDEN: 'You need Admin access at this gym to manage leads.',
    LEAD_FORBIDDEN: 'You need Admin access at this gym to manage leads.',
    NOT_FOUND: 'That lead was not found.',
    // Convert. Each says what to do next, not just what went wrong.
    LEAD_ALREADY_CONVERTED: 'This lead has already been converted — their invite is on the members desk.',
    LEAD_EMAIL_REQUIRED: 'Add an email for this lead — that is where the invite goes.',
    LEAD_NOT_CONVERTIBLE: 'A lost lead cannot be converted. Capture them again if they come back.',
    INVALID_INVITE_PLAN: 'Pick an active Base plan for this gym, and an add-on from this gym if you add one.',
    VALIDATION_ERROR: 'Check the lead details and try again.',
    NETWORK_OR_UNKNOWN: 'Could not reach the server. Check your connection.',
};

export function leadErrorMessage(code: string, fallbackMessage?: string): string {
    return LEAD_ERROR_COPY[code] ?? fallbackMessage ?? 'Something went wrong. Please try again.';
}

export function leadWarningMessage(code: string, fallback?: string): string {
    if (code === 'DUPLICATE_OPEN_LEAD_PHONE') {
        return 'Another open lead already uses this phone number.';
    }
    return fallback ?? 'Saved with a warning.';
}
