/**
 * Playwright fixture adapter for the roster module (`GYM_SAAS_E2E_FIXTURES=1`).
 * Shared state lives in `lib/api/e2e/store.ts`; bound in `roster-services.ts`.
 */
import { ApiClientError } from '@/lib/api/errors';
import type { MembershipMutation, RosterMember, RosterReader, RosterWriter } from '@/modules/roster/roster-ports';
import { E2E_GYM_ID, e2eDataGrantsByGym, e2eGymTrainers, e2eRenewals, e2eRosterMembers } from '@/lib/api/e2e/store';

function toMembershipMutation(member: RosterMember): MembershipMutation {
    return {
        membershipId: member.membershipId,
        clientUserId: member.clientUserId,
        gymOrgId: member.gymOrgId,
        status: member.status,
        checkInBlocked: member.checkInBlocked,
        assignedTrainerId: member.assignedTrainerId,
        joinedAt: member.joinedAt,
        leftAt: member.leftAt,
        updatedAt: '2026-08-11T12:00:00.000Z',
    };
}

export function createE2eRosterAdapter(): RosterReader & RosterWriter {
    return {
        async listMembers({ gymOrgId, status, q }) {
            if (gymOrgId !== E2E_GYM_ID) {
                return { members: [] };
            }
            let items = [...e2eRosterMembers];
            if (status) {
                items = items.filter((member) => member.status === status);
            }
            if (q?.trim()) {
                const needle = q.trim().toLowerCase();
                items = items.filter(
                    (member) =>
                        member.clientName.toLowerCase().includes(needle) ||
                        member.clientEmail.toLowerCase().includes(needle) ||
                        (member.clientPhone ?? '').toLowerCase().includes(needle),
                );
            }
            return { members: items };
        },

        async listMyAssignedMembers({ gymOrgId, status, q }) {
            if (gymOrgId !== E2E_GYM_ID) {
                return { members: [] };
            }
            // E2E staff actor is the first gym trainer — scope to that profile id.
            const selfTrainerId = e2eGymTrainers[0]?.trainerProfileId ?? null;
            let items = e2eRosterMembers.filter((member) => member.assignedTrainerId === selfTrainerId);
            if (status) {
                items = items.filter((member) => member.status === status);
            }
            if (q?.trim()) {
                const needle = q.trim().toLowerCase();
                items = items.filter(
                    (member) =>
                        member.clientName.toLowerCase().includes(needle) ||
                        member.clientEmail.toLowerCase().includes(needle) ||
                        (member.clientPhone ?? '').toLowerCase().includes(needle),
                );
            }
            return { members: items };
        },

        async offboard({ gymOrgId, membershipId }) {
            const idx = e2eRosterMembers.findIndex(
                (item) => item.membershipId === membershipId && item.gymOrgId === gymOrgId,
            );
            if (idx < 0 || e2eRosterMembers[idx].status !== 'ACTIVE') {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Active membership not found',
                    status: 404,
                });
            }
            const updated: RosterMember = {
                ...e2eRosterMembers[idx],
                status: 'INACTIVE',
                leftAt: '2026-08-11T12:00:00.000Z',
            };
            e2eRosterMembers[idx] = updated;
            e2eDataGrantsByGym.delete(gymOrgId);
            return { membership: toMembershipMutation(updated) };
        },

        /**
         * Mirrors the API's own precondition rather than always succeeding: the
         * backend answers 422 COACHING_ADDON_REQUIRED unless the member holds an
         * in-date TRAINER_COACHING add-on. A fixture that skipped that would let
         * a spec "prove" a flow the real endpoint rejects.
         */
        async assignTrainer({ gymOrgId, membershipId, trainerProfileId }) {
            const idx = e2eRosterMembers.findIndex(
                (item) => item.membershipId === membershipId && item.gymOrgId === gymOrgId,
            );
            if (idx < 0) {
                throw new ApiClientError({ code: 'NOT_FOUND', message: 'Active membership not found', status: 404 });
            }
            if (e2eRosterMembers[idx].status !== 'ACTIVE') {
                throw new ApiClientError({
                    code: 'CLIENT_MEMBERSHIP_INVALID_TRANSITION',
                    message: 'Cannot assign a trainer to an inactive membership',
                    status: 422,
                });
            }
            if (!e2eGymTrainers.some((trainer) => trainer.trainerProfileId === trainerProfileId)) {
                throw new ApiClientError({ code: 'TRAINER_NOT_FOUND', message: 'Trainer not found', status: 404 });
            }

            const today = new Date().toISOString().slice(0, 10);
            const hasCoaching = e2eRenewals.some(
                (line) =>
                    line.clientUserId === e2eRosterMembers[idx].clientUserId &&
                    line.kind === 'ADDON' &&
                    line.capability === 'TRAINER_COACHING' &&
                    (line.endDate ?? '') >= today,
            );
            if (!hasCoaching) {
                throw new ApiClientError({
                    code: 'COACHING_ADDON_REQUIRED',
                    message: 'An in-date TRAINER_COACHING addon is required to assign a trainer',
                    status: 422,
                });
            }

            e2eRosterMembers[idx] = { ...e2eRosterMembers[idx], assignedTrainerId: trainerProfileId };
            return { membership: toMembershipMutation(e2eRosterMembers[idx]) };
        },

        async setCheckInBlock({ gymOrgId, membershipId, blocked }) {
            const idx = e2eRosterMembers.findIndex(
                (item) => item.membershipId === membershipId && item.gymOrgId === gymOrgId,
            );
            if (idx < 0) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Active membership not found',
                    status: 404,
                });
            }
            if (e2eRosterMembers[idx].status !== 'ACTIVE') {
                throw new ApiClientError({
                    code: 'CLIENT_MEMBERSHIP_INVALID_TRANSITION',
                    message: 'Cannot block check-in an inactive membership',
                    status: 422,
                });
            }
            const updated: RosterMember = {
                ...e2eRosterMembers[idx],
                checkInBlocked: blocked,
            };
            e2eRosterMembers[idx] = updated;
            return { membership: toMembershipMutation(updated) };
        },
    };
}
