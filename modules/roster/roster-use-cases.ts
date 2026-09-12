import type { RosterReader, RosterWriter } from '@/modules/roster/roster-ports';

export function createListRosterMembers(deps: { roster: RosterReader }) {
    return async function listRosterMembers(input: {
        accessToken: string;
        gymOrgId: string;
        status?: 'ACTIVE' | 'INACTIVE';
        q?: string;
    }) {
        return deps.roster.listMembers(input);
    };
}

export function createListMyAssignedMembers(deps: { roster: RosterReader }) {
    return async function listMyAssignedMembers(input: {
        accessToken: string;
        gymOrgId: string;
        status?: 'ACTIVE' | 'INACTIVE';
        q?: string;
    }) {
        return deps.roster.listMyAssignedMembers(input);
    };
}

export function createOffboardMember(deps: { roster: RosterWriter }) {
    return async function offboardMember(input: { accessToken: string; gymOrgId: string; membershipId: string }) {
        return deps.roster.offboard(input);
    };
}

export function createAssignTrainer(deps: { roster: RosterWriter }) {
    return async function assignTrainer(input: {
        accessToken: string;
        gymOrgId: string;
        membershipId: string;
        trainerProfileId: string;
    }) {
        return deps.roster.assignTrainer(input);
    };
}

export function createSetCheckInBlock(deps: { roster: RosterWriter }) {
    return async function setCheckInBlock(input: {
        accessToken: string;
        gymOrgId: string;
        membershipId: string;
        blocked: boolean;
    }) {
        return deps.roster.setCheckInBlock(input);
    };
}
