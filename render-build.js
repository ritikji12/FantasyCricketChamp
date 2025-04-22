#!/usr/bin/env node
// render-build.js - Build script for Render

const { execSync } = require('child_process');

console.log('Starting Render build process...');

// Step 1: Build the frontend with vite using our ESM config
console.log('Building frontend...');
try {
  // Use the MJS config file
  execSync('npx vite build --config vite.config.mjs', { stdio: 'inherit' });
  console.log('Frontend build completed successfully');
} catch (error) {
  console.error('Frontend build failed:', error);
  process.exit(1);
}

// Step 2: Build the backend with esbuild, explicitly excluding problematic packages
console.log('Building backend...');
try {
  execSync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist ' +
    '--external:@replit/vite-plugin-runtime-error-modal ' +
    '--external:@replit/vite-plugin-cartographer ' + 
    '--external:@replit/vite-plugin-shadcn-theme-json',
    { stdio: 'inherit' }
  );
  console.log('Backend build completed successfully');
} catch (error) {
  console.error('Backend build failed:', error);
  process.exit(1);
}

console.log('Build process completed successfully!');
