'use client';

import { useCallback, useState } from 'react';

/**
 * A list filter that lives in the URL but does **not** re-run the server render.
 *
 * `state-management.mdc` §2 puts shareable filters in `searchParams` so a
 * colleague can paste the link and see the same screen. That rule assumes the
 * filter changes what the server fetches. For filters that only narrow a list
 * already in the query cache, a `<Link>` or `router.replace` would re-run the
 * page — and its `prefetchQuery` — on every keystroke, paying a round-trip to
 * hide rows the browser is already holding.
 *
 * `window.history.replaceState` is the documented Next.js escape hatch here: it
 * updates the URL and stays in sync with `useSearchParams`, without a
 * navigation. Filters that genuinely change the query (a date window) still
 * belong in a `<Link>`.
 *
 * `replaceState`, not `pushState`: typing four characters into a search box
 * should not put four entries in the back button.
 */
export function useShallowSearchParam<T extends string>(
    key: string,
    initialValue: T,
    /** Value that means "no filter" — removed from the URL instead of written as noise. */
    defaultValue: T,
): [T, (next: T) => void] {
    const [value, setValue] = useState<T>(initialValue);

    const update = useCallback(
        (next: T) => {
            setValue(next);
            const params = new URLSearchParams(window.location.search);
            if (next === defaultValue || next === '') {
                params.delete(key);
            } else {
                params.set(key, next);
            }
            const query = params.toString();
            window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
        },
        [key, defaultValue],
    );

    return [value, update];
}
