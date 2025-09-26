/**
 * Test enhanced web scraping on real websites and export to Google Sheets
 */

import { EnhancedWebScraper } from './src/scraper/EnhancedWebScraper.js';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';
import fs from 'fs';
import path from 'path';

async function scrapeAndExportToSheets() {
    console.log('🚀 Starting Real Website Scraping → Google Sheets Export Test...\n');
    
    // Load Google Sheets credentials
    const credentialsPath = './credentials/google-sheets-credentials.json';
    if (!fs.existsSync(credentialsPath)) {
        throw new Error('Google Sheets credentials not found. Please check credentials/google-sheets-credentials.json');
    }
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const spreadsheetId = '15rFNiDyUtp89RijmXNJidzon5RUpgdCalkU1JxeUNJY'; // From .env file
    
    // Initialize Google Sheets exporter
    console.log('📊 Initializing Google Sheets connection...');
    const sheetsExporter = new GoogleSheetsExporter(credentials, spreadsheetId);
    await sheetsExporter.initialize();
    console.log('✅ Google Sheets connected successfully\n');
    
    // Initialize enhanced scraper
    const scraper = new EnhancedWebScraper({
        headless: true,  // Run headless for better performance
        maxDepth: 1,
        maxPages: 1,
        respectRobots: false,  // Testing mode
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Real business websites to scrape
    const testWebsites = [
        {
            url: 'https://www.whitehouse.gov/contact/',
            name: 'White House Contact',
            expectedContacts: 'Government contact info'
        },
        {
            url: 'https://www.harvard.edu/contact-harvard/',
            name: 'Harvard University',
            expectedContacts: 'University phone/email'
        },
        {
            url: 'https://www.github.com/contact',
            name: 'GitHub Contact',
            expectedContacts: 'Tech company support'
        },
        {
            url: 'https://www.yelp.com/biz/joes-pizza-new-york',
            name: 'Yelp Business Listing',
            expectedContacts: 'Restaurant phone/address'
        }
    ];

    const allScrapedData = [];
    let successCount = 0;
    let totalContacts = { emails: 0, phones: 0, names: 0 };

    for (const site of testWebsites) {
        try {
            console.log(`\n📍 Scraping: ${site.name}`);
            console.log(`   URL: ${site.url}`);
            console.log(`   Expected: ${site.expectedContacts}`);
            console.log('─'.repeat(80));
            
            const startTime = Date.now();
            const result = await scraper.scrapeSinglePage(site.url);
            const duration = Date.now() - startTime;
            
            // Format the data for Google Sheets
            const contactData = {
                timestamp: new Date().toISOString(),
                url: site.url,
                title: site.name,
                domain: new URL(site.url).hostname,
                emails: result.emails || [],
                phones: result.phones || [],
                names: result.names || [],
                method: result.method || 'Enhanced Scraper',
                browserInfo: { browser: 'Puppeteer' },
                confidence: 0.8
            };
            
            allScrapedData.push(contactData);
            successCount++;
            
            // Update totals
            totalContacts.emails += contactData.emails.length;
            totalContacts.phones += contactData.phones.length;
            totalContacts.names += contactData.names.length;
            
            console.log(`✅ Scraped successfully in ${duration}ms`);
            console.log(`📧 Emails: ${contactData.emails.length} | 📱 Phones: ${contactData.phones.length} | 👤 Names: ${contactData.names.length}`);
            
            if (contactData.emails.length > 0) {
                contactData.emails.slice(0, 3).forEach(email => console.log(`   📧 ${email}`));
                if (contactData.emails.length > 3) console.log(`   ... and ${contactData.emails.length - 3} more`);
            }
            
            if (contactData.phones.length > 0) {
                contactData.phones.slice(0, 3).forEach(phone => console.log(`   📱 ${phone}`));
                if (contactData.phones.length > 3) console.log(`   ... and ${contactData.phones.length - 3} more`);
            }
            
            if (contactData.names.length > 0) {
                contactData.names.slice(0, 2).forEach(name => console.log(`   👤 ${name}`));
                if (contactData.names.length > 2) console.log(`   ... and ${contactData.names.length - 2} more`);
            }
            
            // Brief pause between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`❌ Failed to scrape ${site.name}:`);
            console.error(`   Error: ${error.message}`);
            
            // Add failed entry to track attempts
            allScrapedData.push({
                timestamp: new Date().toISOString(),
                url: site.url,
                title: site.name,
                domain: new URL(site.url).hostname,
                emails: [],
                phones: [],
                names: [],
                method: 'Failed',
                browserInfo: { browser: 'Error' },
                confidence: 0,
                error: error.message
            });
        }
    }
    
    // Export all data to Google Sheets
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXPORTING TO GOOGLE SHEETS...');
    console.log('='.repeat(80));
    
    if (allScrapedData.length === 0) {
        console.log('❌ No data to export');
        return;
    }
    
    try {
        // Export contact data
        await sheetsExporter.append(allScrapedData);
        
        // Create summary statistics
        const stats = {
            totalSites: allScrapedData.length,
            successfulScrapes: successCount,
            totalEmails: totalContacts.emails,
            totalPhones: totalContacts.phones,
            totalNames: totalContacts.names,
            uniqueDomains: new Set(allScrapedData.map(d => d.domain)).size,
            scrapingDate: new Date().toLocaleDateString(),
            enhancedScraperVersion: '2.0'
        };
        
        // Create summary sheet
        await sheetsExporter.createSummarySheet(stats);
        
        console.log('✅ Successfully exported to Google Sheets!');
        console.log('\n📈 EXPORT SUMMARY:');
        console.log(`   🌐 Sites processed: ${stats.totalSites}`);
        console.log(`   ✅ Successful scrapes: ${stats.successfulScrapes}`);
        console.log(`   📧 Total emails extracted: ${stats.totalEmails}`);
        console.log(`   📱 Total phones extracted: ${stats.totalPhones}`);
        console.log(`   👤 Total names extracted: ${stats.totalNames}`);
        console.log(`   🏢 Unique domains: ${stats.uniqueDomains}`);
        
        console.log(`\n🔗 Google Sheets URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
        
        // Test connection
        const connectionTest = await sheetsExporter.testConnection();
        if (connectionTest.success) {
            console.log(`✅ Spreadsheet "${connectionTest.spreadsheetTitle}" is accessible with ${connectionTest.sheetCount} sheets`);
        }
        
    } catch (exportError) {
        console.error('❌ Failed to export to Google Sheets:', exportError.message);
        console.log('\n📋 Scraped data would have included:');
        allScrapedData.forEach((data, index) => {
            console.log(`   ${index + 1}. ${data.title}: ${data.emails.length} emails, ${data.phones.length} phones, ${data.names.length} names`);
        });
    }
    
    console.log('\n🏁 Real website scraping and Google Sheets export completed!');
    process.exit(0);
}

scrapeAndExportToSheets().catch(error => {
    console.error('💥 Test crashed:', error.message);
    console.error(error.stack);
    process.exit(1);
});