import Link from 'next/link';

import { EmptyState } from '@/components/ui/empty-state';

const QUICK_LINKS = [
    {
        href: '/admin/renewals',
        title: 'Renewals inbox',
        description: 'Members due soon and unpaid nudges — your daily ops wedge.',
    },
    {
        href: '/admin/crm',
        title: 'Lead pipeline',
        description: 'New → Contacted → Trial → Converted → Lost.',
    },
    {
        href: '/admin/members',
        title: 'Member roster',
        description: 'Invites, offboard, and check-in controls.',
    },
    {
        href: '/admin/settings',
        title: 'Gym settings',
        description: 'Create or update your GymOrg profile and timezone.',
    },
] as const;

export default function AdminDashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg) md:text-3xl">Operations</h1>
                <p className="mt-1 text-sm text-(--color-fg-muted)">
                    Admin desk for renewals, leads, roster, and plans.
                </p>
            </div>

            <section
                className="rounded-(--radius-panel) border border-(--color-border)/80 bg-(--color-surface) p-5 shadow-(--shadow-panel) md:p-6"
                aria-label="Quick modules"
            >
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-(--color-fg)">Where to work next</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {QUICK_LINKS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="rounded-(--radius-panel) border border-(--color-border) bg-(--color-canvas)/50 p-4 transition hover:border-(--color-fg)/20 hover:bg-(--color-canvas)"
                        >
                            <p className="text-sm font-medium text-(--color-fg)">{item.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-(--color-fg-muted)">{item.description}</p>
                        </Link>
                    ))}
                </div>
            </section>

            <EmptyState
                title="Live data lands with each module"
                description="Renewals, CRM pipeline, and roster will fill these panels as Phase A slices ship. Visual language matches CRM-light Admin chrome."
            />
        </div>
    );
}
