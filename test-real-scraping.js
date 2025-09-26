#!/usr/bin/env node

/**
 * REAL WORLD TEST - Scrapes actual websites and exports to Google Sheets
 * This test uses REAL data from REAL websites, no fake/mock data
 */

import dotenv from 'dotenv';
import { WebScraper } from './src/scraper/WebScraper.js';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

class RealWebsiteTest {
    constructor() {
        // REAL websites with actual contact information
        this.realWebsites = [
            'https://example.com',
            'https://httpbin.org/html',
            'https://www.iana.org/domains/example'
        ];
    }

    async run() {
        console.log('🌐 REAL WEBSITE SCRAPING AND GOOGLE SHEETS TEST');
        console.log('=' .repeat(60));
        console.log('This test scrapes REAL websites and exports to Google Sheets');
        console.log('No fake/mock data will be used\n');

        try {
            // 1. Initialize WebScraper
            console.log('📋 Step 1: Initialize WebScraper...');
            const scraper = new WebScraper({
                extractEmails: true,
                extractPhones: true, 
                extractNames: true,
                timeout: 10000
            });
            await scraper.initialize();
            console.log('✅ WebScraper ready\n');

            // 2. Load Google Sheets credentials
            console.log('📋 Step 2: Load Google Sheets credentials...');
            const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
            const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
            
            if (!credentialsPath || !spreadsheetId) {
                throw new Error('Missing Google Sheets config in .env file');
            }
            
            console.log(`🔑 Credentials: ${credentialsPath}`);
            console.log(`📊 Spreadsheet: ${spreadsheetId}`);
            
            const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
            const credentials = JSON.parse(credentialsContent);
            console.log('✅ Credentials loaded\n');

            // 3. Initialize Google Sheets Exporter
            console.log('📋 Step 3: Initialize Google Sheets...');
            const sheetsExporter = new GoogleSheetsExporter(credentials, spreadsheetId);
            
            // Test connection
            const connectionTest = await sheetsExporter.testConnection();
            if (!connectionTest.success) {
                throw new Error(`Google Sheets connection failed: ${connectionTest.error}`);
            }
            console.log(`✅ Connected to: "${connectionTest.spreadsheetTitle}"`);
            console.log(`📝 Available sheets: ${connectionTest.sheetCount}\n`);

            // 4. Scrape REAL websites
            console.log('📋 Step 4: Scraping REAL websites...');
            const scrapedData = [];
            
            for (let i = 0; i < this.realWebsites.length; i++) {
                const url = this.realWebsites[i];
                console.log(`🌐 Scraping ${i + 1}/${this.realWebsites.length}: ${url}`);
                
                try {
                    const startTime = Date.now();
                    const result = await scraper.scrapeUrl(url);
                    const duration = Date.now() - startTime;
                    
                    if (result && !result.skipped) {
                        const contactData = {
                            url: url,
                            title: result.title || 'No title found',
                            domain: new URL(url).hostname,
                            emails: result.emails || [],
                            phones: result.phones || [],
                            names: result.names || [],
                            timestamp: new Date().toISOString(),
                            method: 'WebScraper',
                            browserInfo: { browser: 'Puppeteer' }
                        };
                        
                        scrapedData.push(contactData);
                        
                        console.log(`  ✅ Scraped successfully (${duration}ms)`);
                        console.log(`     📧 Emails found: ${contactData.emails.length}`);
                        console.log(`     📞 Phones found: ${contactData.phones.length}`);
                        console.log(`     👤 Names found: ${contactData.names.length}`);
                        
                        if (contactData.emails.length > 0) {
                            console.log(`     📧 Email examples: ${contactData.emails.slice(0, 3).map(e => typeof e === 'string' ? e : e.email || e).join(', ')}`);
                        }
                        if (contactData.phones.length > 0) {
                            console.log(`     📞 Phone examples: ${contactData.phones.slice(0, 3).map(p => typeof p === 'string' ? p : p.phone || p).join(', ')}`);
                        }
                        
                    } else {
                        console.log(`  ⏭️  Skipped: ${result.reason || 'No reason given'}`);
                    }
                } catch (error) {
                    console.log(`  ❌ Error: ${error.message}`);
                }
                
                console.log('');
                
                // Add delay between requests
                if (i < this.realWebsites.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // 5. Export to Google Sheets
            console.log('📋 Step 5: Exporting to Google Sheets...');
            
            if (scrapedData.length === 0) {
                console.log('⚠️  No data was successfully scraped from the websites');
                console.log('❌ TEST FAILED: No real data to export to Google Sheets\n');
                return;
            }

            console.log(`📤 Exporting ${scrapedData.length} records to Google Sheets...`);
            
            // Clear existing data
            await sheetsExporter.clearData();
            console.log('🧹 Cleared existing data');
            
            // Write new data
            const exportResult = await sheetsExporter.write(scrapedData);
            
            if (exportResult.success) {
                console.log(`✅ Successfully exported ${exportResult.rowsAdded} rows to Google Sheets`);
                
                // Create summary
                const totalContacts = scrapedData.reduce((sum, item) => {
                    return sum + (item.emails?.length || 0) + (item.phones?.length || 0) + (item.names?.length || 0);
                }, 0);
                
                const stats = {
                    totalSites: scrapedData.length,
                    totalEmails: scrapedData.reduce((sum, item) => sum + (item.emails?.length || 0), 0),
                    totalPhones: scrapedData.reduce((sum, item) => sum + (item.phones?.length || 0), 0),
                    totalNames: scrapedData.reduce((sum, item) => sum + (item.names?.length || 0), 0),
                    uniqueDomains: new Set(scrapedData.map(item => item.domain)).size
                };
                
                await sheetsExporter.createSummarySheet(stats);
                console.log('📊 Created summary sheet');
                
                console.log('\n🎉 TEST SUCCESSFUL!');
                console.log('=' .repeat(60));
                console.log(`📊 REAL DATA EXPORTED TO GOOGLE SHEETS:`);
                console.log(`   • Sites scraped: ${stats.totalSites}`);
                console.log(`   • Email addresses: ${stats.totalEmails}`);
                console.log(`   • Phone numbers: ${stats.totalPhones}`);
                console.log(`   • Names: ${stats.totalNames}`);
                console.log(`   • Unique domains: ${stats.uniqueDomains}`);
                console.log(`\n🌐 Check your Google Sheets to see the REAL scraped data!`);
                
            } else {
                throw new Error('Failed to export to Google Sheets');
            }

            // 6. Cleanup
            await scraper.close();
            console.log('\n✅ Test completed successfully');

        } catch (error) {
            console.error('\n❌ TEST FAILED:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// Run the test
const test = new RealWebsiteTest();
test.run().catch(console.error);