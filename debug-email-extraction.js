import { WebScraper } from './src/scraper/WebScraper.js';

async function debugEmailExtraction() {
    const scraper = new WebScraper();
    
    const testText = `
        Contact us at info@testcompany.com or support@testcompany.com
        Our CEO is Dr. Robert Wilson (rwilson@testcompany.com)
        Email us: hello@testcompany.com
    `;
    
    const testHtml = `
        <div>
            <p>Contact: <a href="mailto:contact@example.com">contact@example.com</a></p>
            <p>Support: support@company.org</p>
        </div>
    `;
    
    console.log('🔍 Testing email extraction directly...');
    console.log('Test text:', testText.trim());
    console.log('Test HTML:', testHtml.trim());
    
    try {
        const emails = scraper.extractEmails(testText, testHtml);
        console.log('\n📧 Extracted emails:', emails);
        
        // Test individual validation
        const testEmails = ['info@testcompany.com', 'example@example.com', 'test@test.com', 'valid@company.org'];
        console.log('\n🔍 Testing email validation:');
        
        testEmails.forEach(email => {
            const isValid = scraper.isValidEmail(email);
            const isFalsePositive = scraper.isEmailFalsePositive(email);
            console.log(`   ${email}: Valid=${isValid}, FalsePositive=${isFalsePositive}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugEmailExtraction().catch(console.error);