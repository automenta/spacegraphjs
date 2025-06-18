import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: 'spacegraph.js', // Simplified entry path
      name: 'SpaceGraphZUI', // Name for UMD global
      fileName: (format) => `spacegraph.${format}.js` // Output file name pattern
    },
    rollupOptions: {
      // Ensure 'three' and 'gsap' are treated as external dependencies
      external: ['three', 'gsap'],
      output: {
        globals: {
          three: 'THREE',
          gsap: 'gsap'
        }
      }
    },
    sourcemap: true // Enable sourcemap generation
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
