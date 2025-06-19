import { defineConfig } from 'vite';
import { resolve } from 'path';
import terser from '@rollup/plugin-terser';

export default defineConfig({
  build: {
    lib: {
      entry: 'spacegraph.js', // Simplified entry path
      name: 'SpaceGraphZUI', // Name for UMD global
      // fileName is not needed when rollupOptions.output is an array
    },
    minify: false, // Disable Vite's global minification
    sourcemap: true, // Enable sourcemap generation globally
    rollupOptions: {
      // Ensure 'three' and 'gsap' are treated as external dependencies
      external: [], // MODIFIED
      output: [
        {
          format: 'es',
          entryFileNames: 'spacegraph.esm.js',
          // sourcemap is inherited from build.sourcemap
          globals: {} // MODIFIED
        },
        {
          format: 'es',
          entryFileNames: 'spacegraph.esm.min.js',
          // sourcemap is inherited
          plugins: [terser()],
          globals: {} // MODIFIED
        },
        {
          format: 'umd',
          name: 'SpaceGraphZUI',
          entryFileNames: 'spacegraph.umd.js',
          // sourcemap is inherited
          globals: {} // MODIFIED
        },
        {
          format: 'umd',
          name: 'SpaceGraphZUI',
          entryFileNames: 'spacegraph.umd.min.js',
          // sourcemap is inherited
          plugins: [terser()],
          globals: {} // MODIFIED
        }
      ]
    }
  },
  // Keep existing server and optimizeDeps configurations if any
  server: {
    open: true,
    fs: {
      strict: false
    }
  },
  optimizeDeps: {
    include: ['gsap', 'three']
  }
});
