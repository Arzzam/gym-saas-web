/** Named Gym Backend paths for CRM leads — adapters only. */
export const endpoints = {
    gymOrgLeads: (gymOrgId: string) => `/gym-orgs/${encodeURIComponent(gymOrgId)}/leads`,
    gymOrgLead: (gymOrgId: string, leadId: string) =>
        `/gym-orgs/${encodeURIComponent(gymOrgId)}/leads/${encodeURIComponent(leadId)}`,
    gymOrgLeadStatus: (gymOrgId: string, leadId: string) =>
        `/gym-orgs/${encodeURIComponent(gymOrgId)}/leads/${encodeURIComponent(leadId)}/status`,
    gymOrgLeadDueFollowUps: (gymOrgId: string) => `/gym-orgs/${encodeURIComponent(gymOrgId)}/leads/due-follow-ups`,
    gymOrgLeadConvert: (gymOrgId: string, leadId: string) =>
        `/gym-orgs/${encodeURIComponent(gymOrgId)}/leads/${encodeURIComponent(leadId)}/convert`,
} as const;
