import type {
    ConvertLeadInput,
    CreateLeadInput,
    LeadStatus,
    LeadsReader,
    LeadsWriter,
    UpdateLeadInput,
} from '@/modules/leads/leads-ports';

export function createListLeads(deps: { leads: LeadsReader }) {
    return async function listLeads(input: { accessToken: string; gymOrgId: string; status?: LeadStatus }) {
        return deps.leads.list(input);
    };
}

export function createListDueFollowUps(deps: { leads: LeadsReader }) {
    return async function listDueFollowUps(input: { accessToken: string; gymOrgId: string }) {
        return deps.leads.listDueFollowUps(input);
    };
}

export function createCreateLead(deps: { leads: LeadsWriter }) {
    return async function createLead(input: { accessToken: string; gymOrgId: string; body: CreateLeadInput }) {
        return deps.leads.create(input);
    };
}

export function createUpdateLead(deps: { leads: LeadsWriter }) {
    return async function updateLead(input: {
        accessToken: string;
        gymOrgId: string;
        leadId: string;
        body: UpdateLeadInput;
    }) {
        return deps.leads.update(input);
    };
}

export function createChangeLeadStatus(deps: { leads: LeadsWriter }) {
    return async function changeLeadStatus(input: {
        accessToken: string;
        gymOrgId: string;
        leadId: string;
        status: LeadStatus;
    }) {
        return deps.leads.changeStatus(input);
    };
}

export function createConvertLead(deps: { leads: LeadsWriter }) {
    return async function convertLead(input: {
        accessToken: string;
        gymOrgId: string;
        leadId: string;
        body: ConvertLeadInput;
    }) {
        return deps.leads.convert(input);
    };
}

export function createSoftDeleteLead(deps: { leads: LeadsWriter }) {
    return async function softDeleteLead(input: { accessToken: string; gymOrgId: string; leadId: string }) {
        return deps.leads.softDelete(input);
    };
}
