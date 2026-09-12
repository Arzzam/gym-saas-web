import { describe, expect, it } from 'vitest';

import { computeProfileBmi } from '@/modules/profile/profile-bmi';
import { isGrantMissing } from '@/modules/profile/profile-errors';

describe('profile grant-missing vs BMI', () => {
    it('maps USERS_FORBIDDEN to a missing-grant empty state, not a crash', () => {
        expect(isGrantMissing('USERS_FORBIDDEN')).toBe(true);
        expect(isGrantMissing('VALIDATION_ERROR')).toBe(false);
    });

    it('computes BMI only when height and weight are present', () => {
        expect(computeProfileBmi(170, 68)).toBe(23.5);
        expect(computeProfileBmi(null, 68)).toBeNull();
        expect(computeProfileBmi(170, null)).toBeNull();
    });
});
