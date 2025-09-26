#!/usr/bin/env node
/**
 * Setup and Installation Verification Script
 * Checks system requirements and verifies the installation
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

console.log('🔍 Data Scraper - Setup Verification\n');

const requirements = {
    nodeVersion: '22.0.0',
    supportedPlatforms: ['win32', 'darwin', 'linux']
};

function checkNodeVersion() {
    const currentVersion = process.version;
    const major = parseInt(currentVersion.split('.')[0].replace('v', ''));
    const required = parseInt(requirements.nodeVersion.split('.')[0]);
    
    console.log(`📦 Node.js Version: ${currentVersion}`);
    
    if (major >= required) {
        console.log('   ✅ Node.js version is compatible\n');
        return true;
    } else {
        console.log(`   ❌ Node.js ${requirements.nodeVersion}+ required\n`);
        return false;
    }
}

function checkPlatform() {
    const platform = process.platform;
    console.log(`💻 Platform: ${platform}`);
    
    if (requirements.supportedPlatforms.includes(platform)) {
        console.log('   ✅ Platform is supported\n');
        return true;
    } else {
        console.log('   ❌ Platform not fully supported\n');
        return false;
    }
}

function checkDirectories() {
    console.log('📁 Creating required directories...');
    
    const dirs = [
        './data',
        './exports',
        './logs',
        './credentials'
    ];
    
    let created = 0;
    dirs.forEach(dir => {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
            console.log(`   ✅ Created: ${dir}`);
            created++;
        } else {
            console.log(`   ✓ Exists: ${dir}`);
        }
    });
    
    if (created > 0) {
        console.log(`   📂 Created ${created} new directories\n`);
    } else {
        console.log('   📂 All directories exist\n');
    }
    
    return true;
}

function checkBrowsers() {
    console.log('🌐 Checking for supported browsers...');
    
    const browsers = {
        'Google Chrome': ['chrome.exe', '/Applications/Google Chrome.app', 'google-chrome'],
        'Mozilla Firefox': ['firefox.exe', '/Applications/Firefox.app', 'firefox'],
        'Microsoft Edge': ['msedge.exe', '/Applications/Microsoft Edge.app', 'microsoft-edge']
    };
    
    let foundBrowsers = 0;
    
    Object.entries(browsers).forEach(([name, paths]) => {
        let found = false;
        for (const path of paths) {
            try {
                if (process.platform === 'win32') {
                    execSync(`where ${path.split('.')[0]}`, { stdio: 'pipe' });
                    found = true;
                    break;
                } else if (process.platform === 'darwin') {
                    if (path.startsWith('/Applications')) {
                        if (existsSync(path)) {
                            found = true;
                            break;
                        }
                    } else {
                        execSync(`which ${path}`, { stdio: 'pipe' });
                        found = true;
                        break;
                    }
                } else {
                    execSync(`which ${path}`, { stdio: 'pipe' });
                    found = true;
                    break;
                }
            } catch (e) {
                // Browser not found, continue checking
            }
        }
        
        if (found) {
            console.log(`   ✅ ${name} found`);
            foundBrowsers++;
        } else {
            console.log(`   ⚠️  ${name} not found`);
        }
    });
    
    console.log(`   🌐 Found ${foundBrowsers} supported browsers\n`);
    return foundBrowsers > 0;
}

function displayUsageInstructions() {
    console.log('🚀 Getting Started:\n');
    console.log('1. Start the application:');
    console.log('   npm start\n');
    console.log('2. Click "Start Scraping" in the app');
    console.log('3. Browse websites normally');
    console.log('4. Watch contact data appear automatically');
    console.log('5. Export data using CSV or Google Sheets\n');
    
    console.log('⚙️  Configuration (Optional):\n');
    console.log('• Copy .env.example to .env for custom settings');
    console.log('• Access Settings in the app for Google Sheets integration');
    console.log('• Adjust scraping preferences as needed\n');
    
    console.log('📚 Documentation:');
    console.log('• See DATA_SCRAPER_README.md for detailed instructions');
    console.log('• Check the assets/ folder for icon information\n');
}

async function runSetupCheck() {
    let allPassed = true;
    
    // Check requirements
    allPassed &= checkNodeVersion();
    allPassed &= checkPlatform();
    allPassed &= checkDirectories();
    allPassed &= checkBrowsers();
    
    if (allPassed) {
        console.log('✨ Setup verification completed successfully!\n');
        displayUsageInstructions();
        
        console.log('🎯 Quick Test:');
        console.log('   npm test    # Test all components');
        console.log('   npm start   # Launch the application\n');
        
    } else {
        console.log('❌ Setup verification failed. Please address the issues above.\n');
        process.exit(1);
    }
}

// Run the setup check
runSetupCheck().catch(error => {
    console.error('❌ Setup check failed:', error.message);
    process.exit(1);
});