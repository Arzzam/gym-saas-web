import { defineConfig, devices } from '@playwright/test';

import base from './playwright.config';

/**
 * Local macOS 13 arm64 workaround: bundled Chromium is unavailable on this host.
 * Uses the installed Google Chrome channel. Not for CI.
 */
export default defineConfig({
    ...base,
    use: {
        ...base.use,
        // Bundled ffmpeg is unavailable on macOS 13 arm64; keep screenshots only.
        video: 'off',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        },
    ],
});
