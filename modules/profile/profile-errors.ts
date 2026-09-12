/** Calm copy for Profile & Progress API errors. Missing grants are not errors in the UI. */
const PROFILE_ERROR_COPY: Record<string, string> = {
    AUTHENTICATION_FAILED: 'Your session expired. Sign in again.',
    FORBIDDEN: 'You cannot view this member data.',
    USERS_FORBIDDEN: 'You cannot view this member data.',
    NOT_FOUND: 'That profile was not found.',
    VALIDATION_ERROR: 'Check the profile details and try again.',
    INVALID_PROFILE: 'Check the profile details and try again.',
    NETWORK_OR_UNKNOWN: 'Could not reach the server. Check your connection.',
};

export function profileErrorMessage(code: string, fallbackMessage?: string): string {
    return PROFILE_ERROR_COPY[code] ?? fallbackMessage ?? 'Something went wrong. Please try again.';
}

export function isGrantMissing(code: string): boolean {
    return code === 'USERS_FORBIDDEN';
}
