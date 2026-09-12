import { NextResponse } from 'next/server';

import { ApiClientError } from '@/lib/api/errors';
import { requireStaffGym } from '@/lib/auth/staff-gym-gate';
import { profileErrorMessage } from '@/modules/profile/profile-errors';
import { getStaffClientProfileForGym } from '@/modules/profile/profile-queries';

type RouteContext = { params: Promise<{ clientUserId: string }> };

export async function GET(_request: Request, context: RouteContext) {
    const gate = await requireStaffGym();
    if (!gate.ok) {
        return NextResponse.json(
            { error: { code: gate.code, message: profileErrorMessage(gate.code) } },
            { status: gate.status },
        );
    }

    const { clientUserId } = await context.params;
    if (!clientUserId.trim()) {
        return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: profileErrorMessage('VALIDATION_ERROR') } },
            { status: 422 },
        );
    }

    try {
        const result = await getStaffClientProfileForGym({
            accessToken: gate.session.accessToken,
            gymOrgId: gate.gymOrgId,
            clientUserId,
        });
        if (result.status === 'not_shared') {
            return NextResponse.json(
                { error: { code: 'USERS_FORBIDDEN', message: profileErrorMessage('USERS_FORBIDDEN') } },
                { status: 403 },
            );
        }
        return NextResponse.json({ profile: result.data });
    } catch (error) {
        if (error instanceof ApiClientError) {
            return NextResponse.json(
                { error: { code: error.code, message: profileErrorMessage(error.code, error.message) } },
                { status: error.status === 0 ? 502 : error.status },
            );
        }
        return NextResponse.json(
            { error: { code: 'NETWORK_OR_UNKNOWN', message: profileErrorMessage('NETWORK_OR_UNKNOWN') } },
            { status: 500 },
        );
    }
}
