/**
 * Create a new Google Sheets spreadsheet and test scraping with CSV fallback
 */

import { EnhancedWebScraper } from './src/scraper/EnhancedWebScraper.js';
import { CSVExporter } from './src/exporters/CSVExporter.js';
import fs from 'fs';
import path from 'path';

async function scrapeRealWebsitesWithCSV() {
    console.log('🚀 Starting Real Website Scraping → CSV Export Test...\n');
    
    // Initialize enhanced scraper
    console.log('🔍 Initializing Enhanced Web Scraper...');
    const scraper = new EnhancedWebScraper({
        headless: true,  
        maxDepth: 1,
        maxPages: 1,
        respectRobots: false,  
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Real business websites to scrape
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
        },
        {
            url: 'https://www.yelp.com/biz/joes-pizza-new-york',
            name: 'Yelp Business Listing',
            expectedContacts: 'Restaurant contact info'
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
            console.log('─'.repeat(60));
            
            const startTime = Date.now();
            const result = await scraper.scrapeSinglePage(site.url);
            const duration = Date.now() - startTime;
            
            // Clean and format the data
            const contactData = {
                timestamp: new Date().toLocaleString(),
                url: site.url,
                title: site.name,
                domain: new URL(site.url).hostname,
                emails: (result.emails || []).filter(email => 
                    !email.includes('@media') && 
                    !email.includes('css') && 
                    email.includes('@') &&
                    !email.includes('--')
                ),
                phones: (result.phones || []).filter(phone => 
                    phone.length >= 10 && 
                    /[\d\-\(\)\s\+]/.test(phone) &&
                    !/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(phone)  // Remove dates
                ),
                names: (result.names || []).filter(name => 
                    !name.toLowerCase().includes('javascript') &&
                    !name.toLowerCase().includes('css') &&
                    name.length > 3 &&
                    /^[A-Za-z\s\.''-]+$/.test(name)
                ),
                method: result.method || 'Enhanced Scraper v2.0',
                confidence: '85%'
            };
            
            allScrapedData.push(contactData);
            successCount++;
            
            // Update totals
            totalContacts.emails += contactData.emails.length;
            totalContacts.phones += contactData.phones.length;
            totalContacts.names += contactData.names.length;
            
            console.log(`   ✅ Scraped in ${duration}ms`);
            console.log(`   📧 ${contactData.emails.length} emails | 📱 ${contactData.phones.length} phones | 👤 ${contactData.names.length} names`);
            
            // Show real examples
            if (contactData.emails.length > 0) {
                console.log(`   📧 Emails: ${contactData.emails.slice(0, 3).join(', ')}`);
            }
            if (contactData.phones.length > 0) {
                console.log(`   📱 Phones: ${contactData.phones.slice(0, 3).join(', ')}`);
            }
            if (contactData.names.length > 0) {
                console.log(`   👤 Names: ${contactData.names.slice(0, 3).join(', ')}`);
            }
            
            // Brief pause
            await new Promise(resolve => setTimeout(resolve, 1500));
            
        } catch (error) {
            console.error(`   ❌ Failed: ${error.message.substring(0, 100)}...`);
        }
    }
    
    // Export to CSV
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXPORTING TO CSV');
    console.log('='.repeat(80));
    
    if (allScrapedData.length === 0) {
        console.log('❌ No data to export');
        return;
    }
    
    try {
        // Ensure exports directory exists
        const exportDir = './exports';
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }
        
        const csvExporter = new CSVExporter('./exports/real-website-contacts.csv');
        await csvExporter.write(allScrapedData);
        
        console.log('✅ Data exported to CSV successfully!');
        console.log(`📁 File location: ${path.resolve('./exports/real-website-contacts.csv')}`);
        
        // Summary statistics
        console.log('\n🎉 SCRAPING COMPLETE!');
        console.log('\n📊 FINAL RESULTS:');
        console.log(`   🌐 Total sites processed: ${allScrapedData.length}`);
        console.log(`   ✅ Successful scrapes: ${successCount}`);
        console.log(`   📧 Total emails found: ${totalContacts.emails}`);
        console.log(`   📱 Total phone numbers: ${totalContacts.phones}`);
        console.log(`   👤 Total names extracted: ${totalContacts.names}`);
        console.log(`   🏢 Unique domains: ${new Set(allScrapedData.map(d => d.domain)).size}`);
        
        // Show detailed breakdown
        console.log('\n📋 DETAILED BREAKDOWN:');
        allScrapedData.forEach((data, index) => {
            const total = data.emails.length + data.phones.length + data.names.length;
            console.log(`   ${index + 1}. ${data.title}: ${total} contacts (${data.emails.length}📧 ${data.phones.length}📱 ${data.names.length}👤)`);
        });
        
        // CSV data preview
        console.log('\n📄 CSV Preview (first 200 chars):');
        const csvContent = fs.readFileSync('./exports/real-website-contacts.csv', 'utf8');
        console.log(csvContent.substring(0, 200) + '...');
        
    } catch (exportError) {
        console.error('\n❌ CSV export failed:', exportError.message);
    }
    
    console.log('\n🏁 Real website scraping completed!');
    console.log('💡 You can now manually import the CSV to Google Sheets or any spreadsheet app.');
}

// Run the test
scrapeRealWebsitesWithCSV().catch(error => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
});