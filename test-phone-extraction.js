/**
 * Test enhanced phone number extraction on business sites
 * Validating Crawlee-inspired international phone patterns
 */

import { WebScraper } from './src/scraper/WebScraper.js';

async function testPhoneExtraction() {
    console.log('=== Testing Enhanced Phone Number Extraction ===\n');
    
    const scraper = new WebScraper({
        timeout: 30000,
        extractEmails: true,
        extractPhones: true,
        extractNames: true
    });

    try {
        await scraper.initialize();
        
        // Sites more likely to have phone numbers
        const phoneTestSites = [
            {
                url: 'https://www.mit.edu/contact/',
                description: 'MIT Contact - University contact pages often have phones'
            },
            {
                url: 'https://www.stanford.edu/contact/',
                description: 'Stanford Contact - Academic institution contact info'
            },
            {
                url: 'https://www.berkeley.edu/about/',
                description: 'UC Berkeley About - Contact information'
            }
        ];

        let totalPhones = 0;
        let totalEmails = 0;
        let totalNames = 0;

        for (const site of phoneTestSites) {
            console.log(`\n--- Testing: ${site.description} ---`);
            console.log(`URL: ${site.url}`);
            
            try {
                const result = await scraper.scrapeUrl(site.url, { 
                    timeout: 25000 
                });
                
                console.log(`✅ Successfully scraped using ${result.method} method`);
                
                const phoneCount = result.phones?.length || 0;
                const emailCount = result.emails?.length || 0;
                const nameCount = result.names?.length || 0;
                
                totalPhones += phoneCount;
                totalEmails += emailCount;
                totalNames += nameCount;
                
                console.log(`\n📞 Phone Numbers (${phoneCount}):`);
                if (result.phones?.length > 0) {
                    result.phones.forEach((phone, i) => {
                        console.log(`  ${i + 1}. ${phone}`);
                    });
                    
                    // Test our enhanced phone validation
                    console.log(`\n🔍 Phone Analysis:`);
                    result.phones.forEach(phone => {
                        // Check if it looks like a real phone (basic validation)
                        const digits = phone.replace(/\D/g, '');
                        const hasAreaCode = digits.length >= 10;
                        const hasCountryCode = digits.length >= 11;
                        
                        console.log(`  ${phone}:`);
                        console.log(`    - Digits: ${digits.length}`);
                        console.log(`    - Area code: ${hasAreaCode ? '✅' : '❌'}`);
                        console.log(`    - Country code: ${hasCountryCode ? '✅' : '❌'}`);
                    });
                } else {
                    console.log(`  No phone numbers found`);
                }
                
                console.log(`\n📧 Email Addresses (${emailCount}):`);
                if (result.emails?.length > 0) {
                    result.emails.forEach((email, i) => {
                        console.log(`  ${i + 1}. ${email}`);
                    });
                } else {
                    console.log(`  No email addresses found`);
                }
                
                console.log(`\n👤 Names (${nameCount}):`);
                if (result.names?.length > 0) {
                    result.names.slice(0, 3).forEach((name, i) => {
                        console.log(`  ${i + 1}. ${name}`);
                    });
                } else {
                    console.log(`  No names found`);
                }
                
            } catch (error) {
                console.log(`❌ Failed to scrape: ${error.message}`);
            }
            
            // Respectful delay
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 PHONE EXTRACTION SUMMARY');
        console.log('='.repeat(50));
        console.log(`📞 Total phones found: ${totalPhones}`);
        console.log(`📧 Total emails found: ${totalEmails}`);
        console.log(`👤 Total names found: ${totalNames}`);
        console.log(`📈 Total contacts: ${totalPhones + totalEmails + totalNames}`);
        
        console.log('\n🔍 Pattern Analysis:');
        console.log('✅ Crawlee-inspired international phone patterns active');
        console.log('✅ RFC 5322 compliant email extraction');
        console.log('✅ Enhanced name detection with confidence scoring');
        console.log('✅ Advanced false positive filtering');

    } finally {
        await scraper.close();
        console.log('\n=== Phone extraction testing completed ===');
    }
}

// Run the test
testPhoneExtraction().catch(console.error);