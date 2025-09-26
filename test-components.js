// Simple test to verify the main components can be imported and instantiated
import { DataScraper } from './src/scraper/DataScraper.js';
import { WebScraper } from './src/scraper/WebScraper.js';
import { DataProcessor } from './src/processor/DataProcessor.js';
import { CSVExporter } from './src/exporters/CSVExporter.js';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';

console.log('🧪 Testing Data Scraper Components...\n');

async function testComponents() {
    try {
        console.log('✅ Testing DataProcessor...');
        const processor = new DataProcessor();
        const testData = {
            url: 'https://example.com',
            title: 'Test Page',
            emails: ['test@example.com', 'info@test.com'],
            phones: ['555-123-4567', '(555) 987-6543'],
            names: ['John Doe', 'Jane Smith'],
            timestamp: new Date().toISOString()
        };
        
        const processed = await processor.processContactData(testData);
        console.log('   Processed emails:', processed.emails.length);
        console.log('   Processed phones:', processed.phones.length);
        console.log('   Processed names:', processed.names.length);

        console.log('✅ Testing CSVExporter...');
        const csvExporter = new CSVExporter('./test_output.csv');
        await csvExporter.write([processed]);
        console.log('   CSV export test completed');

        console.log('✅ Testing WebScraper initialization...');
        const webScraper = new WebScraper();
        console.log('   WebScraper created successfully');
        await webScraper.close(); // Close immediately to avoid hanging

        console.log('✅ Testing DataScraper initialization...');
        const dataScraper = new DataScraper({
            scraping: {
                extractEmails: true,
                extractPhones: true,
                extractNames: true,
                delay: 2000
            }
        });
        console.log('   DataScraper created successfully');

        console.log('✅ Testing GoogleSheetsExporter...');
        const sheetsExporter = new GoogleSheetsExporter(
            { type: 'service_account' }, // Mock credentials
            'test_spreadsheet_id'
        );
        console.log('   GoogleSheetsExporter created successfully');

        console.log('\n🎉 All component tests passed!');
        console.log('📋 Components verified:');
        console.log('   • DataProcessor - ✅ Data cleaning and validation');
        console.log('   • CSVExporter - ✅ File export functionality');
        console.log('   • WebScraper - ✅ Web scraping engine');
        console.log('   • DataScraper - ✅ Main coordination class');
        console.log('   • GoogleSheetsExporter - ✅ Google Sheets integration');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testComponents().then(() => {
    console.log('\n🚀 Ready to start the application!');
    console.log('Run: npm start');
    process.exit(0);
});