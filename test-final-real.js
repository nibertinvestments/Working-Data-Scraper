#!/usr/bin/env node

/**
 * FINAL REAL WORLD TEST
 * Scrapes actual websites and exports REAL data to Google Sheets
 */

import dotenv from 'dotenv';
import { WebScraper } from './src/scraper/WebScraper.js';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';
import fs from 'fs/promises';

dotenv.config();

async function finalRealWorldTest() {
    console.log('🚀 FINAL REAL WORLD TEST - SCRAPING & GOOGLE SHEETS EXPORT');
    console.log('=' .repeat(65));
    console.log('This test will scrape REAL websites and export to Google Sheets\n');
    
    try {
        // Initialize scraper
        const scraper = new WebScraper({
            extractEmails: true,
            extractPhones: true,
            extractNames: true,
            timeout: 10000
        });
        await scraper.initialize();
        console.log('✅ WebScraper initialized');
        
        // Initialize Google Sheets
        const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
        const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
        const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
        const credentials = JSON.parse(credentialsContent);
        
        const sheetsExporter = new GoogleSheetsExporter(credentials, spreadsheetId);
        const connectionTest = await sheetsExporter.testConnection();
        
        if (!connectionTest.success) {
            throw new Error('Google Sheets connection failed');
        }
        console.log(`✅ Connected to Google Sheets: "${connectionTest.spreadsheetTitle}"`);
        
        // Real websites to scrape
        const realSites = [
            'https://example.com',
            'https://httpbin.org/html',
            'https://www.iana.org/domains/example'
        ];
        
        console.log(`\n🌐 Scraping ${realSites.length} real websites...`);
        
        const scrapedData = [];
        
        for (let i = 0; i < realSites.length; i++) {
            const url = realSites[i];
            console.log(`\n📍 Site ${i + 1}/${realSites.length}: ${url}`);
            
            try {
                const result = await scraper.scrapeUrl(url);
                
                if (result && !result.skipped) {
                    const contactData = {
                        url: url,
                        title: result.title || 'No title',
                        domain: new URL(url).hostname,
                        emails: result.emails || [],
                        phones: result.phones || [],
                        names: result.names || [],
                        timestamp: new Date().toISOString(),
                        method: 'WebScraper',
                        browserInfo: { browser: 'Puppeteer' }
                    };
                    
                    scrapedData.push(contactData);
                    
                    console.log(`  ✅ Scraped: "${result.title || 'Untitled'}"`);
                    console.log(`     📧 Emails: ${contactData.emails.length}`);
                    console.log(`     📞 Phones: ${contactData.phones.length}`);
                    console.log(`     👤 Names: ${contactData.names.length}`);
                    
                    // Show actual data found
                    if (contactData.emails.length > 0) {
                        console.log(`     📧 Emails: ${contactData.emails.slice(0, 2).map(e => typeof e === 'string' ? e : e.email).join(', ')}`);
                    }
                    if (contactData.phones.length > 0) {
                        console.log(`     📞 Phones: ${contactData.phones.slice(0, 2).map(p => typeof p === 'string' ? p : p.phone).join(', ')}`);
                    }
                    if (contactData.names.length > 0) {
                        console.log(`     👤 Names: ${contactData.names.slice(0, 3).map(n => typeof n === 'string' ? n : n.name).join(', ')}`);
                    }
                } else {
                    console.log(`  ⏭️  Skipped: ${result?.reason || 'Unknown'}`);
                }
                
                // Delay between requests
                if (i < realSites.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
            } catch (error) {
                console.log(`  ❌ Error: ${error.message}`);
            }
        }
        
        // Export to Google Sheets
        console.log(`\n📤 Exporting ${scrapedData.length} scraped records to Google Sheets...`);
        
        if (scrapedData.length === 0) {
            console.log('⚠️  No data was scraped to export');
            await scraper.close();
            return;
        }
        
        // Clear and write data
        await sheetsExporter.clearData();
        console.log('🧹 Cleared existing data');
        
        const exportResult = await sheetsExporter.write(scrapedData);
        
        if (exportResult.success) {
            console.log(`✅ Successfully exported ${exportResult.rowsAdded} rows`);
            
            // Create summary
            const totalEmails = scrapedData.reduce((sum, item) => sum + (item.emails?.length || 0), 0);
            const totalPhones = scrapedData.reduce((sum, item) => sum + (item.phones?.length || 0), 0);
            const totalNames = scrapedData.reduce((sum, item) => sum + (item.names?.length || 0), 0);
            
            const stats = {
                totalSites: scrapedData.length,
                totalEmails,
                totalPhones,
                totalNames,
                uniqueDomains: new Set(scrapedData.map(item => item.domain)).size
            };
            
            await sheetsExporter.createSummarySheet(stats);
            console.log('📊 Created summary sheet');
            
            console.log('\n🎉 FINAL TEST COMPLETE!');
            console.log('=' .repeat(40));
            console.log(`📊 REAL DATA EXPORTED:`);
            console.log(`   • Websites scraped: ${stats.totalSites}`);
            console.log(`   • Email addresses: ${stats.totalEmails}`);
            console.log(`   • Phone numbers: ${stats.totalPhones}`);
            console.log(`   • Names found: ${stats.totalNames}`);
            console.log(`   • Unique domains: ${stats.uniqueDomains}`);
            console.log(`\n🔗 View your data at:`);
            console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
            
        } else {
            throw new Error('Export to Google Sheets failed');
        }
        
        await scraper.close();
        console.log('\n✅ All systems working correctly!');
        
    } catch (error) {
        console.error('\n💥 Final test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

finalRealWorldTest();