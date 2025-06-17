import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom', // Use jsdom for a browser-like environment
        globals: true, // Optional: to use Vitest globals like describe, it, expect without explicit imports
        // However, explicit imports are generally good practice as used in the test file.
        // For this project, let's keep it consistent with explicit imports in tests.
    },
});
