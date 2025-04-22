#!/usr/bin/env node

// Custom build script for Render deployment
// This script handles ESM/CJS compatibility issues and avoids top-level await

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create virtual shims for ALL the ESM-only modules
const esmModules = [
  '@replit/vite-plugin-shadcn-theme-json',
  '@replit/vite-plugin-cartographer',
  '@replit/vite-plugin-runtime-error-modal'
];

// Create shims for all ESM modules
for (const moduleName of esmModules) {
  const shimDir = path.join(__dirname, 'node_modules', ...moduleName.split('/'));
  if (!fs.existsSync(shimDir)) {
    fs.mkdirSync(shimDir, { recursive: true });
    fs.writeFileSync(
      path.join(shimDir, 'index.js'),
      `module.exports = function() { return { name: "${moduleName.split('/').pop()}-shim" }; };`
    );
    fs.writeFileSync(
      path.join(shimDir, 'package.json'),
      JSON.stringify({ name: moduleName, main: "index.js" })
    );
    console.log(`Created compatibility shim for ${moduleName}`);
  }
}

console.log('Starting custom Render build process...');

// Step 1: Build the frontend with vite using our custom config
console.log('Building frontend...');
try {
  execSync('npx vite build --config vite.render.config.js', { stdio: 'inherit' });
  console.log('Frontend build completed successfully');
} catch (error) {
  console.error('Frontend build failed:', error);
  process.exit(1);
}

// Step 2: Build the backend with esbuild, marking all Replit packages as external
console.log('Building backend...');
try {
  execSync(
    `npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist ${esmModules.map(m => `--external:${m}`).join(' ')}`,
    { stdio: 'inherit' }
  );
  console.log('Backend build completed successfully');
} catch (error) {
  console.error('Backend build failed:', error);
  process.exit(1);
}

console.log('Build process completed successfully!');
