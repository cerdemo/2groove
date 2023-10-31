const fs = require('fs');

// Load the package.txt file
const packagesTxt = fs.readFileSync('packages.txt', 'utf8');
const packagesData = JSON.parse(packagesTxt);

// Load the current package.json file
const packageJson = require('./package.json');

// Update package.json with dependencies from packagesData
packageJson.dependencies = packagesData.dependencies;

// Write the updated package.json back to the file
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

console.log('Updated package.json with dependencies from package.txt.');
