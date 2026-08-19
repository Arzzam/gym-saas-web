import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ApiClientError } from '@/lib/api/errors';
import { requireStaffGym } from '@/lib/auth/staff-gym-gate';
import { DEFAULT_RENEWAL_WINDOW, renewalWindow } from '@/modules/subscriptions/subscriptions-desk';
import { subscriptionErrorMessage } from '@/modules/subscriptions/subscriptions-errors';
import { listRenewalsDeskForGym } from '@/modules/subscriptions/subscriptions-queries';

/** Client refetch endpoint for the renewals desk (ADR-0011). Gate → shared query → JSON. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The window is passed as explicit dates so the route stays a thin mirror of
 * the query key the client already built. A malformed pair falls back to the
 * default window rather than reaching the API — an arbitrary string here would
 * become an arbitrary string in the upstream query.
 */
function parseWindow(params: URLSearchParams): { onOrAfter: string; onOrBefore: string } {
    const onOrAfter = params.get('onOrAfter');
    const onOrBefore = params.get('onOrBefore');
    if (onOrAfter && onOrBefore && ISO_DATE.test(onOrAfter) && ISO_DATE.test(onOrBefore)) {
        return { onOrAfter, onOrBefore };
    }
    const fallback = renewalWindow(DEFAULT_RENEWAL_WINDOW);
    return { onOrAfter: fallback.onOrAfter, onOrBefore: fallback.onOrBefore };
}

export async function GET(request: NextRequest) {
    const gate = await requireStaffGym();
    if (!gate.ok) {
        return NextResponse.json(
            { error: { code: gate.code, message: subscriptionErrorMessage(gate.code) } },
            { status: gate.status },
        );
    }

    try {
        const data = await listRenewalsDeskForGym({
            accessToken: gate.session.accessToken,
            gymOrgId: gate.gymOrgId,
            ...parseWindow(request.nextUrl.searchParams),
        });
        return NextResponse.json(data);
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
