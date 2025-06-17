import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true, // Automatically open in browser
    fs: {
      strict: false // Allow serving files from the root directory
    }
  },
  build: {
    commonjsOptions: {
       include: [/node_modules/],
       transformMixedEsModules: true // Handle mixed ES/CommonJS modules often found in dependencies
    }
  },
  optimizeDeps: {
    include: ['gsap', 'three'] // Pre-bundle these dependencies
  }
});
