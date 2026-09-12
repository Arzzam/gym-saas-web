import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const profileSchema = z.object({
    userId: z.string().min(1),
    heightCm: z.number().nullable(),
    weightKg: z.number().nullable(),
    dob: z.string().nullable(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable(),
    medicalNotes: z.string().nullable(),
    bmi: z.number().nullable(),
});

const progressLogsEnvelopeSchema = z.object({
    progressLogs: z.object({
        items: z.array(
            z.object({
                id: z.string().min(1),
                clientUserId: z.string().min(1),
                logDate: z.string().min(1),
                weightKg: z.number().nullable(),
                bmi: z.number().nullable(),
                notes: z.string().nullable(),
            }),
        ),
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
    }),
});

describe('Profile & Progress schemas (Postman 200 examples)', () => {
    it('parses Get My Profile body', () => {
        const parsed = z.object({ profile: profileSchema }).parse({
            profile: {
                userId: '22222222-2222-4222-8222-222222222222',
                heightCm: 170,
                weightKg: 68,
                dob: '1990-01-15',
                gender: 'MALE',
                medicalNotes: null,
                bmi: 23.5,
                createdAt: '2026-08-02T12:00:00.000Z',
                updatedAt: '2026-08-11T10:05:00.000Z',
            },
        });
        expect(parsed.profile.bmi).toBe(23.5);
    });

    it('parses staff profile with ungranted gender null', () => {
        const parsed = profileSchema.parse({
            userId: '22222222-2222-4222-8222-222222222222',
            heightCm: 170,
            weightKg: 68,
            dob: '1990-01-15',
            gender: null,
            medicalNotes: null,
            bmi: 23.5,
        });
        expect(parsed.gender).toBeNull();
    });

    it('parses progress logs page', () => {
        const parsed = progressLogsEnvelopeSchema.parse({
            progressLogs: {
                items: [
                    {
                        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                        clientUserId: '22222222-2222-4222-8222-222222222222',
                        logDate: '2026-08-11',
                        weightKg: 68,
                        bmi: 23.5,
                        notes: null,
                    },
                ],
                total: 1,
                limit: 20,
                offset: 0,
            },
        });
        expect(parsed.progressLogs.items[0]?.logDate).toBe('2026-08-11');
    });

    it('parses progress logs when weight arrives as a string (PG numeric)', () => {
        const itemSchema = z.object({
            weightKg: z.preprocess((value) => {
                if (value === null || value === undefined || value === '') {
                    return null;
                }
                if (typeof value === 'string' && value.trim() !== '') {
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? parsed : value;
                }
                return value;
            }, z.number().nullable()),
        });
        expect(itemSchema.parse({ weightKg: '68.50' }).weightKg).toBe(68.5);
    });

    it('parses progress logs page when notes key is omitted', () => {
        const logSchema = z.object({
            notes: z
                .string()
                .nullish()
                .transform((value) => value ?? null),
        });
        expect(logSchema.parse({}).notes).toBeNull();
    });
});
