#!/usr/bin/env node
// render-build.js - Build script for Render

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Step 2: Build the backend with esbuild, but as ESM this time
console.log('Building backend...');
try {
  execSync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist ' +
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
