/**
 * Test enhanced web scraping on real websites and export to Google Sheets
 * Uses .env configuration for Google Sheets integration
 */

import { EnhancedWebScraper } from './src/scraper/EnhancedWebScraper.js';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testGoogleSheetsConnection() {
    console.log('🔍 Testing Google Sheets connection...\n');
    
    // Load configuration from .env
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '15rFNiDyUtp89RijmXNJidzon5RUpgdCalkU1JxeUNJY';
    const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH || './credentials/google-sheets-credentials.json';
    
    console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
    console.log(`🔑 Credentials Path: ${credentialsPath}`);
    
    if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Google Sheets credentials not found at: ${credentialsPath}`);
    }
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log(`📧 Service Account: ${credentials.client_email}`);
    console.log(`🔗 Spreadsheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    
    // Test connection
    console.log('\n⚡ Testing Google Sheets connection...');
    const sheetsExporter = new GoogleSheetsExporter(credentials, spreadsheetId);
    
    try {
        await sheetsExporter.initialize();
        console.log('✅ Google Sheets connection successful!');
        
        const connectionTest = await sheetsExporter.testConnection();
        if (connectionTest.success) {
            console.log(`✅ Spreadsheet "${connectionTest.spreadsheetTitle}" is accessible`);
            console.log(`📄 Number of sheets: ${connectionTest.sheetCount}`);
        }
        
        return sheetsExporter;
        
    } catch (error) {
        console.error('❌ Google Sheets connection failed:', error.message);
        console.log('\n🛠️  To fix this:');
        console.log('1. Open the Google Sheets URL above');
        console.log('2. Click "Share" button');
        console.log(`3. Add this email with Editor access: ${credentials.client_email}`);
        console.log('4. Click "Send"');
        throw error;
    }
}

async function scrapeRealWebsitesAndExport() {
    console.log('🚀 Starting Real Website Scraping → Google Sheets Export Test...\n');
    
    // Test Google Sheets connection first
    const sheetsExporter = await testGoogleSheetsConnection();
    
    // Initialize enhanced scraper
    console.log('\n🔍 Initializing Enhanced Web Scraper...');
    const scraper = new EnhancedWebScraper({
        headless: true,  // Run headless for better performance
        maxDepth: 1,
        maxPages: 1,
        respectRobots: false,  // Testing mode
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Real business websites to scrape for contact data
    const testWebsites = [
        {
            url: 'https://www.whitehouse.gov/contact/',
            name: 'White House Contact Page',
            expectedContacts: 'Government contact information'
        },
        {
            url: 'https://www.harvard.edu/contact-harvard/',
            name: 'Harvard University Contact',
            expectedContacts: 'University phone numbers and emails'
        },
        {
            url: 'https://www.github.com/contact',
            name: 'GitHub Support Contact',
            expectedContacts: 'Tech company support information'
        }
    ];

    const allScrapedData = [];
    let successCount = 0;
    let totalContacts = { emails: 0, phones: 0, names: 0 };

    console.log('\n📍 Starting website scraping...');
    console.log('='.repeat(80));

    for (let i = 0; i < testWebsites.length; i++) {
        const site = testWebsites[i];
        
        try {
            console.log(`\n${i + 1}/${testWebsites.length}. 🌐 ${site.name}`);
            console.log(`   URL: ${site.url}`);
            console.log(`   Expected: ${site.expectedContacts}`);
            console.log('─'.repeat(60));
            
            const startTime = Date.now();
            const result = await scraper.scrapeSinglePage(site.url);
            const duration = Date.now() - startTime;
            
            // Format the data for Google Sheets export
            const contactData = {
                timestamp: new Date().toISOString(),
                url: site.url,
                title: site.name,
                domain: new URL(site.url).hostname,
                emails: result.emails || [],
                phones: result.phones || [],
                names: result.names || [],
                method: result.method || 'Enhanced Scraper v2.0',
                browserInfo: { browser: 'Puppeteer/Chrome' },
                confidence: 0.85
            };
            
            allScrapedData.push(contactData);
            successCount++;
            
            // Update totals
            totalContacts.emails += contactData.emails.length;
            totalContacts.phones += contactData.phones.length;
            totalContacts.names += contactData.names.length;
            
            console.log(`   ✅ Scraped in ${duration}ms`);
            console.log(`   📧 ${contactData.emails.length} emails | 📱 ${contactData.phones.length} phones | 👤 ${contactData.names.length} names`);
            
            // Show some examples
            if (contactData.emails.length > 0) {
                console.log(`   📧 Examples: ${contactData.emails.slice(0, 2).join(', ')}`);
            }
            if (contactData.phones.length > 0) {
                console.log(`   📱 Examples: ${contactData.phones.slice(0, 2).join(', ')}`);
            }
            if (contactData.names.length > 0) {
                console.log(`   👤 Examples: ${contactData.names.slice(0, 2).join(', ')}`);
            }
            
            // Brief pause between requests
            await new Promise(resolve => setTimeout(resolve, 1500));
            
        } catch (error) {
            console.error(`   ❌ Failed: ${error.message}`);
            
            // Add failed entry for tracking
            allScrapedData.push({
                timestamp: new Date().toISOString(),
                url: site.url,
                title: `${site.name} (FAILED)`,
                domain: new URL(site.url).hostname,
                emails: [],
                phones: [],
                names: [],
                method: 'Failed - ' + error.message.substring(0, 50),
                browserInfo: { browser: 'Error' },
                confidence: 0
            });
        }
    }
    
    // Export all data to Google Sheets
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXPORTING TO GOOGLE SHEETS');
    console.log('='.repeat(80));
    
    if (allScrapedData.length === 0) {
        console.log('❌ No data to export');
        return;
    }
    
    try {
        console.log(`📤 Exporting ${allScrapedData.length} records to Google Sheets...`);
        
        // Export contact data to the main sheet
        const exportResult = await sheetsExporter.append(allScrapedData);
        console.log(`✅ Exported ${exportResult.rowsAdded} rows to "Contact Data" sheet`);
        
        // Create summary statistics
        const stats = {
            totalSites: allScrapedData.length,
            successfulScrapes: successCount,
            failedScrapes: allScrapedData.length - successCount,
            totalEmails: totalContacts.emails,
            totalPhones: totalContacts.phones,
            totalNames: totalContacts.names,
            uniqueDomains: new Set(allScrapedData.map(d => d.domain)).size,
            scrapingDate: new Date().toLocaleDateString(),
            scrapingTime: new Date().toLocaleTimeString(),
            enhancedScraperVersion: '2.0'
        };
        
        // Create/update summary sheet
        console.log('📈 Creating summary sheet...');
        await sheetsExporter.createSummarySheet(stats);
        
        console.log('\n🎉 SUCCESS! Data exported to Google Sheets!');
        console.log('\n📊 FINAL SUMMARY:');
        console.log(`   🌐 Total sites processed: ${stats.totalSites}`);
        console.log(`   ✅ Successful scrapes: ${stats.successfulScrapes}`);
        console.log(`   ❌ Failed scrapes: ${stats.failedScrapes}`);
        console.log(`   📧 Total emails found: ${stats.totalEmails}`);
        console.log(`   📱 Total phone numbers: ${stats.totalPhones}`);
        console.log(`   👤 Total names extracted: ${stats.totalNames}`);
        console.log(`   🏢 Unique domains scraped: ${stats.uniqueDomains}`);
        
        const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '15rFNiDyUtp89RijmXNJidzon5RUpgdCalkU1JxeUNJY';
        console.log(`\n🔗 View results: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
        
    } catch (exportError) {
        console.error('\n❌ Export to Google Sheets failed:', exportError.message);
        console.log('\n📋 Scraped data summary:');
        allScrapedData.forEach((data, index) => {
            const total = data.emails.length + data.phones.length + data.names.length;
            console.log(`   ${index + 1}. ${data.title}: ${total} contacts total`);
        });
        
        throw exportError;
    }
    
    console.log('\n🏁 Real website scraping and Google Sheets export completed successfully!');
}

// Run the test
scrapeRealWebsitesAndExport().catch(error => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
});