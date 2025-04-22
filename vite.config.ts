// This is a special Vite configuration file for Render deployment
// It handles all ESM module compatibility issues and avoids top-level await

// Use CommonJS syntax for this file
const { defineConfig } = require('vite');
const path = require('path');
const react = require('@vitejs/plugin-react');

// Create stub plugins that replace the ESM-only Replit plugins
const runtimeErrorStub = {
  name: 'runtime-error-stub',
  // Empty stub that mimics the original plugin
};

const shadcnThemeStub = {
  name: 'shadcn-theme-stub',
  // Empty stub that mimics the original plugin
};

const cartographerStub = {
  name: 'cartographer-stub',
  // Empty stub that mimics the original plugin
};

// Define the Vite configuration
module.exports = defineConfig({
  plugins: [
    react(),
    // Use stubs for Replit plugins instead of trying to import ESM modules
    runtimeErrorStub,
    shadcnThemeStub,
    // Only use cartographer in Replit environment, not in production
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID ? [cartographerStub] : [])
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});// This is a special Vite configuration file for Render deployment
// It handles all ESM module compatibility issues and avoids top-level await

// Use CommonJS syntax for this file
const { defineConfig } = require('vite');
const path = require('path');
const react = require('@vitejs/plugin-react');

// Create stub plugins that replace the ESM-only Replit plugins
const runtimeErrorStub = {
  name: 'runtime-error-stub',
  // Empty stub that mimics the original plugin
};

const shadcnThemeStub = {
  name: 'shadcn-theme-stub',
  // Empty stub that mimics the original plugin
};

const cartographerStub = {
  name: 'cartographer-stub',
  // Empty stub that mimics the original plugin
};

// Define the Vite configuration
module.exports = defineConfig({
  plugins: [
    react(),
    // Use stubs for Replit plugins instead of trying to import ESM modules
    runtimeErrorStub,
    shadcnThemeStub,
    // Only use cartographer in Replit environment, not in production
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID ? [cartographerStub] : [])
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
