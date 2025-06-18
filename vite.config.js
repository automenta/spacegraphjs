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
      external: ['three', 'gsap'],
      output: [
        {
          format: 'es',
          entryFileNames: 'spacegraph.es.js',
          // sourcemap is inherited from build.sourcemap
          globals: {
            three: 'THREE',
            gsap: 'gsap'
          }
        },
        {
          format: 'es',
          entryFileNames: 'spacegraph.es.min.js',
          // sourcemap is inherited
          plugins: [terser()],
          globals: {
            three: 'THREE',
            gsap: 'gsap'
          }
        },
        {
          format: 'umd',
          name: 'SpaceGraphZUI',
          entryFileNames: 'spacegraph.umd.js',
          // sourcemap is inherited
          globals: {
            three: 'THREE',
            gsap: 'gsap'
          }
        },
        {
          format: 'umd',
          name: 'SpaceGraphZUI',
          entryFileNames: 'spacegraph.umd.min.js',
          // sourcemap is inherited
          plugins: [terser()],
          globals: {
            three: 'THREE',
            gsap: 'gsap'
          }
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
