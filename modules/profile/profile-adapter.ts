import { z } from 'zod';

import type { HttpClient } from '@/lib/api/client';
import { endpoints } from '@/modules/profile/profile-endpoints';
import type {
    ClientProfile,
    ProfileReader,
    ProfileWriter,
    ProgressLog,
    ProgressLogsPage,
} from '@/modules/profile/profile-ports';

/** API may send numeric fields as strings (PG numeric) — coerce at the boundary. */
const nullableNumber = z.preprocess((value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
}, z.number().nullable());

const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']).nullable();

const profileSchema = z.object({
    userId: z.string().min(1),
    heightCm: nullableNumber,
    weightKg: nullableNumber,
    dob: z.string().nullable(),
    gender: genderSchema,
    medicalNotes: z
        .string()
        .nullish()
        .transform((value) => value ?? null),
    bmi: nullableNumber,
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
});

const progressLogSchema = z.object({
    id: z.string().min(1),
    clientUserId: z.string().min(1),
    logDate: z.string().min(1),
    weightKg: nullableNumber,
    bmi: nullableNumber,
    // Omitted keys (vs explicit null) are common from the API.
    notes: z
        .string()
        .nullish()
        .transform((value) => value ?? null),
    createdAt: z
        .string()
        .nullish()
        .transform((value) => value ?? ''),
});

const profileEnvelopeSchema = z.object({
    profile: profileSchema,
});

/**
 * Postman: `{ progressLogs: { items, total, limit, offset } }`.
 * Also accept a bare array if the backend ever returns that shape.
 */
const progressLogsEnvelopeSchema = z.object({
    progressLogs: z.union([
        z.object({
            items: z.array(z.unknown()),
            total: z.coerce.number(),
            limit: z.coerce.number(),
            offset: z.coerce.number(),
        }),
        z.array(z.unknown()),
    ]),
});

/** Map snake_case / alternate keys onto the Postman camelCase contract. */
function normalizeProgressLogRecord(raw: unknown): unknown {
    if (!raw || typeof raw !== 'object') {
        return raw;
    }
    const row = raw as Record<string, unknown>;
    return {
        id: row.id,
        clientUserId: row.clientUserId ?? row.client_user_id,
        logDate: row.logDate ?? row.log_date,
        weightKg: row.weightKg ?? row.weight_kg,
        bmi: row.bmi,
        notes: row.notes,
        createdAt: row.createdAt ?? row.created_at,
    };
}

function pageQuery(input: { limit?: number; offset?: number }): string {
    const params = new URLSearchParams();
    if (input.limit !== undefined) {
        params.set('limit', String(input.limit));
    }
    if (input.offset !== undefined) {
        params.set('offset', String(input.offset));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

function toProfile(raw: z.infer<typeof profileSchema>): ClientProfile {
    return {
        userId: raw.userId,
        heightCm: raw.heightCm,
        weightKg: raw.weightKg,
        dob: raw.dob,
        gender: raw.gender,
        medicalNotes: raw.medicalNotes,
        bmi: raw.bmi,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
}

function toLog(raw: z.infer<typeof progressLogSchema>): ProgressLog {
    return {
        id: raw.id,
        clientUserId: raw.clientUserId,
        logDate: raw.logDate,
        weightKg: raw.weightKg,
        bmi: raw.bmi,
        notes: raw.notes,
        createdAt: raw.createdAt,
    };
}

function parseProgressLogsPage(raw: unknown): ProgressLogsPage {
    const envelope = progressLogsEnvelopeSchema.parse(raw).progressLogs;
    const itemsRaw = Array.isArray(envelope) ? envelope : envelope.items;
    const items = itemsRaw.map((item) => toLog(progressLogSchema.parse(normalizeProgressLogRecord(item))));
    if (Array.isArray(envelope)) {
        return {
            items,
            total: items.length,
            limit: items.length,
            offset: 0,
        };
    }
    return {
        items,
        total: envelope.total,
        limit: envelope.limit,
        offset: envelope.offset,
    };
}

export function createProfileAdapter(http: HttpClient): ProfileReader & ProfileWriter {
    return {
        async getMyProfile({ accessToken }) {
            const raw = await http.request<unknown>({
                path: endpoints.meProfile,
                method: 'GET',
                accessToken,
            });
            return { profile: toProfile(profileEnvelopeSchema.parse(raw).profile) };
        },

        async updateMyProfile({ accessToken, body }) {
            const raw = await http.request<unknown>({
                path: endpoints.meProfile,
                method: 'PATCH',
                accessToken,
                body,
            });
            return { profile: toProfile(profileEnvelopeSchema.parse(raw).profile) };
        },

        async listMyProgressLogs({ accessToken, limit, offset }) {
            const raw = await http.request<unknown>({
                path: `${endpoints.meProgressLogs}${pageQuery({ limit, offset })}`,
                method: 'GET',
                accessToken,
            });
            return { progressLogs: parseProgressLogsPage(raw) };
        },

        async upsertMyProgressLog({ accessToken, body }) {
            const raw = await http.request<unknown>({
                path: endpoints.meProgressLogs,
                method: 'PUT',
                accessToken,
                body,
            });
            const envelope = z.object({ progressLog: z.unknown() }).parse(raw);
            return {
                progressLog: toLog(progressLogSchema.parse(normalizeProgressLogRecord(envelope.progressLog))),
            };
        },

        async getStaffClientProfile({ accessToken, gymOrgId, clientUserId }) {
            const raw = await http.request<unknown>({
                path: endpoints.gymOrgClientProfile(gymOrgId, clientUserId),
                method: 'GET',
                accessToken,
            });
            return { profile: toProfile(profileEnvelopeSchema.parse(raw).profile) };
        },

        async listStaffClientProgressLogs({ accessToken, gymOrgId, clientUserId, limit, offset }) {
            const raw = await http.request<unknown>({
                path: `${endpoints.gymOrgClientProgressLogs(gymOrgId, clientUserId)}${pageQuery({ limit, offset })}`,
                method: 'GET',
                accessToken,
            });
            const page = parseProgressLogsPage(raw);
            return { progressLogs: page };
        },
    };
}
