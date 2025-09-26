/**
 * Test script for enhanced web scraping functionality
 */

import { WebScraper } from './src/scraper/WebScraper.js';

async function testEnhancedScraping() {
    console.log('=== Testing Enhanced Web Scraping ===\n');
    
    const scraper = new WebScraper({
        timeout: 15000,
        extractEmails: true,
        extractPhones: true,
        extractNames: true
    });

    try {
        await scraper.initialize();
        
        // Test websites with different types of contact information
        const testUrls = [
            'https://example.com',  // Basic test
            'https://httpbin.org/html',  // HTML content test
        ];

        for (const url of testUrls) {
            console.log(`\n--- Testing: ${url} ---`);
            
            try {
                const result = await scraper.scrapeUrl(url);
                
                console.log(`✅ Successfully scraped: ${url}`);
                console.log(`Method: ${result.method}`);
                console.log(`Title: ${result.title}`);
                console.log(`Domain: ${result.domain}`);
                console.log(`Emails found: ${result.emails?.length || 0}`);
                if (result.emails?.length > 0) {
                    result.emails.forEach(email => console.log(`  - ${email}`));
                }
                console.log(`Phones found: ${result.phones?.length || 0}`);
                if (result.phones?.length > 0) {
                    result.phones.forEach(phone => console.log(`  - ${phone}`));
                }
                console.log(`Names found: ${result.names?.length || 0}`);
                if (result.names?.length > 0) {
                    result.names.forEach(name => console.log(`  - ${name}`));
                }
                
            } catch (error) {
                console.log(`❌ Failed to scrape ${url}: ${error.message}`);
            }
        }

        // Test the new validation functions directly
        console.log('\n--- Testing Data Validation ---');
        
        // Test email validation
        const testEmails = [
            'john.doe@company.com',     // Should pass
            'example@example.com',      // Should fail (placeholder)
            'invalid.email',            // Should fail (no @)
            'test@domain.co.uk',        // Should pass
            'fake@fake.com',           // Should fail (placeholder)
            'contact@business.org'      // Should pass
        ];
        
        console.log('\nEmail validation tests:');
        testEmails.forEach(email => {
            const isValid = scraper.isValidEmail(email);
            const isFalsePositive = scraper.isEmailFalsePositive(email);
            const result = isValid && !isFalsePositive ? '✅ VALID' : '❌ INVALID';
            console.log(`  ${email}: ${result}`);
        });

        // Test phone validation
        const testPhones = [
            '(555) 123-4567',          // Should pass
            '+1 (555) 123-4567',       // Should pass  
            '1234567890',              // Should fail (placeholder)
            '555-1234',                // Should fail (too short)
            '+44 20 7946 0958',        // Should pass (international)
            '(800) 555-1234'           // Should pass (toll-free)
        ];
        
        console.log('\nPhone validation tests:');
        testPhones.forEach(phone => {
            const cleaned = scraper.cleanPhoneNumber(phone);
            const isValid = scraper.isValidPhoneNumber(cleaned);
            const isFalsePositive = scraper.isPhoneFalsePositive(phone);
            const result = isValid && !isFalsePositive ? '✅ VALID' : '❌ INVALID';
            console.log(`  ${phone}: ${result}`);
        });

        // Test name validation
        const testNames = [
            'John Smith',              // Should pass
            'Jane Doe',                // Should fail (placeholder)
            'Dr. Robert Johnson',      // Should pass
            'Lorem Ipsum',             // Should fail (placeholder)
            'Mary Jane Watson',        // Should pass
            'Test User',               // Should fail (placeholder)
            'Sarah O\'Connor'          // Should pass
        ];
        
        console.log('\nName validation tests:');
        testNames.forEach(name => {
            const isValid = scraper.isValidName(name);
            const isFalsePositive = scraper.isNameFalsePositive(name);
            const result = isValid && !isFalsePositive ? '✅ VALID' : '❌ INVALID';
            console.log(`  "${name}": ${result}`);
        });

    } finally {
        await scraper.close();
        console.log('\n=== Enhanced scraping test completed ===');
    }
}

// Run the test
testEnhancedScraping().catch(console.error);