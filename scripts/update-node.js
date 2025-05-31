#!/usr/bin/env node

const { execSync } = require('child_process');
const semver = require('semver');
const fs = require('fs');
const path = require('path');

// Function to get latest LTS version from nodejs.org
async function getLatestLTSVersion() {
    try {
        const response = await fetch('https://nodejs.org/dist/index.json');
        const data = await response.json();
        const ltsVersions = data.filter(v => v.lts);
        return ltsVersions[0].version.slice(1); // Remove 'v' prefix
    } catch (error) {
        console.error('Error fetching latest LTS version:', error);
        return '20.19.2'; // Fallback to current version
    }
}

// Function to update package.json files
function updatePackageJsonFiles(version) {
    const files = [
        path.join(__dirname, '../backend/package.json'),
        path.join(__dirname, '../frontend/package.json'),
        path.join(__dirname, '../package.json')
    ];

    files.forEach(file => {
        if (fs.existsSync(file)) {
            const content = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (content.engines) {
                content.engines.node = `>=${version}`;
                fs.writeFileSync(file, JSON.stringify(content, null, 2) + '\n');
                console.log(`Updated ${file} to require Node.js >=${version}`);
            }
        }
    });
}

async function main() {
    try {
        // Get current Node.js version
        const currentVersion = process.version.slice(1);
        console.log('Current Node.js version:', currentVersion);

        // Accept Node.js 20.x as valid
        if (currentVersion.startsWith('20.')) {
            console.log('Node.js version 20.x is supported. No update needed.');
            return;
        }

        // Get latest LTS version
        const latestLTS = await getLatestLTSVersion();
        console.log('Latest LTS version:', latestLTS);

        if (currentVersion !== latestLTS) {
            console.log(`Node.js update required. Current: ${currentVersion}, Latest LTS: ${latestLTS}`);
            console.log('\nPlease update Node.js using one of these methods:');
            console.log('\n1. Using nvm (recommended):');
            console.log('   nvm install --lts');
            console.log('   nvm use --lts');
            console.log('\n2. Download from nodejs.org:');
            console.log('   Visit https://nodejs.org/ and download the LTS version');
            console.log('\nAfter updating, run this script again to verify the installation.');
            
            // Update package.json files to reflect new version requirement
            updatePackageJsonFiles(latestLTS);
            
            process.exit(1);
        } else {
            console.log('Node.js is up to date!');
            updatePackageJsonFiles(latestLTS);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main(); 