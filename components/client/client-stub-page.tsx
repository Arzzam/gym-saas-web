import type { ReactElement } from 'react';

import { EmptyState } from '@/components/ui/empty-state';

type ClientStubPageProps = {
    title: string;
    panelTitle: string;
    description: string;
};

/** Calm module stub — same shape as `AdminStubPage` until the Postman slice is wired. */
export function ClientStubPage({ title, panelTitle, description }: ClientStubPageProps): ReactElement {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--color-fg) md:text-3xl">{title}</h1>
            </div>
            <EmptyState title={panelTitle} description={description} />
        </div>
    );
}
