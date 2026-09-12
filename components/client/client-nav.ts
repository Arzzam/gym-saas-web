import { Apple, Dumbbell, HeartPulse, Home, UserRound, UtensilsCrossed, type LucideIcon } from 'lucide-react';

/**
 * Client module nav — mirrors Postman client-facing folders:
 * Profile & Progress, Nutrition, Coaching (Diet + Workouts), Health Sync.
 * Home keeps membership invites + data grants.
 */

export type ClientNavIcon = 'home' | 'profile' | 'nutrition' | 'diet' | 'workouts' | 'health';

export type ClientNavItem = {
    href: string;
    label: string;
    icon: ClientNavIcon;
};

export const CLIENT_NAV_ICONS: Readonly<Record<ClientNavIcon, LucideIcon>> = {
    home: Home,
    profile: UserRound,
    nutrition: Apple,
    diet: UtensilsCrossed,
    workouts: Dumbbell,
    health: HeartPulse,
};

const CLIENT_NAV: ReadonlyArray<ClientNavItem> = [
    { href: '/client', label: 'Home', icon: 'home' },
    { href: '/client/profile', label: 'Profile', icon: 'profile' },
    { href: '/client/nutrition', label: 'Nutrition', icon: 'nutrition' },
    { href: '/client/diet', label: 'Diet', icon: 'diet' },
    { href: '/client/workouts', label: 'Workouts', icon: 'workouts' },
    { href: '/client/health', label: 'Health Sync', icon: 'health' },
];

export function clientNavItems(): ReadonlyArray<ClientNavItem> {
    return CLIENT_NAV;
}

/** `/client` is Home — exact match so Profile etc. do not highlight it. */
export function isClientNavItemActive(pathname: string, item: ClientNavItem): boolean {
    if (item.href === '/client') {
        return pathname === '/client';
    }
    return pathname.startsWith(item.href);
}

export function getActiveClientNavItem(pathname: string): ClientNavItem | undefined {
    return clientNavItems().find((item) => isClientNavItemActive(pathname, item));
}
