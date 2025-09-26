import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { EventEmitter } from 'events';

/**
 * Web Scraper - Extracts contact information from websites
 * Uses multiple strategies: Puppeteer for dynamic content, Axios+Cheerio for static content
 */
export class WebScraper extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            timeout: config.timeout || 10000,
            userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            maxConcurrent: config.maxConcurrent || 3,
            retryAttempts: config.retryAttempts || 2,
            extractEmails: config.extractEmails !== false,
            extractPhones: config.extractPhones !== false,
            extractNames: config.extractNames !== false,
            ...config
        };
        
        this.browser = null;
        this.activeScrapes = new Set();
    }

    /**
     * Initialize the browser instance
     */
    async initialize() {
        if (this.browser) return;

        try {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-dev-shm-usage'
                ]
            });
            
            console.log('Web scraper browser initialized');
        } catch (error) {
            console.error('Failed to initialize browser:', error);
            throw error;
        }
    }

    /**
     * Close the browser instance
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Scrape contact information from a URL
     */
    async scrapeUrl(url, options = {}) {
        const scrapeId = `${Date.now()}-${Math.random()}`;
        this.activeScrapes.add(scrapeId);

        try {
            // Validate URL
            if (!this.isValidUrl(url)) {
                throw new Error('Invalid URL provided');
            }

            // Skip certain types of URLs
            if (this.shouldSkipUrl(url)) {
                return { url, skipped: true, reason: 'URL type not supported for scraping' };
            }

            console.log(`Starting scrape for: ${url}`);
            this.emit('scrape-started', { url, scrapeId });

            // Try dynamic scraping first (for JavaScript-heavy sites)
            let result;
            try {
                result = await this.scrapeDynamic(url, options);
            } catch (dynamicError) {
                console.log('Dynamic scraping failed, trying static method:', dynamicError.message);
                // Fallback to static scraping
                result = await this.scrapeStatic(url, options);
            }

            // Process and clean the extracted data
            const processedResult = await this.processScrapedData(result);
            
            this.emit('scrape-completed', { url, data: processedResult, scrapeId });
            return processedResult;

        } catch (error) {
            console.error(`Scraping failed for ${url}:`, error);
            this.emit('scrape-failed', { url, error: error.message, scrapeId });
            return { 
                url, 
                error: error.message, 
                emails: [], 
                phones: [], 
                names: [], 
                timestamp: new Date().toISOString() 
            };
        } finally {
            this.activeScrapes.delete(scrapeId);
        }
    }

    /**
     * Scrape using Puppeteer (for dynamic content)
     */
    async scrapeDynamic(url, options = {}) {
        if (!this.browser) {
            await this.initialize();
        }

        const page = await this.browser.newPage();
        
        try {
            // Set user agent and viewport
            await page.setUserAgent(this.config.userAgent);
            await page.setViewport({ width: 1366, height: 768 });

            // Navigate to page with timeout
            await page.goto(url, { 
                waitUntil: 'networkidle0', 
                timeout: this.config.timeout 
            });

            // Wait a bit for dynamic content to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Extract page content
            const content = await page.content();
            const title = await page.title();

            // Get text content for better extraction
            const textContent = await page.evaluate(() => {
                return document.body ? document.body.innerText : '';
            });

            return {
                url,
                title,
                content,
                textContent,
                method: 'dynamic',
                timestamp: new Date().toISOString()
            };

        } finally {
            await page.close();
        }
    }

    /**
     * Scrape using Axios + Cheerio (for static content)
     */
    async scrapeStatic(url, options = {}) {
        const response = await axios.get(url, {
            timeout: this.config.timeout,
            headers: {
                'User-Agent': this.config.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive'
            },
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);
        const title = $('title').text().trim();
        const textContent = $('body').text();

        return {
            url,
            title,
            content: response.data,
            textContent,
            method: 'static',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Process scraped data to extract contact information with intelligent content selection
     */
    async processScrapedData(rawData) {
        const result = {
            url: rawData.url,
            title: rawData.title,
            domain: this.extractDomain(rawData.url),
            timestamp: rawData.timestamp,
            method: rawData.method,
            emails: [],
            phones: [],
            names: []
        };

        // Get targeted content sections for better extraction
        const targetedContent = this.extractTargetedContent(rawData.textContent, rawData.content);
        const combinedText = `${rawData.title} ${targetedContent.priorityText} ${targetedContent.generalText}`;

        // Extract emails with priority content first
        if (this.config.extractEmails) {
            result.emails = this.extractEmails(combinedText, rawData.content);
        }

        // Extract phone numbers with priority content first
        if (this.config.extractPhones) {
            result.phones = this.extractPhoneNumbers(combinedText, rawData.content);
        }

        // Extract names with priority content first
        if (this.config.extractNames) {
            result.names = this.extractNames(combinedText, rawData.content);
        }

        // Apply comprehensive validation and filtering
        const validatedResult = this.validateExtractedData(result);

        return validatedResult;
    }

    /**
     * Extract targeted content from specific sections likely to contain contact information
     */
    extractTargetedContent(textContent, htmlContent) {
        const result = {
            priorityText: '',
            generalText: textContent || ''
        };

        if (!htmlContent) {
            return result;
        }

        const $ = cheerio.load(htmlContent);
        
        // Priority selectors for contact-rich sections
        const prioritySelectors = [
            // Contact sections
            'section[id*="contact" i], div[id*="contact" i], footer[id*="contact" i]',
            'section[class*="contact" i], div[class*="contact" i]',
            '[id*="contact-info" i], [class*="contact-info" i]',
            
            // About sections
            'section[id*="about" i], div[id*="about" i]',
            'section[class*="about" i], div[class*="about" i]',
            '[id*="about-us" i], [class*="about-us" i]',
            
            // Team sections
            'section[id*="team" i], div[id*="team" i]',
            'section[class*="team" i], div[class*="team" i]',
            '[id*="our-team" i], [class*="our-team" i]',
            
            // Footer sections (often contain contact info)
            'footer, .footer, #footer',
            '.site-footer, #site-footer',
            
            // Header contact info
            'header, .header, #header',
            '.site-header, #site-header',
            '.top-bar, #top-bar',
            
            // Sidebar contact info
            '.sidebar, #sidebar',
            '.widget, .contact-widget',
            
            // Business info sections
            '[id*="business-info" i], [class*="business-info" i]',
            '[id*="company-info" i], [class*="company-info" i]',
            
            // Address/location sections
            '[id*="address" i], [class*="address" i]',
            '[id*="location" i], [class*="location" i]',
            
            // Staff/personnel sections
            '[id*="staff" i], [class*="staff" i]',
            '[id*="personnel" i], [class*="personnel" i]',
            '[id*="directory" i], [class*="directory" i]',
            
            // Bio/profile sections
            '.bio, .profile, .author-bio',
            '[id*="bio" i], [class*="bio" i]',
            
            // Contact forms and their containers
            'form[id*="contact" i], form[class*="contact" i]',
            '.contact-form, #contact-form',
            
            // Navigation with contact links
            'nav a[href*="contact" i], .nav a[href*="contact" i]',
            'a[href*="tel:"], a[href*="mailto:"]'
        ];

        // Secondary selectors for potentially relevant content
        const secondarySelectors = [
            // Social media sections
            '.social, .social-media, #social',
            '[class*="social" i], [id*="social" i]',
            
            // Info boxes and callouts
            '.info-box, .callout, .highlight',
            '.notice, .important',
            
            // Article author sections
            '.author, .byline, .post-author',
            '.article-author, .entry-author',
            
            // Testimonials (might have client names)
            '.testimonial, .testimonials',
            '[class*="testimonial" i]',
            
            // Event information
            '.event-info, .event-details',
            
            // Press releases
            '.press-release, .news-item'
        ];

        // Extract priority content
        let priorityContent = [];
        prioritySelectors.forEach(selector => {
            try {
                $(selector).each((i, elem) => {
                    const text = $(elem).text().trim();
                    if (text && text.length > 10) { // Minimum meaningful content
                        priorityContent.push(text);
                    }
                });
            } catch (error) {
                // Skip invalid selectors
            }
        });

        // Extract secondary content
        let secondaryContent = [];
        secondarySelectors.forEach(selector => {
            try {
                $(selector).each((i, elem) => {
                    const text = $(elem).text().trim();
                    if (text && text.length > 20) { // Slightly higher threshold for secondary
                        secondaryContent.push(text);
                    }
                });
            } catch (error) {
                // Skip invalid selectors
            }
        });

        // Combine and deduplicate priority content
        result.priorityText = this.deduplicateContent([...priorityContent, ...secondaryContent]).join(' ');

        // Also extract from meta tags and structured data
        const metaContent = this.extractMetaContactInfo(htmlContent);
        if (metaContent) {
            result.priorityText = `${metaContent} ${result.priorityText}`;
        }

        return result;
    }

    /**
     * Extract contact information from meta tags and structured data
     */
    extractMetaContactInfo(html) {
        const contactInfo = [];

        // Extract from common meta tags
        const metaPatterns = [
            /<meta[^>]+name="contact"[^>]+content="([^"]+)"/gi,
            /<meta[^>]+name="phone"[^>]+content="([^"]+)"/gi,
            /<meta[^>]+name="email"[^>]+content="([^"]+)"/gi,
            /<meta[^>]+name="address"[^>]+content="([^"]+)"/gi,
            /<meta[^>]+property="business:contact_data"[^>]+content="([^"]+)"/gi,
            /<meta[^>]+property="og:phone_number"[^>]+content="([^"]+)"/gi,
            /<meta[^>]+property="og:email"[^>]+content="([^"]+)"/gi
        ];

        metaPatterns.forEach(pattern => {
            const matches = html.match(pattern) || [];
            matches.forEach(match => {
                const contentMatch = match.match(/content="([^"]+)"/);
                if (contentMatch) {
                    contactInfo.push(contentMatch[1]);
                }
            });
        });

        // Extract from JSON-LD structured data
        const jsonLdPattern = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
        const jsonLdMatches = html.match(jsonLdPattern) || [];
        
        jsonLdMatches.forEach(match => {
            try {
                const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
                const data = JSON.parse(jsonContent);
                
                // Extract contact info from various schema types
                this.extractContactFromJsonLd(data, contactInfo);
            } catch (error) {
                // Skip invalid JSON-LD
            }
        });

        return contactInfo.join(' ');
    }

    /**
     * Extract contact information from JSON-LD structured data
     */
    extractContactFromJsonLd(data, contactInfo) {
        if (Array.isArray(data)) {
            data.forEach(item => this.extractContactFromJsonLd(item, contactInfo));
            return;
        }

        if (typeof data !== 'object' || !data) return;

        // Common properties that might contain contact info
        const contactProperties = [
            'telephone', 'phone', 'email', 'contactPoint',
            'address', 'name', 'givenName', 'familyName',
            'founder', 'employee', 'member', 'author'
        ];

        contactProperties.forEach(prop => {
            if (data[prop]) {
                if (typeof data[prop] === 'string') {
                    contactInfo.push(data[prop]);
                } else if (typeof data[prop] === 'object') {
                    this.extractContactFromJsonLd(data[prop], contactInfo);
                }
            }
        });

        // Check for Organization or Person schema types
        if (data['@type']) {
            const type = Array.isArray(data['@type']) ? data['@type'] : [data['@type']];
            if (type.some(t => ['Organization', 'Person', 'LocalBusiness', 'Corporation'].includes(t))) {
                // This is likely to have contact information
                Object.values(data).forEach(value => {
                    if (typeof value === 'string' && value.length > 5) {
                        contactInfo.push(value);
                    } else if (typeof value === 'object') {
                        this.extractContactFromJsonLd(value, contactInfo);
                    }
                });
            }
        }
    }

    /**
     * Deduplicate content to avoid processing the same text multiple times
     */
    deduplicateContent(contentArray) {
        const seen = new Set();
        const minLength = 15;
        
        return contentArray.filter(content => {
            if (!content || content.length < minLength) return false;
            
            // Create a normalized version for comparison
            const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
            
            // Check if we've seen very similar content
            for (const seenContent of seen) {
                if (this.stringSimilarity(normalized, seenContent) > 0.8) {
                    return false; // Too similar, skip
                }
            }
            
            seen.add(normalized);
            return true;
        });
    }

    /**
     * Calculate string similarity (simple Jaccard similarity)
     */
    stringSimilarity(str1, str2) {
        const words1 = new Set(str1.split(' '));
        const words2 = new Set(str2.split(' '));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    /**
     * Extract email addresses from text with advanced patterns
     * Based on research from Scrapy and Crawlee frameworks
     */
    extractEmails(text, html = '') {
        const emails = new Set();
        
        // RFC 5322 compliant email regex (most comprehensive) - from Crawlee
        const EMAIL_REGEX_STRING = '(?:[a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\\])';
        const EMAIL_REGEX_GLOBAL = new RegExp(EMAIL_REGEX_STRING, 'ig');
        
        // Comprehensive email patterns based on Scrapy research
        const emailPatterns = [
            // Primary RFC-compliant pattern from Crawlee
            EMAIL_REGEX_GLOBAL,
            
            // Standard email pattern
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            
            // Obfuscation patterns commonly found in scraped data
            /\b[A-Za-z0-9._%+-]+\s*\[\s*at\s*\]\s*[A-Za-z0-9.-]+\s*\[\s*dot\s*\]\s*[A-Z|a-z]{2,}\b/gi,
            /\b[A-Za-z0-9._%+-]+\s*\(\s*at\s*\)\s*[A-Za-z0-9.-]+\s*\(\s*dot\s*\)\s*[A-Z|a-z]{2,}\b/gi,
            /\b[A-Za-z0-9._%+-]+\s+at\s+[A-Za-z0-9.-]+\s+dot\s+[A-Z|a-z]{2,}\b/gi,
            
            // HTML entity obfuscation
            /\b[A-Za-z0-9._%+-]+&#64;[A-Za-z0-9.-]+&#46;[A-Z|a-z]{2,}\b/gi,
            /\b[A-Za-z0-9._%+-]+&at;[A-Za-z0-9.-]+&dot;[A-Z|a-z]{2,}\b/gi,
            
            // Space-separated obfuscation
            /\b[A-Za-z0-9._%+-]+\s+@\s+[A-Za-z0-9.-]+\s+\.\s+[A-Z|a-z]{2,}\b/g,
            
            // JavaScript/ROT13 basic patterns
            /\b[A-Za-z0-9._%+-]+\s*\{\s*@\s*\}\s*[A-Za-z0-9.-]+\s*\{\s*\.\s*\}\s*[A-Z|a-z]{2,}\b/gi
        ];
        
        // Extract from text content using all patterns
        emailPatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            matches.forEach(email => {
                const cleanEmail = this.cleanObfuscatedEmail(email);
                if (cleanEmail && this.isValidEmail(cleanEmail)) {
                    emails.add(cleanEmail.toLowerCase());
                }
            });
        });
        
        // Extract from HTML URLs (Crawlee approach)
        if (html) {
            const linkUrls = this.extractUrlsFromHtml(html);
            const emailsFromUrls = this.emailsFromUrls(linkUrls);
            emailsFromUrls.forEach(email => emails.add(email.toLowerCase()));
            
            // Mailto links with query parameter handling
            const mailtoRegex = /href\s*=\s*['"]\s*mailto:([^'"?]+)(?:\?[^'"]*)?['"]/gi;
            const mailtoMatches = html.match(mailtoRegex) || [];
            mailtoMatches.forEach(match => {
                const emailMatch = match.match(/mailto:([^'"?]+)/i);
                if (emailMatch) {
                    const email = emailMatch[1].trim();
                    if (this.isValidEmail(email)) {
                        emails.add(email.toLowerCase());
                    }
                }
            });
            
            // Data attributes and JavaScript variables (enhanced)
            const jsEmailPatterns = [
                /['""]([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})['"]/g,
                /email\s*[:=]\s*['""]?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})['""]?/gi,
                /contact\s*[:=]\s*['""]?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})['""]?/gi,
                /data-email\s*=\s*['""]([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})['"]/gi,
                /var\s+\w*email\w*\s*=\s*['""]([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})['"]/gi
            ];
            
            jsEmailPatterns.forEach(pattern => {
                const matches = html.match(pattern) || [];
                matches.forEach(match => {
                    const emailMatch = match.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/);
                    if (emailMatch && this.isValidEmail(emailMatch[1])) {
                        emails.add(emailMatch[1].toLowerCase());
                    }
                });
            });
            
            // Schema.org structured data (enhanced)
            const schemaPatterns = [
                /"email":\s*"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})"/gi,
                /"contactPoint":[^}]*"email":\s*"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})"/gi,
                /itemprop\s*=\s*['""]email['""][^>]*content\s*=\s*['""]([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})['"]/gi
            ];
            
            schemaPatterns.forEach(pattern => {
                const matches = html.match(pattern) || [];
                matches.forEach(match => {
                    const emailMatch = match.match(/"?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})"?/);
                    if (emailMatch && this.isValidEmail(emailMatch[1])) {
                        emails.add(emailMatch[1].toLowerCase());
                    }
                });
            });
        }
        
        // Enhanced filtering with domain validation
        const filtered = Array.from(emails)
            .filter(email => this.isValidEmail(email))
            .filter(email => !this.isEmailFalsePositive(email))
            .filter(email => this.isValidEmailDomain(email))
            .sort() // Sort for consistency
            .filter((email, index, arr) => arr.indexOf(email) === index); // Remove duplicates
        
        return filtered.slice(0, 15); // Return top results
    }

    /**
     * Extract URLs from HTML for email processing (Crawlee approach)
     */
    extractUrlsFromHtml(html) {
        const urls = [];
        const linkRegex = /href\s*=\s*['""]([^'""]+)['"]/gi;
        const matches = html.match(linkRegex) || [];
        
        matches.forEach(match => {
            const urlMatch = match.match(/href\s*=\s*['""]([^'""]+)['"]/i);
            if (urlMatch) {
                urls.push(urlMatch[1]);
            }
        });
        
        return urls;
    }

    /**
     * Extract emails from URLs (Crawlee emailsFromUrls function)
     */
    emailsFromUrls(urls) {
        const emails = [];
        const EMAIL_URL_PREFIX_REGEX = /^mailto:/i;
        
        for (const url of urls) {
            if (!url || !EMAIL_URL_PREFIX_REGEX.test(url)) continue;
            
            const email = url.replace(EMAIL_URL_PREFIX_REGEX, '').split('?')[0].trim();
            if (this.isValidEmail(email)) {
                emails.push(email);
            }
        }
        
        return emails;
    }

    /**
     * Validate email domain (enhanced from Scrapy research)
     */
    isValidEmailDomain(email) {
        const domain = email.split('@')[1];
        if (!domain) return false;
        
        // Basic domain validation
        if (domain.length < 3 || domain.length > 255) return false;
        if (!domain.includes('.')) return false;
        if (domain.startsWith('.') || domain.endsWith('.')) return false;
        if (domain.includes('..')) return false;
        
        // TLD validation (basic)
        const tld = domain.split('.').pop();
        if (!tld || tld.length < 2 || tld.length > 6) return false;
        
        // Common valid TLD pattern
        if (!/^[a-z]{2,6}$/i.test(tld)) return false;
        
        return true;
    }

    /**
     * Clean obfuscated emails
     */
    cleanObfuscatedEmail(email) {
        return email
            .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
            .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
            .replace(/\s*\(\s*@\s*\)\s*/gi, '@')
            .replace(/\s*\(\s*\.\s*\)\s*/gi, '.')
            .replace(/\s+@\s+/g, '@')
            .replace(/\s+\.\s+/g, '.')
            .replace(/\s/g, '');
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && 
               email.length <= 254 && 
               !email.startsWith('.') && 
               !email.endsWith('.') &&
               !email.includes('..') &&
               email.split('@').length === 2;
    }

    /**
     * Extract phone numbers from text with advanced international patterns
     * Based on comprehensive patterns from Crawlee's social.ts
     */
    extractPhoneNumbers(text, html = '') {
        const phones = new Set();
        
        // Comprehensive phone number patterns based on Crawlee research
        const PHONE_REGEX_STRINGS = [
            // Basic 6-15 digit numbers
            '[0-9]{6,15}',
            
            // US/International with parentheses - various formats
            '([0-9]{1,4}( )?)?\\([0-9]{2,4}\\)( )?[0-9]{2,4}(( )?(-|.))?( )?[0-9]{2,6}',
            
            // Brazilian format: (51) 5667-9987 or (19)94138-9398
            '\\([0-9]{2}\\)( )?[0-9]{4,5}-[0-9]{4}',
            
            // US format with extensions: 1(262) 955-95-79 or 1(262)955.95.79
            '([0-9]{1,4}( )?)?\\([0-9]{2,4}\\)( )?[0-9]{2,4}(( )?(-|.))?( )?[0-9]{2,6}',
            
            // Dash-separated formats
            '[0-9]{2,4}-[0-9]{2,4}-[0-9]{2,4}-[0-9]{2,6}',
            '[0-9]{2,4}-[0-9]{2,4}-[0-9]{2,6}',
            '[0-9]{2,4}-[0-9]{2,6}',
            
            // Dot-separated formats
            '[0-9]{2,4}\\.[0-9]{2,4}\\.[0-9]{2,4}\\.[0-9]{2,6}',
            '[0-9]{2,4}\\.[0-9]{2,4}\\.[0-9]{2,6}',
            '[0-9]{2,4}\\.[0-9]{2,6}',
            
            // Space-separated formats
            '[0-9]{2,4} [0-9]{2,4} [0-9]{2,4} [0-9]{2,6}',
            '[0-9]{2,4} [0-9]{2,4} [0-9]{2,6}',
            '[0-9]{2,4} [0-9]{3,8}'
        ];
        
        // Add country code prefixes
        const phonePatterns = PHONE_REGEX_STRINGS.map(regex => new RegExp(`(00|\\+)?${regex}`, 'ig'));
        
        // Extract from text content
        phonePatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            matches.forEach(phone => {
                const cleaned = this.cleanPhoneNumber(phone);
                if (this.isValidPhoneNumber(cleaned) && !this.isPhoneFalsePositive(phone)) {
                    phones.add(phone.trim());
                }
            });
        });
        
        // Extract from HTML URLs (Crawlee approach)
        if (html) {
            const linkUrls = this.extractUrlsFromHtml(html);
            const phonesFromUrls = this.phonesFromUrls(linkUrls);
            phonesFromUrls.forEach(phone => {
                if (this.isValidPhoneNumber(this.cleanPhoneNumber(phone))) {
                    phones.add(phone);
                }
            });
            
            // Enhanced tel: link extraction
            const telPatterns = [
                /tel:([+]?[\d\s\-\(\)\.ext]+)/gi,
                /href\s*=\s*['"]\s*tel:([^'"]*)['"]>/gi,
                /"telephone":\s*"([^"]+)"/gi,
                /itemprop\s*=\s*['""]telephone['""][^>]*content\s*=\s*['""]([^'""]+)['"]/gi
            ];
            
            telPatterns.forEach(pattern => {
                const matches = html.match(pattern) || [];
                matches.forEach(match => {
                    const phoneMatch = match.match(/([+]?[\d\s\-\(\)\.ext]+)/);
                    if (phoneMatch) {
                        const phone = phoneMatch[1].trim();
                        const cleaned = this.cleanPhoneNumber(phone);
                        if (this.isValidPhoneNumber(cleaned) && !this.isPhoneFalsePositive(phone)) {
                            phones.add(phone);
                        }
                    }
                });
            });
            
            // Schema.org and structured data
            const schemaPatterns = [
                /"telephone":\s*"([^"]+)"/gi,
                /"phone":\s*"([^"]+)"/gi,
                /itemprop\s*=\s*['""]telephone['""][^>]*content\s*=\s*['""]([^'""]+)['"]/gi,
                /data-phone\s*=\s*['""]([^'""]+)['"]/gi
            ];
            
            schemaPatterns.forEach(pattern => {
                const matches = html.match(pattern) || [];
                matches.forEach(match => {
                    const phoneMatch = match.match(/"([^"]+)"/);
                    if (phoneMatch) {
                        const phone = phoneMatch[1].trim();
                        const cleaned = this.cleanPhoneNumber(phone);
                        if (this.isValidPhoneNumber(cleaned) && !this.isPhoneFalsePositive(phone)) {
                            phones.add(phone);
                        }
                    }
                });
            });
        }
        
        // Enhanced filtering and formatting
        const filtered = Array.from(phones)
            .filter(phone => !this.isPhoneFalsePositive(phone))
            .map(phone => this.formatPhoneNumber(phone))
            .filter(phone => phone !== null)
            .sort() // Sort for consistency
            .filter((phone, index, arr) => arr.indexOf(phone) === index); // Remove duplicates
        
        return filtered.slice(0, 10); // Return top results
    }

    /**
     * Extract phones from URLs (Crawlee phonesFromUrls function)
     */
    phonesFromUrls(urls) {
        const phones = [];
        const PHONE_URL_PREFIX_REGEX = /^(tel|phone|telephone|callto):(\/)?(\/)?/i;
        
        for (const url of urls) {
            if (!url || !PHONE_URL_PREFIX_REGEX.test(url)) continue;
            
            const phone = url.replace(PHONE_URL_PREFIX_REGEX, '').trim();
            const cleaned = this.cleanPhoneNumber(phone);
            if (this.isValidPhoneNumber(cleaned)) {
                phones.push(phone);
            }
        }
        
        return phones;
    }

    /**
     * Clean phone number for validation
     */
    cleanPhoneNumber(phone) {
        return phone.replace(/[^\d+]/g, '');
    }

    /**
     * Validate phone number (enhanced with Crawlee logic)
     */
    isValidPhoneNumber(cleaned) {
        // Minimum digits validation (Crawlee uses 7 minimum)
        const PHONE_MIN_DIGITS = 7;
        const digitCount = (cleaned.match(/[0-9]/g) || []).length;
        
        if (digitCount < PHONE_MIN_DIGITS) return false;
        
        // Must have between 7 and 15 digits (international standard)
        if (cleaned.length < 7 || cleaned.length > 15) return false;
        
        // False positive patterns (based on Crawlee research)
        const SKIP_PHONE_REGEXS = [
            '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', // Date format: 2018-11-10
            '^[0-9]{4}/[0-9]{2}/[0-9]{2}$', // Date format: 2018/11/10
            '^[0-9]{2}/[0-9]{2}/[0-9]{4}$', // Date format: 11/10/2018
            '^[0-9]{8,}$' // Too many consecutive digits (likely false positive)
        ];
        
        const skipRegex = new RegExp(`(${SKIP_PHONE_REGEXS.join('|')})`, 'i');
        if (skipRegex.test(cleaned)) return false;
        
        // If starts with +, must have country code
        if (cleaned.startsWith('+')) {
            return cleaned.length >= 8 && cleaned.length <= 15;
        }
        
        // US/Canada specific validation
        if (cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'))) {
            const number = cleaned.startsWith('1') ? cleaned.substring(1) : cleaned;
            if (number.length === 10) {
                const areaCode = number.substring(0, 3);
                const exchange = number.substring(3, 6);
                
                // Area code cannot start with 0 or 1
                if (areaCode.startsWith('0') || areaCode.startsWith('1')) return false;
                
                // Exchange cannot start with 0 or 1
                if (exchange.startsWith('0') || exchange.startsWith('1')) return false;
                
                return true;
            }
        }
        
        // International numbers (basic validation)
        return cleaned.length >= 7 && cleaned.length <= 15;
    }

    /**
     * Format phone number for display
     */
    formatPhoneNumber(phone) {
        const cleaned = this.cleanPhoneNumber(phone);
        
        // US/Canada formatting
        if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            const number = cleaned.substring(1);
            return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
        }
        
        // Keep original formatting for international or non-standard numbers
        return phone.trim();
    }

    /**
     * Extract names from text with advanced pattern recognition
     * Enhanced with patterns inspired by Scrapy and Crawlee research
     */
    extractNames(text, html = '') {
        const names = new Set();
        
        // Enhanced name extraction patterns based on research
        const namePatterns = [
            // Professional titles with names (enhanced)
            /(?:Dr\.?|Doctor|Prof\.?|Professor|Mr\.?|Ms\.?|Mrs\.?|Miss|CEO|President|Director|Manager|VP|Vice\s+President)\s+([A-Z][a-z]+'?(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]+'?(?:\s+[A-Z][a-z]+'?)?)/gi,
            
            // Contact information patterns (enhanced)
            /(?:contact|reach(?:\s+out\s+to)?|speak\s+with|talk\s+to|meet|ask\s+for|call|email)\s+(?:us\s+at\s+)?([A-Z][a-z]{1,15}(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]{1,20})/gi,
            
            // About/Team sections
            /(?:about|team|staff|meet|our|founder|co-founder|ceo|president|owner|director|manager|lead|head|senior|principal|chief)[\s:]*([A-Z][a-z]{1,15}\s+[A-Z][a-z]{1,20})/gi,
            
            // Author/byline patterns
            /(?:by|author|written\s+by|created\s+by|developed\s+by):\s*([A-Z][a-z]{1,15}(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]{1,20})/gi,
            
            // Job title patterns
            /([A-Z][a-z]{1,15}(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]{1,20}),?\s+(?:is\s+(?:our|the|a)|works?\s+as|serves?\s+as)?\s*(?:CEO|President|Director|Manager|Engineer|Developer|Designer|Consultant|Specialist|Coordinator|Analyst|Associate)/gi,
            
            // Introduction patterns
            /(?:hello,?\s+i'?m|hi,?\s+i'?m|my\s+name\s+is|i'?m|this\s+is)\s+([A-Z][a-z]{1,15}(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]{1,20})/gi,
            
            // Quote attribution patterns
            /["""].*?["""],?\s*(?:said|says|according\s+to|states?)\s+([A-Z][a-z]{1,15}(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]{1,20})/gi,
            
            // Business card style patterns
            /([A-Z][a-z]{1,15}(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]{1,20})\s*[,\n]\s*(?:CEO|President|Director|Manager|Partner|Owner|Founder)/gi,
            
            // Email signature patterns
            /(?:best\s+regards?|sincerely|thank\s+you),?\s*\n?\s*([A-Z][a-z]{1,15}(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]{1,20})/gi,
            
            // Three-part names (First Middle Last)
            /\b([A-Z][a-z]{2,12}\s+[A-Z][a-z]{1,12}\s+[A-Z][a-z]{2,15})\b/g,
            
            // Standard full name patterns (2-3 parts)
            /\b([A-Z][a-z]{2,15}\s+(?:[A-Z]\.?\s+)?[A-Z][a-z]{2,20}(?:\s+[A-Z][a-z]{2,20})?)\b/g
        ];
        
        // Extract from text with enhanced pattern matching
        namePatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            matches.forEach(match => {
                // Extract the name part - handle different capture group positions
                let nameMatch = null;
                
                // Try to find the name in various capture group positions
                const fullMatch = pattern.exec(match);
                if (fullMatch && fullMatch[1]) {
                    nameMatch = fullMatch[1];
                } else {
                    // Fallback to pattern matching
                    const namePattern = /([A-Z][a-z]{1,15}(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]{1,20})+)/;
                    const result = match.match(namePattern);
                    if (result) nameMatch = result[1];
                }
                
                if (nameMatch) {
                    const name = nameMatch.trim()
                        .replace(/\s+/g, ' ') // Normalize spaces
                        .replace(/([A-Z])\.\s*([A-Z])/g, '$1. $2') // Fix middle initial spacing
                        .replace(/,.*$/, ''); // Remove trailing job titles/credentials
                    
                    if (this.isValidName(name) && !this.isNameFalsePositive(name)) {
                        names.add(name);
                    }
                }
                // Reset regex for next iteration
                pattern.lastIndex = 0;
            });
        });
        
        // Extract from HTML with structured data (enhanced)
        if (html) {
            this.extractNamesFromStructuredData(html, names);
            this.extractNamesFromMetaTags(html, names);
            this.extractNamesFromSchemaOrg(html, names);
            this.extractNamesFromMicrodata(html, names);
            this.extractNamesFromSocialProfiles(html, names);
        }
        
        // Enhanced post-processing with confidence scoring
        const processedNames = Array.from(names)
            .map(name => this.normalizeName(name))
            .filter(name => name && this.isValidName(name))
            .filter(name => !this.isNameFalsePositive(name))
            .filter((name, index, arr) => arr.indexOf(name) === index) // Remove duplicates
            .sort((a, b) => {
                // Score names by quality indicators
                const scoreA = this.calculateNameConfidence(a);
                const scoreB = this.calculateNameConfidence(b);
                
                if (scoreA !== scoreB) {
                    return scoreB - scoreA; // Higher confidence first
                }
                
                // Secondary sort: prefer longer names (more complete)
                if (a.split(' ').length !== b.split(' ').length) {
                    return b.split(' ').length - a.split(' ').length;
                }
                
                return a.localeCompare(b);
            });
        
        return processedNames.slice(0, 8); // Return top-quality names
    }

    /**
     * Calculate confidence score for name quality
     */
    calculateNameConfidence(name) {
        let score = 0;
        const parts = name.split(' ');
        
        // Prefer names with 2-3 parts (first + last or first + middle + last)
        if (parts.length === 2) score += 10;
        if (parts.length === 3) score += 8;
        if (parts.length === 1) score += 3;
        if (parts.length > 3) score -= 5;
        
        // Prefer proper capitalization
        if (parts.every(part => /^[A-Z][a-z]+$/.test(part.replace(/\.$/, '')))) {
            score += 5;
        }
        
        // Bonus for middle initials
        if (parts.length === 3 && /^[A-Z]\.$/.test(parts[1])) {
            score += 3;
        }
        
        // Penalty for very short or very long names
        const totalLength = name.replace(/\s+/g, '').length;
        if (totalLength < 4 || totalLength > 30) score -= 5;
        
        // Bonus for common name patterns
        if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name)) score += 2;
        
        return score;
    }

    /**
     * Extract names from social media profiles in HTML
     */
    extractNamesFromSocialProfiles(html, names) {
        // LinkedIn profile patterns
        const linkedinPatterns = [
            /linkedin\.com\/in\/([A-Za-z-]+)/gi,
            /"name":\s*"([^"]+)"[^}]*"@type":\s*"Person"/gi
        ];
        
        // Twitter profile patterns  
        const twitterPatterns = [
            /twitter\.com\/([A-Za-z0-9_]+)/gi,
            /"name":\s*"([^"]+)"[^}]*twitter/gi
        ];
        
        // Extract from social media links
        const allPatterns = [...linkedinPatterns, ...twitterPatterns];
        allPatterns.forEach(pattern => {
            const matches = html.match(pattern) || [];
            matches.forEach(match => {
                const nameMatch = match.match(/"([^"]+)"/);
                if (nameMatch) {
                    const name = nameMatch[1].replace(/[-_]/g, ' ');
                    if (this.isValidName(name)) {
                        names.add(name);
                    }
                }
            });
        });
    }

    /**
     * Extract names from structured data in HTML
     */
    extractNamesFromStructuredData(html, names) {
        // Schema.org Person markup
        const schemaPatterns = [
            /"@type":\s*"Person"[^}]*"name":\s*"([^"]+)"/gi,
            /"@type":\s*"Person"[^}]*"givenName":\s*"([^"]+)"[^}]*"familyName":\s*"([^"]+)"/gi,
            /"name":\s*"([A-Z][a-z]{1,15}\s+[A-Z][a-z]{1,20})"/gi
        ];
        
        schemaPatterns.forEach(pattern => {
            const matches = html.match(pattern) || [];
            matches.forEach(match => {
                const nameMatches = match.match(/"([A-Z][^"]*[a-z])"/g);
                if (nameMatches) {
                    nameMatches.forEach(nameMatch => {
                        const name = nameMatch.replace(/"/g, '').trim();
                        if (this.isValidName(name)) {
                            names.add(name);
                        }
                    });
                }
            });
        });
    }

    /**
     * Extract names from meta tags
     */
    extractNamesFromMetaTags(html, names) {
        const metaPatterns = [
            /<meta[^>]+name="author"[^>]+content="([^"]+)"/gi,
            /<meta[^>]+name="creator"[^>]+content="([^"]+)"/gi,
            /<meta[^>]+property="article:author"[^>]+content="([^"]+)"/gi,
            /<meta[^>]+property="profile:first_name"[^>]+content="([^"]+)"[^>]*>/gi,
            /<meta[^>]+property="profile:last_name"[^>]+content="([^"]+)"[^>]*>/gi
        ];
        
        metaPatterns.forEach(pattern => {
            const matches = html.match(pattern) || [];
            matches.forEach(match => {
                const contentMatch = match.match(/content="([^"]+)"/);
                if (contentMatch) {
                    const name = contentMatch[1].trim();
                    if (this.isValidName(name)) {
                        names.add(name);
                    }
                }
            });
        });
    }

    /**
     * Extract names from Schema.org markup
     */
    extractNamesFromSchemaOrg(html, names) {
        // Look for itemprop="name" with itemtype="http://schema.org/Person"
        const schemaOrgPattern = /itemtype="[^"]*Person"[^>]*>[\s\S]*?itemprop="name"[^>]*>([^<]+)</gi;
        const matches = html.match(schemaOrgPattern) || [];
        
        matches.forEach(match => {
            const nameMatch = match.match(/itemprop="name"[^>]*>([^<]+)</);
            if (nameMatch) {
                const name = nameMatch[1].trim();
                if (this.isValidName(name)) {
                    names.add(name);
                }
            }
        });
    }

    /**
     * Extract names from microdata
     */
    extractNamesFromMicrodata(html, names) {
        // Look for common microdata patterns
        const microdataPatterns = [
            /<[^>]+class="[^"]*(?:author|name|person|contact)[^"]*"[^>]*>([A-Z][a-z]+\s+[A-Z][a-z]+)</gi,
            /<[^>]+id="[^"]*(?:author|name|person|contact)[^"]*"[^>]*>([A-Z][a-z]+\s+[A-Z][a-z]+)</gi,
            /<span[^>]+class="[^"]*name[^"]*"[^>]*>([A-Z][a-z]+\s+[A-Z][a-z]+)</gi
        ];
        
        microdataPatterns.forEach(pattern => {
            const matches = html.match(pattern) || [];
            matches.forEach(match => {
                const nameMatch = match.match(/>([A-Z][a-z]+\s+[A-Z][a-z]+)</);
                if (nameMatch) {
                    const name = nameMatch[1].trim();
                    if (this.isValidName(name)) {
                        names.add(name);
                    }
                }
            });
        });
    }

    /**
     * Validate if a name looks legitimate
     */
    isValidName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const trimmed = name.trim();
        if (trimmed.length < 3 || trimmed.length > 50) return false;
        
        // Must have at least first and last name
        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) return false;
        
        // Each part should be reasonable length
        if (parts.some(part => part.length < 2 || part.length > 20)) return false;
        
        // Should not contain numbers or special characters (except apostrophes, periods, hyphens)
        if (!/^[A-Za-z\s.'-]+$/.test(trimmed)) return false;
        
        // Should start with capital letter
        if (!/^[A-Z]/.test(trimmed)) return false;
        
        // Each word should start with capital
        const words = parts.filter(part => part.length > 1); // Ignore single letters (initials)
        if (words.some(word => !/^[A-Z]/.test(word))) return false;
        
        return true;
    }

    /**
     * Normalize name formatting
     */
    normalizeName(name) {
        return name
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
            .replace(/\b([A-Z])\.?\s*([A-Z])\b/g, '$1. $2') // Fix initials
            .replace(/\b([A-Z][a-z]+)\s+([A-Z])\b/g, '$1 $2.') // Add period to single letter
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Check if email is a false positive with comprehensive filtering
     */
    isEmailFalsePositive(email) {
        if (!email || typeof email !== 'string') return true;
        
        const lowerEmail = email.toLowerCase();
        
        // Enhanced false positive patterns based on Scrapy/Crawlee research
        const falsePositives = [
            // Standard test/example emails
            'test@example.com', 'user@example.com', 'admin@example.com',
            'info@example.com', 'support@example.com', 'contact@example.com',
            'noreply@example.com', 'no-reply@example.com', 'hello@example.com',
            'mail@example.com', 'email@example.com', 'name@example.com',
            
            // Common development/testing patterns
            'test@test.com', 'admin@test.com', 'user@test.com',
            'test@localhost', 'admin@localhost', 'user@localhost',
            'test@domain.com', 'user@domain.com', 'example@domain.com',
            
            // Placeholder patterns
            'your.email@example.com', 'youremail@example.com',
            'jane@example.com', 'john@example.com', 'doe@example.com',
            'jane.doe@example.com', 'john.doe@example.com', 'john.smith@example.com',
            
            // Website builder placeholders
            'info@yoursite.com', 'contact@yoursite.com', 'admin@yoursite.com',
            'info@yourcompany.com', 'contact@yourcompany.com',
            'info@company.com', 'contact@company.com',
            
            // Social media false positives
            'share@facebook.com', 'like@facebook.com', 'post@facebook.com',
            'tweet@twitter.com', 'share@twitter.com', 'follow@twitter.com'
        ];
        
        const domainFalsePositives = [
            // Standard test domains (Crawlee research)
            'example.com', 'example.org', 'example.net',
            'test.com', 'test.org', 'test.net',
            'domain.com', 'yourdomain.com', 'yoursite.com',
            'company.com', 'yourcompany.com', 'mycompany.com',
            'website.com', 'yourwebsite.com',
            'sample.com', 'demo.com', 'localhost', 'local',
            'tempuri.org', 'tempuri.com',
            
            // Developer testing domains
            'dev.local', 'test.local', 'staging.com',
            'dev.example.com', 'test.example.com'
        ];
        
        // Extract domain
        const domain = email.split('@')[1];
        if (!domain) return true;
        
        // Check exact matches
        if (falsePositives.includes(lowerEmail)) return true;
        if (domainFalsePositives.includes(domain)) return true;
        
        // Enhanced placeholder detection (Scrapy inspired)
        const placeholderWords = [
            'lorem', 'ipsum', 'placeholder', 'sample', 'test', 'dummy', 'fake', 'mock',
            'default', 'example', 'demo', 'temp', 'temporary', 'invalid',
            'enter', 'insert', 'put', 'type', 'write', 'click'
        ];
        if (placeholderWords.some(word => lowerEmail.includes(word))) return true;
        
        // Invalid email patterns (enhanced)
        if (lowerEmail.includes('..') || lowerEmail.startsWith('.') || lowerEmail.endsWith('.')) return true;
        if (lowerEmail.includes('@.') || lowerEmail.includes('.@')) return true;
        if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) return true;
        
        // Too many repeated characters (Crawlee pattern)
        if (/(.)\1{4,}/.test(lowerEmail)) return true;
        
        // Enhanced suspicious patterns (Scrapy research)
        const suspiciousPatterns = [
            // No-reply patterns
            /^(no-?reply|do-?not-?reply|noreply)@/i,
            /^(bounce|mailer-daemon|postmaster)@/i,
            
            // Development/testing patterns
            /^(info|support|admin|webmaster|postmaster)@.*\.(test|local|localhost)$/i,
            /^(test|admin|user|demo)@(test|demo|local|localhost)\./i,
            
            // Pattern-based false positives
            /^\d+@\d+\.\d+$/, // All numbers
            /^[a-z]@[a-z]\.[a-z]{2,3}$/i, // Single character username/domain
            /^.{1,2}@.{1,2}\./i, // Too short username or domain
            /^[^@]+@[^.]+$/, // Domain without TLD
            /^[^@]{1,2}@.+/, // Username too short
            /^.+@[^.]{1,2}\..+/, // Domain name too short
            
            // Suspicious character patterns
            /[<>"`']/,  // HTML/script characters
            /^\d+[a-z]*@.+/, // Starts with only numbers
            /^[a-z]+\d+@example\./i, // Common test patterns
            
            // Website template patterns
            /^(contact|info|support)@(company|business|website|site)\./i,
            /^email@(company|business|website|site)\./i,
            /^(your|my)(email|mail|address)@/i,
            
            // Invalid TLD patterns
            /@[^.]+\.(test|local|invalid|localhost|example)$/i
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(lowerEmail))) return true;
        
        // Domain-specific validation (Crawlee inspired)
        const tldParts = domain.split('.');
        const tld = tldParts[tldParts.length - 1];
        
        // Invalid TLD check
        if (tld.length < 2 || tld.length > 6) return true;
        if (!/^[a-z]+$/i.test(tld)) return true;
        
        // Common invalid domains
        const invalidTlds = ['test', 'local', 'localhost', 'invalid', 'example'];
        if (invalidTlds.includes(tld)) return true;
        
        return false;
    }

    /**
     * Check if phone number is a false positive with enhanced Crawlee patterns
     */
    isPhoneFalsePositive(phone) {
        if (!phone || typeof phone !== 'string') return true;
        
        const cleaned = phone.replace(/[^\d]/g, '');
        
        // Enhanced false positive patterns based on Crawlee research
        const falsePositives = [
            // Common sequential/repeated patterns
            '1234567890', '0000000000', '1111111111', '2222222222',
            '3333333333', '4444444444', '5555555555', '6666666666',
            '7777777777', '8888888888', '9999999999',
            '1234567800', '1234567890', '0987654321',
            
            // Hollywood/TV numbers
            '5551234567', '8005551234', '5551212000', '5552345678',
            '5551234', '5559876', '5551212',
            
            // Test numbers
            '1234567', '9876543', '5555555', '1111111',
            '0123456789', '1230984567'
        ];
        
        if (falsePositives.includes(cleaned)) return true;
        
        // Date-like patterns (Crawlee SKIP_PHONE_REGEXS)
        const datePatterns = [
            /^\d{4}\d{2}\d{2}$/, // YYYYMMDD: 20181110
            /^\d{2}\d{2}\d{4}$/, // MMDDYYYY: 11102018
            /^\d{4}$/, // Just year: 2018
            /^\d{8}$/ // Generic 8-digit (often dates)
        ];
        
        if (datePatterns.some(pattern => pattern.test(cleaned))) return true;
        
        // Sequential number patterns
        if (/^(012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)/.test(cleaned)) {
            return true;
        }
        
        // Too many repeated digits
        if (/(\d)\1{6,}/.test(cleaned)) return true;
        
        // Suspicious patterns for US numbers
        if (cleaned.length === 10) {
            const area = cleaned.substring(0, 3);
            const exchange = cleaned.substring(3, 6);
            const number = cleaned.substring(6);
            
            // Invalid area codes
            const invalidAreaCodes = ['000', '001', '111', '911'];
            if (invalidAreaCodes.includes(area)) return true;
            
            // Pattern-based false positives
            if (area === exchange && exchange === number) return true; // All same
            if (area === '555' && exchange === '555') return true; // Double 555
        }
        
        // Common placeholder/test patterns in the original phone string
        const originalLower = phone.toLowerCase();
        const placeholderWords = [
            'xxx', 'yyy', 'zzz', 'test', 'phone', 'number',
            'call', 'dial', 'contact', 'placeholder', 'sample'
        ];
        
        if (placeholderWords.some(word => originalLower.includes(word))) return true;
        
        // Enhanced validation based on Scrapy research
        if (cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'))) {
            const number = cleaned.startsWith('1') ? cleaned.substring(1) : cleaned;
            if (number.length === 10) {
                const areaCode = number.substring(0, 3);
                const exchange = number.substring(3, 6);
                
                // Invalid area codes (enhanced list)
                const invalidAreaCodes = ['000', '001', '111', '211', '311', '411', '511', '611', '711', '811', '911'];
                if (invalidAreaCodes.includes(areaCode)) return true;
                
                // Area codes that don't exist or are reserved
                if (areaCode.startsWith('0') || areaCode.startsWith('1')) return true;
                if (areaCode.endsWith('11')) return true; // N11 codes are reserved
                
                // Invalid exchanges
                if (exchange.startsWith('0') || exchange.startsWith('1')) return true;
                if (exchange === '555' && number.substring(6, 8) === '01') return true; // 555-01xx reserved for fiction
            }
        }
        
        // Too short or too long for any real phone number
        if (cleaned.length < 7 || cleaned.length > 15) return true;
        
        // Contains suspicious patterns
        if (phone.toLowerCase().includes('extension') && !phone.match(/ext\.?\s?\d{1,5}/i)) return true;
        
        return false;
    }

    /**
     * Enhanced name false positive detection
     */
    isNameFalsePositive(name) {
        if (!name || typeof name !== 'string') return true;
        
        const lowerName = name.toLowerCase().trim();
        
        // Common placeholder names
        const falsePositives = [
            'john doe', 'jane doe', 'john smith', 'jane smith',
            'lorem ipsum', 'test user', 'sample name', 'your name',
            'first last', 'fname lname', 'firstname lastname',
            'user name', 'full name', 'company name', 'business name',
            'admin user', 'site admin', 'web admin', 'administrator',
            'default user', 'guest user', 'anonymous user',
            'example name', 'sample person', 'test person',
            'dummy name', 'fake name', 'placeholder name'
        ];
        
        if (falsePositives.includes(lowerName)) return true;
        
        // Contains placeholder words
        const placeholderWords = ['lorem', 'ipsum', 'example', 'sample', 'test', 'dummy', 'fake', 'placeholder', 'default'];
        if (placeholderWords.some(word => lowerName.includes(word))) return true;
        
        // Common business terms that aren't names
        const businessTerms = [
            'company', 'corporation', 'business', 'enterprise', 'organization',
            'department', 'division', 'office', 'branch', 'headquarters',
            'customer service', 'tech support', 'sales team', 'marketing team',
            'help desk', 'information desk', 'reception', 'front desk',
            'about us', 'contact us', 'home page', 'main page', 'news events',
            'domain names', 'abuse information', 'protocols numbers',
            'root zone', 'time zones', 'root servers', 'special use'
        ];
        
        if (businessTerms.some(term => lowerName.includes(term))) return true;
        
        // Job titles that might be extracted as names
        const jobTitles = [
            'customer service', 'tech support', 'sales representative',
            'marketing manager', 'account manager', 'project manager',
            'general manager', 'operations manager', 'office manager'
        ];
        
        if (jobTitles.some(title => lowerName.includes(title))) return true;
        
        // Names that are too generic or common in documentation
        const genericNames = [
            'contact person', 'sales person', 'support person',
            'your contact', 'our representative', 'team member',
            'staff member', 'company representative'
        ];
        
        if (genericNames.some(generic => lowerName.includes(generic))) return true;
        
        // Technical/programming related false positives
        const techTerms = ['api key', 'user id', 'client id', 'session id', 'auth token'];
        if (techTerms.some(term => lowerName.includes(term))) return true;
        
        // Names with suspicious patterns
        const suspiciousPatterns = [
            /^(mr|mrs|ms|dr|prof)\.?\s+(example|sample|test)/i,
            /^(example|sample|test)\s+/i,
            /^[a-z]{1,2}\s+[a-z]{1,2}$/i, // Too short (single letters)
            /^(.+)\s+\1$/i, // Repeated words (e.g., "John John")
            /\d/,  // Contains numbers
            /[!@#$%^&*(),.?":{}|<>]/,  // Contains special characters
            /^[A-Z]+\s+[A-Z]+$/,  // All caps (likely not a real name)
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(name));
    }

    /**
     * Additional validation for extracted contact data
     */
    validateExtractedData(data) {
        const validated = { ...data };
        
        // Email validation and scoring
        validated.emails = data.emails
            .filter(email => this.isValidEmail(email))
            .filter(email => !this.isEmailFalsePositive(email))
            .map(email => ({
                value: email,
                confidence: this.calculateEmailConfidence(email),
                type: this.classifyEmailType(email)
            }))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10)
            .map(item => item.value); // Return just values for now
        
        // Phone validation and scoring
        validated.phones = data.phones
            .filter(phone => !this.isPhoneFalsePositive(phone))
            .map(phone => ({
                value: phone,
                confidence: this.calculatePhoneConfidence(phone),
                type: this.classifyPhoneType(phone)
            }))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 6)
            .map(item => item.value);
        
        // Name validation and scoring
        validated.names = data.names
            .filter(name => this.isValidName(name))
            .filter(name => !this.isNameFalsePositive(name))
            .map(name => ({
                value: name,
                confidence: this.calculateNameConfidence(name),
                completeness: this.assessNameCompleteness(name)
            }))
            .sort((a, b) => {
                // Sort by confidence, then by completeness
                if (a.confidence !== b.confidence) {
                    return b.confidence - a.confidence;
                }
                return b.completeness - a.completeness;
            })
            .slice(0, 5)
            .map(item => item.value);
        
        return validated;
    }

    /**
     * Calculate confidence score for emails (0-1)
     */
    calculateEmailConfidence(email) {
        let score = 0.5; // Base score
        
        // Domain reputation (common business domains get higher score)
        const businessDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com'];
        const domain = email.split('@')[1];
        
        if (!businessDomains.includes(domain)) {
            score += 0.2; // Custom domains often more reliable for business
        }
        
        // Length considerations
        if (email.length > 8 && email.length < 50) score += 0.1;
        
        // Professional patterns
        if (/^[a-zA-Z]+\.[a-zA-Z]+@/.test(email)) score += 0.2; // firstname.lastname pattern
        if (/^(info|contact|hello|support)@/.test(email)) score += 0.1; // Business emails
        
        return Math.min(score, 1.0);
    }

    /**
     * Classify email type
     */
    classifyEmailType(email) {
        if (/^(info|contact|hello)@/.test(email)) return 'general';
        if (/^(support|help)@/.test(email)) return 'support';
        if (/^(sales|marketing)@/.test(email)) return 'sales';
        if (/^[a-zA-Z]+\.[a-zA-Z]+@/.test(email)) return 'personal';
        return 'other';
    }

    /**
     * Calculate confidence score for phone numbers (0-1)
     */
    calculatePhoneConfidence(phone) {
        let score = 0.5; // Base score
        
        // Format quality
        if (/^\+1\s\(\d{3}\)\s\d{3}-\d{4}$/.test(phone)) score += 0.3; // Well formatted
        if (/^\(\d{3}\)\s\d{3}-\d{4}$/.test(phone)) score += 0.2; // Standard US format
        if (/tel:/.test(phone)) score += 0.1; // Found in tel: link
        
        // Length considerations
        const cleaned = phone.replace(/[^\d]/g, '');
        if (cleaned.length === 10 || cleaned.length === 11) score += 0.2; // Standard lengths
        
        return Math.min(score, 1.0);
    }

    /**
     * Classify phone type
     */
    classifyPhoneType(phone) {
        const cleaned = phone.replace(/[^\d]/g, '');
        
        if (/^1?(800|833|844|855|866|877|888)/.test(cleaned)) return 'toll-free';
        if (cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'))) return 'us-local';
        if (cleaned.startsWith('+')) return 'international';
        return 'other';
    }

    /**
     * Calculate confidence score for names (0-1)
     */
    calculateNameConfidence(name) {
        let score = 0.5; // Base score
        
        const parts = name.trim().split(/\s+/);
        
        // Completeness (more parts usually better)
        if (parts.length >= 2) score += 0.2;
        if (parts.length >= 3) score += 0.1; // Full name with middle
        
        // Length considerations
        if (name.length > 6 && name.length < 40) score += 0.1;
        
        // Proper capitalization
        if (parts.every(part => /^[A-Z][a-z]+$/.test(part) || /^[A-Z]\.$/.test(part))) {
            score += 0.2;
        }
        
        return Math.min(score, 1.0);
    }

    /**
     * Assess name completeness (0-1)
     */
    assessNameCompleteness(name) {
        const parts = name.trim().split(/\s+/);
        
        if (parts.length >= 3) return 1.0; // First Middle Last
        if (parts.length === 2) return 0.8; // First Last
        return 0.3; // Just one name
    }

    /**
     * Validate if URL is scrapable
     */
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Check if URL should be skipped
     */
    shouldSkipUrl(url) {
        const skipPatterns = [
            /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|dmg)$/i,
            /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i,
            /\.(mp3|wav|mp4|avi|mov|webm)$/i,
            /javascript:/i,
            /mailto:/i,
            /tel:/i,
            /ftp:/i
        ];
        
        return skipPatterns.some(pattern => pattern.test(url));
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    /**
     * Get active scraping count
     */
    getActiveScrapeCount() {
        return this.activeScrapes.size;
    }
}