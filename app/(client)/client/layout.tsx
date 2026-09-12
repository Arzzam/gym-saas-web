import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { ClientShell } from '@/components/client/client-shell';
import { getSession, isClientSession } from '@/lib/auth/session';

/** Same initials helper as Admin layout — keep chrome identity consistent across lanes. */
function initialsFrom(name: string | null, email: string): string {
    const source = (name?.trim() || email).trim();
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length === 0) {
        return 'G';
    }
    if (parts.length === 1) {
        return parts[0]!.slice(0, 2).toUpperCase();
    }
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

/**
 * Client chrome: sidebar modules (Postman client folders) + header Profile options.
 * Profile & progress live on `/client/profile`; Home keeps invites + data grants.
 */
export default async function ClientSectionLayout({ children }: { children: ReactNode }) {
    const session = await getSession();
    if (!session || !isClientSession(session)) {
        redirect('/login');
    }

    const displayName = session.name ?? session.email;
    const sidebarStateCookie = (await cookies()).get('sidebar_state')?.value;
    const defaultSidebarOpen = sidebarStateCookie !== 'false';

    return (
        <ClientShell
            defaultSidebarOpen={defaultSidebarOpen}
            user={{
                displayName,
                email: session.email,
                initials: initialsFrom(session.name, session.email),
            }}
        >
            {children}
        </ClientShell>
    );
}
