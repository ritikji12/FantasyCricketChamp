// render-build-script.cjs - CommonJS file for Render build
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Render build process...');

// Step 1: Build the frontend with vite
console.log('Building frontend...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('Frontend build completed successfully');
} catch (error) {
  console.error('Frontend build failed:', error);
  process.exit(1);
}

// Step 2: Build the backend
console.log('Building backend...');
try {
  execSync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist',
    { stdio: 'inherit' }
  );
  console.log('Backend build completed successfully');
} catch (error) {
  console.error('Backend build failed:', error);
  process.exit(1);
}

// Step 3: Explicitly mark as CommonJS
const distPackageJson = {
  "type": "commonjs"
};
fs.writeFileSync(
  path.join(__dirname, 'dist', 'package.json'), 
  JSON.stringify(distPackageJson, null, 2)
);

// Step 4: IMPORTANT - Create an explicit server entry point wrapper
// This ensures the server starts correctly regardless of ESM/CJS confusion
const serverWrapper = `
// server-wrapper.cjs - CommonJS wrapper to start the server
const server = require('./dist/index.js');
`;
fs.writeFileSync('server-wrapper.cjs', serverWrapper);

console.log('Build process completed successfully!');
