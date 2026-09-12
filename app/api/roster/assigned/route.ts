import { NextResponse } from 'next/server';

import { ApiClientError } from '@/lib/api/errors';
import { requireStaffGym } from '@/lib/auth/staff-gym-gate';
import { rosterErrorMessage } from '@/modules/roster/roster-errors';
import { listMyAssignedMembersForGym } from '@/modules/roster/roster-queries';

/** Client refetch for trainer assigned roster (ADR-0011). */
export async function GET() {
    const gate = await requireStaffGym();
    if (!gate.ok) {
        return NextResponse.json(
            { error: { code: gate.code, message: rosterErrorMessage(gate.code) } },
            { status: gate.status },
        );
    }

    try {
        const members = await listMyAssignedMembersForGym({
            accessToken: gate.session.accessToken,
            gymOrgId: gate.gymOrgId,
        });
        return NextResponse.json({ members });
    } catch (error) {
        if (error instanceof ApiClientError) {
            return NextResponse.json(
                { error: { code: error.code, message: rosterErrorMessage(error.code) } },
                { status: error.status === 0 ? 502 : error.status },
            );
        }
        return NextResponse.json(
            { error: { code: 'NETWORK_OR_UNKNOWN', message: rosterErrorMessage('NETWORK_OR_UNKNOWN') } },
            { status: 500 },
        );
    }
}
