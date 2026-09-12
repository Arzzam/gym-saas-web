'use client';

import { usePathname } from 'next/navigation';
import { useMemo, type ReactElement, type ReactNode } from 'react';

import { getActiveClientNavItem } from '@/components/client/client-nav';
import { ClientSidebar } from '@/components/client/client-sidebar';
import { ProfileMenu } from '@/components/profile/profile-menu';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

/** Mirrors `AdminShellUser` — identity for the Profile options menu. */
export type ClientShellUser = {
    displayName: string;
    email: string;
    initials: string;
};

type ClientShellProps = {
    children: ReactNode;
    user: ClientShellUser;
    /** SSR-known sidebar open state, read from the `sidebar_state` cookie. */
    defaultSidebarOpen?: boolean;
};

export function ClientShell({ children, user, defaultSidebarOpen = true }: ClientShellProps): ReactElement {
    const pathname = usePathname();
    const pageLabel = useMemo(() => getActiveClientNavItem(pathname)?.label, [pathname]);

    return (
        // Same shell chrome as Admin — shared Sidebar primitive + Profile options.
        <TooltipProvider delay={150}>
            <SidebarProvider defaultOpen={defaultSidebarOpen} className="admin-shell">
                <ClientSidebar />
                <SidebarInset className="flex min-h-svh min-w-0 flex-col bg-transparent">
                    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-(--color-border)/80 bg-(--color-surface)/90 px-4 backdrop-blur-md sm:px-6">
                        <SidebarTrigger />
                        <Separator
                            orientation="vertical"
                            className="mr-1 hidden h-6 sm:block data-vertical:self-center"
                        />
                        {/* Not an <h1> — each page renders its own primary heading; this is chrome, not content. */}
                        <p className="min-w-0 truncate text-sm font-medium text-(--color-fg)">{pageLabel}</p>

                        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                            <ProfileMenu
                                user={{
                                    displayName: user.displayName,
                                    email: user.email,
                                    roleLabel: 'CLIENT',
                                    initials: user.initials,
                                }}
                            />
                        </div>
                    </header>

                    <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 md:px-8 md:py-8">
                        <div className="mx-auto max-w-6xl">{children}</div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
}
