/**
 * Test enhanced web scraping on contact-rich websites
 * Testing Scrapy and Crawlee-inspired extraction patterns
 */

import { WebScraper } from './src/scraper/WebScraper.js';

async function testContactRichSites() {
    console.log('=== Testing Enhanced Contact Extraction on Contact-Rich Sites ===\n');
    
    const scraper = new WebScraper({
        timeout: 25000,
        extractEmails: true,
        extractPhones: true,
        extractNames: true
    });

    try {
        await scraper.initialize();
        
        // Sites specifically known to have contact information
        const contactRichSites = [
            {
                url: 'https://www.mozilla.org/en-US/contact/',
                description: 'Mozilla Contact Page - Should have emails and names'
            },
            {
                url: 'https://www.elastic.co/about/leadership',
                description: 'Elastic Leadership - Should have executive names'
            },
            {
                url: 'https://www.docker.com/company/newsroom/media-resources/',
                description: 'Docker Media Resources - Often has media contact info'
            },
            {
                url: 'https://blog.cloudflare.com/author/matthew-prince/',
                description: 'Cloudflare CEO blog - Should extract name from profile'
            },
            {
                url: 'https://www.npmjs.com/support',
                description: 'NPM Support - Should have support contact methods'
            }
        ];

        let totalEmails = 0;
        let totalPhones = 0;
        let totalNames = 0;
        let successfulScrapes = 0;

        for (const site of contactRichSites) {
            console.log(`\n--- Testing: ${site.description} ---`);
            console.log(`URL: ${site.url}`);
            
            try {
                const result = await scraper.scrapeUrl(site.url, { 
                    timeout: 20000 
                });
                
                successfulScrapes++;
                console.log(`✅ Successfully scraped`);
                console.log(`Method: ${result.method}`);
                console.log(`Title: ${result.title?.substring(0, 60)}...`);
                
                // Count and display findings
                const emailCount = result.emails?.length || 0;
                const phoneCount = result.phones?.length || 0;
                const nameCount = result.names?.length || 0;
                
                totalEmails += emailCount;
                totalPhones += phoneCount;
                totalNames += nameCount;
                
                console.log(`\n📧 Emails found: ${emailCount}`);
                if (result.emails?.length > 0) {
                    result.emails.slice(0, 5).forEach(email => {
                        console.log(`  ✉️  ${email}`);
                    });
                }
                
                console.log(`\n📞 Phones found: ${phoneCount}`);
                if (result.phones?.length > 0) {
                    result.phones.slice(0, 5).forEach(phone => {
                        console.log(`  ☎️  ${phone}`);
                    });
                }
                
                console.log(`\n👤 Names found: ${nameCount}`);
                if (result.names?.length > 0) {
                    result.names.slice(0, 5).forEach(name => {
                        console.log(`  👨‍💼 ${name}`);
                    });
                }
                
                // Display metadata if available
                if (result.metadata) {
                    console.log(`\n📊 Quality Metrics:`);
                    if (result.metadata.emailDomains) {
                        console.log(`  - Email domains: ${result.metadata.emailDomains.join(', ')}`);
                    }
                    if (result.metadata.phoneFormats) {
                        console.log(`  - Phone formats detected: ${result.metadata.phoneFormats.join(', ')}`);
                    }
                    if (result.metadata.nameConfidence) {
                        console.log(`  - Average name confidence: ${Math.round(result.metadata.nameConfidence * 100)}%`);
                    }
                }
                
            } catch (error) {
                console.log(`❌ Failed to scrape: ${error.message}`);
                
                // Try static method as fallback
                try {
                    console.log(`  🔄 Trying static fallback...`);
                    const staticResult = await scraper.scrapeStatic(site.url);
                    const processed = await scraper.processScrapedData(staticResult);
                    
                    if (processed.emails?.length || processed.phones?.length || processed.names?.length) {
                        successfulScrapes++;
                        console.log(`  ✅ Static method found data:`);
                        console.log(`    📧 Emails: ${processed.emails?.length || 0}`);
                        console.log(`    📞 Phones: ${processed.phones?.length || 0}`);
                        console.log(`    👤 Names: ${processed.names?.length || 0}`);
                        
                        totalEmails += processed.emails?.length || 0;
                        totalPhones += processed.phones?.length || 0;
                        totalNames += processed.names?.length || 0;
                    } else {
                        console.log(`  ❌ Static method found no contacts`);
                    }
                } catch (staticError) {
                    console.log(`  ❌ Static method also failed: ${staticError.message}`);
                }
            }
            
            // Be respectful to servers
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Final summary
        console.log('\n' + '='.repeat(60));
        console.log('🎯 EXTRACTION RESULTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Successful scrapes: ${successfulScrapes}/${contactRichSites.length}`);
        console.log(`📧 Total emails extracted: ${totalEmails}`);
        console.log(`📞 Total phones extracted: ${totalPhones}`);
        console.log(`👤 Total names extracted: ${totalNames}`);
        console.log(`📊 Total contacts found: ${totalEmails + totalPhones + totalNames}`);
        
        if (successfulScrapes > 0) {
            console.log(`📈 Average contacts per successful scrape: ${Math.round((totalEmails + totalPhones + totalNames) / successfulScrapes)}`);
        }
        
        console.log('\n🚀 Enhanced patterns from Scrapy and Crawlee research are active!');
        console.log('   - RFC 5322 compliant email extraction');
        console.log('   - International phone number patterns');
        console.log('   - Name extraction with confidence scoring');
        console.log('   - Advanced validation and false positive filtering');

    } finally {
        await scraper.close();
        console.log('\n=== Contact-rich site testing completed ===');
    }
}

// Run the test
testContactRichSites().catch(console.error);