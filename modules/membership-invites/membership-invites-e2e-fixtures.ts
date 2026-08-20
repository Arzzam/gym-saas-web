/**
 * Playwright fixture adapter for the membership-invites module (`GYM_SAAS_E2E_FIXTURES=1`).
 * Shared state lives in `lib/api/e2e/store.ts`; bound in `membership-invites-services.ts`.
 */
import { ApiClientError } from '@/lib/api/errors';
import type {
    MembershipInvite,
    MembershipInvitesReader,
    MembershipInvitesWriter,
    MyDataGrants,
} from '@/modules/membership-invites/membership-invites-ports';
import {
    E2E_GYM_ID,
    e2eDataGrantsByGym,
    e2eMembershipInvites,
    seedMembershipSideEffects,
    e2eNextId,
} from '@/lib/api/e2e/store';

export function createE2eMembershipInvitesAdapter(): MembershipInvitesReader & MembershipInvitesWriter {
    return {
        async list({ gymOrgId, limit = 50, offset = 0 }) {
            if (gymOrgId !== E2E_GYM_ID) {
                return {
                    membershipInvites: { items: [], total: 0, limit, offset },
                };
            }
            return {
                membershipInvites: {
                    items: e2eMembershipInvites.slice(offset, offset + limit),
                    total: e2eMembershipInvites.length,
                    limit,
                    offset,
                },
            };
        },

        async create({ gymOrgId, body }) {
            const invite: MembershipInvite = {
                id: e2eNextId('minvite-e2e-new'),
                gymOrgId,
                invitedEmail: body.invitedEmail,
                invitedUserId: null,
                inviteeName: body.inviteeName,
                inviteePhone: body.inviteePhone ?? null,
                basePlanId: body.basePlanId,
                basePaymentStatus: body.basePaymentStatus,
                addonPlanId: body.addonPlanId ?? null,
                addonPaymentStatus: body.addonPaymentStatus ?? null,
                status: 'PENDING',
                expiresAt: body.expiresAt ?? '2026-08-22T00:00:00.000Z',
                createdBy: 'e2e-user-1',
                acceptedAt: null,
                acceptedMembershipId: null,
                createdAt: '2026-08-08T12:00:00.000Z',
                updatedAt: '2026-08-08T12:00:00.000Z',
            };
            e2eMembershipInvites.unshift(invite);
            return { membershipInvite: invite };
        },

        async listInbox({ limit = 50, offset = 0 }) {
            // Ensure a pending invite exists across Playwright re-runs (same Next process).
            if (!e2eMembershipInvites.some((item) => item.status === 'PENDING')) {
                e2eMembershipInvites.unshift({
                    id: `minvite-e2e-pending-${Date.now()}`,
                    gymOrgId: E2E_GYM_ID,
                    invitedEmail: 'e2e-client@example.com',
                    invitedUserId: 'e2e-client-1',
                    inviteeName: 'E2E Member',
                    inviteePhone: null,
                    basePlanId: 'plan-e2e-base',
                    basePaymentStatus: 'unpaid',
                    addonPlanId: null,
                    addonPaymentStatus: null,
                    status: 'PENDING',
                    expiresAt: '2026-08-22T00:00:00.000Z',
                    createdBy: 'e2e-user-1',
                    acceptedAt: null,
                    acceptedMembershipId: null,
                    createdAt: '2026-08-08T12:00:00.000Z',
                    updatedAt: '2026-08-08T12:00:00.000Z',
                });
            }
            // Include ACCEPTED so /client can discover gymOrgId for my-data-grants.
            const items = e2eMembershipInvites
                .filter((item) => item.status === 'PENDING' || item.status === 'ACCEPTED')
                .map((item) => ({
                    ...item,
                    gym: {
                        id: E2E_GYM_ID,
                        name: 'E2E Gym',
                        address: null,
                        contactPhone: null,
                        contactEmail: null,
                        logoUrl: null,
                        timezone: 'Asia/Kolkata',
                    },
                }));
            return {
                membershipInvites: {
                    items: items.slice(offset, offset + limit),
                    total: items.length,
                    limit,
                    offset,
                },
            };
        },

        async accept({ membershipInviteId, body }) {
            const idx = e2eMembershipInvites.findIndex((item) => item.id === membershipInviteId);
            if (idx < 0) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            if (e2eMembershipInvites[idx].status !== 'PENDING') {
                throw new ApiClientError({
                    code: 'MEMBERSHIP_INVITE_INVALID_TRANSITION',
                    message: 'Only PENDING membership invites can be accepted',
                    status: 409,
                });
            }
            const membershipId = 'membership-e2e-1';
            const profileAttributes = ['DOB', 'HEIGHT', 'WEIGHT', ...(body?.optionalProfileAttributes ?? [])];
            const classGrants = [...(body?.optionalClassGrants ?? [])];
            const updated: MembershipInvite = {
                ...e2eMembershipInvites[idx],
                status: 'ACCEPTED',
                acceptedAt: '2026-08-08T12:05:00.000Z',
                acceptedMembershipId: membershipId,
                updatedAt: '2026-08-08T12:05:00.000Z',
            };
            e2eMembershipInvites[idx] = updated;
            seedMembershipSideEffects({
                membershipId,
                gymOrgId: updated.gymOrgId,
                invite: updated,
                profileAttributes,
                classGrants,
            });
            return {
                membershipInvite: updated,
                membershipId,
                grants: {
                    profileAttributes,
                    classGrants,
                },
            };
        },

        async revoke({ membershipInviteId }) {
            const idx = e2eMembershipInvites.findIndex((item) => item.id === membershipInviteId);
            if (idx < 0) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    status: 404,
                });
            }
            if (e2eMembershipInvites[idx].status !== 'PENDING') {
                throw new ApiClientError({
                    code: 'MEMBERSHIP_INVITE_INVALID_TRANSITION',
                    message: 'Only PENDING membership invites can be revoked',
                    status: 409,
                });
            }
            const updated: MembershipInvite = {
                ...e2eMembershipInvites[idx],
                status: 'REVOKED',
                updatedAt: '2026-08-08T12:10:00.000Z',
            };
            e2eMembershipInvites[idx] = updated;
            return { membershipInvite: updated };
        },

        async getMyDataGrants({ gymOrgId }) {
            const grants = e2eDataGrantsByGym.get(gymOrgId);
            if (!grants) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Active membership not found for this gym',
                    status: 404,
                });
            }
            return { dataGrants: { ...grants } };
        },

        async updateMyDataGrants({ gymOrgId, body }) {
            const existing = e2eDataGrantsByGym.get(gymOrgId);
            if (!existing) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Active membership not found for this gym',
                    status: 404,
                });
            }
            const updated: MyDataGrants = {
                ...existing,
                profileAttributes: ['DOB', 'HEIGHT', 'WEIGHT', ...(body.optionalProfileAttributes ?? [])],
                classGrants: [...(body.optionalClassGrants ?? [])],
            };
            e2eDataGrantsByGym.set(gymOrgId, updated);
            return { dataGrants: updated };
        },
    };
}
