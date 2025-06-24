// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
    js.configs.recommended,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                // ecmaVersion 'latest' should cover ES2021 globals by default with modern ESLint.
                // If specific ES2021 globals are missing, they can be added from 'globals' package.
                // e.g. ...globals.es2021 (if available as a combined object) or specific ones.
            },
        },
        rules: {
            'no-console': 'warn',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
        // Apply this configuration to all JavaScript files.
        // ESLint CLI will target specific files, but this ensures these rules apply to .js files.
        files: ['**/*.js'],
        // If there are specific ignores from an .eslintignore file, they should be added here too.
        // For now, assuming .gitignore is respected or no specific .eslintignore patterns beyond Prettier's.
        // ignores: ["dist/**", "node_modules/**"] // Example common ignores (often default)
    },
];
