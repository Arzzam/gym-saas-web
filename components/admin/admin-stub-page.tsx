import type { ReactElement } from 'react';

import { EmptyState } from '@/components/ui/empty-state';

type AdminStubPageProps = {
    title: string;
    panelTitle: string;
    description: string;
};

export function AdminStubPage({ title, panelTitle, description }: AdminStubPageProps): ReactElement {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg) md:text-3xl">{title}</h1>
            </div>
            <EmptyState title={panelTitle} description={description} />
        </div>
    );
}
