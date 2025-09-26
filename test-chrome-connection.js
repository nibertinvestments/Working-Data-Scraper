/**
 * Test Chrome DevTools Protocol connection
 * This script tests if Chrome is running with remote debugging enabled
 */

async function testChromeConnection() {
    console.log('Testing Chrome DevTools Protocol connection...');
    
    try {
        // Import chrome-remote-interface
        const CDP = await import('chrome-remote-interface');
        console.log('✓ Chrome DevTools Protocol library loaded');
        
        // Try to connect to Chrome
        const client = await CDP.default({ port: 9222 });
        console.log('✓ Connected to Chrome DevTools Protocol on port 9222');
        
        const { Runtime, Page } = client;
        
        // Enable necessary domains
        await Runtime.enable();
        await Page.enable();
        console.log('✓ Runtime and Page domains enabled');
        
        // Get current URL
        const result = await Runtime.evaluate({
            expression: 'window.location.href'
        });
        
        if (result && result.result && result.result.value) {
            console.log('✓ Successfully extracted URL:', result.result.value);
        } else {
            console.log('✗ No URL result received');
        }
        
        // Get page title
        const titleResult = await Runtime.evaluate({
            expression: 'document.title'
        });
        
        if (titleResult && titleResult.result && titleResult.result.value) {
            console.log('✓ Successfully extracted title:', titleResult.result.value);
        }
        
        await client.close();
        console.log('✓ Chrome DevTools Protocol connection successful!');
        
    } catch (error) {
        console.log('✗ Chrome DevTools Protocol connection failed:');
        console.log('  Error:', error.message);
        console.log('');
        console.log('This means Chrome is not running with remote debugging enabled.');
        console.log('To fix this:');
        console.log('1. Close all Chrome windows');
        console.log('2. Run: powershell -ExecutionPolicy Bypass -File setup-chrome-debug.ps1');
        console.log('3. Use the "Chrome Debug Mode" shortcut to launch Chrome');
        console.log('4. Then run this test again');
        
        return false;
    }
    
    return true;
}

// Run the test
testChromeConnection().then(success => {
    if (success) {
        console.log('\n🎉 Chrome is properly configured for browser monitoring!');
    } else {
        console.log('\n⚠️  Chrome needs to be configured for browser monitoring.');
    }
}).catch(error => {
    console.error('Test failed:', error);
});