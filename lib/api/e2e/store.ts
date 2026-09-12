/**
 * Shared state + constants for the Playwright fixture adapters
 * (`GYM_SAAS_E2E_FIXTURES=1`). Per-module fakes live in
 * `modules/<m>/<m>-e2e-fixtures.ts` and read/write the containers here.
 *
 * This state is genuinely cross-module — accepting a membership invite creates
 * a roster member, a subscription and a DataGrant — which is why it stays in
 * one kernel rather than being cut up per module (ADR-0007 called this out;
 * ADR-0011 forced the `globalThis` backing, see below).
 */
import type { Attendance } from '@/modules/attendance/attendance-ports';
import type { GymTrainer } from '@/modules/gym-orgs/gym-orgs-ports';
import type { Lead } from '@/modules/leads/leads-ports';
import type { MembershipInvite, MyDataGrants } from '@/modules/membership-invites/membership-invites-ports';
import type { MembershipPlan } from '@/modules/plans/plans-ports';
import type { ClientProfile, ProgressLog } from '@/modules/profile/profile-ports';
import type { RosterMember } from '@/modules/roster/roster-ports';
import type { StaffInvite } from '@/modules/staff-invites/staff-invites-ports';
import type { RenewalDueItem } from '@/modules/subscriptions/subscriptions-ports';

export const E2E_FIXTURES_ENV = 'GYM_SAAS_E2E_FIXTURES';

export const E2E_STAFF_TOKEN_WITH_GYM = 'e2e-access-token';
export const E2E_STAFF_TOKEN_NO_GYM = 'e2e-access-token-no-gym';
export const E2E_CLIENT_TOKEN = 'e2e-client-access';

export const E2E_GYM_ID = 'gym-e2e-1';
export const E2E_PENDING_INBOX_ID = 'invite-e2e-inbox-1';
export const E2E_TRAINER_PROFILE_ID = 'trainer-profile-e2e-1';

/**
 * Process-wide store for the mutable fixture state below.
 *
 * Next bundles route handlers (`app/api/**`) separately from page and Server
 * Action code, so this module is instantiated **more than once per server**.
 * With plain `const` module state, a write through a Server Action landed in
 * one copy while a read through a route handler saw another — the fixture
 * equivalent of two databases. Keying off `globalThis` gives every bundle the
 * same objects, because the process is what's actually shared.
 *
 * Only fixtures need this: in production `createAppServices()` holds no state,
 * it just talks HTTP to the Gym Backend.
 */
const e2eGlobal = globalThis as typeof globalThis & {
    __gymSaasE2eStore?: Map<string, unknown>;
};

export function e2eShared<T>(key: string, create: () => T): T {
    const store = (e2eGlobal.__gymSaasE2eStore ??= new Map<string, unknown>());
    if (!store.has(key)) {
        store.set(key, create());
    }
    return store.get(key) as T;
}

/**
 * Monotonic id source for fixture `create` calls.
 *
 * Ids used to be derived from the array length (`plan-e2e-${e2ePlans.length + 1}`).
 * Playwright's workers share these arrays, so a create that followed another
 * worker's delete handed out an id that was already live. Every later
 * `findIndex((item) => item.id === id)` — update, softDelete — then resolved to
 * whichever duplicate came first: one spec's delete removed another spec's row,
 * and the row the spec was actually asserting on never went away. Serial runs
 * hid it, because an id is only reused there once its holder is gone.
 *
 * A counter that only ever goes up cannot collide, however the arrays are
 * mutated. Prefixes end in `-new` so a generated id can never equal a seeded
 * one (`plan-e2e-base`, `lead-e2e-1`, ...).
 */
export function e2eNextId(prefix: string): string {
    const counters = e2eShared('idCounters', () => new Map<string, number>());
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}-${next}`;
}

/** Tokens that gained a gym via Accept Staff Invite in this process. */
export const e2eAffiliatedTokens = e2eShared('affiliatedTokens', () => new Set<string>());
/** Tokens that became gym owners via Create GymOrg in this process. */
export const e2eOwnerTokens = e2eShared('ownerTokens', () => new Set<string>());

export function areE2eFixturesEnabled(): boolean {
    return process.env[E2E_FIXTURES_ENV] === '1';
}

export function sampleInvite(overrides: Partial<StaffInvite> = {}): StaffInvite {
    return {
        id: 'invite-e2e-1',
        gymOrgId: E2E_GYM_ID,
        invitedUserId: 'e2e-invitee-1',
        targetRole: 'TRAINER',
        status: 'PENDING',
        expiresAt: '2026-08-20T00:00:00.000Z',
        createdBy: 'e2e-user-1',
        acceptedAt: null,
        createdAt: '2026-08-06T00:00:00.000Z',
        updatedAt: '2026-08-06T00:00:00.000Z',
        ...overrides,
    };
}

/**
 * In-memory fixtures, created once per server process.
 *
 * Playwright's workers are **not** isolated from each other here: they are
 * browser contexts sharing one `next start`, so every worker reads and writes
 * these same arrays. A spec that mutates a row therefore has to own that row —
 * two tests racing for one record is a flake, not a bug in the app. Give each
 * mutating test its own fixture, and keep shared assertions on fields no
 * mutation touches (a price, a row count, a name).
 */
export const e2eGymInvites = e2eShared('gymInvites', (): StaffInvite[] => [
    sampleInvite({ id: 'invite-e2e-gym-pending' }),
]);

export const e2ePlans = e2eShared('plans', (): MembershipPlan[] => [
    {
        id: 'plan-e2e-base',
        gymOrgId: E2E_GYM_ID,
        name: 'Monthly',
        kind: 'BASE',
        capability: null,
        durationDays: 30,
        price: 999,
        active: true,
        createdAt: '2026-08-08T00:00:00.000Z',
        updatedAt: '2026-08-08T00:00:00.000Z',
    },
    {
        id: 'plan-e2e-addon',
        gymOrgId: E2E_GYM_ID,
        name: 'PT Coaching',
        kind: 'ADDON',
        capability: 'TRAINER_COACHING',
        durationDays: 30,
        price: 1500,
        active: true,
        createdAt: '2026-08-08T00:00:00.000Z',
        updatedAt: '2026-08-08T00:00:00.000Z',
    },
]);

export const e2eLeads = e2eShared('leads', (): Lead[] => [
    {
        id: 'lead-e2e-1',
        gymOrgId: E2E_GYM_ID,
        name: 'Walk-in Prospect',
        phone: '9876543210',
        source: 'walk-in',
        interest: 'trial',
        notes: null,
        status: 'NEW',
        followUpDate: '2026-08-10',
        createdBy: 'e2e-user-1',
        convertedMembershipInviteId: null,
        createdAt: '2026-08-08T00:00:00.000Z',
        updatedAt: '2026-08-08T00:00:00.000Z',
    },
]);

export const e2eMembershipInvites = e2eShared('membershipInvites', (): MembershipInvite[] => [
    {
        id: 'minvite-e2e-1',
        gymOrgId: E2E_GYM_ID,
        invitedEmail: 'alex.client@example.com',
        invitedUserId: 'e2e-client-1',
        inviteeName: 'Alex Client',
        inviteePhone: '+15551234567',
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
    },
]);

export const e2eRosterMembers = e2eShared('rosterMembers', (): RosterMember[] => [
    {
        membershipId: 'membership-e2e-active',
        clientUserId: 'e2e-client-roster-1',
        gymOrgId: E2E_GYM_ID,
        status: 'ACTIVE',
        checkInBlocked: false,
        assignedTrainerId: null,
        clientName: 'Ada Client',
        clientEmail: 'ada@example.com',
        clientPhone: '+919876500001',
        joinedAt: '2026-08-08T12:00:00.000Z',
        leftAt: null,
        basePaymentStatus: 'unpaid',
        baseAmountPaid: 0,
        basePriceAmount: 999,
    },
    {
        membershipId: 'membership-e2e-active-2',
        clientUserId: 'e2e-client-roster-2',
        gymOrgId: E2E_GYM_ID,
        status: 'ACTIVE',
        checkInBlocked: false,
        assignedTrainerId: null,
        clientName: 'Rahul Menon',
        clientEmail: 'rahul@example.com',
        clientPhone: '+919876500002',
        joinedAt: '2026-08-06T12:00:00.000Z',
        leftAt: null,
        basePaymentStatus: 'partial',
        baseAmountPaid: 500,
        basePriceAmount: 1499,
    },
    {
        // No phone: the desk must degrade to email-only contact, not render a dead tel: link.
        membershipId: 'membership-e2e-active-3',
        clientUserId: 'e2e-client-roster-3',
        gymOrgId: E2E_GYM_ID,
        status: 'ACTIVE',
        checkInBlocked: false,
        assignedTrainerId: null,
        clientName: 'Priya Sharma',
        clientEmail: 'priya@example.com',
        clientPhone: null,
        joinedAt: '2026-08-04T12:00:00.000Z',
        leftAt: null,
        basePaymentStatus: 'paid',
        baseAmountPaid: 799,
        basePriceAmount: 799,
    },
    // Owned by the "mark paid" spec — nothing else may mutate this member.
    {
        membershipId: 'membership-e2e-active-4',
        clientUserId: 'e2e-client-roster-4',
        gymOrgId: E2E_GYM_ID,
        status: 'ACTIVE',
        checkInBlocked: false,
        assignedTrainerId: null,
        clientName: 'Vikram Rao',
        clientEmail: 'vikram@example.com',
        clientPhone: '+919876500004',
        joinedAt: '2026-08-05T12:00:00.000Z',
        leftAt: null,
        basePaymentStatus: 'unpaid',
        baseAmountPaid: 0,
        basePriceAmount: 1200,
    },
    // Owned by the offboard spec. Has no renewal line, so removing them from
    // the roster cannot move the renewals desk's money totals.
    {
        membershipId: 'membership-e2e-active-6',
        clientUserId: 'e2e-client-roster-6',
        gymOrgId: E2E_GYM_ID,
        status: 'ACTIVE',
        checkInBlocked: false,
        assignedTrainerId: null,
        clientName: 'Deepa Rao',
        clientEmail: 'deepa@example.com',
        clientPhone: '+919876500006',
        joinedAt: '2026-08-03T12:00:00.000Z',
        leftAt: null,
        basePaymentStatus: 'paid',
        baseAmountPaid: 999,
        basePriceAmount: 999,
    },
    // Owned by the "part payment" spec — nothing else may mutate this member.
    {
        membershipId: 'membership-e2e-active-5',
        clientUserId: 'e2e-client-roster-5',
        gymOrgId: E2E_GYM_ID,
        status: 'ACTIVE',
        checkInBlocked: false,
        assignedTrainerId: null,
        clientName: 'Neha Iyer',
        clientEmail: 'neha@example.com',
        clientPhone: '+919876500005',
        joinedAt: '2026-08-05T12:00:00.000Z',
        leftAt: null,
        basePaymentStatus: 'unpaid',
        baseAmountPaid: 0,
        basePriceAmount: 2000,
    },
]);

/**
 * Gym staff who can coach. `trainerProfileId` is what a membership's
 * `assignedTrainerId` holds — deliberately different from `userId`, as in the
 * real contract, so a spec that confuses the two fails here rather than in prod.
 *
 * `[0]` doubles as the E2E TRAINER-role actor's own profile (`listMyAssignedMembers`
 * scopes to whichever trainer is "self"), so keep an entry at that index.
 */
export const e2eGymTrainers = e2eShared('gymTrainers', (): GymTrainer[] => [
    {
        trainerProfileId: E2E_TRAINER_PROFILE_ID,
        userId: 'e2e-user-trainer-1',
        gymOrgId: E2E_GYM_ID,
        name: 'Karan Coach',
        email: 'karan@example.com',
        staffCode: 'STAFF-K1',
        bio: 'Strength',
        isAdmin: false,
        createdAt: '2026-08-08T12:00:00.000Z',
    },
    {
        trainerProfileId: 'trainer-profile-e2e-2',
        userId: 'e2e-user-trainer-2',
        gymOrgId: E2E_GYM_ID,
        name: 'Meera Coach',
        email: 'meera@example.com',
        staffCode: 'STAFF-M2',
        bio: null,
        isAdmin: false,
        createdAt: '2026-08-09T12:00:00.000Z',
    },
    {
        trainerProfileId: 'trainer-profile-e2e-3',
        userId: 'e2e-user-1',
        gymOrgId: E2E_GYM_ID,
        name: 'Owner Admin',
        email: 'owner@example.com',
        staffCode: 'STAFF-AB12',
        bio: null,
        isAdmin: true,
        createdAt: '2026-08-08T12:00:00.000Z',
    },
]);

export const e2eClientProfiles = e2eShared('clientProfiles', () => {
    const profiles = new Map<string, ClientProfile>();
    profiles.set('e2e-client-1', {
        userId: 'e2e-client-1',
        heightCm: 170,
        weightKg: 68,
        dob: '1990-01-15',
        gender: 'MALE',
        medicalNotes: null,
        bmi: 23.5,
        createdAt: '2026-08-02T12:00:00.000Z',
        updatedAt: '2026-08-11T10:05:00.000Z',
    });
    profiles.set('e2e-client-roster-1', {
        userId: 'e2e-client-roster-1',
        heightCm: 165,
        weightKg: 60,
        dob: '1992-04-20',
        gender: 'FEMALE',
        medicalNotes: 'Old ankle sprain',
        bmi: 22,
        createdAt: '2026-08-08T12:00:00.000Z',
        updatedAt: '2026-08-11T10:05:00.000Z',
    });
    return profiles;
});

export const e2eProgressLogs = e2eShared('progressLogs', (): ProgressLog[] => [
    {
        id: 'progress-e2e-ada-1',
        clientUserId: 'e2e-client-roster-1',
        logDate: '2026-08-11',
        weightKg: 60,
        bmi: 22,
        notes: null,
        createdAt: '2026-08-11T10:05:00.000Z',
    },
]);

/** Staff-visible grants per gym+client. Ada shares required vitals only — not PROGRESS. */
export const e2eStaffClientGrants = e2eShared(
    'staffClientGrants',
    () =>
        new Map<string, { profileAttributes: string[]; classGrants: string[] }>([
            [`${E2E_GYM_ID}:e2e-client-roster-1`, { profileAttributes: ['DOB', 'HEIGHT', 'WEIGHT'], classGrants: [] }],
        ]),
);

export const e2eAttendances = e2eShared('attendances', (): Attendance[] => []);
export const e2eDataGrantsByGym = e2eShared('dataGrantsByGym', () => new Map<string, MyDataGrants>());

export function isoDateOffset(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

export const e2eRenewals = e2eShared('renewals', (): RenewalDueItem[] => [
    {
        id: 'sub-e2e-renewal-1',
        clientMembershipId: 'membership-e2e-active',
        gymOrgId: E2E_GYM_ID,
        planId: 'plan-e2e-base',
        kind: 'BASE',
        capability: null,
        priceAmount: 999,
        durationDays: 30,
        startDate: isoDateOffset(-28),
        endDate: isoDateOffset(1),
        startSource: 'FIRST_ATTENDANCE',
        paymentStatus: 'unpaid',
        amountPaid: 0,
        createdAt: '2026-08-08T12:00:00.000Z',
        updatedAt: '2026-08-11T10:00:00.000Z',
        clientUserId: 'e2e-client-roster-1',
    },
    // One line per payment status, all inside the default "next 7 days" window,
    // so the desk's payment filters and money strip have something to separate.
    {
        id: 'sub-e2e-renewal-2',
        clientMembershipId: 'membership-e2e-active-2',
        gymOrgId: E2E_GYM_ID,
        planId: 'plan-e2e-base',
        kind: 'BASE',
        capability: null,
        priceAmount: 1499,
        durationDays: 30,
        startDate: isoDateOffset(-25),
        endDate: isoDateOffset(5),
        startSource: 'FIRST_ATTENDANCE',
        paymentStatus: 'partial',
        amountPaid: 500,
        createdAt: '2026-08-06T12:00:00.000Z',
        updatedAt: '2026-08-11T10:00:00.000Z',
        clientUserId: 'e2e-client-roster-2',
    },
    {
        id: 'sub-e2e-renewal-3',
        clientMembershipId: 'membership-e2e-active-3',
        gymOrgId: E2E_GYM_ID,
        planId: 'plan-e2e-addon',
        kind: 'ADDON',
        capability: 'TRAINER_COACHING',
        priceAmount: 799,
        durationDays: 30,
        startDate: isoDateOffset(-24),
        endDate: isoDateOffset(6),
        startSource: 'FIRST_ATTENDANCE',
        paymentStatus: 'paid',
        amountPaid: 799,
        createdAt: '2026-08-04T12:00:00.000Z',
        updatedAt: '2026-08-11T10:00:00.000Z',
        clientUserId: 'e2e-client-roster-3',
    },
    // The two rows below are each owned by one mutating spec. Prices stay fixed
    // whatever those specs do to `paymentStatus`, which is why the money strip
    // asserts on "Billed" and not on "Collected".
    {
        id: 'sub-e2e-renewal-4',
        clientMembershipId: 'membership-e2e-active-4',
        gymOrgId: E2E_GYM_ID,
        planId: 'plan-e2e-base',
        kind: 'BASE',
        capability: null,
        priceAmount: 1200,
        durationDays: 30,
        startDate: isoDateOffset(-27),
        endDate: isoDateOffset(3),
        startSource: 'FIRST_ATTENDANCE',
        paymentStatus: 'unpaid',
        amountPaid: 0,
        createdAt: '2026-08-05T12:00:00.000Z',
        updatedAt: '2026-08-11T10:00:00.000Z',
        clientUserId: 'e2e-client-roster-4',
    },
    {
        id: 'sub-e2e-renewal-5',
        clientMembershipId: 'membership-e2e-active-5',
        gymOrgId: E2E_GYM_ID,
        planId: 'plan-e2e-base',
        kind: 'BASE',
        capability: null,
        priceAmount: 2000,
        durationDays: 30,
        startDate: isoDateOffset(-26),
        endDate: isoDateOffset(4),
        startSource: 'FIRST_ATTENDANCE',
        paymentStatus: 'unpaid',
        amountPaid: 0,
        createdAt: '2026-08-05T12:00:00.000Z',
        updatedAt: '2026-08-11T10:00:00.000Z',
        clientUserId: 'e2e-client-roster-5',
    },
]);

/** Accepting a membership invite fans out across roster, subscriptions and DataGrants. */
export function seedMembershipSideEffects(input: {
    membershipId: string;
    gymOrgId: string;
    invite: MembershipInvite;
    profileAttributes: string[];
    classGrants: string[];
}) {
    e2eDataGrantsByGym.set(input.gymOrgId, {
        gymOrgId: input.gymOrgId,
        clientUserId: 'e2e-client-1',
        profileAttributes: input.profileAttributes,
        classGrants: input.classGrants,
    });
    e2eStaffClientGrants.set(`${input.gymOrgId}:e2e-client-1`, {
        profileAttributes: input.profileAttributes,
        classGrants: input.classGrants,
    });

    const existingIdx = e2eRosterMembers.findIndex((item) => item.membershipId === input.membershipId);
    const member: RosterMember = {
        membershipId: input.membershipId,
        clientUserId: 'e2e-client-1',
        gymOrgId: input.gymOrgId,
        status: 'ACTIVE',
        checkInBlocked: false,
        assignedTrainerId: null,
        clientName: input.invite.inviteeName,
        clientEmail: input.invite.invitedEmail,
        clientPhone: input.invite.inviteePhone,
        joinedAt: '2026-08-08T12:05:00.000Z',
        leftAt: null,
        basePaymentStatus: input.invite.basePaymentStatus,
        baseAmountPaid: 0,
        basePriceAmount: 999,
    };
    if (existingIdx >= 0) {
        e2eRosterMembers[existingIdx] = member;
    } else {
        e2eRosterMembers.unshift(member);
    }
}
