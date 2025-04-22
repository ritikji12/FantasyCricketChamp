// render-setup.cjs - Setup script for Render deployment
const fs = require('fs');
const path = require('path');

console.log('Setting up Render environment...');

// Read the original package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const originalPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Create a modified version for Render
const renderPackageJson = {...originalPackageJson};

// Add type:module
renderPackageJson.type = 'module';

// Remove Replit-specific dependencies that don't exist in the npm registry
const replitDependencies = [
  '@replit/vite-plugin-cartographer',
  '@replit/vite-plugin-runtime-error-modal',
  '@replit/vite-plugin-shadcn-theme-json'
];

replitDependencies.forEach(dep => {
  if (renderPackageJson.dependencies[dep]) {
    console.log(`Removing Replit-specific dependency: ${dep}`);
    delete renderPackageJson.dependencies[dep];
  }
});

// Write the modified package.json back
fs.writeFileSync(packageJsonPath, JSON.stringify(renderPackageJson, null, 2));

// Create a Render-specific Vite config file
const viteConfigContent = `
// vite.render.config.js - Render-specific Vite config
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // No Replit-specific plugins here
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
`;

fs.writeFileSync('vite.render.config.js', viteConfigContent);

// Update package.json scripts to use the Render-specific config for build
renderPackageJson.scripts.build = 'vite build --config vite.render.config.js && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist';
fs.writeFileSync(packageJsonPath, JSON.stringify(renderPackageJson, null, 2));

console.log('Successfully configured project for Render deployment');
