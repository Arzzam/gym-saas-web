/**
 * Playwright fixture adapter for the attendance module (`GYM_SAAS_E2E_FIXTURES=1`).
 * Shared state lives in `lib/api/e2e/store.ts`; bound in `attendance-services.ts`.
 */
import { ApiClientError } from '@/lib/api/errors';
import type { Attendance, AttendanceReader, AttendanceWriter } from '@/modules/attendance/attendance-ports';
import { E2E_GYM_ID, e2eAttendances, e2eRosterMembers, e2eNextId } from '@/lib/api/e2e/store';

export function createE2eAttendanceAdapter(): AttendanceReader & AttendanceWriter {
    return {
        async listForDay({ gymOrgId, day, limit = 50, offset = 0 }) {
            if (gymOrgId !== E2E_GYM_ID) {
                return {
                    attendances: { items: [], total: 0, limit, offset },
                };
            }
            const items = e2eAttendances.filter(
                (item) => item.gymOrgId === gymOrgId && item.occurredAt.startsWith(day),
            );
            return {
                attendances: {
                    items: items.slice(offset, offset + limit),
                    total: items.length,
                    limit,
                    offset,
                },
            };
        },

        async deskMark({ gymOrgId, clientUserId }) {
            const member = e2eRosterMembers.find(
                (item) => item.gymOrgId === gymOrgId && item.clientUserId === clientUserId && item.status === 'ACTIVE',
            );
            if (!member) {
                throw new ApiClientError({
                    code: 'NOT_FOUND',
                    message: 'Active membership not found',
                    status: 404,
                });
            }
            if (member.checkInBlocked) {
                throw new ApiClientError({
                    code: 'ATTENDANCE_FORBIDDEN',
                    message: 'Check-in is blocked for this member',
                    status: 403,
                });
            }
            const day = new Date().toISOString().slice(0, 10);
            const attendance: Attendance = {
                id: e2eNextId('attendance-e2e-new'),
                clientUserId,
                gymOrgId,
                occurredAt: `${day}T10:00:00.000Z`,
                recordedBy: 'ADMIN',
                recorderUserId: 'e2e-user-1',
                createdAt: `${day}T10:00:00.000Z`,
                baseStarted: false,
            };
            e2eAttendances.unshift(attendance);
            return { attendance };
        },
    };
}
