/**
 * Profile & Progress — Postman folder.
 * Client owns the data. Staff read is grant-filtered by the API.
 */

export type ProfileGender = 'MALE' | 'FEMALE' | 'OTHER';

export type ClientProfile = {
    userId: string;
    heightCm: number | null;
    weightKg: number | null;
    dob: string | null;
    gender: ProfileGender | null;
    medicalNotes: string | null;
    bmi: number | null;
    createdAt: string;
    updatedAt: string;
};

export type UpdateMyProfileInput = {
    heightCm: number | null;
    weightKg: number | null;
    dob: string | null;
    gender: ProfileGender | null;
    medicalNotes: string | null;
};

export type ProgressLog = {
    id: string;
    clientUserId: string;
    logDate: string;
    weightKg: number | null;
    bmi: number | null;
    notes: string | null;
    createdAt: string;
};

export type ProgressLogsPage = {
    items: ProgressLog[];
    total: number;
    limit: number;
    offset: number;
};

export type UpsertProgressLogInput = {
    logDate: string;
    weightKg: number | null;
    notes: string | null;
};

export type ProfileReader = {
    getMyProfile: (input: { accessToken: string }) => Promise<{ profile: ClientProfile }>;
    listMyProgressLogs: (input: {
        accessToken: string;
        limit?: number;
        offset?: number;
    }) => Promise<{ progressLogs: ProgressLogsPage }>;
    getStaffClientProfile: (input: {
        accessToken: string;
        gymOrgId: string;
        clientUserId: string;
    }) => Promise<{ profile: ClientProfile }>;
    listStaffClientProgressLogs: (input: {
        accessToken: string;
        gymOrgId: string;
        clientUserId: string;
        limit?: number;
        offset?: number;
    }) => Promise<{ progressLogs: ProgressLogsPage }>;
};

export type ProfileWriter = {
    updateMyProfile: (input: {
        accessToken: string;
        body: UpdateMyProfileInput;
    }) => Promise<{ profile: ClientProfile }>;
    upsertMyProgressLog: (input: {
        accessToken: string;
        body: UpsertProgressLogInput;
    }) => Promise<{ progressLog: ProgressLog }>;
};
