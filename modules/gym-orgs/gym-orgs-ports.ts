/** GymOrgWriter / reader ports for M2. */
export type GymOrgSummary = {
    id: string;
    name: string;
    timezone: string;
    isOwner: boolean;
};

export type CreateGymOrgInput = {
    name: string;
    address?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    logoUrl?: string | null;
    timezone?: string;
};

export type GymOrgDetail = GymOrgSummary & {
    ownerUserId?: string;
    createdAt?: string;
    updatedAt?: string;
};

/**
 * A staff member who can coach at this gym — Postman `List Gym Trainers`.
 *
 * `trainerProfileId` is the id the roster's `assignedTrainerId` holds and the
 * one `Assign Trainer` expects; `userId` is the person's account. They are
 * different ids for the same human, so mixing them up silently assigns nobody.
 */
export type GymTrainer = {
    trainerProfileId: string;
    userId: string;
    gymOrgId: string;
    name: string;
    email: string;
    staffCode: string | null;
    bio: string | null;
    isAdmin: boolean;
    createdAt: string | null;
};

export type GymTrainersPage = {
    items: GymTrainer[];
    total: number;
    limit: number;
    offset: number;
};

export type GymOrgsReader = {
    list: (input: { accessToken: string }) => Promise<{ gymOrgs: GymOrgSummary[] }>;
    listTrainers: (input: {
        accessToken: string;
        gymOrgId: string;
        limit?: number;
        offset?: number;
    }) => Promise<{ trainers: GymTrainersPage }>;
};

export type GymOrgsWriter = {
    create: (input: { accessToken: string; body: CreateGymOrgInput }) => Promise<{ gymOrg: GymOrgDetail }>;
};
