#!/usr/bin/env node

/**
 * REAL CONTACT-RICH WEBSITE TEST
 * Testing with government and business sites that actually have contact info
 */

import dotenv from 'dotenv';
import { WebScraper } from './src/scraper/WebScraper.js';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';
import fs from 'fs/promises';

dotenv.config();

async function testRealContactSites() {
    console.log('🏛️ TESTING WITH REAL CONTACT-RICH WEBSITES');
    console.log('=' .repeat(60));
    console.log('Testing with government and business sites that have actual contact info\n');
    
    try {
        // Initialize scraper with better settings for real sites
        const scraper = new WebScraper({
            extractEmails: true,
            extractPhones: true,
            extractNames: true,
            timeout: 20000, // Longer timeout for complex sites
            retryAttempts: 3
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
        
        // REAL websites with actual contact information
        const contactRichSites = [
            'https://www.whitehouse.gov/contact/',
            'https://www.nasa.gov/contact/',
            'https://www.fbi.gov/contact-us',
            'https://www.cdc.gov/contact/',
            'https://www.state.gov/contact-us/'
        ];
        
        console.log(`\n🌐 Scraping ${contactRichSites.length} contact-rich websites...`);
        
        const scrapedData = [];
        
        for (let i = 0; i < contactRichSites.length; i++) {
            const url = contactRichSites[i];
            console.log(`\n📍 Site ${i + 1}/${contactRichSites.length}: ${url}`);
            
            try {
                const startTime = Date.now();
                const result = await scraper.scrapeUrl(url);
                const duration = Date.now() - startTime;
                
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
                    
                    console.log(`  ✅ SUCCESS (${duration}ms): "${result.title || 'Untitled'}"`);
                    console.log(`     📧 Emails found: ${contactData.emails.length}`);
                    console.log(`     📞 Phones found: ${contactData.phones.length}`);
                    console.log(`     👤 Names found: ${contactData.names.length}`);
                    
                    // Show the ACTUAL contact data found
                    if (contactData.emails.length > 0) {
                        const emailList = contactData.emails.slice(0, 3).map(e => 
                            typeof e === 'string' ? e : (e.email || e.value || JSON.stringify(e))
                        );
                        console.log(`     📧 EMAILS: ${emailList.join(', ')}`);
                    }
                    
                    if (contactData.phones.length > 0) {
                        const phoneList = contactData.phones.slice(0, 3).map(p => 
                            typeof p === 'string' ? p : (p.phone || p.value || JSON.stringify(p))
                        );
                        console.log(`     📞 PHONES: ${phoneList.join(', ')}`);
                    }
                    
                    if (contactData.names.length > 0) {
                        const nameList = contactData.names.slice(0, 5).map(n => 
                            typeof n === 'string' ? n : (n.name || n.value || JSON.stringify(n))
                        );
                        console.log(`     👤 NAMES: ${nameList.join(', ')}`);
                    }
                    
                    // Show total contact items found
                    const totalContacts = contactData.emails.length + contactData.phones.length + contactData.names.length;
                    console.log(`     🎯 TOTAL CONTACTS: ${totalContacts}`);
                    
                } else {
                    console.log(`  ⏭️  SKIPPED: ${result?.reason || 'Unknown reason'}`);
                }
                
            } catch (error) {
                console.log(`  ❌ ERROR scraping ${url}: ${error.message}`);
            }
            
            // Delay between requests to be respectful
            if (i < contactRichSites.length - 1) {
                console.log('  ⏳ Waiting 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        // Show summary of scraped data
        console.log('\n📊 SCRAPING SUMMARY:');
        console.log('=' .repeat(40));
        
        if (scrapedData.length === 0) {
            console.log('❌ NO DATA SCRAPED - Something is wrong with the scraper');
            await scraper.close();
            return;
        }
        
        const totalEmails = scrapedData.reduce((sum, item) => sum + (item.emails?.length || 0), 0);
        const totalPhones = scrapedData.reduce((sum, item) => sum + (item.phones?.length || 0), 0);
        const totalNames = scrapedData.reduce((sum, item) => sum + (item.names?.length || 0), 0);
        const totalContacts = totalEmails + totalPhones + totalNames;
        
        console.log(`📈 Sites successfully scraped: ${scrapedData.length}/${contactRichSites.length}`);
        console.log(`📧 Total email addresses: ${totalEmails}`);
        console.log(`📞 Total phone numbers: ${totalPhones}`);
        console.log(`👤 Total names: ${totalNames}`);
        console.log(`🎯 TOTAL CONTACT ITEMS: ${totalContacts}`);
        
        // Export to Google Sheets
        console.log(`\n📤 Exporting ${scrapedData.length} records to Google Sheets...`);
        
        // Clear existing data and export new data
        await sheetsExporter.clearData();
        console.log('🧹 Cleared existing Google Sheets data');
        
        const exportResult = await sheetsExporter.write(scrapedData);
        
        if (exportResult.success) {
            console.log(`✅ Exported ${exportResult.rowsAdded} rows to Google Sheets`);
            
            // Create summary sheet
            const stats = {
                totalSites: scrapedData.length,
                totalEmails,
                totalPhones,
                totalNames,
                uniqueDomains: new Set(scrapedData.map(item => item.domain)).size
            };
            
            await sheetsExporter.createSummarySheet(stats);
            console.log('📊 Created summary sheet');
            
            console.log('\n🎉 REAL WORLD TEST COMPLETE!');
            console.log('=' .repeat(50));
            console.log('📋 RESULTS WITH ACTUAL CONTACT DATA:');
            console.log(`   • Government sites scraped: ${stats.totalSites}`);
            console.log(`   • Real email addresses: ${stats.totalEmails}`);
            console.log(`   • Real phone numbers: ${stats.totalPhones}`);
            console.log(`   • Names/contacts: ${stats.totalNames}`);
            console.log(`   • Total contact items: ${totalContacts}`);
            console.log(`\n🔗 Check your Google Sheets:`);
            console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
            
            if (totalContacts > 0) {
                console.log('\n✅ SUCCESS: Found real contact information!');
            } else {
                console.log('\n⚠️  WARNING: No contact info found - scraper may need improvement');
            }
            
        } else {
            console.log('❌ Failed to export to Google Sheets');
        }
        
        await scraper.close();
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testRealContactSites();