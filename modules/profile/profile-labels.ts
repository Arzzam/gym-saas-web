import type { ProfileGender } from '@/modules/profile/profile-ports';

export function profileGenderLabel(gender: ProfileGender): string {
    if (gender === 'MALE') {
        return 'Male';
    }
    if (gender === 'FEMALE') {
        return 'Female';
    }
    return 'Other';
}

export function formatProfileMeasure(value: number | null, unit: string): string {
    if (value === null) {
        return '—';
    }
    return `${value} ${unit}`;
}
