import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { QueryProvider } from '@/components/query/query-provider';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { BRAND_NAME } from '@/lib/brand';
import { themeBootScript } from '@/lib/theme/theme-mode';

import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: BRAND_NAME,
    description: 'Admin-first gym management for staff and members',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
            suppressHydrationWarning
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
            </head>
            <body className="min-h-full">
                <QueryProvider>
                    <ThemeProvider>{children}</ThemeProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
