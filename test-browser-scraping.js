/**
 * Test enhanced web scraping on real websites with actual browser automation
 */

import { EnhancedWebScraper } from './src/scraper/EnhancedWebScraper.js';

async function testRealWebsites() {
    console.log('🚀 Testing Enhanced Web Scraper on REAL websites with browser automation...\n');
    
    const scraper = new EnhancedWebScraper({
        headless: false,  // Show browser so we can see what's happening
        maxDepth: 1,
        maxPages: 1,
        respectRobots: false,  // We're testing, not production
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Real business websites that should have contact info
    const testWebsites = [
        {
            url: 'https://www.whitehouse.gov/contact/',
            name: 'White House Contact',
            expectEmails: true,
            expectPhones: true
        },
        {
            url: 'https://www.harvard.edu/contact-harvard/',
            name: 'Harvard Contact',
            expectEmails: true,
            expectPhones: true
        },
        {
            url: 'https://www.github.com/contact',
            name: 'GitHub Contact',
            expectEmails: true,
            expectPhones: false
        }
    ];

    for (const site of testWebsites) {
        try {
            console.log(`\n📍 Testing: ${site.name}`);
            console.log(`   URL: ${site.url}`);
            console.log('=' .repeat(80));
            
            const startTime = Date.now();
            const result = await scraper.scrapeSinglePage(site.url);
            const duration = Date.now() - startTime;
            
            console.log(`✅ Scraped successfully in ${duration}ms`);
            console.log(`📧 Emails found: ${result.emails?.length || 0}`);
            if (result.emails && result.emails.length > 0) {
                result.emails.forEach(email => console.log(`   📧 ${email}`));
            }
            
            console.log(`📱 Phones found: ${result.phones?.length || 0}`);
            if (result.phones && result.phones.length > 0) {
                result.phones.forEach(phone => console.log(`   📱 ${phone}`));
            }
            
            console.log(`👤 Names found: ${result.names?.length || 0}`);
            if (result.names && result.names.length > 0) {
                result.names.forEach(name => console.log(`   👤 ${name}`));
            }
            
            // Validation
            if (site.expectEmails && (!result.emails || result.emails.length === 0)) {
                console.log('⚠️  Expected emails but found none');
            }
            if (site.expectPhones && (!result.phones || result.phones.length === 0)) {
                console.log('⚠️  Expected phones but found none');
            }
            
            // Brief pause between requests
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (error) {
            console.error(`❌ Failed to scrape ${site.name}:`);
            console.error(`   URL: ${site.url}`);
            console.error(`   Error: ${error.message}`);
            
            // Show stack trace for debugging
            if (error.stack) {
                console.error(`   Stack: ${error.stack.split('\n')[1]?.trim()}`);
            }
        }
    }
    
    console.log('\n🏁 Real website browser testing completed!');
    process.exit(0);
}

testRealWebsites().catch(error => {
    console.error('💥 Test crashed:', error.message);
    console.error(error.stack);
    process.exit(1);
});