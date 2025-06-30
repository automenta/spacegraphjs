// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import importPlugin from 'eslint-plugin-import';

export default [
    js.configs.recommended,
    eslintPluginPrettierRecommended,
    {
        // Settings for eslint-plugin-import
        plugins: {
            import: importPlugin,
        },
        settings: {
            'import/resolver': {
                node: {
                    extensions: ['.js', '.jsx', '.mjs', '.ts', '.tsx'], // Added .mjs
                },
                alias: {
                    map: [
                        // We don't need to map 'three/addons/' to a local path
                        // because it's external (CDN). Instead, we'll ignore it.
                        ['src', './src'],
                    ],
                    extensions: ['.js', '.jsx', '.mjs'],
                },
            },
            // 'import/ignore': [
            //  'three/addons/.*', // This would ignore them from resolution entirely
            // ],
        },
        rules: {
            // 'import/no-unresolved': ['error', { commonjs: true, amd: true, ignore: ['^three/addons/'] }],
            // Let's try configuring the resolver properly first or using 'import/core-modules'
            'import/no-unresolved': [
                'error',
                {
                    commonjs: true,
                    amd: true,
                    ignore: ['^three$', '^three/addons/.*$', '^gsap$'], // Mark CDN imports as "ignorable"
                },
            ],
            'import/extensions': [
                'warn',
                'ignorePackages',
                {
                    js: 'always', // or 'never' if you don't want .js extensions
                    mjs: 'always',
                },
            ],
            // other import plugin rules can be added here
        },
        files: ['**/*.js', '**/*.mjs'], // Explicitly apply this config object to JS/MJS files
    },
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.vitest,
                Chart: 'readonly',
                // ecmaVersion 'latest' should cover ES2021 globals by default with modern ESLint.
                // If specific ES2021 globals are missing, they can be added from 'globals' package.
                // e.g. ...globals.es2021 (if available as a combined object) or specific ones.
            },
        },
        rules: {
            'no-console': 'warn',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-case-declarations': 'warn',
        },
        // Apply this configuration to all JavaScript files.
        // ESLint CLI will target specific files, but this ensures these rules apply to .js files.
        files: ['**/*.js'],
        // If there are specific ignores from an .eslintignore file, they should be added here too.
        // For now, assuming .gitignore is respected or no specific .eslintignore patterns beyond Prettier's.
        // ignores: ["dist/**", "node_modules/**"] // Example common ignores (often default)
    },
];
