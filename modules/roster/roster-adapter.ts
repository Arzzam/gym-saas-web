import { z } from 'zod';

import { endpoints } from '@/modules/roster/roster-endpoints';
import type { HttpClient } from '@/lib/api/client';
import type {
    MembershipMutation,
    MembershipStatus,
    RosterMember,
    RosterReader,
    RosterWriter,
} from '@/modules/roster/roster-ports';

const paymentStatusSchema = z.enum(['paid', 'unpaid', 'partial']).nullable();

const memberSchema = z.object({
    membershipId: z.string().min(1),
    clientUserId: z.string().min(1),
    gymOrgId: z.string().min(1).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    checkInBlocked: z.boolean(),
    assignedTrainerId: z.string().min(1).nullable().optional(),
    clientName: z.string().min(1),
    clientEmail: z.string().min(1),
    clientPhone: z.string().nullable().optional(),
    joinedAt: z.string().min(1),
    leftAt: z.string().nullable().optional(),
    basePaymentStatus: paymentStatusSchema.optional(),
    baseAmountPaid: z.number().nullable().optional(),
    basePriceAmount: z.number().nullable().optional(),
});

const membershipMutationSchema = z.object({
    membershipId: z.string().min(1),
    clientUserId: z.string().min(1),
    gymOrgId: z.string().min(1).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    checkInBlocked: z.boolean(),
    assignedTrainerId: z.string().min(1).nullable().optional(),
    joinedAt: z.string().min(1),
    leftAt: z.string().nullable().optional(),
    updatedAt: z.string().min(1).optional(),
});

const membersEnvelopeSchema = z.object({
    members: z.array(memberSchema),
});

const membershipEnvelopeSchema = z.object({
    membership: membershipMutationSchema,
});

function normalizeMember(raw: z.infer<typeof memberSchema>, gymOrgId: string): RosterMember {
    return {
        membershipId: raw.membershipId,
        clientUserId: raw.clientUserId,
        gymOrgId: raw.gymOrgId ?? gymOrgId,
        status: raw.status,
        checkInBlocked: raw.checkInBlocked,
        assignedTrainerId: raw.assignedTrainerId ?? null,
        clientName: raw.clientName,
        clientEmail: raw.clientEmail,
        clientPhone: raw.clientPhone ?? null,
        joinedAt: raw.joinedAt,
        leftAt: raw.leftAt ?? null,
        basePaymentStatus: raw.basePaymentStatus ?? null,
        baseAmountPaid: raw.baseAmountPaid ?? null,
        basePriceAmount: raw.basePriceAmount ?? null,
    };
}

function normalizeMembership(raw: z.infer<typeof membershipMutationSchema>, gymOrgId: string): MembershipMutation {
    return {
        membershipId: raw.membershipId,
        clientUserId: raw.clientUserId,
        gymOrgId: raw.gymOrgId ?? gymOrgId,
        status: raw.status,
        checkInBlocked: raw.checkInBlocked,
        assignedTrainerId: raw.assignedTrainerId ?? null,
        joinedAt: raw.joinedAt,
        leftAt: raw.leftAt ?? null,
        updatedAt: raw.updatedAt ?? '',
    };
}

function listQuery(input: { status?: MembershipStatus; q?: string }): string {
    const params = new URLSearchParams();
    if (input.status) {
        params.set('status', input.status);
    }
    if (input.q?.trim()) {
        params.set('q', input.q.trim());
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export function createRosterAdapter(http: HttpClient): RosterReader & RosterWriter {
    return {
        async listMembers({ accessToken, gymOrgId, status, q }) {
            const raw = await http.request<unknown>({
                path: `${endpoints.gymOrgMembers(gymOrgId)}${listQuery({ status, q })}`,
                method: 'GET',
                accessToken,
            });
            const parsed = membersEnvelopeSchema.parse(raw);
            return {
                members: parsed.members.map((item) => normalizeMember(item, gymOrgId)),
            };
        },

        async offboard({ accessToken, gymOrgId, membershipId }) {
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgMemberOffboard(gymOrgId, membershipId),
                method: 'POST',
                accessToken,
            });
            const parsed = membershipEnvelopeSchema.parse(raw);
            return {
                membership: normalizeMembership(parsed.membership, gymOrgId),
            };
        },

        async assignTrainer({ accessToken, gymOrgId, membershipId, trainerProfileId }) {
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgMemberAssignTrainer(gymOrgId, membershipId),
                method: 'POST',
                accessToken,
                body: { trainerProfileId },
            });
            const parsed = membershipEnvelopeSchema.parse(raw);
            return { membership: normalizeMembership(parsed.membership, gymOrgId) };
        },

        async setCheckInBlock({ accessToken, gymOrgId, membershipId, blocked }) {
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgMemberCheckInBlock(gymOrgId, membershipId),
                method: 'PATCH',
                accessToken,
                body: { blocked },
            });
            const parsed = membershipEnvelopeSchema.parse(raw);
            return {
                membership: normalizeMembership(parsed.membership, gymOrgId),
            };
        },
    };
}
