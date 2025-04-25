// direct-build.js - Direct approach to create .cjs file
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting direct build approach...');

// FIRST: Remove type:module from package.json if it exists
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent);
  
  // Make a backup
  fs.writeFileSync(packageJsonPath + '.backup', packageJsonContent);
  
  // Remove type:module if it exists
  if (packageJson.type === 'module') {
    delete packageJson.type;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Removed "type": "module" from package.json');
  }
}

// Build the frontend
console.log('Building frontend...');
const viteConfigContent = `
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig({
  plugins: [react()],
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
fs.writeFileSync('simple-vite.config.js', viteConfigContent);

try {
  execSync('npx vite build --config simple-vite.config.js', { stdio: 'inherit' });
  console.log('Frontend build completed');
} catch (error) {
  console.error('Frontend build failed:', error);
  process.exit(1);
}

// Build backend with explicit .cjs extension output
console.log('Building backend with explicit .cjs output...');
try {
  // Use --outfile instead of --outdir to explicitly set the filename with .cjs extension
  execSync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outfile=dist/server.cjs',
    { stdio: 'inherit' }
  );
  console.log('Backend build completed with .cjs extension');
} catch (error) {
  console.error('Backend build failed:', error);
  process.exit(1);
}

// Create an explicit .cjs starter script
const starterScript = `#!/usr/bin/env node
// This is a CommonJS script to start the server
const server = require('./dist/server.cjs');
`;
fs.writeFileSync('start-server.cjs', starterScript);
fs.chmodSync('start-server.cjs', '755'); // Make executable

// Restore original package.json if it was backed up
if (fs.existsSync(packageJsonPath + '.backup')) {
  fs.copyFileSync(packageJsonPath + '.backup', packageJsonPath);
  fs.unlinkSync(packageJsonPath + '.backup');
  console.log('Restored original package.json');
}

console.log('Build completed successfully!');
