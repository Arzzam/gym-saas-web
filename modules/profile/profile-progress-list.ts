import type { ProgressLog } from '@/modules/profile/profile-ports';

/**
 * Staff / client BFF may return either a ProgressLog[] or the Postman page
 * `{ items, total, limit, offset }`. Always collapse to an array for the UI.
 */
export function normalizeProgressLogList(value: unknown): ProgressLog[] {
    if (Array.isArray(value)) {
        return value as ProgressLog[];
    }
    if (value && typeof value === 'object' && 'items' in value) {
        const items = (value as { items: unknown }).items;
        if (Array.isArray(items)) {
            return items as ProgressLog[];
        }
    }
    return [];
}
