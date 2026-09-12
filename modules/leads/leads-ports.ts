/** CRM leads — Postman Leads folder. */
import type { MembershipPaymentStatus } from '@/modules/membership-invites/membership-invites-ports';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'TRIAL' | 'CONVERTED' | 'LOST';

export type Lead = {
    id: string;
    gymOrgId: string;
    name: string;
    phone: string;
    /**
     * Optional on a lead — a walk-in gives a phone, not always an address. It is
     * what `Convert Lead` falls back to when the Admin does not override it, so a
     * lead without one has to be given an email at convert time (422
     * `LEAD_EMAIL_REQUIRED`).
     */
    email: string | null;
    source: string | null;
    interest: string | null;
    notes: string | null;
    status: LeadStatus;
    followUpDate: string | null;
    createdBy: string;
    convertedMembershipInviteId: string | null;
    createdAt: string;
    updatedAt: string;
};

export type LeadPage = {
    items: Lead[];
    total: number;
    limit: number;
    offset: number;
};

export type LeadWarning = {
    code: string;
    message?: string;
};

export type CreateLeadInput = {
    name: string;
    phone: string;
    source?: string | null;
    interest?: string | null;
    notes?: string | null;
    email?: string | null;
};

export type UpdateLeadInput = {
    name?: string;
    phone?: string;
    source?: string | null;
    interest?: string | null;
    notes?: string | null;
    email?: string | null;
    /** YYYY-MM-DD or null to clear; omit to keep. */
    followUpDate?: string | null;
};

/**
 * Body for `Convert Lead`. Mirrors the create-membership-invite body, minus the
 * name and phone the API reads off the lead itself.
 *
 * `invitedEmail` is optional only when the lead already carries one — the API
 * answers 422 `LEAD_EMAIL_REQUIRED` if neither exists. The add-on pair is
 * all-or-nothing.
 */
export type ConvertLeadInput = {
    invitedEmail?: string;
    basePlanId: string;
    basePaymentStatus: MembershipPaymentStatus;
    addonPlanId?: string;
    addonPaymentStatus?: MembershipPaymentStatus;
    /** ISO 8601, or omitted to leave the invite open-ended. */
    expiresAt?: string;
};

export type LeadsReader = {
    list: (input: {
        accessToken: string;
        gymOrgId: string;
        status?: LeadStatus;
        limit?: number;
        offset?: number;
    }) => Promise<{ leads: LeadPage }>;

    listDueFollowUps: (input: {
        accessToken: string;
        gymOrgId: string;
        limit?: number;
        offset?: number;
    }) => Promise<{ leads: LeadPage }>;

    get: (input: { accessToken: string; gymOrgId: string; leadId: string }) => Promise<{ lead: Lead }>;
};

export type LeadsWriter = {
    create: (input: {
        accessToken: string;
        gymOrgId: string;
        body: CreateLeadInput;
    }) => Promise<{ lead: Lead; warnings: LeadWarning[] }>;

    update: (input: {
        accessToken: string;
        gymOrgId: string;
        leadId: string;
        body: UpdateLeadInput;
    }) => Promise<{ lead: Lead; warnings: LeadWarning[] }>;

    changeStatus: (input: {
        accessToken: string;
        gymOrgId: string;
        leadId: string;
        status: LeadStatus;
    }) => Promise<{ lead: Lead }>;

    /**
     * Create a PENDING membership invite from this lead and flip it to
     * `CONVERTED`, in one API call.
     *
     * Resolves to the invite's **id**, not the invite: the CRM never renders one,
     * and the id lands on the lead as `convertedMembershipInviteId` anyway.
     * Returning the whole DTO would make this module depend on the
     * membership-invites entity for something no screen here reads.
     */
    convert: (input: {
        accessToken: string;
        gymOrgId: string;
        leadId: string;
        body: ConvertLeadInput;
    }) => Promise<{ lead: Lead; membershipInviteId: string }>;

    softDelete: (input: { accessToken: string; gymOrgId: string; leadId: string }) => Promise<void>;
};
