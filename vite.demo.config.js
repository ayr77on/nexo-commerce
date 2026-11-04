import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    root: fileURLToPath(new URL('./static-demo', import.meta.url)),
    base: './',
    publicDir: false,
    plugins: [
        tailwindcss(),
        {
            name: 'static-hosting-marker',
            generateBundle() { this.emitFile({type: 'asset', fileName: '.nojekyll', source: ''}); },
        },
    ],
    build: {
        outDir: fileURLToPath(new URL('./dist/demo', import.meta.url)),
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/chart.js') || id.includes('node_modules/@kurkle')) return 'charts';
                },
            },
        },
    },
});
