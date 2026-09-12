import type { ReactElement } from 'react';

import { BRAND_EMOJI, BRAND_INITIALS, BRAND_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

type AuthBrandMarkProps = {
    className?: string;
    /** Hides the wordmark so the tile can sit alone in tight chrome. */
    isTileOnly?: boolean;
};

/** Product mark for the auth shell — mirrors the sidebar tile in Admin/Client chrome. */
export function AuthBrandMark({ className, isTileOnly = false }: AuthBrandMarkProps): ReactElement {
    return (
        <span className={cn('inline-flex items-center gap-3', className)}>
            <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--color-accent) text-xs font-bold text-(--color-accent-fg)"
                aria-hidden
            >
                {BRAND_INITIALS}
            </span>
            {isTileOnly ? null : (
                <span className="flex items-center gap-1.5 text-[0.9375rem] font-semibold tracking-tight text-(--color-fg)">
                    {BRAND_NAME}
                    <span aria-hidden className="text-xs">
                        {BRAND_EMOJI}
                    </span>
                </span>
            )}
        </span>
    );
}
