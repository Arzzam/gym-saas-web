/** Named Gym Backend paths for the member roster — adapters only. */
export const endpoints = {
    gymOrgMembers: (gymOrgId: string) => `/gym-orgs/${encodeURIComponent(gymOrgId)}/members`,
    gymOrgMemberOffboard: (gymOrgId: string, membershipId: string) =>
        `/gym-orgs/${encodeURIComponent(gymOrgId)}/members/${encodeURIComponent(membershipId)}/offboard`,
    gymOrgMemberAssignTrainer: (gymOrgId: string, membershipId: string) =>
        `/gym-orgs/${encodeURIComponent(gymOrgId)}/members/${encodeURIComponent(membershipId)}/assign-trainer`,
    gymOrgMemberCheckInBlock: (gymOrgId: string, membershipId: string) =>
        `/gym-orgs/${encodeURIComponent(gymOrgId)}/members/${encodeURIComponent(membershipId)}/check-in-block`,
} as const;
