/**
 * How much room a `WorkQueueLayout` rail needs. `default` suits a rail that
 * reads a record back; `wide` suits one that holds an edit form, where at
 * 21rem every helper sentence wraps to three lines while the queue beside it
 * sits half empty.
 *
 * Its own module, not an export of `work-queue-layout.tsx`, because the
 * skeleton renders inside a Server Component and every export of a
 * `'use client'` module reaches a server render as a client reference rather
 * than as the string map this needs to index.
 */
export type RailWidth = 'default' | 'wide';

export const RAIL_GRID_CLASS: Record<RailWidth, string> = {
    default: 'lg:grid-cols-[minmax(0,1fr)_21rem]',
    wide: 'lg:grid-cols-[minmax(0,1fr)_25rem]',
};
