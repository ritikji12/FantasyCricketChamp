// fix-build.js - A script to fix the module type issues
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting build with module type fixes...');

// Step 1: Temporarily modify package.json to remove "type": "module"
const packageJsonPath = path.join(__dirname, 'package.json');
let packageJson;
if (fs.existsSync(packageJsonPath)) {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(packageJsonContent);
  
  // Make a backup
  fs.writeFileSync(packageJsonPath + '.backup', packageJsonContent);
  
  // Remove type:module if it exists
  if (packageJson.type === 'module') {
    delete packageJson.type;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Removed "type": "module" from package.json');
  }
}

// Step 2: Create a simplified Vite config
const minimalViteConfig = `
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig({
  plugins: [
    react(),
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
fs.writeFileSync('minimal-vite.config.js', minimalViteConfig);

// Step 3: Build the frontend
console.log('Building frontend...');
try {
  execSync('npx vite build --config minimal-vite.config.js', { stdio: 'inherit' });
  console.log('Frontend build completed successfully');
} catch (error) {
  console.error('Frontend build failed:', error);
  
  // Restore package.json if it was modified
  if (fs.existsSync(packageJsonPath + '.backup')) {
    fs.copyFileSync(packageJsonPath + '.backup', packageJsonPath);
  }
  
  process.exit(1);
}

// Step 4: Build the backend with explicit CommonJS format
console.log('Building backend...');
try {
  execSync(
    'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist',
    { stdio: 'inherit' }
  );
  console.log('Backend build completed successfully');
} catch (error) {
  console.error('Backend build failed:', error);
  
  // Restore package.json if it was modified
  if (fs.existsSync(packageJsonPath + '.backup')) {
    fs.copyFileSync(packageJsonPath + '.backup', packageJsonPath);
  }
  
  process.exit(1);
}

// Step 5: Create a CommonJS package.json in the dist directory
const distPackageJson = {
  "name": "fantasy-cricket-champ-dist",
  "type": "commonjs",
  "private": true
};
fs.writeFileSync(
  path.join(__dirname, 'dist', 'package.json'), 
  JSON.stringify(distPackageJson, null, 2)
);

// Step 6: Check and patch the built server file to handle module check safely
const serverPath = path.join(__dirname, 'dist', 'index.js');
if (fs.existsSync(serverPath)) {
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Fix the module check that's causing the error
  serverContent = serverContent.replace(
    'if (__require.main === module) {',
    'if (typeof module !== "undefined" && __require.main === module) {'
  );
  
  fs.writeFileSync(serverPath, serverContent);
  console.log('Patched server module check');
}

// Restore original package.json
if (fs.existsSync(packageJsonPath + '.backup')) {
  fs.copyFileSync(packageJsonPath + '.backup', packageJsonPath);
  fs.unlinkSync(packageJsonPath + '.backup');
  console.log('Restored original package.json');
}

console.log('Build completed successfully!');
