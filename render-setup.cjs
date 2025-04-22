// render-setup.cjs - CommonJS script to set up Render environment
const fs = require('fs');
const path = require('path');

console.log('Setting up Render environment...');

// Read the original package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const originalPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add type:module
originalPackageJson.type = 'module';

// Write the modified package.json back
fs.writeFileSync(packageJsonPath, JSON.stringify(originalPackageJson, null, 2));

console.log('Successfully added "type": "module" to package.json');
