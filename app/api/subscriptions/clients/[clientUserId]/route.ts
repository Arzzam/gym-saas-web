import { NextResponse } from 'next/server';

import { ApiClientError } from '@/lib/api/errors';
import { requireStaffGym } from '@/lib/auth/staff-gym-gate';
import { subscriptionErrorMessage } from '@/modules/subscriptions/subscriptions-errors';
import { listClientSubscriptionsForGym } from '@/modules/subscriptions/subscriptions-queries';

/**
 * One client's subscription lines, for the renewals detail rail (ADR-0011).
 * Gate → shared query → JSON, same as every other refetch endpoint.
 *
 * `clientUserId` comes off the URL, but the gym does not: `requireStaffGym`
 * resolves the tenant from the session, so this cannot be pointed at another
 * gym's client by editing the path (`000-project-context.mdc` — no cross-tenant
 * read, and never a `gym_org_id` sent from the client).
 */
export async function GET(_request: Request, context: RouteContext<'/api/subscriptions/clients/[clientUserId]'>) {
    const gate = await requireStaffGym();
    if (!gate.ok) {
        return NextResponse.json(
            { error: { code: gate.code, message: subscriptionErrorMessage(gate.code) } },
            { status: gate.status },
        );
    }

    const { clientUserId } = await context.params;
    if (!clientUserId) {
        return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: subscriptionErrorMessage('VALIDATION_ERROR') } },
            { status: 400 },
        );
    }

    try {
        const subscriptions = await listClientSubscriptionsForGym({
            accessToken: gate.session.accessToken,
            gymOrgId: gate.gymOrgId,
            clientUserId,
        });
        return NextResponse.json({ subscriptions });
    } catch (error) {
        if (error instanceof ApiClientError) {
            return NextResponse.json(
                { error: { code: error.code, message: subscriptionErrorMessage(error.code, error.message) } },
                { status: error.status === 0 ? 502 : error.status },
            );
        }
        return NextResponse.json(
            { error: { code: 'NETWORK_OR_UNKNOWN', message: subscriptionErrorMessage('NETWORK_OR_UNKNOWN') } },
            { status: 500 },
        );
    }
}
