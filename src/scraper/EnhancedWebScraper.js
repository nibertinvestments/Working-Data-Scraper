import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { EventEmitter } from 'events';
import { URL } from 'url';

/**
 * Enhanced Web Scraper with full-site crawling and Tor/Proxy support
 * Features:
 * - Full website crawling following internal links
 * - Tor browser integration with SOCKS5 proxy support
 * - Advanced anti-detection measures
 * - Comprehensive contact extraction based on Scrapy/Crawlee research
 */
export class EnhancedWebScraper extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            timeout: config.timeout || 15000,
            userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            maxConcurrent: config.maxConcurrent || 3,
            retryAttempts: config.retryAttempts || 2,
            extractEmails: config.extractEmails !== false,
            extractPhones: config.extractPhones !== false,
            extractNames: config.extractNames !== false,
            
            // Full-site crawling options
            maxDepth: config.maxDepth || 3,
            maxPages: config.maxPages || 50,
            respectRobots: config.respectRobots !== false,
            crawlDelay: config.crawlDelay || 1000,
            followExternalLinks: config.followExternalLinks === true,
            
            // Tor/Proxy options
            useTor: config.useTor === true,
            torProxy: config.torProxy || 'socks5://127.0.0.1:9050',
            customProxy: config.customProxy || null,
            proxyAuth: config.proxyAuth || null,
            
            // Anti-detection options
            randomizeUserAgent: config.randomizeUserAgent === true,
            randomizeViewport: config.randomizeViewport === true,
            simulateHumanBehavior: config.simulateHumanBehavior === true,
            stealthMode: config.stealthMode === true,
            
            ...config
        };
        
        this.browser = null;
        this.activeScrapes = new Set();
        this.visitedUrls = new Map(); // URL -> depth
        this.foundContacts = new Map(); // URL -> contacts
        this.robotsCache = new Map();
        this.siteMap = new Map(); // domain -> internal links
        
        // User agents for randomization
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
        
        // Viewport sizes for randomization
        this.viewports = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1536, height: 864 },
            { width: 1440, height: 900 },
            { width: 1280, height: 720 }
        ];
    }

    /**
     * Initialize the enhanced browser with Tor/proxy support
     */
    async initialize() {
        if (this.browser) return;

        try {
            const launchOptions = {
                headless: this.config.stealthMode ? 'new' : false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions-except=/dev/null',
                    '--disable-extensions',
                    '--no-first-run',
                    '--disable-default-apps',
                    '--disable-infobars',
                    '--window-size=1920,1080'
                ]
            };

            // Configure proxy if specified
            if (this.config.useTor || this.config.customProxy) {
                const proxyServer = this.config.customProxy || this.config.torProxy;
                launchOptions.args.push(`--proxy-server=${proxyServer}`);
                
                // For SOCKS proxies, ensure proper handling
                if (proxyServer.startsWith('socks')) {
                    launchOptions.args.push('--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1');
                }
                
                console.log(`Using proxy: ${proxyServer}`);
            }

            this.browser = await puppeteer.launch(launchOptions);
            
            console.log('Enhanced web scraper with full-site crawling initialized');
        } catch (error) {
            console.error('Failed to initialize enhanced browser:', error);
            throw error;
        }
    }

    /**
     * Full-site crawling with comprehensive contact extraction
     */
    async crawlWebsite(startUrl, options = {}) {
        const crawlOptions = { ...this.config, ...options };
        this.visitedUrls.clear();
        this.foundContacts.clear();
        this.siteMap.clear();
        
        const domain = this.extractDomain(startUrl);
        const results = {
            crawledPages: 0,
            totalContacts: { emails: 0, phones: 0, names: 0 },
            contacts: new Map(),
            sitemap: [],
            errors: []
        };

        try {
            // Check robots.txt if enabled
            if (crawlOptions.respectRobots) {
                await this.loadRobotsTxt(domain);
            }

            // Start crawling
            await this.crawlUrl(startUrl, 0, crawlOptions, results);

            // Aggregate results
            const aggregatedContacts = this.aggregateContacts();
            
            return {
                success: true,
                domain,
                crawledPages: results.crawledPages,
                emails: aggregatedContacts.emails,
                phones: aggregatedContacts.phones,
                names: aggregatedContacts.names,
                totalContacts: {
                    emails: aggregatedContacts.emails.length,
                    phones: aggregatedContacts.phones.length,
                    names: aggregatedContacts.names.length
                },
                sitemap: Array.from(this.visitedUrls.keys()),
                contactsByPage: Object.fromEntries(this.foundContacts),
                errors: results.errors
            };

        } catch (error) {
            console.error('Website crawling failed:', error);
            return {
                success: false,
                error: error.message,
                partialResults: this.aggregateContacts()
            };
        }
    }

    /**
     * Recursive URL crawling with depth control
     */
    async crawlUrl(url, depth, options, results) {
        // Check depth and page limits
        if (depth > options.maxDepth || results.crawledPages >= options.maxPages) {
            return;
        }

        // Skip if already visited
        if (this.visitedUrls.has(url)) {
            return;
        }

        // Check if URL is allowed by robots.txt
        if (options.respectRobots && !this.isAllowedByRobots(url)) {
            console.log(`Skipped by robots.txt: ${url}`);
            return;
        }

        try {
            console.log(`Crawling (depth ${depth}): ${url}`);
            this.visitedUrls.set(url, depth);

            // Scrape the current page
            const pageData = await this.scrapeUrl(url, {
                ...options,
                extractLinks: true // Enable link extraction
            });

            if (pageData.success) {
                results.crawledPages++;
                this.foundContacts.set(url, pageData);

                // Extract and process internal links
                const links = this.extractInternalLinks(pageData.links || [], url, options.followExternalLinks);
                
                // Add delay between requests (respectful crawling)
                if (options.crawlDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, options.crawlDelay));
                }

                // Recursively crawl found links
                for (const link of links) {
                    if (!this.visitedUrls.has(link) && results.crawledPages < options.maxPages) {
                        await this.crawlUrl(link, depth + 1, options, results);
                    }
                }
            } else {
                results.errors.push({ url, error: pageData.error });
            }

        } catch (error) {
            console.error(`Error crawling ${url}:`, error);
            results.errors.push({ url, error: error.message });
        }
    }

    /**
     * Enhanced scrape method with anti-detection and link extraction
     */
    async scrapeUrl(url, options = {}) {
        const scrapeId = Date.now() + Math.random();
        this.activeScrapes.add(scrapeId);

        try {
            if (!this.isValidUrl(url)) {
                throw new Error('Invalid URL format');
            }

            // Try dynamic scraping first (more comprehensive)
            let result = await this.scrapeDynamic(url, { ...options, extractLinks: true });
            
            // Fallback to static scraping if dynamic fails
            if (!result.success) {
                console.log(`Dynamic scraping failed for ${url}, trying static...`);
                result = await this.scrapeStatic(url, { ...options, extractLinks: true });
            }

            if (result.success) {
                // Process and validate extracted data
                const processedData = await this.processScrapedData(result);
                this.emit('scraped', { url, data: processedData });
                return processedData;
            }

            return result;

        } catch (error) {
            console.error(`Error scraping ${url}:`, error);
            this.emit('error', { url, error });
            return {
                success: false,
                error: error.message,
                emails: [],
                phones: [],
                names: [],
                links: []
            };
        } finally {
            this.activeScrapes.delete(scrapeId);
        }
    }

    /**
     * Enhanced dynamic scraping with stealth and anti-detection
     */
    async scrapeDynamic(url, options = {}) {
        let page;
        
        try {
            if (!this.browser) {
                await this.initialize();
            }

            page = await this.browser.newPage();

            // Configure stealth settings
            await this.configureStealthPage(page, options);

            // Set proxy authentication if needed
            if (this.config.proxyAuth) {
                await page.authenticate(this.config.proxyAuth);
            }

            // Navigate to the page with enhanced options
            const response = await page.goto(url, {
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: this.config.timeout
            });

            if (!response.ok()) {
                throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
            }

            // Simulate human behavior if enabled
            if (this.config.simulateHumanBehavior) {
                await this.simulateHumanBehavior(page);
            }

            // Wait for any dynamic content to load
            await page.waitForTimeout(2000);

            // Extract page content and links
            const pageContent = await page.evaluate(() => {
                return {
                    html: document.documentElement.outerHTML,
                    text: document.body ? document.body.innerText : '',
                    title: document.title,
                    links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
                        href: a.href,
                        text: a.textContent?.trim() || '',
                        title: a.title || ''
                    }))
                };
            });

            await page.close();

            return {
                success: true,
                content: pageContent.html,
                text: pageContent.text,
                title: pageContent.title,
                links: pageContent.links,
                url,
                method: 'dynamic'
            };

        } catch (error) {
            if (page) await page.close().catch(() => {});
            console.error(`Dynamic scraping failed for ${url}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Enhanced static scraping with proxy support
     */
    async scrapeStatic(url, options = {}) {
        try {
            const axiosConfig = {
                timeout: this.config.timeout,
                headers: {
                    'User-Agent': this.config.randomizeUserAgent 
                        ? this.getRandomUserAgent() 
                        : this.config.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                maxRedirects: 5
            };

            // Configure proxy if specified
            if (this.config.useTor || this.config.customProxy) {
                const proxyUrl = this.config.customProxy || this.config.torProxy;
                if (proxyUrl.startsWith('socks')) {
                    // For SOCKS proxies, we need a different approach
                    console.log('SOCKS proxy detected, dynamic scraping recommended');
                }
            }

            const response = await axios.get(url, axiosConfig);
            const $ = cheerio.load(response.data);

            // Extract links
            const links = [];
            $('a[href]').each((i, elem) => {
                const href = $(elem).attr('href');
                if (href) {
                    const absoluteUrl = this.resolveUrl(href, url);
                    if (absoluteUrl) {
                        links.push({
                            href: absoluteUrl,
                            text: $(elem).text().trim(),
                            title: $(elem).attr('title') || ''
                        });
                    }
                }
            });

            // Extract contact information from the scraped content
            const contacts = this.extractContactInfo($.text(), response.data);

            return {
                success: true,
                content: response.data,
                text: $.text(),
                title: $('title').text() || '',
                links,
                url,
                method: 'static',
                emails: contacts.emails,
                phones: contacts.phones,
                names: contacts.names
            };

        } catch (error) {
            console.error(`Static scraping failed for ${url}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Configure stealth settings for page
     */
    async configureStealthPage(page, options = {}) {
        // Randomize user agent if enabled
        if (this.config.randomizeUserAgent) {
            await page.setUserAgent(this.getRandomUserAgent());
        } else {
            await page.setUserAgent(this.config.userAgent);
        }

        // Randomize viewport if enabled
        if (this.config.randomizeViewport) {
            const viewport = this.getRandomViewport();
            await page.setViewport(viewport);
        }

        // Remove automation indicators
        await page.evaluateOnNewDocument(() => {
            // Remove webdriver property
            delete navigator.__proto__.webdriver;
            
            // Mock chrome runtime
            window.chrome = {
                runtime: {}
            };
            
            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });

            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Uint8Array.from([1, 2, 3]) }) :
                    originalQuery(parameters)
            );
        });

        // Set extra headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        });
    }

    /**
     * Simulate human-like behavior
     */
    async simulateHumanBehavior(page) {
        // Random mouse movements
        await page.mouse.move(
            Math.random() * 800 + 100,
            Math.random() * 600 + 100
        );

        // Random scrolling
        const scrollDistance = Math.random() * 1000 + 200;
        await page.evaluate((distance) => {
            window.scrollBy(0, distance);
        }, scrollDistance);

        // Random wait
        await page.waitForTimeout(Math.random() * 2000 + 500);

        // Scroll back up partially
        await page.evaluate(() => {
            window.scrollBy(0, -Math.random() * 300);
        });
    }

    /**
     * Load and parse robots.txt
     */
    async loadRobotsTxt(domain) {
        if (this.robotsCache.has(domain)) {
            return this.robotsCache.get(domain);
        }

        try {
            const robotsUrl = `https://${domain}/robots.txt`;
            const response = await axios.get(robotsUrl, {
                timeout: 5000,
                headers: { 'User-Agent': this.config.userAgent }
            });

            const robotsRules = this.parseRobotsTxt(response.data);
            this.robotsCache.set(domain, robotsRules);
            return robotsRules;

        } catch (error) {
            // If robots.txt is not found, allow all
            const allowAllRules = { disallowedPaths: [], crawlDelay: 0 };
            this.robotsCache.set(domain, allowAllRules);
            return allowAllRules;
        }
    }

    /**
     * Parse robots.txt content
     */
    parseRobotsTxt(content) {
        const lines = content.split('\\n');
        const disallowedPaths = [];
        let crawlDelay = 0;
        let userAgentMatch = false;

        for (const line of lines) {
            const trimmed = line.trim().toLowerCase();
            
            if (trimmed.startsWith('user-agent:')) {
                const agent = trimmed.replace('user-agent:', '').trim();
                userAgentMatch = agent === '*' || agent.includes('*');
            }
            
            if (userAgentMatch) {
                if (trimmed.startsWith('disallow:')) {
                    const path = trimmed.replace('disallow:', '').trim();
                    if (path) disallowedPaths.push(path);
                }
                
                if (trimmed.startsWith('crawl-delay:')) {
                    const delay = trimmed.replace('crawl-delay:', '').trim();
                    crawlDelay = parseInt(delay) * 1000 || 0;
                }
            }
        }

        return { disallowedPaths, crawlDelay };
    }

    /**
     * Check if URL is allowed by robots.txt
     */
    isAllowedByRobots(url) {
        const domain = this.extractDomain(url);
        const robots = this.robotsCache.get(domain);
        
        if (!robots) return true;

        const urlPath = new URL(url).pathname;
        return !robots.disallowedPaths.some(path => urlPath.startsWith(path));
    }

    /**
     * Extract internal links from page links
     */
    extractInternalLinks(links, baseUrl, followExternal = false) {
        const baseDomain = this.extractDomain(baseUrl);
        const internalLinks = new Set();

        for (const link of links) {
            const absoluteUrl = this.resolveUrl(link.href, baseUrl);
            if (!absoluteUrl || this.shouldSkipUrl(absoluteUrl)) continue;

            const linkDomain = this.extractDomain(absoluteUrl);
            
            // Include internal links, and external if enabled
            if (linkDomain === baseDomain || followExternal) {
                // Skip common non-content pages
                if (!this.isContentUrl(absoluteUrl)) continue;
                
                internalLinks.add(absoluteUrl);
            }
        }

        return Array.from(internalLinks);
    }

    /**
     * Check if URL likely contains content worth scraping
     */
    isContentUrl(url) {
        const lowercaseUrl = url.toLowerCase();
        
        // Skip admin, login, and other non-content URLs
        const skipPatterns = [
            '/admin', '/login', '/register', '/logout', '/signin', '/signup',
            '/cart', '/checkout', '/account', '/profile', '/settings',
            '/search', '/404', '/500', '/error',
            '/privacy', '/terms', '/legal', '/cookies',
            '/feed', '/rss', '/xml', '/json',
            '#', '?utm_', '?ref=', '?src='
        ];

        return !skipPatterns.some(pattern => lowercaseUrl.includes(pattern));
    }

    /**
     * Resolve relative URLs to absolute
     */
    resolveUrl(href, baseUrl) {
        try {
            return new URL(href, baseUrl).href;
        } catch {
            return null;
        }
    }

    /**
     * Aggregate all found contacts across pages
     */
    aggregateContacts() {
        const allEmails = new Set();
        const allPhones = new Set();
        const allNames = new Set();

        for (const [url, pageData] of this.foundContacts) {
            if (pageData.success) {
                (pageData.emails || []).forEach(email => allEmails.add(email));
                (pageData.phones || []).forEach(phone => allPhones.add(phone));
                (pageData.names || []).forEach(name => allNames.add(name));
            }
        }

        return {
            emails: Array.from(allEmails),
            phones: Array.from(allPhones),
            names: Array.from(allNames)
        };
    }

    /**
     * Get random user agent
     */
    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    /**
     * Get random viewport size
     */
    getRandomViewport() {
        return this.viewports[Math.floor(Math.random() * this.viewports.length)];
    }

    // Keep all the existing extraction methods from original WebScraper...
    // (extractEmails, extractPhoneNumbers, extractNames, validation methods, etc.)
    // They are already well-implemented, so we'll reuse them

    async processScrapedData(rawData) {
        const combinedText = rawData.text + ' ' + (rawData.content || '');
        const result = {
            success: true,
            url: rawData.url,
            title: rawData.title || '',
            method: rawData.method || 'unknown',
            emails: [],
            phones: [],
            names: [],
            links: rawData.links || []
        };

        try {
            // Extract contacts using existing methods
            if (this.config.extractEmails) {
                result.emails = this.extractEmails(combinedText, rawData.content);
            }
            
            if (this.config.extractPhones) {
                result.phones = this.extractPhoneNumbers(combinedText, rawData.content);
            }
            
            if (this.config.extractNames) {
                result.names = this.extractNames(combinedText);
            }

            // Validate extracted data
            const validated = this.validateExtractedData(result);
            
            return {
                ...result,
                ...validated,
                extractionStats: {
                    emailsFound: result.emails.length,
                    phonesFound: result.phones.length,
                    namesFound: result.names.length,
                    linksFound: result.links.length
                }
            };

        } catch (error) {
            console.error('Error processing scraped data:', error);
            return {
                ...result,
                error: error.message
            };
        }
    }

    // Include all existing extraction methods here...
    // (I'll add the key ones for brevity)

    extractEmails(text, html = '') {
        const emails = new Set();
        
        // Enhanced RFC-compliant email pattern from Scrapy/Crawlee research
        const emailPattern = /\b[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\b/g;
        
        // Extract from text
        const textMatches = text.match(emailPattern) || [];
        textMatches.forEach(email => {
            if (!this.isEmailFalsePositive(email)) {
                emails.add(email.toLowerCase());
            }
        });

        // Extract from HTML attributes and special patterns
        if (html) {
            const $ = cheerio.load(html);
            
            // mailto: links
            $('a[href^="mailto:"]').each((i, elem) => {
                const href = $(elem).attr('href');
                const email = href.replace(/^mailto:/i, '').split('?')[0];
                if (email && !this.isEmailFalsePositive(email)) {
                    emails.add(email.toLowerCase());
                }
            });
        }

        return Array.from(emails).slice(0, 10);
    }

    extractPhoneNumbers(text, html = '') {
        const phones = new Set();
        
        // Enhanced international phone patterns from Crawlee research
        const phonePatterns = [
            /\+?1?[-\s.]?\(?([0-9]{3})\)?[-\s.]?([0-9]{3})[-\s.]?([0-9]{4})\b/g,
            /\+?([1-9]\d{0,3})[-\s.]?\(?([0-9]{1,4})\)?[-\s.]?([0-9]{1,4})[-\s.]?([0-9]{1,9})\b/g,
            /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
            /\b\(?\d{3}\)?[-\s.]?\d{3}[-\s.]?\d{4}\b/g
        ];

        phonePatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            matches.forEach(phone => {
                const cleaned = this.cleanPhoneNumber(phone);
                if (this.isValidPhoneNumber(cleaned) && !this.isPhoneFalsePositive(phone)) {
                    phones.add(phone.trim());
                }
            });
        });

        // Extract from tel: links
        if (html) {
            const telPhones = this.extractPhonesFromUrls(this.extractUrls(html));
            telPhones.forEach(phone => phones.add(phone));
        }

        return Array.from(phones).slice(0, 6);
    }

    extractNames(text) {
        const names = new Set();
        
        // Enhanced name patterns
        const namePatterns = [
            /\b([A-Z][a-z]{1,15}\s+[A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15})?)\b/g,
            /\b(Dr\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+)\b/g,
            /\b(Mr\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+)\b/g,
            /\b(Mrs?\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+)\b/g
        ];

        namePatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            matches.forEach(name => {
                const cleanName = name.trim();
                if (this.isValidName(cleanName) && !this.isNameFalsePositive(cleanName)) {
                    names.add(cleanName);
                }
            });
        });

        return Array.from(names).slice(0, 5);
    }

    // Include validation methods from original implementation
    isEmailFalsePositive(email) {
        const falsePositives = [
            /@example\./i,
            /@test\./i,
            /@localhost/i,
            /noreply@/i,
            /no-reply@/i,
            /donotreply@/i,
            /@domain\./i,
            /@your-domain\./i,
            /\.(png|jpg|jpeg|gif|pdf|doc|docx|zip|rar)$/i
        ];
        return falsePositives.some(pattern => pattern.test(email));
    }

    isPhoneFalsePositive(phone) {
        const falsePositivePatterns = [
            /^\d{4}[-/.]\d{2}[-/.]\d{2}$/,  // Date format YYYY-MM-DD
            /^\d{2}[-/.]\d{2}[-/.]\d{4}$/,  // Date format MM-DD-YYYY
            /^\d+\.\d+$/,                   // Decimal numbers
            /^\d+:\d+$/,                    // Time format
            /\b(zip|postal|code|id|ssn|ein|account|routing|tracking|order|invoice)\b/i
        ];
        return falsePositivePatterns.some(pattern => pattern.test(phone));
    }

    isNameFalsePositive(name) {
        const falsePositives = [
            /\b(click|here|more|info|contact|about|home|page|site|website|email|phone|address|location|map|directions|hours|open|closed|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
            /\d{2,}/,
            /[^\w\s'-\.]/,
            /^(Mr|Mrs|Ms|Dr|Prof|Inc|LLC|Ltd|Corp|Company|Business|Service|Services|Group|Team|Staff|Department|Office|Center|Centre)$/i
        ];
        return falsePositives.some(pattern => pattern.test(name));
    }

    isValidName(name) {
        if (!name || name.length < 2 || name.length > 50) return false;
        const words = name.trim().split(/\s+/);
        return words.length >= 2 && words.length <= 4 && 
               words.every(word => /^[A-Z][a-z]+$/i.test(word) || /^(Dr|Mr|Mrs|Ms)\.?$/i.test(word));
    }

    cleanPhoneNumber(phone) {
        return phone.replace(/[^\d+]/g, '');
    }

    isValidPhoneNumber(cleaned) {
        return cleaned.length >= 7 && cleaned.length <= 15 && /^\+?[\d\s\-\(\)]+$/.test(cleaned);
    }

    validateExtractedData(data) {
        return {
            emails: data.emails.filter(email => !this.isEmailFalsePositive(email)),
            phones: data.phones.filter(phone => !this.isPhoneFalsePositive(phone)),
            names: data.names.filter(name => !this.isNameFalsePositive(name))
        };
    }

    extractUrls(html) {
        const $ = cheerio.load(html);
        const urls = [];
        $('a[href]').each((i, elem) => {
            urls.push($(elem).attr('href'));
        });
        return urls;
    }

    extractPhonesFromUrls(urls) {
        return urls.filter(url => url && url.startsWith('tel:'))
                  .map(url => url.replace('tel:', '').trim())
                  .filter(phone => this.isValidPhoneNumber(this.cleanPhoneNumber(phone)));
    }

    // Utility methods
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }

    shouldSkipUrl(url) {
        const skipPatterns = [
            /\\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|dmg)$/i,
            /\\.(jpg|jpeg|png|gif|webp|svg|ico)$/i,
            /\\.(mp3|wav|mp4|avi|mov|webm)$/i,
            /javascript:/i,
            /mailto:/i,
            /tel:/i,
            /ftp:/i
        ];
        
        return skipPatterns.some(pattern => pattern.test(url));
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('Enhanced web scraper browser closed');
        }
    }

    getActiveScrapeCount() {
        return this.activeScrapes.size;
    }

    // Backwards compatibility method
    async scrape(url, options = {}) {
        return await this.scrapeUrl(url, options);
    }

    // Single page scraping method
    async scrapeSinglePage(url, options = {}) {
        return await this.scrapeUrl(url, options);
    }

    // Direct contact info extraction method
    extractContactInfo(text, html = '') {
        return {
            emails: this.extractEmails(text, html),
            phones: this.extractPhoneNumbers(text, html),
            names: this.extractNames(text, html)
        };
    }
}

export default EnhancedWebScraper;