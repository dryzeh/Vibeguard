#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function updatePackages(directory) {
    console.log(`\nUpdating packages in ${directory}...`);
    try {
        // Clean install
        execSync('rm -rf node_modules package-lock.json', { cwd: directory, stdio: 'inherit' });
        
        // Update all packages to latest versions
        execSync('npm install --save-exact', { cwd: directory, stdio: 'inherit' });
        
        // Update specific packages that need to be latest
        const packageJson = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
        
        if (directory.includes('backend')) {
            execSync('npm install typescript@latest @types/node@latest', { cwd: directory, stdio: 'inherit' });
        } else if (directory.includes('frontend')) {
            execSync('npm install typescript@latest @types/react@latest @types/react-native@latest', { cwd: directory, stdio: 'inherit' });
            execSync('npm run update-expo-cli && npm run upgrade-expo', { cwd: directory, stdio: 'inherit' });
        }
        
        console.log(`✅ Successfully updated packages in ${directory}`);
    } catch (error) {
        console.error(`❌ Error updating packages in ${directory}:`, error);
        process.exit(1);
    }
}

function main() {
    const rootDir = path.join(__dirname, '..');
    const backendDir = path.join(rootDir, 'backend');
    const frontendDir = path.join(rootDir, 'frontend');

    // Update root packages first
    console.log('\nUpdating root packages...');
    try {
        execSync('npm install --save-exact', { cwd: rootDir, stdio: 'inherit' });
        console.log('✅ Successfully updated root packages');
    } catch (error) {
        console.error('❌ Error updating root packages:', error);
        process.exit(1);
    }

    // Update backend and frontend packages
    updatePackages(backendDir);
    updatePackages(frontendDir);

    console.log('\n🎉 All packages have been updated successfully!');
    console.log('\nNext steps:');
    console.log('1. Run tests to ensure everything works: npm test');
    console.log('2. Start the development servers: npm run dev');
}

main(); 