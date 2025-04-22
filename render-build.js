#!/usr/bin/env node

// Custom build script for Render deployment
// This script handles ESM/CJS compatibility issues and avoids top-level await

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create a virtual shim for the ESM-only module
const shimDir = path.join(__dirname, 'node_modules', '@replit', 'vite-plugin-shadcn-theme-json');
if (!fs.existsSync(shimDir)) {
  fs.mkdirSync(shimDir, { recursive: true });
  fs.writeFileSync(
    path.join(shimDir, 'index.js'),
    'module.exports = function() { return { name: "theme-shim" }; };'
  );
  fs.writeFileSync(
    path.join(shimDir, 'package.json'),
    JSON.stringify({ name: "@replit/vite-plugin-shadcn-theme-json", main: "index.js" })
  );
  console.log('Created compatibility shim for @replit/vite-plugin-shadcn-theme-json');
}

console.log('Starting custom Render build process...');

// Step 1: Build the frontend with vite
console.log('Building frontend...');
try {
  execSync('npx vite build --config vite.render.config.js', { stdio: 'inherit' });
  console.log('Frontend build completed successfully');
} catch (error) {
  console.error('Frontend build failed:', error);
  process.exit(1);
}

// Step 2: Build the backend with esbuild (avoiding top-level await)
console.log('Building backend...');
try {
  execSync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --external:@replit/vite-plugin-shadcn-theme-json --external:@replit/vite-plugin-cartographer',
    { stdio: 'inherit' }
  );
  console.log('Backend build completed successfully');
} catch (error) {
  console.error('Backend build failed:', error);
  process.exit(1);
}

console.log('Build process completed successfully!');
