# Chrome Browser Monitoring Setup Guide

## Chrome DevTools Protocol Setup (Recommended)

To enable automatic Chrome URL detection, you need to run Chrome with remote debugging enabled:

### Method 1: Command Line (Temporary)
1. Close all Chrome windows completely
2. Open Command Prompt or PowerShell
3. Run this command:
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
```

### Method 2: Create Chrome Shortcut (Permanent)
1. Right-click on desktop → New → Shortcut
2. For location, enter:
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
```
3. Name it "Chrome Debug Mode" 
4. Use this shortcut to launch Chrome for data scraping

### Method 3: Automatic Setup Script
Run the PowerShell script we'll create to automatically set this up.

## Alternative Method (Fallback)
If Chrome DevTools Protocol isn't available, the app will fall back to:
- Reading Chrome window titles (limited accuracy)
- Manual URL entry when auto-detection fails

## Testing
Once Chrome is running with debugging enabled:
1. Open Chrome using one of the methods above
2. Visit any website
3. Launch the Data Scraper app
4. It should automatically detect and scrape the websites you visit

## Security Note
The remote debugging port is only accessible locally and only when Chrome is running in this special mode.