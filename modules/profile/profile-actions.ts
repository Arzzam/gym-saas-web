'use server';

import { revalidatePath } from 'next/cache';

import { createAppServices } from '@/lib/api/composition';
import { ApiClientError } from '@/lib/api/errors';
import { getSession } from '@/lib/auth/session';
import { profileErrorMessage } from '@/modules/profile/profile-errors';
import type { ProfileGender } from '@/modules/profile/profile-ports';

export type ProfileActionResult = { ok: true } | { ok: false; code: string; message: string };

function fail(error: unknown): ProfileActionResult {
    if (error instanceof ApiClientError) {
        return {
            ok: false,
            code: error.code,
            message: profileErrorMessage(error.code, error.message),
        };
    }
    if (error instanceof Error && error.name === 'ZodError') {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: profileErrorMessage('VALIDATION_ERROR'),
        };
    }
    return {
        ok: false,
        code: 'NETWORK_OR_UNKNOWN',
        message: profileErrorMessage('NETWORK_OR_UNKNOWN'),
    };
}

async function requireClient(): Promise<
    { ok: true; accessToken: string } | { ok: false; result: ProfileActionResult }
> {
    const session = await getSession();
    if (!session || session.lane !== 'CLIENT') {
        return {
            ok: false,
            result: {
                ok: false,
                code: 'AUTHENTICATION_FAILED',
                message: profileErrorMessage('AUTHENTICATION_FAILED'),
            },
        };
    }
    return { ok: true, accessToken: session.accessToken };
}

function parseOptionalNumber(raw: string): number | null | undefined {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return null;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value)) {
        return undefined;
    }
    return value;
}

const GENDERS = new Set<ProfileGender>(['MALE', 'FEMALE', 'OTHER']);

export async function updateMyProfileAction(input: {
    heightCm: string;
    weightKg: string;
    dob: string;
    gender: string;
    medicalNotes: string;
}): Promise<ProfileActionResult> {
    const gate = await requireClient();
    if (!gate.ok) {
        return gate.result;
    }

    const heightCm = parseOptionalNumber(input.heightCm);
    const weightKg = parseOptionalNumber(input.weightKg);
    if (heightCm === undefined || weightKg === undefined) {
        return { ok: false, code: 'VALIDATION_ERROR', message: profileErrorMessage('VALIDATION_ERROR') };
    }

    const genderRaw = input.gender.trim();
    const gender = genderRaw.length === 0 ? null : genderRaw;
    if (gender !== null && !GENDERS.has(gender as ProfileGender)) {
        return { ok: false, code: 'VALIDATION_ERROR', message: profileErrorMessage('VALIDATION_ERROR') };
    }

    const dob = input.dob.trim() === '' ? null : input.dob.trim();
    const medicalNotes = input.medicalNotes.trim() === '' ? null : input.medicalNotes.trim();

    try {
        const { updateMyProfile } = createAppServices();
        await updateMyProfile({
            accessToken: gate.accessToken,
            body: {
                heightCm,
                weightKg,
                dob,
                gender: gender as ProfileGender | null,
                medicalNotes,
            },
        });
        revalidatePath('/client/profile');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function upsertMyProgressLogAction(input: {
    logDate: string;
    weightKg: string;
    notes: string;
}): Promise<ProfileActionResult> {
    const gate = await requireClient();
    if (!gate.ok) {
        return gate.result;
    }

    const logDate = input.logDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
        return { ok: false, code: 'VALIDATION_ERROR', message: profileErrorMessage('VALIDATION_ERROR') };
    }

    const weightKg = parseOptionalNumber(input.weightKg);
    if (weightKg === undefined) {
        return { ok: false, code: 'VALIDATION_ERROR', message: profileErrorMessage('VALIDATION_ERROR') };
    }

    const notes = input.notes.trim() === '' ? null : input.notes.trim();

    try {
        const { upsertMyProgressLog } = createAppServices();
        await upsertMyProgressLog({
            accessToken: gate.accessToken,
            body: { logDate, weightKg, notes },
        });
        revalidatePath('/client/profile');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}
