import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // plugins: [react()], // React plugin removed
  base: '/spacegraphjs/',
  build: {
    outDir: 'dist-demo', // Though specified in script, good to have for clarity
  },
});
