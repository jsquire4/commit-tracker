import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'compass',
      filename: 'remoteEntry.js',
      exposes: {
        // Main app — host imports: import CompassApp from 'compass/App'
        './App': './src/remoteEntry.tsx',
        // Design tokens — host imports: import 'compass/styles'
        './styles': './src/styles/global.css',
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
    extensions: ['.mts', '.mjs', '.ts', '.tsx', '.js', '.jsx', '.json'],
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
    sourcemap: true,
    target: 'esnext',
    minify: true,
    cssCodeSplit: false,
    // Module Federation controls chunk splitting for shared modules.
    // manualChunks is incompatible — the federation plugin handles this.
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
