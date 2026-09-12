'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
    ADMIN_NAV_ICONS,
    adminNavItems,
    isAdminNavItemActive,
    resolveAdminHomeHref,
    type AdminNavItem,
    type AdminShellMode,
} from '@/components/admin/admin-nav';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';
import { BRAND_EMOJI, BRAND_INITIALS, BRAND_NAME } from '@/lib/brand';

function AdminNavLink({ item }: { item: AdminNavItem }) {
    const pathname = usePathname();
    const { isMobile, setOpenMobile } = useSidebar();
    const Icon = ADMIN_NAV_ICONS[item.icon];
    const active = isAdminNavItemActive(pathname, item);

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                isActive={active}
                tooltip={item.label}
                // Bigger than the shadcn default (h-8/text-sm) — the default reads cramped
                // for a staff-facing nav that's on screen all day.
                className="h-10 gap-3 text-[0.9375rem]"
                render={
                    <Link
                        href={item.href}
                        onClick={() => {
                            if (isMobile) {
                                setOpenMobile(false);
                            }
                        }}
                    />
                }
            >
                <Icon />
                <span>{item.label}</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

type AppSidebarProps = {
    mode: AdminShellMode;
    gymName: string | null;
};

export function AppSidebar({ mode, gymName }: AppSidebarProps) {
    const { isMobile, setOpenMobile } = useSidebar();
    const homeHref = resolveAdminHomeHref(mode);

    return (
        <Sidebar collapsible="icon" aria-label="Admin modules" role="complementary">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            tooltip={BRAND_NAME}
                            render={
                                <Link
                                    href={homeHref}
                                    onClick={() => {
                                        if (isMobile) {
                                            setOpenMobile(false);
                                        }
                                    }}
                                />
                            }
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-[0.625rem] font-bold text-sidebar-primary-foreground">
                                {BRAND_INITIALS}
                            </span>
                            <span className="min-w-0">
                                {/* Emoji sits outside the truncating span — `overflow:hidden` clips its taller glyph. */}
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <span className="truncate text-[0.9375rem] font-semibold tracking-tight">
                                        {BRAND_NAME}
                                    </span>
                                    <span aria-hidden className="shrink-0 text-xs">
                                        {BRAND_EMOJI}
                                    </span>
                                </span>
                                {gymName ? (
                                    <span className="block truncate text-xs text-sidebar-foreground/70">{gymName}</span>
                                ) : null}
                            </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1">
                            {adminNavItems(mode).map((item) => (
                                <AdminNavLink key={item.href} item={item} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarRail />
        </Sidebar>
    );
}
