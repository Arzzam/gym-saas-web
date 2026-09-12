'use server';

import { revalidatePath } from 'next/cache';

import { createAppServices } from '@/lib/api/composition';
import { ApiClientError } from '@/lib/api/errors';
import { getSession } from '@/lib/auth/session';
import { leadErrorMessage, leadWarningMessage } from '@/modules/leads/leads-errors';
import type { LeadStatus } from '@/modules/leads/leads-ports';
import type { MembershipPaymentStatus } from '@/modules/membership-invites/membership-invites-ports';

export type LeadActionResult = { ok: true; warning?: string } | { ok: false; code: string; message: string };

function fail(error: unknown): LeadActionResult {
    if (error instanceof ApiClientError) {
        return {
            ok: false,
            code: error.code,
            message: leadErrorMessage(error.code, error.message),
        };
    }
    if (error instanceof Error && error.name === 'ZodError') {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: leadErrorMessage('VALIDATION_ERROR'),
        };
    }
    return {
        ok: false,
        code: 'NETWORK_OR_UNKNOWN',
        message: leadErrorMessage('NETWORK_OR_UNKNOWN'),
    };
}

async function requireStaffAdminGym(): Promise<
    { ok: true; accessToken: string; gymOrgId: string } | { ok: false; result: LeadActionResult }
> {
    const session = await getSession();
    if (!session || session.lane !== 'STAFF') {
        return {
            ok: false,
            result: {
                ok: false,
                code: 'AUTHENTICATION_FAILED',
                message: leadErrorMessage('AUTHENTICATION_FAILED'),
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
                message: leadErrorMessage('FORBIDDEN'),
            },
        };
    }
    return { ok: true, accessToken: session.accessToken, gymOrgId };
}

/** Blank means "no email on file", which is a legitimate state for a walk-in. */
function normalizeEmail(raw: string | undefined): string | null {
    return raw?.trim().toLowerCase() || null;
}

export async function createLeadAction(input: {
    name: string;
    phone: string;
    email?: string;
    source?: string;
    interest?: string;
    notes?: string;
}): Promise<LeadActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }

    const name = input.name.trim();
    const phone = input.phone.replace(/\D/g, '');
    const email = normalizeEmail(input.email);
    if (name.length < 2) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Enter the lead’s name.',
        };
    }
    if (phone.length < 8) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Enter a valid phone number.',
        };
    }
    if (email && !email.includes('@')) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Enter a valid email, or leave it blank.',
        };
    }

    try {
        const { createLead } = createAppServices();
        const result = await createLead({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            body: {
                name,
                phone,
                email,
                source: input.source?.trim() || null,
                interest: input.interest?.trim() || null,
                notes: input.notes?.trim() || null,
            },
        });
        revalidatePath('/admin/crm');
        const warning = result.warnings[0];
        return {
            ok: true,
            warning: warning ? leadWarningMessage(warning.code, warning.message) : undefined,
        };
    } catch (error) {
        return fail(error);
    }
}

export async function updateLeadAction(input: {
    leadId: string;
    name: string;
    phone: string;
    email?: string;
    source?: string;
    interest?: string;
    notes?: string;
    followUpDate?: string | null;
}): Promise<LeadActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }

    const name = input.name.trim();
    const phone = input.phone.replace(/\D/g, '');
    const email = normalizeEmail(input.email);
    if (name.length < 2) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Enter the lead’s name.',
        };
    }
    if (phone.length < 8) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Enter a valid phone number.',
        };
    }
    if (email && !email.includes('@')) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Enter a valid email, or leave it blank.',
        };
    }

    try {
        const { updateLead } = createAppServices();
        const result = await updateLead({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            leadId: input.leadId,
            body: {
                name,
                phone,
                email,
                source: input.source?.trim() || null,
                interest: input.interest?.trim() || null,
                notes: input.notes?.trim() || null,
                followUpDate: input.followUpDate === undefined ? undefined : input.followUpDate?.trim() || null,
            },
        });
        revalidatePath('/admin/crm');
        const warning = result.warnings[0];
        return {
            ok: true,
            warning: warning ? leadWarningMessage(warning.code, warning.message) : undefined,
        };
    } catch (error) {
        return fail(error);
    }
}

export async function changeLeadStatusAction(input: { leadId: string; status: LeadStatus }): Promise<LeadActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }
    try {
        const { changeLeadStatus } = createAppServices();
        await changeLeadStatus({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            leadId: input.leadId,
            status: input.status,
        });
        revalidatePath('/admin/crm');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

function isPaymentStatus(value: string): value is MembershipPaymentStatus {
    return value === 'paid' || value === 'unpaid' || value === 'partial';
}

/**
 * Create a membership invite from a lead. This is the only thing that may set a
 * lead to `CONVERTED` — the stage picker no longer offers it, so a converted
 * lead always has an invite behind it.
 *
 * Revalidates **both** desks: the lead's stage moves on `/admin/crm`, and the
 * new PENDING invite belongs in the members desk's Invites queue.
 */
export async function convertLeadAction(input: {
    leadId: string;
    invitedEmail?: string;
    basePlanId: string;
    basePaymentStatus: string;
    addonPlanId?: string;
    addonPaymentStatus?: string;
    expiresAt?: string;
}): Promise<LeadActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }

    const invitedEmail = normalizeEmail(input.invitedEmail);
    const basePlanId = input.basePlanId.trim();
    const addonPlanId = input.addonPlanId?.trim() ?? '';
    const addonPaymentRaw = input.addonPaymentStatus?.trim() ?? '';

    if (invitedEmail && !invitedEmail.includes('@')) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Enter a valid email for the invite.' };
    }
    if (!basePlanId) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Choose a Base plan.' };
    }
    if (!isPaymentStatus(input.basePaymentStatus)) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Choose a base payment status.' };
    }
    // The API rejects a half-set add-on; say so before spending a round trip.
    const hasAddon = Boolean(addonPlanId) || Boolean(addonPaymentRaw);
    if (hasAddon && !(addonPlanId && isPaymentStatus(addonPaymentRaw))) {
        return {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Add-on plan and payment status must both be set, or both left empty.',
        };
    }

    try {
        const { convertLead } = createAppServices();
        await convertLead({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            leadId: input.leadId,
            body: {
                ...(invitedEmail ? { invitedEmail } : {}),
                basePlanId,
                basePaymentStatus: input.basePaymentStatus,
                ...(addonPlanId && isPaymentStatus(addonPaymentRaw)
                    ? { addonPlanId, addonPaymentStatus: addonPaymentRaw }
                    : {}),
                ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
            },
        });
        revalidatePath('/admin/crm');
        revalidatePath('/admin/members');
        return { ok: true };
    } catch (error) {
        // Notably LEAD_ALREADY_CONVERTED (409), LEAD_EMAIL_REQUIRED and
        // LEAD_NOT_CONVERTIBLE (422) — mapped to plain copy in `leads-errors.ts`.
        return fail(error);
    }
}

export async function setLeadFollowUpAction(input: {
    leadId: string;
    followUpDate: string | null;
}): Promise<LeadActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }
    try {
        const { updateLead } = createAppServices();
        await updateLead({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            leadId: input.leadId,
            body: { followUpDate: input.followUpDate },
        });
        revalidatePath('/admin/crm');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function deleteLeadAction(input: { leadId: string }): Promise<LeadActionResult> {
    const gate = await requireStaffAdminGym();
    if (!gate.ok) {
        return gate.result;
    }
    try {
        const { softDeleteLead } = createAppServices();
        await softDeleteLead({
            accessToken: gate.accessToken,
            gymOrgId: gate.gymOrgId,
            leadId: input.leadId,
        });
        revalidatePath('/admin/crm');
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}
