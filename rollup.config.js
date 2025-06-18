import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import babel from '@rollup/plugin-babel';

// Define specific plugins
const babelPlugin = babel({
    babelHelpers: 'bundled',
    exclude: 'node_modules/**',
    extensions: ['.js', '.mjs'], // Explicitly include .js and .mjs
    presets: ['@babel/preset-env'] // Simplest preset-env config
});

const resolvePlugin = resolve();
const commonjsPlugin = commonjs({
    include: /node_modules/, // Only process files in node_modules
    transformMixedEsModules: true // Handle mixed ES/CommonJS modules in dependencies
});
// terser will be used as terser() directly in the output config

const basePlugins = [resolvePlugin, commonjsPlugin];

export default {
    input: 'spacegraph.js',
    external: ['three', 'gsap'],
    // No top-level plugins array, plugins are defined per output
    output: [
        // Non-minified outputs
        {
            file: 'dist/spacegraph.esm.js',
            format: 'esm',
            sourcemap: true,
            plugins: [babelPlugin, ...basePlugins],
        },
        {
            file: 'dist/spacegraph.umd.js',
            format: 'umd',
            name: 'SpaceGraphZUI',
            sourcemap: true,
            globals: {
                three: 'THREE',
                gsap: 'gsap',
            },
            plugins: [babelPlugin, ...basePlugins],
        },
        // Minified outputs
        {
            file: 'dist/spacegraph.esm.min.js',
            format: 'esm',
            sourcemap: true,
            plugins: [babelPlugin, ...basePlugins, terser()],
        },
        {
            file: 'dist/spacegraph.umd.min.js',
            format: 'umd',
            name: 'SpaceGraphZUI',
            sourcemap: true,
            globals: {
                three: 'THREE',
                gsap: 'gsap',
            },
            plugins: [babelPlugin, ...basePlugins, terser()],
        },
    ],
};
