import { describe, expect, it } from 'vitest';

import { formatInviteExpiry } from '@/modules/membership-invites/membership-invites-labels';

describe('formatInviteExpiry', () => {
    it('uses a pinned locale so SSR and the client match', () => {
        expect(formatInviteExpiry('2026-08-22T00:00:00.000Z')).toBe('22 Aug 2026');
    });

    it('returns the raw string when the timestamp is invalid', () => {
        expect(formatInviteExpiry('not-a-date')).toBe('not-a-date');
    });
});
