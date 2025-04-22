// render-setup.cjs - Setup script for Render deployment
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// IMPORTANT: Create a custom server-wrapper script rather than using package.json build
renderPackageJson.scripts.build = 'vite build --config vite.render.config.js';
fs.writeFileSync(packageJsonPath, JSON.stringify(renderPackageJson, null, 2));

console.log('Successfully configured project for Render deployment');

// Create a simple server build and run script
console.log('Building frontend...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Frontend build completed successfully');
} catch (error) {
  console.error('Frontend build failed:', error);
  process.exit(1);
}

// Create a CommonJS-specific server build with .cjs extension
console.log('Building backend with CJS extension...');
try {
  // Build with .cjs extension explicitly
  execSync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outfile=dist/index.cjs',
    { stdio: 'inherit' }
  );
  console.log('Backend build completed successfully');
} catch (error) {
  console.error('Backend build failed:', error);
  process.exit(1);
}

// Create a simple ESM wrapper to run the CJS file
const serverWrapper = `
// server-wrapper.js - ES
