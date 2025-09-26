import { EventEmitter } from 'events';
import activeWin from 'active-win';
import { spawn } from 'child_process';

/**
 * Browser Monitor - Detects active browser tabs and URLs
 * Uses multiple strategies to monitor browser activity across different browsers
 */
export class BrowserMonitor extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            pollInterval: config.pollInterval || 1000, // Check every second
            supportedBrowsers: config.supportedBrowsers || [
                'chrome.exe',
                'firefox.exe', 
                'msedge.exe',
                'opera.exe',
                'brave.exe',
                'vivaldi.exe'
            ],
            ...config
        };
        
        this.isMonitoring = false;
        this.lastUrl = null;
        this.lastTitle = null;
        this.monitoringInterval = null;
        this.visitedUrls = new Set();
    }

    /**
     * Start monitoring browser activity
     */
    async start() {
        if (this.isMonitoring) {
            throw new Error('Browser monitoring is already active');
        }

        console.log('Starting browser monitoring...');
        this.isMonitoring = true;
        
        // Start polling for active window changes
        this.monitoringInterval = setInterval(() => {
            this.checkActiveWindow();
        }, this.config.pollInterval);
        
        this.emit('monitoring-started');
    }

    /**
     * Stop monitoring browser activity
     */
    async stop() {
        if (!this.isMonitoring) {
            return;
        }

        console.log('Stopping browser monitoring...');
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.emit('monitoring-stopped');
    }

    /**
     * Check the currently active window and extract URL if it's a browser
     */
    async checkActiveWindow() {
        try {
            const window = await activeWin();
            
            if (!window || !this.isBrowserWindow(window)) {
                return;
            }

            // Try to extract URL from the window title or use browser-specific methods
            const urlInfo = await this.extractUrlFromWindow(window);
            
            if (urlInfo && urlInfo.url && urlInfo.url !== this.lastUrl) {
                this.lastUrl = urlInfo.url;
                this.lastTitle = urlInfo.title;
                
                // Only emit if this is a new URL we haven't seen recently
                if (!this.visitedUrls.has(urlInfo.url)) {
                    this.visitedUrls.add(urlInfo.url);
                    
                    // Clean up old URLs to prevent memory leaks (keep last 1000)
                    if (this.visitedUrls.size > 1000) {
                        const urlsArray = Array.from(this.visitedUrls);
                        this.visitedUrls = new Set(urlsArray.slice(-500));
                    }
                    
                    this.emit('url-changed', {
                        url: urlInfo.url,
                        title: urlInfo.title,
                        browser: this.getBrowserName(window.owner.name),
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            // Don't log every error as this runs frequently
            // Only emit error events for significant issues
            if (error.message && !error.message.includes('activeWin')) {
                this.emit('error', error);
            }
        }
    }

    /**
     * Check if the given window belongs to a supported browser
     */
    isBrowserWindow(window) {
        if (!window || !window.owner || !window.owner.name) {
            return false;
        }

        const processName = window.owner.name.toLowerCase();
        return this.config.supportedBrowsers.some(browser => 
            processName.includes(browser.toLowerCase().replace('.exe', ''))
        );
    }

    /**
     * Extract URL information from browser window
     */
    async extractUrlFromWindow(window) {
        const browserName = this.getBrowserName(window.owner.name);
        
        // Try different extraction methods based on browser and platform
        if (process.platform === 'win32') {
            return this.extractUrlWindows(window, browserName);
        } else if (process.platform === 'darwin') {
            return this.extractUrlMacOS(window, browserName);
        } else {
            return this.extractUrlLinux(window, browserName);
        }
    }

    /**
     * Extract URL on Windows systems
     */
    async extractUrlWindows(window, browserName) {
        // For Windows, we'll use window title parsing and PowerShell scripts
        // This is a fallback method as direct URL extraction requires more complex solutions
        
        try {
            // Try PowerShell method for Chrome-based browsers
            if (['chrome', 'edge', 'brave', 'vivaldi'].includes(browserName)) {
                return await this.getChromeBrowserUrl();
            }
            
            // Try Firefox-specific method
            if (browserName === 'firefox') {
                return await this.getFirefoxUrl();
            }
            
            // Fallback to title parsing
            return this.parseUrlFromTitle(window.title);
        } catch (error) {
            return this.parseUrlFromTitle(window.title);
        }
    }

    /**
     * Extract URL on macOS systems
     */
    async extractUrlMacOS(window, browserName) {
        // macOS has better AppleScript support for browser URL extraction
        try {
            return await this.getUrlViaAppleScript(browserName);
        } catch (error) {
            return this.parseUrlFromTitle(window.title);
        }
    }

    /**
     * Extract URL on Linux systems
     */
    async extractUrlLinux(window, browserName) {
        // Linux URL extraction using various methods
        try {
            return await this.getUrlViaLinuxMethod(browserName);
        } catch (error) {
            return this.parseUrlFromTitle(window.title);
        }
    }

    /**
     * Get Chrome browser URL using Chrome DevTools Protocol
     */
    async getChromeBrowserUrl() {
        try {
            // Import chrome-remote-interface dynamically
            const CDP = await import('chrome-remote-interface');
            
            // Try to connect to Chrome DevTools
            const client = await CDP.default({ port: 9222 });
            const { Runtime, Page } = client;
            
            // Enable necessary domains
            await Runtime.enable();
            await Page.enable();
            
            // Get current URL
            const result = await Runtime.evaluate({
                expression: 'window.location.href'
            });
            
            await client.close();
            
            if (result && result.result && result.result.value) {
                return {
                    url: result.result.value,
                    title: null // Will be extracted by WebScraper
                };
            }
            
            return null;
        } catch (error) {
            // Chrome DevTools not available, try alternative method
            return await this.getChromeBrowserUrlAlternative();
        }
    }

    /**
     * Alternative Chrome URL extraction using Windows automation
     */
    async getChromeBrowserUrlAlternative() {
        return new Promise((resolve) => {
            // PowerShell script to get Chrome window title (which often contains URL info)
            const script = `
                Add-Type -AssemblyName System.Windows.Forms
                Add-Type -AssemblyName System.Drawing
                
                try {
                    $chromeProcesses = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -ne ""}
                    if ($chromeProcesses) {
                        $mainChrome = $chromeProcesses | Select-Object -First 1
                        if ($mainChrome.MainWindowTitle) {
                            $title = $mainChrome.MainWindowTitle
                            # Try to extract URL from title if it follows common patterns
                            if ($title -match "^(.*) - Google Chrome$") {
                                $pageTitle = $matches[1]
                                # Look for URL patterns in title
                                if ($pageTitle -match "https?://[^\\s]+") {
                                    Write-Output "URL:$($matches[0])"
                                } else {
                                    Write-Output "TITLE:$pageTitle"
                                }
                            } else {
                                Write-Output "TITLE:$title"
                            }
                        }
                    }
                } catch {
                    Write-Output "ERROR"
                }
            `;
            
            const powershell = spawn('powershell.exe', ['-Command', script], {
                windowsHide: true
            });
            
            let output = '';
            powershell.stdout.on('data', (data) => {
                output += data.toString().trim();
            });
            
            powershell.on('close', () => {
                if (output.startsWith('URL:')) {
                    const url = output.substring(4);
                    resolve({
                        url: url,
                        title: null
                    });
                } else if (output.startsWith('TITLE:')) {
                    const title = output.substring(6);
                    // For titles without URLs, we can't determine the URL
                    // This is a limitation of this approach
                    resolve(null);
                } else {
                    resolve(null);
                }
            });
            
            powershell.on('error', () => {
                resolve(null);
            });
            
            // Timeout after 3 seconds
            setTimeout(() => {
                powershell.kill();
                resolve(null);
            }, 3000);
        });
    }

    /**
     * Get Firefox URL using specific methods
     */
    async getFirefoxUrl() {
        // Firefox URL extraction would go here
        // This is more complex and would require browser extension or debugging protocol
        return null;
    }

    /**
     * Get URL via AppleScript on macOS
     */
    async getUrlViaAppleScript(browserName) {
        return new Promise((resolve, reject) => {
            let script = '';
            
            switch (browserName) {
                case 'chrome':
                    script = 'tell application "Google Chrome" to get URL of active tab of first window';
                    break;
                case 'safari':
                    script = 'tell application "Safari" to get URL of current tab of first window';
                    break;
                case 'firefox':
                    // Firefox doesn't support AppleScript well
                    return resolve(null);
                default:
                    return resolve(null);
            }
            
            const osascript = spawn('osascript', ['-e', script]);
            
            let output = '';
            osascript.stdout.on('data', (data) => {
                output += data.toString().trim();
            });
            
            osascript.on('close', (code) => {
                if (code === 0 && output) {
                    resolve({
                        url: output,
                        title: 'Unknown', // Would need another script for title
                        method: 'applescript'
                    });
                } else {
                    resolve(null);
                }
            });
            
            setTimeout(() => {
                osascript.kill();
                resolve(null);
            }, 2000);
        });
    }

    /**
     * Get URL via Linux-specific methods
     */
    async getUrlViaLinuxMethod(browserName) {
        // Linux methods would include checking browser debugging ports,
        // window manager properties, etc.
        return null;
    }

    /**
     * Parse URL from window title as fallback
     */
    parseUrlFromTitle(title) {
        if (!title) return null;
        
        // Common patterns in browser titles
        const patterns = [
            // "Page Title - Google Chrome"
            /^(.+?) - Google Chrome$/,
            // "Page Title - Mozilla Firefox"
            /^(.+?) - Mozilla Firefox$/,
            // "Page Title - Microsoft Edge"
            /^(.+?) - Microsoft Edge$/,
            // URLs in title
            /(https?:\/\/[^\s]+)/,
            // Domain patterns
            /([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/
        ];
        
        for (const pattern of patterns) {
            const match = title.match(pattern);
            if (match) {
                let extractedUrl = match[1] || match[0];
                
                // If it's not a full URL, try to construct one
                if (!extractedUrl.startsWith('http')) {
                    // Check if it looks like a domain
                    if (extractedUrl.includes('.') && !extractedUrl.includes(' ')) {
                        extractedUrl = 'https://' + extractedUrl;
                    } else {
                        // It's probably just a page title, skip
                        continue;
                    }
                }
                
                return {
                    url: extractedUrl,
                    title: title,
                    method: 'title-parsing'
                };
            }
        }
        
        return null;
    }

    /**
     * Get browser name from process name
     */
    getBrowserName(processName) {
        const name = processName.toLowerCase();
        
        if (name.includes('chrome')) return 'chrome';
        if (name.includes('firefox')) return 'firefox';
        if (name.includes('edge')) return 'edge';
        if (name.includes('safari')) return 'safari';
        if (name.includes('opera')) return 'opera';
        if (name.includes('brave')) return 'brave';
        if (name.includes('vivaldi')) return 'vivaldi';
        
        return 'unknown';
    }

    /**
     * Get monitoring status
     */
    isActive() {
        return this.isMonitoring;
    }

    /**
     * Get list of visited URLs
     */
    getVisitedUrls() {
        return Array.from(this.visitedUrls);
    }
}