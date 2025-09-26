import { EventEmitter } from 'events';
import { BrowserMonitor } from '../monitor/BrowserMonitor.js';
import { WebScraper } from './WebScraper.js';
import { DataProcessor } from '../processor/DataProcessor.js';
import { DatabaseManager } from '../storage/DatabaseManager.js';

/**
 * Main DataScraper class - Coordinates browser monitoring, web scraping, and data processing
 */
export class DataScraper extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            scrapeDelay: config.scraping?.delay || 2000,
            extractEmails: config.scraping?.extractEmails !== false,
            extractPhones: config.scraping?.extractPhones !== false,
            extractNames: config.scraping?.extractNames !== false,
            maxConcurrentScrapes: config.maxConcurrentScrapes || 2,
            ...config
        };
        
        this.isActive = false;
        this.pendingUrls = new Set();
        this.scrapeQueue = [];
        this.lastScrapeTime = 0;
        
        // Initialize components
        this.browserMonitor = new BrowserMonitor({
            pollInterval: 1000,
            supportedBrowsers: [
                'chrome.exe',
                'firefox.exe',
                'msedge.exe',
                'opera.exe',
                'brave.exe'
            ]
        });
        
        this.webScraper = new WebScraper({
            extractEmails: this.config.extractEmails,
            extractPhones: this.config.extractPhones,
            extractNames: this.config.extractNames,
            timeout: 15000
        });
        
        this.dataProcessor = new DataProcessor({
            enableDeduplication: true,
            enableValidation: true
        });
        
        this.database = new DatabaseManager();
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners between components
     */
    setupEventListeners() {
        // Browser monitoring events
        this.browserMonitor.on('url-changed', (urlInfo) => {
            this.handleNewUrl(urlInfo);
        });
        
        this.browserMonitor.on('error', (error) => {
            console.error('Browser monitor error:', error);
            this.emit('error', new Error(`Browser monitoring error: ${error.message}`));
        });
        
        // Web scraper events
        this.webScraper.on('scrape-completed', (result) => {
            this.handleScrapeCompleted(result);
        });
        
        this.webScraper.on('scrape-failed', (result) => {
            console.log(`Scrape failed for ${result.url}: ${result.error}`);
            this.emit('status-update', `Failed to scrape ${this.shortenUrl(result.url)}`);
        });
        
        this.webScraper.on('scrape-started', (result) => {
            this.emit('status-update', `Scraping ${this.shortenUrl(result.url)}...`);
        });
    }

    /**
     * Start the data scraper
     */
    async start() {
        if (this.isActive) {
            throw new Error('Data scraper is already active');
        }

        try {
            console.log('Starting Data Scraper...');
            this.isActive = true;
            
            // Initialize database
            await this.database.initialize();
            
            // Initialize web scraper
            await this.webScraper.initialize();
            
            // Start browser monitoring
            await this.browserMonitor.start();
            
            // Start processing queue
            this.startQueueProcessor();
            
            this.emit('status-update', 'Data scraper started - monitoring browser activity');
            console.log('Data scraper started successfully');
            
        } catch (error) {
            this.isActive = false;
            console.error('Failed to start data scraper:', error);
            throw error;
        }
    }

    /**
     * Stop the data scraper
     */
    async stop() {
        if (!this.isActive) {
            return;
        }

        try {
            console.log('Stopping Data Scraper...');
            this.isActive = false;
            
            // Stop browser monitoring
            await this.browserMonitor.stop();
            
            // Close web scraper
            await this.webScraper.close();
            
            // Clear pending operations
            this.scrapeQueue = [];
            this.pendingUrls.clear();
            
            this.emit('status-update', 'Data scraper stopped');
            console.log('Data scraper stopped successfully');
            
        } catch (error) {
            console.error('Error stopping data scraper:', error);
            throw error;
        }
    }

    /**
     * Handle new URL detected from browser
     */
    async handleNewUrl(urlInfo) {
        if (!this.isActive) return;
        
        const url = urlInfo.url;
        
        // Skip if we've already processed this URL recently
        if (this.pendingUrls.has(url)) {
            return;
        }
        
        // Skip URLs that shouldn't be scraped
        if (this.shouldSkipUrl(url)) {
            return;
        }
        
        console.log(`New URL detected: ${url}`);
        this.pendingUrls.add(url);
        
        // Add to scrape queue
        this.scrapeQueue.push({
            ...urlInfo,
            addedAt: Date.now()
        });
        
        // Clean up old pending URLs (keep only last 100)
        if (this.pendingUrls.size > 100) {
            const urlsArray = Array.from(this.pendingUrls);
            this.pendingUrls = new Set(urlsArray.slice(-50));
        }
    }

    /**
     * Process the scrape queue with rate limiting
     */
    startQueueProcessor() {
        const processQueue = async () => {
            if (!this.isActive || this.scrapeQueue.length === 0) {
                setTimeout(processQueue, 1000); // Check again in 1 second
                return;
            }
            
            // Rate limiting - ensure minimum delay between scrapes
            const now = Date.now();
            if (now - this.lastScrapeTime < this.config.scrapeDelay) {
                setTimeout(processQueue, this.config.scrapeDelay - (now - this.lastScrapeTime));
                return;
            }
            
            // Check if we have capacity for more scrapes
            const activeScrapes = this.webScraper.getActiveScrapeCount();
            if (activeScrapes >= this.config.maxConcurrentScrapes) {
                setTimeout(processQueue, 1000);
                return;
            }
            
            // Process next URL in queue
            const urlInfo = this.scrapeQueue.shift();
            if (urlInfo) {
                this.lastScrapeTime = now;
                
                // Don't await - let it run in background
                this.scrapeUrl(urlInfo).catch(error => {
                    console.error(`Background scrape error for ${urlInfo.url}:`, error);
                });
            }
            
            // Schedule next processing
            setTimeout(processQueue, 500);
        };
        
        processQueue();
    }

    /**
     * Scrape a specific URL
     */
    async scrapeUrl(urlInfo) {
        try {
            const result = await this.webScraper.scrapeUrl(urlInfo.url);
            
            // Add browser context to result
            result.browserInfo = {
                browser: urlInfo.browser,
                detectedAt: urlInfo.timestamp
            };
            
            return result;
        } catch (error) {
            console.error(`Failed to scrape ${urlInfo.url}:`, error);
            throw error;
        }
    }

    /**
     * Handle completed scrape
     */
    async handleScrapeCompleted(result) {
        try {
            const data = result.data;
            
            // Skip if no contact information found
            const hasContacts = (data.emails && data.emails.length > 0) ||
                              (data.phones && data.phones.length > 0) ||
                              (data.names && data.names.length > 0);
            
            if (!hasContacts) {
                console.log(`No contact info found for ${data.url}`);
                return;
            }
            
            // Process the data (validate, deduplicate, etc.)
            const processedData = await this.dataProcessor.processContactData(data);
            
            // Store in database
            await this.database.storeContactData(processedData);
            
            // Emit event for UI update
            this.emit('data-scraped', processedData);
            
            console.log(`Contact data extracted from ${data.url}:`, {
                emails: processedData.emails.length,
                phones: processedData.phones.length,
                names: processedData.names.length
            });
            
        } catch (error) {
            console.error('Error handling scraped data:', error);
            this.emit('error', error);
        }
    }

    /**
     * Check if URL should be skipped
     */
    shouldSkipUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Skip common non-content URLs
            const skipDomains = [
                'google.com',
                'youtube.com',
                'facebook.com',
                'twitter.com',
                'instagram.com',
                'tiktok.com',
                'reddit.com',
                'github.com',
                'stackoverflow.com'
            ];
            
            const skipPaths = [
                '/search',
                '/login',
                '/register',
                '/auth',
                '/api/',
                '/admin'
            ];
            
            const skipExtensions = [
                '.pdf', '.doc', '.docx', '.xls', '.xlsx',
                '.jpg', '.jpeg', '.png', '.gif', '.webp',
                '.mp3', '.mp4', '.avi', '.zip', '.rar'
            ];
            
            // Check domain
            const hostname = urlObj.hostname.toLowerCase();
            if (skipDomains.some(domain => hostname.includes(domain))) {
                return true;
            }
            
            // Check path
            const pathname = urlObj.pathname.toLowerCase();
            if (skipPaths.some(path => pathname.includes(path))) {
                return true;
            }
            
            // Check extension
            if (skipExtensions.some(ext => pathname.endsWith(ext))) {
                return true;
            }
            
            return false;
            
        } catch {
            return true; // Skip invalid URLs
        }
    }

    /**
     * Get all scraped data
     */
    async getAllScrapedData() {
        return await this.database.getAllContactData();
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Update component configurations
        if (newConfig.scraping) {
            this.webScraper.config.extractEmails = newConfig.scraping.extractEmails;
            this.webScraper.config.extractPhones = newConfig.scraping.extractPhones;
            this.webScraper.config.extractNames = newConfig.scraping.extractNames;
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            queueSize: this.scrapeQueue.length,
            activeScrapes: this.webScraper?.getActiveScrapeCount() || 0,
            pendingUrls: this.pendingUrls.size
        };
    }

    /**
     * Shorten URL for display
     */
    shortenUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url.substring(0, 30) + (url.length > 30 ? '...' : '');
        }
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        await this.stop();
        await this.database.close();
    }
}