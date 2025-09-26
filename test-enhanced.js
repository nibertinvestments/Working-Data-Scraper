const EnhancedWebScraper = require('./src/scraper/EnhancedWebScraper.js');

async function testEnhancedScraper() {
    console.log('Testing Enhanced Web Scraper...');
    
    const scraper = new EnhancedWebScraper({
        headless: true,
        maxDepth: 2,
        maxPages: 5,
        respectRobots: true,
        userAgent: 'Enhanced-Scraper/1.0',
        proxyConfig: {
            type: 'http', // Start with http proxy for testing
            host: null,   // No proxy for initial test
            port: null,
            username: null,
            password: null
        }
    });

    try {
        console.log('Starting crawl of a test website...');
        
        // Test on a simple website first
        const results = await scraper.crawlWebsite('https://httpbin.org/html');
        
        console.log('Crawl Results:');
        console.log('Pages scraped:', results.pages);
        console.log('Total contacts found:');
        console.log('- Emails:', results.aggregatedData.emails);
        console.log('- Phones:', results.aggregatedData.phones);
        console.log('- Names:', results.aggregatedData.names);
        
        console.log('\nTest completed successfully!');
        
    } catch (error) {
        console.error('Test failed:', error.message);
        console.error(error.stack);
    }
}

testEnhancedScraper();