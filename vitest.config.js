import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        coverage: {
            provider: 'v8', // or 'istanbul'
            reporter: ['text', 'json', 'html', 'lcov'],
            reportsDirectory: './coverage',
            all: true,
            include: ['src/**/*.js'],
            exclude: [
                'src/examples/**',
                'src/**/*.test.js',
                'src/index.js', // Usually just re-exports, low value to cover
                'src/utils.js', // If it contains very generic utils, or test them directly
                // Add other files/patterns to exclude if necessary e.g. main.js for demos
            ],
            // Thresholds (optional, but good for CI)
            // statements: 80,
            // branches: 80,
            // functions: 80,
            // lines: 80,
        },
    },
});
