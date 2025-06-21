import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    // Do not empty outDir before build, as tsc will have placed .d.ts files there.
    emptyOutDir: false,
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/spacegraph.js'),
      name: 'Spacegraph', // UMD global name
      formats: ['es', 'umd'], // Output ES module and UMD
      fileName: (format) => `spacegraph.${format}.js`,
    },
    rollupOptions: {
      // Externalize peer dependencies
      external: ['three', 'gsap'],
      output: {
        globals: {
          three: 'THREE',
          gsap: 'gsap',
        },
      },
    },
  },
});
