import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        // Do not empty outDir before build, as tsc will have placed .d.ts files there.
        // This will be true if tsc emits to 'dist' before vite runs.
        emptyOutDir: false, // Set to true if tsc outputs to a temp dir first
        outDir: 'dist',
        lib: {
            entry: path.resolve(__dirname, 'src/index.js'), // Corrected entry point
            name: 'Spacegraph', // UMD global name
            formats: ['es', 'umd', 'cjs'], // Added 'cjs'
            fileName: (format) => `spacegraph.${format}.js`,
        },
        rollupOptions: {
            // Externalize peer dependencies
            external: ['three', 'gsap', 'postprocessing'], // Added 'postprocessing'
            output: {
                globals: {
                    three: 'THREE',
                    gsap: 'gsap',
                    postprocessing: 'PostProcessing', // Assuming 'PostProcessing' is the global. This may need verification.
                },
            },
        },
    },
});
