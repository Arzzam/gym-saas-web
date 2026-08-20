import { NextResponse } from 'next/server';

import { ApiClientError } from '@/lib/api/errors';
import { requireStaffGym } from '@/lib/auth/staff-gym-gate';
import { listGymTrainersForGym } from '@/modules/gym-orgs/gym-orgs-queries';
import { rosterErrorMessage } from '@/modules/roster/roster-errors';

/**
 * Client refetch endpoint for the trainer picker (ADR-0011).
 * Gate → shared query → JSON. The tenant comes from the session, never the
 * request, so this cannot be pointed at another gym's staff.
 */
export async function GET() {
    const gate = await requireStaffGym();
    if (!gate.ok) {
        return NextResponse.json(
            { error: { code: gate.code, message: rosterErrorMessage(gate.code) } },
            { status: gate.status },
        );
    }

    try {
        const trainers = await listGymTrainersForGym({
            accessToken: gate.session.accessToken,
            gymOrgId: gate.gymOrgId,
        });
        return NextResponse.json({ trainers });
    } catch (error) {
        if (error instanceof ApiClientError) {
            return NextResponse.json(
                { error: { code: error.code, message: rosterErrorMessage(error.code, error.message) } },
                { status: error.status === 0 ? 502 : error.status },
            );
        }
        return NextResponse.json(
            { error: { code: 'NETWORK_OR_UNKNOWN', message: rosterErrorMessage('NETWORK_OR_UNKNOWN') } },
            { status: 500 },
        );
    }
}
