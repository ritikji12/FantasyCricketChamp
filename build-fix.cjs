// build-fix.cjs - Script to handle ESM/CJS issues on Render
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('Starting Render build with ESM/CJS compatibility fixes...');

// Step 1: Backup original package.json
console.log('Backing up original package.json...');
const originalPackageJson = fs.readFileSync('package.json', 'utf8');
fs.writeFileSync('package.json.backup', originalPackageJson);

// Step 2: Modify package.json to add "type": "module"
console.log('Modifying package.json to add type:module...');
const packageJson = JSON.parse(originalPackageJson);
packageJson.type = "module";
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

// Step 3: Build frontend
console.log('Building frontend...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
} catch (error) {
  console.error('Frontend build failed:', error);
  // Restore original package.json
  fs.writeFileSync('package.json', originalPackageJson);
  process.exit(1);
}

// Step 4: Build backend
console.log('Building backend...');
try {
  execSync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist ' +
    '--external:@replit/vite-plugin-runtime-error-modal ' +
    '--external:@replit/vite-plugin-cartographer ' +
    '--external:@replit/vite-plugin-shadcn-theme-json',
    { stdio: 'inherit' }
  );
} catch (error) {
  console.error('Backend build failed:', error);
  // Restore original package.json
  fs.writeFileSync('package.json', originalPackageJson);
  process.exit(1);
}

// Step 5: Create a simple run script 
const runScript = `
// ESM format entry point
import './dist/index.js';
`;
fs.writeFileSync('run.mjs', runScript);

// Step 6: Restore original package.json
console.log('Restoring original package.json...');
fs.writeFileSync('package.json', originalPackageJson);

console.log('Build process completed successfully!');
