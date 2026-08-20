/**
 * Playwright fixture adapter for the staff-invites module (`GYM_SAAS_E2E_FIXTURES=1`).
 * Shared state lives in `lib/api/e2e/store.ts`; bound in `staff-invites-services.ts`.
 */
import { ApiClientError } from '@/lib/api/errors';
import type { StaffInvite, StaffInvitesReader, StaffInvitesWriter } from '@/modules/staff-invites/staff-invites-ports';
import {
    E2E_GYM_ID,
    E2E_PENDING_INBOX_ID,
    E2E_STAFF_TOKEN_NO_GYM,
    E2E_STAFF_TOKEN_WITH_GYM,
    e2eAffiliatedTokens,
    e2eGymInvites,
    sampleInvite,
    e2eNextId,
} from '@/lib/api/e2e/store';

export function createE2eStaffInvitesAdapter(): StaffInvitesReader & StaffInvitesWriter {
    return {
        async listForGym({ accessToken, gymOrgId, limit = 20, offset = 0 }) {
            if (accessToken !== E2E_STAFF_TOKEN_WITH_GYM || gymOrgId !== E2E_GYM_ID) {
                return {
                    staffInvites: { items: [], total: 0, limit, offset },
                };
            }
            const items = e2eGymInvites.slice(offset, offset + limit);
            return {
                staffInvites: {
                    items,
                    total: e2eGymInvites.length,
                    limit,
                    offset,
                },
            };
        },

        async listInbox({ accessToken, limit = 20, offset = 0 }) {
            if (accessToken !== E2E_STAFF_TOKEN_NO_GYM) {
                return {
                    staffInvites: { items: [], total: 0, limit, offset },
                };
            }
            const items = [
                sampleInvite({
                    id: E2E_PENDING_INBOX_ID,
                    invitedUserId: 'e2e-user-1',
                    targetRole: 'TRAINER',
                    status: 'PENDING',
                    gym: {
                        id: E2E_GYM_ID,
                        name: 'E2E Gym',
                        address: null,
                        contactPhone: null,
                        contactEmail: null,
                        logoUrl: null,
                        timezone: 'Asia/Kolkata',
                    },
                }),
            ];
            return {
                staffInvites: {
                    items: items.slice(offset, offset + limit),
                    total: items.length,
                    limit,
                    offset,
                },
            };
        },

        async create({ accessToken, gymOrgId, body }) {
            if (accessToken !== E2E_STAFF_TOKEN_WITH_GYM) {
                throw new ApiClientError({
                    code: 'STAFF_INVITE_FORBIDDEN',
                    message: 'Not allowed',
                    status: 403,
                });
            }
            const invite = sampleInvite({
                id: e2eNextId('invite-e2e-new'),
                gymOrgId,
                targetRole: body.targetRole,
                status: 'PENDING',
            });
            e2eGymInvites.unshift(invite);
            return { staffInvite: invite };
        },

        async revoke({ inviteId }) {
            const idx = e2eGymInvites.findIndex((item) => item.id === inviteId);
            if (idx < 0) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            const updated: StaffInvite = {
                ...e2eGymInvites[idx],
                status: 'REVOKED',
                updatedAt: '2026-08-06T01:00:00.000Z',
            };
            e2eGymInvites[idx] = updated;
            return { staffInvite: updated };
        },

        async accept({ accessToken, inviteId }) {
            if (accessToken === E2E_STAFF_TOKEN_NO_GYM && inviteId === E2E_PENDING_INBOX_ID) {
                e2eAffiliatedTokens.add(accessToken);
                return {
                    staffInvite: sampleInvite({
                        id: inviteId,
                        invitedUserId: 'e2e-user-1',
                        status: 'ACCEPTED',
                        acceptedAt: '2026-08-06T01:00:00.000Z',
                        targetRole: 'TRAINER',
                    }),
                };
            }
            throw new ApiClientError({
                code: 'NOT_FOUND',
                message: 'Not found',
                status: 404,
            });
        },
    };
}
