import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/spacegraphjs/',
  build: {
    outDir: 'dist-demo', // Though specified in script, good to have for clarity
  },
});
