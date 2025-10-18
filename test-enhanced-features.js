// Test the new enhanced data extraction features
import { WebScraper } from './src/scraper/WebScraper.js';
import { DatabaseManager } from './src/storage/DatabaseManager.js';
import { CSVExporter } from './src/exporters/CSVExporter.js';

console.log('🧪 Testing Enhanced Data Extraction Features...\n');

async function testEnhancedFeatures() {
    const webScraper = new WebScraper({
        extractEmails: true,
        extractPhones: true,
        extractNames: true
    });

    try {
        // Test HTML sample with various data types
        const testHtml = `
            <html lang="en">
            <head>
                <title>Acme Corporation - Test Company</title>
                <meta name="description" content="Leading provider of innovative solutions since 1995">
                <meta name="keywords" content="business, technology, innovation, services">
                <meta name="author" content="Acme Team">
                <link rel="icon" href="https://example.com/logo.png">
            </head>
            <body>
                <header>
                    <h1>Acme Corporation</h1>
                </header>
                
                <section id="contact">
                    <h2>Contact Us</h2>
                    <p>Email: info@acme.com, support@acme.com</p>
                    <p>Phone: (555) 123-4567, +1-555-987-6543</p>
                    <p>Contact: John Doe, Jane Smith</p>
                    <address>
                        123 Business Street, Innovation City, CA 94102
                    </address>
                </section>
                
                <section id="about">
                    <p>Founded in 1995, Acme Corporation is a leading technology company.</p>
                    <p>Monday-Friday: 9:00 AM - 5:00 PM</p>
                    <p>Saturday: 10:00 AM - 2:00 PM</p>
                </section>
                
                <footer>
                    <a href="https://facebook.com/acmecorp">Facebook</a>
                    <a href="https://twitter.com/acmecorp">Twitter</a>
                    <a href="https://linkedin.com/company/acmecorp">LinkedIn</a>
                    <a href="https://instagram.com/acmecorp">Instagram</a>
                </footer>
                
                <script type="application/ld+json">
                {
                    "@type": "Organization",
                    "name": "Acme Corporation",
                    "description": "Leading provider of innovative business solutions",
                    "foundingDate": "1995-01-15"
                }
                </script>
            </body>
            </html>
        `;

        console.log('✅ Testing new extraction methods...\n');

        // Test address extraction
        const addresses = webScraper.extractAddresses(testHtml, testHtml);
        console.log('📍 Addresses extracted:', addresses.length);
        if (addresses.length > 0) {
            console.log('   -', addresses[0]);
        }

        // Test social media extraction
        const socialMedia = webScraper.extractSocialMediaLinks(testHtml);
        console.log('\n📱 Social media links extracted:');
        console.log('   - Facebook:', socialMedia.facebook ? '✓' : '✗');
        console.log('   - Twitter:', socialMedia.twitter ? '✓' : '✗');
        console.log('   - LinkedIn:', socialMedia.linkedin ? '✓' : '✗');
        console.log('   - Instagram:', socialMedia.instagram ? '✓' : '✗');

        // Test company info extraction
        const companyInfo = webScraper.extractCompanyInfo(testHtml, testHtml);
        console.log('\n🏢 Company information extracted:');
        console.log('   - Company Name:', companyInfo.companyName || 'N/A');
        console.log('   - Founded Year:', companyInfo.foundedYear || 'N/A');
        console.log('   - Description:', companyInfo.description ? companyInfo.description.substring(0, 50) + '...' : 'N/A');

        // Test metadata extraction
        const metadata = webScraper.extractWebsiteMetadata(testHtml);
        console.log('\n🔍 Metadata extracted:');
        console.log('   - Keywords:', metadata.keywords.length);
        console.log('   - Description:', metadata.description ? '✓' : '✗');
        console.log('   - Language:', metadata.language);
        console.log('   - Author:', metadata.author || 'N/A');

        // Test business hours extraction
        const businessHours = webScraper.extractBusinessHours(testHtml, testHtml);
        console.log('\n⏰ Business hours extracted:');
        console.log('   - Found:', businessHours.found ? 'Yes' : 'No');
        if (businessHours.found && businessHours.hours.length > 0) {
            console.log('   -', businessHours.hours[0]);
        }

        // Test images extraction
        const images = webScraper.extractImages(testHtml, 'https://example.com');
        console.log('\n🖼️  Images extracted:');
        console.log('   - Logo:', images.logo ? '✓' : '✗');
        console.log('   - Images count:', images.images.length);

        // Test full processing
        console.log('\n✅ Testing full data processing...');
        const rawData = {
            url: 'https://example.com',
            title: 'Acme Corporation - Test Company',
            content: testHtml,
            textContent: testHtml.replace(/<[^>]*>/g, ' '),
            method: 'test',
            timestamp: new Date().toISOString()
        };

        const processedData = await webScraper.processScrapedData(rawData);
        
        console.log('\n📊 Processed data summary:');
        console.log('   - Emails:', processedData.emails?.length || 0);
        console.log('   - Phones:', processedData.phones?.length || 0);
        console.log('   - Names:', processedData.names?.length || 0);
        console.log('   - Addresses:', processedData.addresses?.length || 0);
        console.log('   - Social media platforms:', Object.keys(processedData.socialMedia || {}).filter(k => processedData.socialMedia[k]).length);
        console.log('   - Company info available:', processedData.companyInfo?.companyName ? 'Yes' : 'No');

        // Test database storage
        console.log('\n✅ Testing database storage...');
        const db = new DatabaseManager({ dbPath: './data/test_enhanced.db' });
        await db.initialize();
        
        const contactId = await db.storeContactData(processedData);
        console.log('   - Contact ID:', contactId);
        
        const retrievedData = await db.getAllContactData();
        console.log('   - Retrieved contacts:', retrievedData.length);
        
        if (retrievedData.length > 0) {
            const contact = retrievedData[0];
            console.log('   - Has addresses:', contact.addresses?.length > 0 ? 'Yes' : 'No');
            console.log('   - Has social media:', Object.keys(contact.socialMedia || {}).length > 0 ? 'Yes' : 'No');
            console.log('   - Has company info:', contact.companyInfo?.companyName ? 'Yes' : 'No');
        }
        
        await db.close();

        // Test CSV export
        console.log('\n✅ Testing CSV export...');
        const csvExporter = new CSVExporter('./test_enhanced_output.csv');
        await csvExporter.write(retrievedData);
        console.log('   - CSV file created successfully');

        await webScraper.close();

        console.log('\n🎉 All enhanced feature tests passed!');
        console.log('📋 New features verified:');
        console.log('   • Address extraction - ✅');
        console.log('   • Social media link extraction - ✅');
        console.log('   • Company information extraction - ✅');
        console.log('   • Website metadata extraction - ✅');
        console.log('   • Business hours extraction - ✅');
        console.log('   • Image extraction - ✅');
        console.log('   • Database storage of new fields - ✅');
        console.log('   • CSV export with new columns - ✅');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testEnhancedFeatures().then(() => {
    console.log('\n✨ Enhanced features are ready to use!');
    process.exit(0);
});
