import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { AuthBrandMark } from '@/modules/auth/components/auth-brand-mark';
import { AuthHeroPanel } from '@/modules/auth/components/auth-hero-panel';

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-(--color-canvas) lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
            <AuthHeroPanel />

            {/* Form column is a plain surface so the tinted hero reads as the other half of the split. */}
            <div className="relative flex min-h-svh flex-col justify-center bg-(--color-surface) px-5 py-14 sm:px-8 lg:min-h-0 lg:px-12 xl:px-16">
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                    <ThemeToggle />
                </div>

                <div className="mx-auto w-full max-w-sm">
                    {/* The hero panel carries the brand above `lg`; below it, the form column does. */}
                    <AuthBrandMark className="mb-8 lg:hidden" />
                    {children}
                </div>
            </div>
        </div>
    );
}
