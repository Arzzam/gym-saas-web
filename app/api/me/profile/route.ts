import { NextResponse } from 'next/server';

import { ApiClientError } from '@/lib/api/errors';
import { requireClientSession } from '@/lib/auth/client-gate';
import { profileErrorMessage } from '@/modules/profile/profile-errors';
import { getMyProfileForSession } from '@/modules/profile/profile-queries';

export async function GET() {
    const gate = await requireClientSession();
    if (!gate.ok) {
        return NextResponse.json(
            { error: { code: gate.code, message: profileErrorMessage(gate.code) } },
            { status: gate.status },
        );
    }

    try {
        const profile = await getMyProfileForSession({ accessToken: gate.session.accessToken });
        return NextResponse.json({ profile });
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
