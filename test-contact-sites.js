#!/usr/bin/env node

/**
 * REAL CONTACT-RICH WEBSITES TEST
 * Tests websites that are likely to have actual contact information
 */

import dotenv from 'dotenv';
import { WebScraper } from './src/scraper/WebScraper.js';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';
import fs from 'fs/promises';

dotenv.config();

class ContactRichWebsiteTest {
    constructor() {
        // Real websites that typically have contact information
        this.contactRichSites = [
            'https://www.w3.org/Consortium/contact',
            'https://www.mozilla.org/en-US/contact/',
            'https://nodejs.org/en/about/',
            'https://github.com/contact',
            'https://stackoverflow.com/company/contact'
        ];
    }

    async run() {
        console.log('🌐 TESTING CONTACT-RICH REAL WEBSITES');
        console.log('=' .repeat(60));

        try {
            const scraper = new WebScraper({
                extractEmails: true,
                extractPhones: true, 
                extractNames: true,
                timeout: 15000
            });
            await scraper.initialize();

            const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
            const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
            const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
            const credentials = JSON.parse(credentialsContent);

            const sheetsExporter = new GoogleSheetsExporter(credentials, spreadsheetId);
            await sheetsExporter.testConnection();

            const scrapedData = [];
            
            for (let i = 0; i < this.contactRichSites.length; i++) {
                const url = this.contactRichSites[i];
                console.log(`🌐 Scraping ${i + 1}/${this.contactRichSites.length}: ${url}`);
                
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
                        
                        console.log(`  ✅ Success - Title: "${result.title || 'No title'}"`);
                        console.log(`     📧 Emails: ${contactData.emails.length}`);
                        console.log(`     📞 Phones: ${contactData.phones.length}`);
                        console.log(`     👤 Names: ${contactData.names.length}`);
                        
                        // Show actual found data
                        if (contactData.emails.length > 0) {
                            const emailList = contactData.emails.slice(0, 3).map(e => 
                                typeof e === 'string' ? e : (e.email || JSON.stringify(e))
                            ).join(', ');
                            console.log(`     📧 Found emails: ${emailList}`);
                        }
                        
                        if (contactData.phones.length > 0) {
                            const phoneList = contactData.phones.slice(0, 3).map(p => 
                                typeof p === 'string' ? p : (p.phone || JSON.stringify(p))
                            ).join(', ');
                            console.log(`     📞 Found phones: ${phoneList}`);
                        }
                        
                        if (contactData.names.length > 0) {
                            const nameList = contactData.names.slice(0, 3).map(n => 
                                typeof n === 'string' ? n : (n.name || JSON.stringify(n))
                            ).join(', ');
                            console.log(`     👤 Found names: ${nameList}`);
                        }
                        
                    } else {
                        console.log(`  ⏭️  Skipped: ${result?.reason || 'Unknown'}`);
                    }
                } catch (error) {
                    console.log(`  ❌ Error: ${error.message}`);
                }
                
                console.log('');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            if (scrapedData.length > 0) {
                console.log(`📤 Exporting ${scrapedData.length} records to Google Sheets...`);
                
                // Append to existing data instead of clearing
                const exportResult = await sheetsExporter.append(scrapedData);
                
                if (exportResult.success) {
                    console.log(`✅ Added ${exportResult.rowsAdded} new rows to Google Sheets`);
                    
                    const totalContacts = scrapedData.reduce((sum, item) => {
                        return sum + (item.emails?.length || 0) + (item.phones?.length || 0) + (item.names?.length || 0);
                    }, 0);
                    
                    console.log('\n🎉 CONTACT-RICH SITE TEST COMPLETE!');
                    console.log(`📊 Total contact items found: ${totalContacts}`);
                    console.log(`📧 Total emails: ${scrapedData.reduce((sum, item) => sum + (item.emails?.length || 0), 0)}`);
                    console.log(`📞 Total phones: ${scrapedData.reduce((sum, item) => sum + (item.phones?.length || 0), 0)}`);
                    console.log(`👤 Total names: ${scrapedData.reduce((sum, item) => sum + (item.names?.length || 0), 0)}`);
                }
            } else {
                console.log('⚠️  No data was scraped from any site');
            }

            await scraper.close();

        } catch (error) {
            console.error('\n❌ TEST FAILED:', error.message);
            process.exit(1);
        }
    }
}

const test = new ContactRichWebsiteTest();
test.run().catch(console.error);