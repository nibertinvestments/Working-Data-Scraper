#!/usr/bin/env node

/**
 * Real-world test for Google Sheets integration
 * Tests actual website scraping and exports results to Google Sheets
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'fs/promises';
import { WebScraper } from './src/scraper/WebScraper.js';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';
import { DatabaseManager } from './src/storage/DatabaseManager.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class RealWorldGoogleSheetsTest {
    constructor() {
        this.testResults = [];
        this.webScraper = null;
        this.googleSheetsExporter = null;
        this.database = null;
        
        // Real websites known to have contact information
        this.testWebsites = [
            'https://example.com/contact',
            'https://httpbin.org/html', // Simple HTML for testing
            'https://www.wikipedia.org', // Large site with structured content
            'https://github.com/about', // Tech company with contact info
            'https://stackoverflow.com/company' // Another tech site
        ];
    }

    async initialize() {
        console.log('🚀 Initializing Real-World Google Sheets Test...\n');

        try {
            // Initialize web scraper
            this.webScraper = new WebScraper({
                extractEmails: true,
                extractPhones: true,
                extractNames: true,
                timeout: 15000
            });
            await this.webScraper.initialize();
            console.log('✅ Web scraper initialized');

            // Initialize database
            this.database = new DatabaseManager({
                dbPath: process.env.DATABASE_PATH || './data/contacts.db'
            });
            await this.database.initialize();
            console.log('✅ Database initialized');

            // Load and verify Google Sheets credentials
            const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
            const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
            
            if (!credentialsPath || !spreadsheetId) {
                throw new Error('Missing Google Sheets configuration. Please check GOOGLE_SHEETS_CREDENTIALS_PATH and GOOGLE_SHEETS_SPREADSHEET_ID in .env');
            }

            console.log(`📊 Using spreadsheet ID: ${spreadsheetId}`);
            console.log(`🔑 Using credentials from: ${credentialsPath}`);

            const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
            const credentials = JSON.parse(credentialsContent);

            // Initialize Google Sheets exporter
            this.googleSheetsExporter = new GoogleSheetsExporter(credentials, spreadsheetId);
            
            // Test connection first
            console.log('🔌 Testing Google Sheets connection...');
            const connectionTest = await this.googleSheetsExporter.testConnection();
            
            if (!connectionTest.success) {
                throw new Error(`Google Sheets connection failed: ${connectionTest.error}`);
            }
            
            console.log(`✅ Connected to Google Sheets: "${connectionTest.spreadsheetTitle}"`);
            console.log(`📝 Sheets found: ${connectionTest.sheetCount}\n`);

        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }

    async testWebsiteScraping() {
        console.log('🌐 Starting real website scraping tests...\n');
        
        const scrapedContacts = [];
        
        for (let i = 0; i < this.testWebsites.length; i++) {
            const url = this.testWebsites[i];
            console.log(`📍 Testing site ${i + 1}/${this.testWebsites.length}: ${url}`);
            
            try {
                const startTime = Date.now();
                const result = await this.webScraper.scrapeUrl(url);
                const duration = Date.now() - startTime;
                
                if (result && !result.skipped) {
                    const contactData = {
                        url: url,
                        title: result.title || 'Unknown Title',
                        domain: new URL(url).hostname,
                        emails: result.emails || [],
                        phones: result.phones || [],
                        names: result.names || [],
                        timestamp: new Date().toISOString(),
                        method: result.method || 'WebScraper',
                        browserInfo: { browser: 'Puppeteer' },
                        scrapeDuration: duration
                    };
                    
                    scrapedContacts.push(contactData);
                    
                    // Store in database
                    await this.database.saveContact(contactData);
                    
                    console.log(`  ✅ Success (${duration}ms)`);
                    console.log(`     📧 Emails: ${contactData.emails.length}`);
                    console.log(`     📞 Phones: ${contactData.phones.length}`);
                    console.log(`     👤 Names: ${contactData.names.length}`);
                    
                    this.testResults.push({
                        url,
                        status: 'success',
                        duration,
                        contacts: contactData.emails.length + contactData.phones.length + contactData.names.length
                    });
                } else {
                    console.log(`  ⏭️  Skipped: ${result.reason || 'Unknown reason'}`);
                    this.testResults.push({
                        url,
                        status: 'skipped',
                        reason: result.reason
                    });
                }
                
            } catch (error) {
                console.log(`  ❌ Failed: ${error.message}`);
                this.testResults.push({
                    url,
                    status: 'error',
                    error: error.message
                });
            }
            
            // Add delay between requests
            if (i < this.testWebsites.length - 1) {
                console.log('  ⏳ Waiting 2 seconds...\n');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log(`\n📊 Scraping completed! Found ${scrapedContacts.length} sites with contact data.\n`);
        return scrapedContacts;
    }

    async testGoogleSheetsExport(contactData) {
        console.log('📤 Testing Google Sheets export...\n');
        
        if (contactData.length === 0) {
            console.log('⚠️  No contact data to export');
            return;
        }

        try {
            // Clear existing data first (optional)
            console.log('🧹 Clearing existing data from Google Sheets...');
            await this.googleSheetsExporter.clearData();
            
            // Export the scraped data
            console.log('📋 Exporting contact data to Google Sheets...');
            const exportResult = await this.googleSheetsExporter.write(contactData);
            
            if (exportResult.success) {
                console.log(`✅ Successfully exported ${exportResult.rowsAdded} rows to Google Sheets`);
                
                // Create summary statistics
                const stats = {
                    totalSites: contactData.length,
                    totalEmails: contactData.reduce((sum, c) => sum + (c.emails?.length || 0), 0),
                    totalPhones: contactData.reduce((sum, c) => sum + (c.phones?.length || 0), 0),
                    totalNames: contactData.reduce((sum, c) => sum + (c.names?.length || 0), 0),
                    uniqueDomains: new Set(contactData.map(c => c.domain)).size
                };
                
                console.log('📈 Creating summary sheet...');
                await this.googleSheetsExporter.createSummarySheet(stats);
                console.log('✅ Summary sheet created');
                
                return { success: true, stats };
            } else {
                throw new Error('Export failed');
            }
            
        } catch (error) {
            console.error('❌ Google Sheets export failed:', error.message);
            throw error;
        }
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        if (this.webScraper) {
            await this.webScraper.close();
            console.log('✅ Web scraper closed');
        }
        
        if (this.database) {
            await this.database.close();
            console.log('✅ Database closed');
        }
    }

    async run() {
        const startTime = Date.now();
        
        try {
            await this.initialize();
            
            const contactData = await this.testWebsiteScraping();
            
            const exportResult = await this.testGoogleSheetsExport(contactData);
            
            const totalTime = Date.now() - startTime;
            
            console.log('\n🎉 Test completed successfully!');
            console.log('='.repeat(50));
            console.log(`⏱️  Total execution time: ${totalTime}ms`);
            console.log(`🌐 Websites tested: ${this.testWebsites.length}`);
            console.log(`✅ Successful scrapes: ${this.testResults.filter(r => r.status === 'success').length}`);
            console.log(`❌ Failed scrapes: ${this.testResults.filter(r => r.status === 'error').length}`);
            console.log(`⏭️  Skipped scrapes: ${this.testResults.filter(r => r.status === 'skipped').length}`);
            
            if (exportResult && exportResult.stats) {
                console.log(`📊 Total contacts exported: ${exportResult.stats.totalEmails + exportResult.stats.totalPhones + exportResult.stats.totalNames}`);
            }
            
            console.log('\n📋 Detailed results:');
            this.testResults.forEach((result, i) => {
                const status = result.status === 'success' ? '✅' : 
                             result.status === 'error' ? '❌' : '⏭️';
                console.log(`${status} ${this.testWebsites[i]} - ${result.status}`);
                if (result.contacts) console.log(`   📞 Contacts found: ${result.contacts}`);
                if (result.error) console.log(`   Error: ${result.error}`);
                if (result.reason) console.log(`   Reason: ${result.reason}`);
            });
            
        } catch (error) {
            console.error('\n💥 Test failed:', error.message);
            console.error(error.stack);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new RealWorldGoogleSheetsTest();
    test.run().catch(console.error);
}

export { RealWorldGoogleSheetsTest };