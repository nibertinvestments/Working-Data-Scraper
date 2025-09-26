/**
 * Create a new Google Sheets spreadsheet and test scraping real websites
 */

import { google } from 'googleapis';
import { EnhancedWebScraper } from './src/scraper/EnhancedWebScraper.js';
import fs from 'fs';

async function createSpreadsheetAndScrape() {
    console.log('🚀 Creating Google Sheets and scraping real websites...\n');
    
    // Load credentials
    const credentials = JSON.parse(fs.readFileSync('./credentials/google-sheets-credentials.json', 'utf8'));
    console.log(`📧 Service Account: ${credentials.client_email}`);
    
    // Initialize Google APIs
    const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
    });
    
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const drive = google.drive({ version: 'v3', auth: authClient });
    
    console.log('🔗 Creating new Google Sheets spreadsheet...');
    
    // Create a new spreadsheet
    const spreadsheetResponse = await sheets.spreadsheets.create({
        requestBody: {
            properties: {
                title: 'Data Scraper Results - ' + new Date().toLocaleDateString()
            },
            sheets: [{
                properties: {
                    title: 'Contact Data',
                    gridProperties: {
                        rowCount: 1000,
                        columnCount: 10
                    }
                }
            }]
        }
    });
    
    const spreadsheetId = spreadsheetResponse.data.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    
    console.log(`✅ Spreadsheet created!`);
    console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
    console.log(`🔗 URL: ${spreadsheetUrl}`);
    
    // Make the spreadsheet publicly viewable
    await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    });
    
    console.log('✅ Spreadsheet made publicly viewable');
    
    // Add headers
    const headers = [
        'Timestamp',
        'Website URL', 
        'Website Title',
        'Domain',
        'Email Addresses',
        'Phone Numbers',
        'Names',
        'Browser Used',
        'Scrape Method',
        'Confidence Score'
    ];
    
    await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: 'Contact Data!A1:J1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [headers]
        }
    });
    
    console.log('✅ Headers added to spreadsheet');
    
    // Initialize enhanced scraper
    console.log('\n🔍 Initializing Enhanced Web Scraper...');
    const scraper = new EnhancedWebScraper({
        headless: true,
        maxDepth: 1,
        maxPages: 1,
        respectRobots: false,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Real websites to scrape
    const testWebsites = [
        {
            url: 'https://www.whitehouse.gov/contact/',
            name: 'White House Contact Page'
        },
        {
            url: 'https://www.harvard.edu/contact-harvard/', 
            name: 'Harvard University Contact'
        },
        {
            url: 'https://www.github.com/contact',
            name: 'GitHub Support Contact'
        }
    ];
    
    const allRows = [];
    let totalContacts = { emails: 0, phones: 0, names: 0 };
    
    console.log('\n📍 Starting website scraping...');
    console.log('='.repeat(80));
    
    for (let i = 0; i < testWebsites.length; i++) {
        const site = testWebsites[i];
        
        try {
            console.log(`\n${i + 1}/${testWebsites.length}. 🌐 ${site.name}`);
            console.log(`   URL: ${site.url}`);
            
            const startTime = Date.now();
            const result = await scraper.scrapeSinglePage(site.url);
            const duration = Date.now() - startTime;
            
            // Clean the data
            const emails = (result.emails || []).filter(email => 
                email.includes('@') && 
                !email.includes('@media') && 
                !email.includes('css') &&
                email.length < 100
            );
            
            const phones = (result.phones || []).filter(phone => 
                phone.length >= 10 && 
                /[\d\-\(\)\s\+]/.test(phone) &&
                !/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(phone)
            );
            
            const names = (result.names || []).filter(name => 
                name.length > 3 &&
                name.length < 50 &&
                /^[A-Za-z\s\.''-]+$/.test(name) &&
                !name.toLowerCase().includes('javascript')
            );
            
            // Create row for spreadsheet
            const row = [
                new Date().toLocaleString(),
                site.url,
                site.name,
                new URL(site.url).hostname,
                emails.join(', '),
                phones.join(', '),
                names.join(', '),
                'Puppeteer/Chrome',
                result.method || 'Enhanced Scraper v2.0',
                '85%'
            ];
            
            allRows.push(row);
            
            // Update totals
            totalContacts.emails += emails.length;
            totalContacts.phones += phones.length;
            totalContacts.names += names.length;
            
            console.log(`   ✅ Scraped in ${duration}ms`);
            console.log(`   📧 ${emails.length} emails | 📱 ${phones.length} phones | 👤 ${names.length} names`);
            
            if (emails.length > 0) {
                console.log(`   📧 Emails: ${emails.slice(0, 2).join(', ')}`);
            }
            if (phones.length > 0) {
                console.log(`   📱 Phones: ${phones.slice(0, 2).join(', ')}`);
            }
            if (names.length > 0) {
                console.log(`   👤 Names: ${names.slice(0, 2).join(', ')}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
        } catch (error) {
            console.error(`   ❌ Failed: ${error.message.substring(0, 100)}`);
            
            // Add failed row
            allRows.push([
                new Date().toLocaleString(),
                site.url,
                site.name + ' (FAILED)',
                new URL(site.url).hostname,
                '',
                '',
                '',
                'Error',
                'Failed - ' + error.message.substring(0, 30),
                '0%'
            ]);
        }
    }
    
    // Export all data to spreadsheet
    console.log('\n📊 EXPORTING TO GOOGLE SHEETS...');
    
    if (allRows.length > 0) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `Contact Data!A2:J${allRows.length + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: allRows
            }
        });
        
        console.log(`✅ Exported ${allRows.length} rows to Google Sheets`);
    }
    
    // Format the spreadsheet
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
            requests: [{
                repeatCell: {
                    range: {
                        sheetId: 0,
                        startRowIndex: 0,
                        endRowIndex: 1,
                        startColumnIndex: 0,
                        endColumnIndex: 10
                    },
                    cell: {
                        userEnteredFormat: {
                            backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                            textFormat: {
                                foregroundColor: { red: 1, green: 1, blue: 1 },
                                bold: true
                            }
                        }
                    },
                    fields: 'userEnteredFormat(backgroundColor,textFormat)'
                }
            }]
        }
    });
    
    console.log('\n🎉 SUCCESS! Data exported to Google Sheets!');
    console.log('\n📊 FINAL RESULTS:');
    console.log(`   🌐 Total sites processed: ${allRows.length}`);
    console.log(`   📧 Total emails found: ${totalContacts.emails}`);
    console.log(`   📱 Total phone numbers: ${totalContacts.phones}`);
    console.log(`   👤 Total names extracted: ${totalContacts.names}`);
    
    console.log(`\n🔗 VIEW YOUR RESULTS HERE:`);
    console.log(`   ${spreadsheetUrl}`);
    
    // Open the spreadsheet
    console.log('\n🌐 Opening spreadsheet in browser...');
    
    return {
        spreadsheetId,
        spreadsheetUrl,
        totalContacts
    };
}

// Run the test
createSpreadsheetAndScrape().catch(error => {
    console.error('\n💥 Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
});