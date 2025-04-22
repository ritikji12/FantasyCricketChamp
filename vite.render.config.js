// This is a special Vite configuration file for Render deployment
// It handles the ESM module compatibility issues and avoids top-level await

const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');
const runtimeErrorOverlay = require('@replit/vite-plugin-runtime-error-modal');

// Compatibility resolver for @replit/vite-plugin-shadcn-theme-json
const shadcnThemeResolver = {
  name: 'shadcn-theme-resolver',
  resolveId(id) {
    if (id === '@replit/vite-plugin-shadcn-theme-json') {
      return { id: 'virtual:shadcn-theme-json', external: true };
    }
    return null;
  }
};

// Cartographer plugin wrapper to avoid top-level await
const cartographerWrapper = {
  name: 'cartographer-wrapper',
  // Empty plugin that replaces the actual cartographer in production
};

module.exports = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    shadcnThemeResolver,
    cartographerWrapper
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
  },
  root: path.resolve(__dirname, 'client'),
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
  },
});
