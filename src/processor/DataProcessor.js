/**
 * Data Processor - Cleans, validates, and deduplicates contact information
 */
export class DataProcessor {
    constructor(config = {}) {
        this.config = {
            enableDeduplication: config.enableDeduplication !== false,
            enableValidation: config.enableValidation !== false,
            enableEnrichment: config.enableEnrichment !== false,
            ...config
        };
        
        this.processedData = new Map(); // For deduplication
        this.emailPatterns = this.initializeEmailPatterns();
        this.phonePatterns = this.initializePhonePatterns();
        this.namePatterns = this.initializeNamePatterns();
    }

    /**
     * Process contact data with validation, cleaning, and deduplication
     */
    async processContactData(rawData) {
        const processed = {
            ...rawData,
            emails: [],
            phones: [],
            names: [],
            processedAt: new Date().toISOString()
        };

        // Process emails
        if (rawData.emails && rawData.emails.length > 0) {
            processed.emails = await this.processEmails(rawData.emails, rawData.url);
        }

        // Process phone numbers
        if (rawData.phones && rawData.phones.length > 0) {
            processed.phones = await this.processPhones(rawData.phones, rawData.url);
        }

        // Process names
        if (rawData.names && rawData.names.length > 0) {
            processed.names = await this.processNames(rawData.names, rawData.url);
        }

        // Deduplicate if enabled
        if (this.config.enableDeduplication) {
            return this.deduplicateData(processed);
        }

        return processed;
    }

    /**
     * Process and validate email addresses
     */
    async processEmails(emails, sourceUrl = '') {
        const processed = [];
        const seenEmails = new Set();

        for (const email of emails) {
            const cleanEmail = this.cleanEmail(email);
            
            if (!cleanEmail || seenEmails.has(cleanEmail)) {
                continue;
            }

            if (this.config.enableValidation && !this.isValidEmail(cleanEmail)) {
                continue;
            }

            // Additional filtering
            if (this.isSpamEmail(cleanEmail) || this.isPlaceholderEmail(cleanEmail)) {
                continue;
            }

            const processedEmail = {
                email: cleanEmail,
                domain: this.extractEmailDomain(cleanEmail),
                type: this.classifyEmailType(cleanEmail),
                confidence: this.calculateEmailConfidence(cleanEmail, sourceUrl),
                source: sourceUrl,
                foundAt: new Date().toISOString()
            };

            processed.push(processedEmail);
            seenEmails.add(cleanEmail);
        }

        // Sort by confidence
        return processed.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Process and validate phone numbers
     */
    async processPhones(phones, sourceUrl = '') {
        const processed = [];
        const seenPhones = new Set();

        for (const phone of phones) {
            const cleanPhone = this.cleanPhone(phone);
            
            if (!cleanPhone || seenPhones.has(cleanPhone)) {
                continue;
            }

            if (this.config.enableValidation && !this.isValidPhone(cleanPhone)) {
                continue;
            }

            const processedPhone = {
                phone: cleanPhone,
                formatted: this.formatPhone(cleanPhone),
                country: this.detectPhoneCountry(cleanPhone),
                type: this.classifyPhoneType(cleanPhone),
                confidence: this.calculatePhoneConfidence(cleanPhone, sourceUrl),
                source: sourceUrl,
                foundAt: new Date().toISOString()
            };

            processed.push(processedPhone);
            seenPhones.add(cleanPhone);
        }

        return processed.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Process and validate names
     */
    async processNames(names, sourceUrl = '') {
        const processed = [];
        const seenNames = new Set();

        for (const name of names) {
            const cleanName = this.cleanName(name);
            
            if (!cleanName || seenNames.has(cleanName.toLowerCase())) {
                continue;
            }

            if (this.config.enableValidation && !this.isValidName(cleanName)) {
                continue;
            }

            const processedName = {
                name: cleanName,
                firstName: this.extractFirstName(cleanName),
                lastName: this.extractLastName(cleanName),
                type: this.classifyNameType(cleanName),
                confidence: this.calculateNameConfidence(cleanName, sourceUrl),
                source: sourceUrl,
                foundAt: new Date().toISOString()
            };

            processed.push(processedName);
            seenNames.add(cleanName.toLowerCase());
        }

        return processed.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Clean email address
     */
    cleanEmail(email) {
        if (!email) return null;
        
        return email
            .toLowerCase()
            .trim()
            .replace(/[<>'"]/g, '') // Remove quotes and brackets
            .replace(/^mailto:/i, '') // Remove mailto:
            .replace(/\s+/g, ''); // Remove spaces
    }

    /**
     * Clean phone number
     */
    cleanPhone(phone) {
        if (!phone) return null;
        
        return phone
            .trim()
            .replace(/^tel:/i, '') // Remove tel:
            .replace(/[^\d+\-\(\)\s\.]/g, '') // Keep only valid phone characters
            .trim();
    }

    /**
     * Clean name
     */
    cleanName(name) {
        if (!name) return null;
        
        return name
            .trim()
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/[^\w\s\-'\.]/g, '') // Remove special characters except common ones
            .replace(/\b(mr|mrs|ms|dr|prof|sr|jr)\b\.?/gi, '') // Remove titles
            .trim();
    }

    /**
     * Validate email address
     */
    isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone number
     */
    isValidPhone(phone) {
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 15;
    }

    /**
     * Validate name
     */
    isValidName(name) {
        if (!name || name.length < 2 || name.length > 100) return false;
        
        // Must have at least one letter
        if (!/[a-zA-Z]/.test(name)) return false;
        
        // Split into parts
        const parts = name.split(' ').filter(part => part.length > 0);
        if (parts.length === 0 || parts.length > 5) return false;
        
        // Each part should start with a capital letter
        for (const part of parts) {
            if (part.length < 1 || !/^[A-Z]/.test(part)) return false;
        }
        
        return true;
    }

    /**
     * Check for spam/fake emails
     */
    isSpamEmail(email) {
        const spamPatterns = [
            /noreply/i,
            /no-reply/i,
            /donotreply/i,
            /automated/i,
            /system@/i,
            /bounce@/i,
            /newsletter@/i
        ];
        
        return spamPatterns.some(pattern => pattern.test(email));
    }

    /**
     * Check for placeholder emails
     */
    isPlaceholderEmail(email) {
        const placeholders = [
            'example@example.com',
            'test@test.com',
            'user@domain.com',
            'email@domain.com'
        ];
        
        return placeholders.includes(email) || 
               email.includes('placeholder') ||
               email.includes('yoursite') ||
               email.includes('yourdomain');
    }

    /**
     * Extract domain from email
     */
    extractEmailDomain(email) {
        return email.split('@')[1] || '';
    }

    /**
     * Classify email type
     */
    classifyEmailType(email) {
        const domain = this.extractEmailDomain(email);
        const localPart = email.split('@')[0];
        
        // Business domains
        const businessPatterns = [
            /^(info|contact|sales|support|hello|admin|office)$/i,
            /^(marketing|hr|careers|jobs|press|media)$/i
        ];
        
        if (businessPatterns.some(pattern => pattern.test(localPart))) {
            return 'business';
        }
        
        // Personal email providers
        const personalDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'aol.com', 'icloud.com', 'me.com', 'protonmail.com'
        ];
        
        if (personalDomains.includes(domain)) {
            return 'personal';
        }
        
        return 'business'; // Default for custom domains
    }

    /**
     * Format phone number for display
     */
    formatPhone(phone) {
        const digits = phone.replace(/\D/g, '');
        
        // US format
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        
        // US format with country code
        if (digits.length === 11 && digits.startsWith('1')) {
            return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        }
        
        // International format
        if (digits.length > 11) {
            return `+${digits}`;
        }
        
        return phone; // Return original if can't format
    }

    /**
     * Detect phone country
     */
    detectPhoneCountry(phone) {
        const digits = phone.replace(/\D/g, '');
        
        if (digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) {
            return 'US';
        }
        
        // Add more country detection logic as needed
        return 'Unknown';
    }

    /**
     * Classify phone type
     */
    classifyPhoneType(phone) {
        // This is a basic implementation
        // In practice, you'd use a phone number library for accurate detection
        return 'unknown';
    }

    /**
     * Extract first name
     */
    extractFirstName(fullName) {
        const parts = fullName.trim().split(' ');
        return parts[0] || '';
    }

    /**
     * Extract last name
     */
    extractLastName(fullName) {
        const parts = fullName.trim().split(' ');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    }

    /**
     * Classify name type
     */
    classifyNameType(name) {
        const parts = name.split(' ').filter(part => part.length > 0);
        
        if (parts.length === 1) return 'single';
        if (parts.length === 2) return 'full';
        if (parts.length > 2) return 'full_with_middle';
        
        return 'unknown';
    }

    /**
     * Calculate confidence scores
     */
    calculateEmailConfidence(email, sourceUrl) {
        let confidence = 0.5; // Base confidence
        
        // Boost for business emails
        if (this.classifyEmailType(email) === 'business') {
            confidence += 0.2;
        }
        
        // Boost for contact pages
        if (sourceUrl.toLowerCase().includes('contact')) {
            confidence += 0.2;
        }
        
        // Reduce for generic emails
        if (/^(info|contact|support)@/.test(email)) {
            confidence -= 0.1;
        }
        
        return Math.min(1.0, Math.max(0.1, confidence));
    }

    calculatePhoneConfidence(phone, sourceUrl) {
        let confidence = 0.5; // Base confidence
        
        // Boost for contact pages
        if (sourceUrl.toLowerCase().includes('contact')) {
            confidence += 0.3;
        }
        
        // Boost for properly formatted numbers
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 10 || digits.length === 11) {
            confidence += 0.2;
        }
        
        return Math.min(1.0, Math.max(0.1, confidence));
    }

    calculateNameConfidence(name, sourceUrl) {
        let confidence = 0.4; // Lower base confidence for names
        
        // Boost for about/team pages
        if (/about|team|staff|contact/.test(sourceUrl.toLowerCase())) {
            confidence += 0.3;
        }
        
        // Boost for full names
        if (this.classifyNameType(name) === 'full') {
            confidence += 0.2;
        }
        
        return Math.min(1.0, Math.max(0.1, confidence));
    }

    /**
     * Deduplicate data across all sources
     */
    deduplicateData(data) {
        const deduped = { ...data };
        
        // Deduplicate emails
        deduped.emails = this.deduplicateEmails(data.emails);
        
        // Deduplicate phones
        deduped.phones = this.deduplicatePhones(data.phones);
        
        // Deduplicate names
        deduped.names = this.deduplicateNames(data.names);
        
        return deduped;
    }

    /**
     * Deduplicate emails
     */
    deduplicateEmails(emails) {
        const seen = new Set();
        return emails.filter(emailObj => {
            const key = emailObj.email.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Deduplicate phones
     */
    deduplicatePhones(phones) {
        const seen = new Set();
        return phones.filter(phoneObj => {
            const key = phoneObj.phone.replace(/\D/g, ''); // Compare by digits only
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Deduplicate names
     */
    deduplicateNames(names) {
        const seen = new Set();
        return names.filter(nameObj => {
            const key = nameObj.name.toLowerCase().replace(/\s+/g, ' ').trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Initialize regex patterns
     */
    initializeEmailPatterns() {
        return {
            basic: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            obfuscated: /\b[A-Za-z0-9._%+-]+\s*\[?at\]?\s*[A-Za-z0-9.-]+\s*\[?dot\]?\s*[A-Z|a-z]{2,}\b/gi
        };
    }

    initializePhonePatterns() {
        return {
            us: /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g,
            international: /(?:\+[1-9]\d{0,3}[-.\s]?)?(?:\(?[0-9]{1,4}\)?[-.\s]?)?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/g
        };
    }

    initializeNamePatterns() {
        return {
            full: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
            withTitle: /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+ [A-Z][a-z]+\b/gi
        };
    }
}