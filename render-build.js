#!/usr/bin/env node
// render-build.js - Build script for Render

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
// Important: Using format=cjs to ensure CommonJS compatibility
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

// Step 3: Create a package.json in the dist directory to explicitly set "type": "commonjs"
// This ensures Node treats our output as CommonJS regardless of parent directory
console.log('Creating dist/package.json to specify CommonJS...');
const distPackageJson = {
  "name": "fantasy-cricket-champ-dist",
  "type": "commonjs",
  "private": true
};
fs.writeFileSync(
  path.join(__dirname, 'dist', 'package.json'), 
  JSON.stringify(distPackageJson, null, 2)
);

console.log('Build process completed successfully!');
