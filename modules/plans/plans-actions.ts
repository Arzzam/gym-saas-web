'use server';

import { revalidatePath } from 'next/cache';

import { createAppServices } from '@/lib/api/composition';
import { ApiClientError } from '@/lib/api/errors';
import { getSession } from '@/lib/auth/session';
import { planErrorMessage } from '@/modules/plans/plans-errors';
import type { PlanKind } from '@/modules/plans/plans-ports';

export type PlanActionResult = { ok: true } | { ok: false; code: string; message: string };

function fail(error: unknown): PlanActionResult {
    if (error instanceof ApiClientError) {
        return {
            ok: false,
            code: error.code,
            message: planErrorMessage(error.code, error.message),
        };
    }
    if (error instanceof Error && error.name === 'ZodError') {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: planErrorMessage('VALIDATION_ERROR'),
        };
    }
    return {
        ok: false,
        code: 'NETWORK_OR_UNKNOWN',
        message: planErrorMessage('NETWORK_OR_UNKNOWN'),
    };
}

async function requireStaffAdminGym(): Promise<
    { ok: true; accessToken: string; gymOrgId: string } | { ok: false; result: PlanActionResult }
> {
    const session = await getSession();
    if (!session || session.lane !== 'STAFF') {
        return {
            ok: false,
            result: {
                ok: false,
                code: 'AUTHENTICATION_FAILED',
                message: planErrorMessage('AUTHENTICATION_FAILED'),
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
                message: planErrorMessage('FORBIDDEN'),
            },
        };
    }
    return { ok: true, accessToken: session.accessToken, gymOrgId };
}

export async function createPlanAction(input: {
    name: string;
    kind: PlanKind;
    durationDays: number;
    price: number;
}): Promise<PlanActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }

    const name = input.name.trim();
    if (name.length < 2) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Enter a plan name (at least 2 characters).',
        };
    }
    if (!Number.isFinite(input.durationDays) || input.durationDays < 1) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Duration must be at least 1 day.',
        };
    }
    if (!Number.isFinite(input.price) || input.price < 0) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Enter a valid price.',
        };
    }

    try {
        const { createPlan } = createAppServices();
        await createPlan({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            body: {
                name,
                kind: input.kind,
                durationDays: Math.floor(input.durationDays),
                price: input.price,
                capability: input.kind === 'ADDON' ? 'TRAINER_COACHING' : undefined,
            },
        });
        revalidatePath('/admin/plans');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

/**
 * Edit a plan's name, term or price.
 *
 * `updatePlan` has been wired to the adapter since the module landed, but the
 * only caller was `setPlanActiveAction` sending `{ active }` — so a gym could
 * create a plan and then never correct a typo in its name or move its price.
 * Validation mirrors `createPlanAction`: the same fields deserve the same
 * rules, and a plan that could not be created should not be reachable by edit.
 *
 * `kind` is deliberately absent. Turning a membership into an add-on would
 * change what every existing subscription on it means, and the API's own
 * `UpdatePlanInput` does not accept it either.
 */
export async function updatePlanAction(input: {
    planId: string;
    name: string;
    durationDays: number;
    price: number;
}): Promise<PlanActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }

    const name = input.name.trim();
    if (name.length < 2) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Enter a plan name (at least 2 characters).' };
    }
    if (!Number.isFinite(input.durationDays) || input.durationDays < 1) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Duration must be at least 1 day.' };
    }
    if (!Number.isFinite(input.price) || input.price < 0) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Enter a valid price.' };
    }

    try {
        const { updatePlan } = createAppServices();
        await updatePlan({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            planId: input.planId,
            body: { name, durationDays: Math.floor(input.durationDays), price: input.price },
        });
        revalidatePath('/admin/plans');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function setPlanActiveAction(input: { planId: string; active: boolean }): Promise<PlanActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }
    try {
        const { updatePlan } = createAppServices();
        await updatePlan({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            planId: input.planId,
            body: { active: input.active },
        });
        revalidatePath('/admin/plans');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function deletePlanAction(input: { planId: string }): Promise<PlanActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }
    try {
        const { softDeletePlan } = createAppServices();
        await softDeletePlan({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            planId: input.planId,
        });
        revalidatePath('/admin/plans');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}
