/**
 * Gym roster — Postman Roster folder.
 * Authz: Auth + STAFF session + gym tenant; API enforces ADMIN.
 * No DataGrant — membership / check-in block are gym-owned.
 */

export type MembershipStatus = 'ACTIVE' | 'INACTIVE';

export type RosterMember = {
    membershipId: string;
    clientUserId: string;
    gymOrgId: string;
    status: MembershipStatus;
    checkInBlocked: boolean;
    assignedTrainerId: string | null;
    clientName: string;
    clientEmail: string;
    clientPhone: string | null;
    joinedAt: string;
    leftAt: string | null;
    basePaymentStatus: 'paid' | 'unpaid' | 'partial' | null;
    baseAmountPaid: number | null;
    basePriceAmount: number | null;
};

/** Mutation responses (offboard / check-in-block) omit client display fields. */
export type MembershipMutation = {
    membershipId: string;
    clientUserId: string;
    gymOrgId: string;
    status: MembershipStatus;
    checkInBlocked: boolean;
    assignedTrainerId: string | null;
    joinedAt: string;
    leftAt: string | null;
    updatedAt: string;
};

export type RosterReader = {
    listMembers: (input: {
        accessToken: string;
        gymOrgId: string;
        status?: MembershipStatus;
        q?: string;
    }) => Promise<{ members: RosterMember[] }>;
};

export type RosterWriter = {
    offboard: (input: {
        accessToken: string;
        gymOrgId: string;
        membershipId: string;
    }) => Promise<{ membership: MembershipMutation }>;

    /**
     * Assign or change the member's coach. `trainerProfileId` is the trainer's
     * profile id (`GymTrainer.trainerProfileId`), which is what
     * `assignedTrainerId` holds — not their `userId`.
     *
     * The API rejects this with `COACHING_ADDON_REQUIRED` unless the member
     * holds an in-date TRAINER_COACHING add-on. There is deliberately no
     * unassign: the contract has no such request.
     */
    assignTrainer: (input: {
        accessToken: string;
        gymOrgId: string;
        membershipId: string;
        trainerProfileId: string;
    }) => Promise<{ membership: MembershipMutation }>;

    setCheckInBlock: (input: {
        accessToken: string;
        gymOrgId: string;
        membershipId: string;
        blocked: boolean;
    }) => Promise<{ membership: MembershipMutation }>;
};
