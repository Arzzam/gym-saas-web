import { createAppServices } from '@/lib/api/composition';
import type { Lead, LeadStatus } from '@/modules/leads/leads-ports';
import type { MembershipPlan } from '@/modules/plans/plans-ports';

export type LeadsPageData = {
    leads: Lead[];
    dueFollowUps: Lead[];
    basePlans: MembershipPlan[];
    addonPlans: MembershipPlan[];
};

/**
 * Server-side read for the CRM pipeline (ADR-0011). Consumed by both the RSC
 * prefetch in `crm/page.tsx` and `app/api/leads/route.ts`, so the two can't
 * drift.
 *
 * Plans ride along the same way they do on the members page: the convert
 * dialog needs them to populate its selects, and to know upfront whether it
 * has any to offer — same reason `MemberInviteDialog` disables its trigger on
 * zero base plans.
 */
export async function listLeadsPageForGym(input: {
    accessToken: string;
    gymOrgId: string;
    statusFilter: LeadStatus | 'ALL';
}): Promise<LeadsPageData> {
    const { listLeads, listDueFollowUps, listPlans } = createAppServices();
    const [listResult, dueResult, basePage, addonPage] = await Promise.all([
        listLeads({
            accessToken: input.accessToken,
            gymOrgId: input.gymOrgId,
            status: input.statusFilter === 'ALL' ? undefined : input.statusFilter,
        }),
        listDueFollowUps({ accessToken: input.accessToken, gymOrgId: input.gymOrgId }),
        listPlans({ accessToken: input.accessToken, gymOrgId: input.gymOrgId, kind: 'BASE', active: true }),
        listPlans({ accessToken: input.accessToken, gymOrgId: input.gymOrgId, kind: 'ADDON', active: true }),
    ]);

    return {
        leads: listResult.leads.items,
        dueFollowUps: dueResult.leads.items,
        basePlans: basePage.plans.items,
        addonPlans: addonPage.plans.items,
    };
}
