// vite.config.mjs - This is an ESM version of the config for Render
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create stub plugins since we can't use Replit plugins
const runtimeErrorStub = {
  name: 'runtime-error-stub'
};

// No top-level await here
export default defineConfig({
  plugins: [
    react(),
    runtimeErrorStub,
    // Skip Replit-specific plugins
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
