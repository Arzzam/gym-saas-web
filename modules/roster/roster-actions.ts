'use server';

import { revalidatePath } from 'next/cache';

import { createAppServices } from '@/lib/api/composition';
import { ApiClientError } from '@/lib/api/errors';
import { getSession } from '@/lib/auth/session';
import { rosterErrorMessage } from '@/modules/roster/roster-errors';

export type RosterActionResult = { ok: true } | { ok: false; code: string; message: string };

function fail(error: unknown): RosterActionResult {
    if (error instanceof ApiClientError) {
        return {
            ok: false,
            code: error.code,
            message: rosterErrorMessage(error.code, error.message),
        };
    }
    if (error instanceof Error && error.name === 'ZodError') {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: rosterErrorMessage('VALIDATION_ERROR'),
        };
    }
    return {
        ok: false,
        code: 'NETWORK_OR_UNKNOWN',
        message: rosterErrorMessage('NETWORK_OR_UNKNOWN'),
    };
}

/** Auth + STAFF + gym tenant. API enforces ADMIN. No DataGrant (gym-owned). */
async function requireStaffAdminGym(): Promise<
    { ok: true; accessToken: string; gymOrgId: string } | { ok: false; result: RosterActionResult }
> {
    const session = await getSession();
    if (!session || session.lane !== 'STAFF') {
        return {
            ok: false,
            result: {
                ok: false,
                code: 'AUTHENTICATION_FAILED',
                message: rosterErrorMessage('AUTHENTICATION_FAILED'),
            },
        };
    }
    const { listGymOrgs } = createAppServices();
    const { gymOrgs } = await listGymOrgs({ accessToken: session.accessToken });
    const gymOrgId = gymOrgs[0]?.id;
    if (!gymOrgId) {
        return {
            ok: false,
            result: {
                ok: false,
                code: 'FORBIDDEN',
                message: rosterErrorMessage('FORBIDDEN'),
            },
        };
    }
    return { ok: true, accessToken: session.accessToken, gymOrgId };
}

export async function offboardMemberAction(input: { membershipId: string }): Promise<RosterActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }
    const membershipId = input.membershipId.trim();
    if (!membershipId) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: rosterErrorMessage('VALIDATION_ERROR'),
        };
    }
    try {
        const { offboardMember } = createAppServices();
        await offboardMember({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            membershipId,
        });
        revalidatePath('/admin/members');
        revalidatePath('/admin/attendance');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function assignTrainerAction(input: {
    membershipId: string;
    trainerProfileId: string;
}): Promise<RosterActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }
    const membershipId = input.membershipId.trim();
    const trainerProfileId = input.trainerProfileId.trim();
    if (!membershipId) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: rosterErrorMessage('VALIDATION_ERROR'),
        };
    }
    if (!trainerProfileId) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Pick a trainer to assign.' };
    }

    try {
        const { assignTrainer } = createAppServices();
        await assignTrainer({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            membershipId,
            trainerProfileId,
        });
        revalidatePath('/admin/members');
        return { ok: true };
    } catch (error) {
        // Notably COACHING_ADDON_REQUIRED (422) — mapped to plain copy in
        // `roster-errors.ts` rather than surfaced raw.
        return fail(error);
    }
}

export async function setCheckInBlockAction(input: {
    membershipId: string;
    blocked: boolean;
}): Promise<RosterActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }
    const membershipId = input.membershipId.trim();
    if (!membershipId) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: rosterErrorMessage('VALIDATION_ERROR'),
        };
    }
    try {
        const { setCheckInBlock } = createAppServices();
        await setCheckInBlock({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            membershipId,
            blocked: input.blocked,
        });
        revalidatePath('/admin/members');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}
