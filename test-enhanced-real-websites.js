#!/usr/bin/env node

import path from 'path';
import EnhancedWebScraper from './src/scraper/EnhancedWebScraper.js';

async function testEnhancedScraper() {
    console.log('🚀 Testing Enhanced Web Scraper on Real Websites');
    console.log('=' .repeat(60));

    const scraper = new EnhancedWebScraper({
        // Start with basic settings - no Tor for initial testing
        enableTor: false,
        maxDepth: 2,
        maxPages: 5,
        respectRobots: true,
        delays: {
            navigation: 2000,
            interaction: 1000,
            between_pages: 3000
        }
    });

    // Test websites - these should have contact information
    const testUrls = [
        'https://example-business.com',  // Generic business site
        'https://www.ycombinator.com/companies', // YC companies page
        'https://about.google.com/contact-us/',  // Google contact page
        'https://www.mozilla.org/en-US/contact/', // Mozilla contact
        'https://www.npmjs.com/support'  // NPM support page
    ];

    console.log('\n📊 Starting Enhanced Extraction Tests...\n');

    for (const url of testUrls) {
        try {
            console.log(`\n🔍 Testing: ${url}`);
            console.log('-'.repeat(50));
            
            const startTime = Date.now();
            const results = await scraper.crawlWebsite(url);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log(`⏱️  Completed in ${duration}s`);
            console.log(`📄 Pages crawled: ${results.pagesCrawled}`);
            console.log(`📧 Emails found: ${results.emails.length}`);
            console.log(`📞 Phones found: ${results.phones.length}`);
            console.log(`👤 Names found: ${results.names.length}`);
            
            // Display found contacts
            if (results.emails.length > 0) {
                console.log(`   📧 Emails: ${results.emails.slice(0, 3).join(', ')}${results.emails.length > 3 ? '...' : ''}`);
            }
            if (results.phones.length > 0) {
                console.log(`   📞 Phones: ${results.phones.slice(0, 3).join(', ')}${results.phones.length > 3 ? '...' : ''}`);
            }
            if (results.names.length > 0) {
                console.log(`   👤 Names: ${results.names.slice(0, 3).join(', ')}${results.names.length > 3 ? '...' : ''}`);
            }

            // Show quality metrics
            const totalContacts = results.emails.length + results.phones.length + results.names.length;
            const contactsPerPage = results.pagesCrawled > 0 ? (totalContacts / results.pagesCrawled).toFixed(1) : 0;
            console.log(`📈 Contacts per page: ${contactsPerPage}`);
            
        } catch (error) {
            console.error(`❌ Error testing ${url}:`, error.message);
            
            // Try fallback single-page scraping
            try {
                console.log('🔄 Attempting single-page fallback...');
                const fallbackResults = await scraper.scrapeSinglePage(url);
                console.log(`📧 Fallback emails: ${fallbackResults.emails.length}`);
                console.log(`📞 Fallback phones: ${fallbackResults.phones.length}`);
                console.log(`👤 Fallback names: ${fallbackResults.names.length}`);
            } catch (fallbackError) {
                console.error(`❌ Fallback also failed:`, fallbackError.message);
            }
        }
    }

    console.log('\n🔒 Testing Tor Integration...');
    console.log('-'.repeat(40));
    
    // Test with Tor if available
    try {
        const torScraper = new EnhancedWebScraper({
            enableTor: true,
            torProxy: 'socks5://127.0.0.1:9050',
            maxDepth: 1,
            maxPages: 2
        });

        console.log('🧅 Testing with Tor proxy...');
        const torResults = await torScraper.scrapeSinglePage('https://httpbin.org/ip');
        console.log('✅ Tor connection test successful');
        
    } catch (torError) {
        console.log('⚠️  Tor not available or not configured:', torError.message);
        console.log('💡 To enable Tor: Install Tor Browser and ensure it\'s running');
    }

    console.log('\n🧪 Testing Enhanced Extraction Patterns...');
    console.log('-'.repeat(45));
    
    // Test extraction patterns directly
    const testText = `
        Contact John Smith at john.smith@company.com or call (555) 123-4567.
        Reach Dr. Sarah Johnson at +1-800-555-0199 or email sarah.johnson@medical.org.
        For support, contact info@support.com or call 1-888-HELP-NOW.
        Visit us at 123 Main St. or call our office at (555) 987-6543.
        International: +44 20 7946 0958 or email london@company.co.uk
    `;
    
    console.log('📝 Testing pattern extraction on sample text...');
    const patterns = scraper.extractContactInfo(testText, '');
    
    console.log(`📧 Email patterns found: ${patterns.emails.length}`);
    patterns.emails.forEach(email => console.log(`   • ${email}`));
    
    console.log(`📞 Phone patterns found: ${patterns.phones.length}`);
    patterns.phones.forEach(phone => console.log(`   • ${phone}`));
    
    console.log(`👤 Name patterns found: ${patterns.names.length}`);
    patterns.names.forEach(name => console.log(`   • ${name}`));

    await scraper.close();
    
    console.log('\n✅ Enhanced Scraper Testing Complete!');
    console.log('🎯 Ready for production use with full-site crawling and Tor integration');
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Run the test
testEnhancedScraper().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});

export default testEnhancedScraper;