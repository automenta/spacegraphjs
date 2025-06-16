import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser'; // Updated import

const basePlugins = [
  resolve(),
  commonjs()
];

export default {
  input: 'spacegraph.js',
  external: [], // three and gsap will now be bundled
  output: [
    // Non-minified outputs
    {
      file: 'dist/spacegraph.esm.js',
      format: 'esm',
      sourcemap: true,
      plugins: basePlugins // Apply base plugins
    },
    {
      file: 'dist/spacegraph.umd.js',
      format: 'umd',
      name: 'SpaceGraphZUI',
      sourcemap: true,
      // globals are mainly for external UMD dependencies
      // Since three and gsap are now bundled, these might not be strictly needed for them
      // but leaving them won't harm for other potential externals.
      // For a cleaner setup, if NO externals remain, globals could be removed or emptied.
      globals: {
        'three': 'THREE', // Kept in case of other externals, or future changes
        'gsap': 'gsap'    // Kept in case of other externals
      },
      plugins: basePlugins // Apply base plugins
    },
    // Minified outputs
    {
      file: 'dist/spacegraph.esm.min.js',
      format: 'esm',
      sourcemap: true,
      plugins: [...basePlugins, terser()] // Add terser for this output
    },
    {
      file: 'dist/spacegraph.umd.min.js',
      format: 'umd',
      name: 'SpaceGraphZUI',
      sourcemap: true,
      globals: {
        'three': 'THREE',
        'gsap': 'gsap'
      },
      plugins: [...basePlugins, terser()] // Add terser for this output
    }
  ]
  // Top-level plugins are not needed if specified per output,
  // or if all outputs share the exact same plugins.
  // For clarity, moving them into each output or a base array is better
  // when some outputs have different plugins (like terser).
};
