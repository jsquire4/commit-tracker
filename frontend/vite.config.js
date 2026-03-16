import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';
export default defineConfig({
    plugins: [
        react(),
        federation({
            name: 'st6CommitModule',
            filename: 'remoteEntry.js',
            exposes: {
                './App': './src/bootstrap.tsx',
            },
            shared: {
                react: { requiredVersion: '^18.3.1' },
                'react-dom': { requiredVersion: '^18.3.1' },
                'react-router-dom': { requiredVersion: '^6.22.3' },
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    server: {
        port: 3001,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
    build: {
        // Module Federation's shared-module shims use top-level await, which requires
        // an ESNext target. The host app is responsible for its own polyfills/target.
        target: 'esnext',
        sourcemap: true,
        // manualChunks is omitted: Module Federation manages its own chunk splitting
        // for shared singletons (react, react-dom, react-router-dom).
        // Non-shared vendor chunks are still split automatically by Rollup's defaults.
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-query': ['@tanstack/react-query'],
                    'vendor-ui': ['@headlessui/react', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
                    'vendor-charts': ['recharts'],
                    'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
                },
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: true,
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
