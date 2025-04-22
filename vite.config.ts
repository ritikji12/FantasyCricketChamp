import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Import themePlugin with a dynamic import to avoid ESM issues
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create Vite config as async function to properly handle dynamic imports
export default defineConfig(async () => {
  // Dynamically import plugins
  let dynamicPlugins = [];
  
  // Only import theme plugin in development/Replit environment
  if (process.env.NODE_ENV !== "production") {
    try {
      const themeModule = await import("@replit/vite-plugin-shadcn-theme-json");
      dynamicPlugins.push(themeModule.default());
    } catch (err) {
      console.warn("Could not load theme plugin:", err);
    }
  }
  
  // Only import cartographer in Replit environment
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    try {
      const cartographerModule = await import("@replit/vite-plugin-cartographer");
      dynamicPlugins.push(cartographerModule.cartographer());
    } catch (err) {
      console.warn("Could not load cartographer plugin:", err);
    }
  }

  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...dynamicPlugins,
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
  };
});
