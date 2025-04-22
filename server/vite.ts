import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import shadcnTheme from "@replit/vite-plugin-shadcn-theme-json";

// Export the Vite configuration
export default defineConfig({
  plugins: [
    react(),
    shadcnTheme(), // Ensure this plugin is compatible with ESM
  ],
  server: {
    port: 5173,
    open: true,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
