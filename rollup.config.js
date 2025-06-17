import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser'; // Updated import

const basePlugins = [resolve(), commonjs()];

export default {
    input: 'spacegraph.js',
    external: ['three', 'gsap'], // three and gsap will now be external
    output: [
        // Non-minified outputs
        {
            file: 'dist/spacegraph.esm.js',
            format: 'esm',
            sourcemap: true,
            plugins: basePlugins, // Apply base plugins
        },
        {
            file: 'dist/spacegraph.umd.js',
            format: 'umd',
            name: 'SpaceGraphZUI',
            sourcemap: true,
            // globals are mainly for external UMD dependencies
            globals: {
                three: 'THREE',
                gsap: 'gsap',
            },
            plugins: basePlugins, // Apply base plugins
        },
        // Minified outputs
        {
            file: 'dist/spacegraph.esm.min.js',
            format: 'esm',
            sourcemap: true,
            plugins: [...basePlugins, terser()], // Add terser for this output
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
            plugins: [...basePlugins, terser()], // Add terser for this output
        },
    ],
    // Top-level plugins are not needed if specified per output,
    // or if all outputs share the exact same plugins.
    // For clarity, moving them into each output or a base array is better
    // when some outputs have different plugins (like terser).
};
