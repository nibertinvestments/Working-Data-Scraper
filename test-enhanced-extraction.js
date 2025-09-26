import { WebScraper } from './src/scraper/WebScraper.js';

async function testRealWorldScraping() {
    console.log('🔍 Testing real-world web scraping with enhanced algorithms...');
    
    const scraper = new WebScraper({
        timeout: 20000,
        extractEmails: true,
        extractPhones: true,
        extractNames: true
    });

    const testSites = [
        {
            name: 'GitHub About Page',
            url: 'https://github.com/about',
            expect: { emails: false, phones: false, names: true }
        },
        {
            name: 'HubSpot Contact Page',
            url: 'https://www.hubspot.com/company/contact',
            expect: { emails: true, phones: true, names: true }
        }
    ];

    try {
        await scraper.initialize();
        console.log('✅ WebScraper initialized successfully\n');

        for (const site of testSites) {
            console.log(`\n🌐 Testing: ${site.name}`);
            console.log(`📡 URL: ${site.url}`);
            console.log('⏱️  Scraping...');
            
            try {
                const result = await scraper.scrapeUrl(site.url);
                
                console.log('\n📊 RESULTS:');
                console.log(`   Title: ${result.title}`);
                console.log(`   Method: ${result.method}`);
                console.log(`   📧 Emails (${result.emails.length}):`, result.emails.slice(0, 3));
                console.log(`   📞 Phones (${result.phones.length}):`, result.phones.slice(0, 3));
                console.log(`   👤 Names (${result.names.length}):`, result.names.slice(0, 3));
                
                // Evaluation
                let score = 0;
                let total = 0;
                
                if (site.expect.emails) {
                    total++;
                    if (result.emails.length > 0) {
                        score++;
                        console.log('   ✅ Found emails as expected');
                    } else {
                        console.log('   ❌ Expected emails but found none');
                    }
                }
                
                if (site.expect.phones) {
                    total++;
                    if (result.phones.length > 0) {
                        score++;
                        console.log('   ✅ Found phones as expected');
                    } else {
                        console.log('   ❌ Expected phones but found none');
                    }
                }
                
                if (site.expect.names) {
                    total++;
                    if (result.names.length > 0) {
                        score++;
                        console.log('   ✅ Found names as expected');
                    } else {
                        console.log('   ❌ Expected names but found none');
                    }
                }
                
                const successRate = total > 0 ? (score / total * 100).toFixed(1) : 'N/A';
                console.log(`   🎯 Success Rate: ${successRate}% (${score}/${total})`);
                
            } catch (error) {
                console.error(`   ❌ Error scraping ${site.name}:`, error.message);
            }
            
            console.log('   ' + '─'.repeat(50));
        }
        
        // Test with mock HTML data to verify our extraction algorithms
        console.log('\n🧪 Testing extraction algorithms with mock data...');
        await testExtractionAlgorithms(scraper);
        
    } catch (error) {
        console.error('❌ Test setup failed:', error.message);
    } finally {
        await scraper.close();
        console.log('\n✅ Tests completed - WebScraper closed');
    }
}

async function testExtractionAlgorithms(scraper) {
    const mockHtml = `
    <html>
    <head><title>Test Company - Contact Information</title></head>
    <body>
        <header>
            <div class="contact-info">
                <p>Call us: (555) 123-4567</p>
                <p>Email: info@testcompany.com</p>
            </div>
        </header>
        <main>
            <section id="about">
                <h2>About Us</h2>
                <p>Founded by John Smith and Mary Johnson in 2020.</p>
                <p>Contact our CEO, Dr. Robert Wilson at rwilson@testcompany.com</p>
            </section>
            <section id="contact">
                <h2>Contact Information</h2>
                <p>Phone: +1 (800) 555-0199</p>
                <p>Fax: (555) 123-4568</p>
                <p>Email: <a href="mailto:support@testcompany.com">support@testcompany.com</a></p>
                <div class="team">
                    <p>Sales Manager: Sarah Davis</p>
                    <p>Technical Support: Mike Brown</p>
                </div>
            </section>
        </main>
        <footer>
            <p>&copy; 2023 Test Company. Contact us at hello@testcompany.com</p>
            <p>Emergency line: 1-800-HELP-NOW (1-800-435-7669)</p>
        </footer>
    </body>
    </html>`;

    const mockResult = {
        url: 'http://testcompany.com',
        title: 'Test Company - Contact Information',
        content: mockHtml,
        textContent: mockHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        method: 'mock',
        timestamp: new Date().toISOString()
    };

    const processedResult = await scraper.processScrapedData(mockResult);
    
    console.log('\n📊 Mock Data Extraction Results:');
    console.log(`   📧 Emails found: ${processedResult.emails.join(', ')}`);
    console.log(`   📞 Phones found: ${processedResult.phones.join(', ')}`);
    console.log(`   👤 Names found: ${processedResult.names.join(', ')}`);
    
    // Expected results
    const expectedEmails = ['info@testcompany.com', 'support@testcompany.com', 'hello@testcompany.com'];
    const expectedNames = ['John Smith', 'Mary Johnson', 'Robert Wilson', 'Sarah Davis', 'Mike Brown'];
    
    console.log('\n🎯 Algorithm Performance:');
    console.log(`   Email Detection: ${processedResult.emails.length >= 3 ? '✅' : '❌'} (Found ${processedResult.emails.length}, Expected ≥3)`);
    console.log(`   Phone Detection: ${processedResult.phones.length >= 2 ? '✅' : '❌'} (Found ${processedResult.phones.length}, Expected ≥2)`);
    console.log(`   Name Detection: ${processedResult.names.length >= 3 ? '✅' : '❌'} (Found ${processedResult.names.length}, Expected ≥3)`);
}

testRealWorldScraping().catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
});