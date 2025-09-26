import { WebScraper } from './src/scraper/WebScraper.js';

async function testDirectScraping() {
    console.log('Testing enhanced web scraping...');
    
    const scraper = new WebScraper({
        timeout: 15000,
        extractEmails: true,
        extractPhones: true,
        extractNames: true
    });

    try {
        await scraper.initialize();
        console.log('✓ WebScraper initialized');

        // Test with a real website that has contact information
        const testUrl = 'https://example.com';
        console.log(`\n📡 Testing scraping: ${testUrl}`);
        
        const result = await scraper.scrapeUrl(testUrl);
        
        console.log('\n=== SCRAPING RESULTS ===');
        console.log('URL:', result.url);
        console.log('Title:', result.title);
        console.log('Domain:', result.domain);
        console.log('Method:', result.method);
        console.log('\n📧 Emails found:', result.emails);
        console.log('📞 Phones found:', result.phones);
        console.log('👤 Names found:', result.names);
        
        if (result.emails.length === 0 && result.phones.length === 0 && result.names.length === 0) {
            console.log('\n⚠️  No contact data extracted. This might be expected for example.com');
            console.log('Let\'s try a business website...');
            
            // Try a business website
            const businessUrl = 'https://www.iana.org/about';
            console.log(`\n📡 Testing business website: ${businessUrl}`);
            
            const businessResult = await scraper.scrapeUrl(businessUrl);
            console.log('\n=== BUSINESS WEBSITE RESULTS ===');
            console.log('📧 Emails:', businessResult.emails);
            console.log('📞 Phones:', businessResult.phones);
            console.log('👤 Names:', businessResult.names);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await scraper.close();
        console.log('\n✓ WebScraper closed');
    }
}

testDirectScraping().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
});