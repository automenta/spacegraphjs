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
      external: ['three', 'gsap'], // Ensure 'three' and 'gsap' are treated as external dependencies
      output: [
        {
          format: 'es',
          entryFileNames: 'spacegraph.esm.js',
          // sourcemap is inherited from build.sourcemap
          globals: {
            three: 'THREE',
            gsap: 'gsap'
          }
        },
        {
          format: 'es',
          entryFileNames: 'spacegraph.esm.min.js',
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
          globals: {
            three: 'THREE',
            gsap: 'gsap'
          }
        },
        {
          format: 'umd',
          name: 'SpaceGraphZUI',
          entryFileNames: 'spacegraph.umd.min.js',
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
  resolve: {
    alias: {
      'three/addons': resolve(__dirname, 'node_modules/three/examples/jsm')
    }
  },
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
