'use client';

import { useEffect, useState, useTransition, type ReactElement } from 'react';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { signOutAction } from '@/modules/auth/auth-actions';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ProfileMenuUser = {
    displayName: string;
    email: string;
    roleLabel?: string;
    initials: string;
};

type ProfileMenuProps = {
    user: ProfileMenuUser;
    className?: string;
};

/**
 * Shared chrome for Admin / Trainer / Client: profile options menu.
 * Dark mode + Sign out live here.
 */
export function ProfileMenu({ user, className }: ProfileMenuProps): ReactElement {
    const [mounted, setMounted] = useState(false);
    const [isSigningOut, startSignOut] = useTransition();

    useEffect(() => {
        // Avoid hydration mismatch for the theme control inside the menu.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-xl px-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-2',
                    className,
                )}
                aria-label="Profile options"
            >
                <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-(--color-canvas-accent) text-xs font-semibold text-(--color-fg) ring-2 ring-(--color-surface)"
                    aria-hidden
                >
                    {user.initials}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                    <span className="block truncate text-sm leading-tight font-medium">{user.displayName}</span>
                    {user.roleLabel ? (
                        <span className="block truncate text-xs text-(--color-fg-muted)">{user.roleLabel}</span>
                    ) : null}
                </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                        <span className="block text-sm font-medium text-(--color-fg)">{user.displayName}</span>
                        <span className="block truncate text-xs text-(--color-fg-muted)">{user.email}</span>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between gap-3 px-1.5 py-1.5">
                    <span className="text-sm text-(--color-fg)">Dark mode</span>
                    {mounted ? <ThemeToggle /> : <span className="h-9 w-9" aria-hidden />}
                </div>
                <DropdownMenuSeparator />
                {/* Clearing the session cookie is a mutation — it has to run in a Server Action. */}
                <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer"
                    disabled={isSigningOut}
                    onClick={() => startSignOut(async () => signOutAction())}
                >
                    {isSigningOut ? 'Signing out…' : 'Sign out'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
