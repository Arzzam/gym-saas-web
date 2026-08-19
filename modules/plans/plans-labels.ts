import type { PlanKind, PlanCapability } from '@/modules/plans/plans-ports';

export function planKindLabel(kind: PlanKind): string {
    switch (kind) {
        case 'BASE':
            return 'Base';
        case 'ADDON':
            return 'Add-on';
    }
}

export function planCapabilityLabel(capability: PlanCapability | null): string {
    if (!capability) {
        return '—';
    }
    switch (capability) {
        case 'TRAINER_COACHING':
            return 'Trainer coaching';
    }
}

export function formatPlanDuration(days: number): string {
    if (days === 30) {
        return '30 days';
    }
    if (days === 365) {
        return '365 days';
    }
    return `${days} days`;
}
