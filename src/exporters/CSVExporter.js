import createCsvWriter from 'csv-writer';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * CSV Exporter - Handles exporting contact data to CSV files
 */
export class CSVExporter {
    constructor(filePath) {
        this.filePath = filePath;
        this.csvWriter = null;
        this.isInitialized = false;
        
        // CSV headers configuration
        this.headers = [
            { id: 'timestamp', title: 'Timestamp' },
            { id: 'url', title: 'Website URL' },
            { id: 'title', title: 'Website Title' },
            { id: 'domain', title: 'Domain' },
            { id: 'emails', title: 'Email Addresses' },
            { id: 'phones', title: 'Phone Numbers' },
            { id: 'names', title: 'Names' },
            { id: 'browser', title: 'Browser Used' },
            { id: 'method', title: 'Scrape Method' },
            { id: 'confidence', title: 'Confidence Score' }
        ];
    }

    /**
     * Initialize CSV writer
     */
    initialize() {
        if (this.isInitialized) return;

        try {
            // Ensure directory exists
            const dir = dirname(this.filePath);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }

            // Create CSV writer instance
            this.csvWriter = createCsvWriter.createObjectCsvWriter({
                path: this.filePath,
                header: this.headers,
                append: false // Will be set to true for append operations
            });

            this.isInitialized = true;
            console.log(`CSV exporter initialized for: ${this.filePath}`);

        } catch (error) {
            console.error('Failed to initialize CSV exporter:', error);
            throw error;
        }
    }

    /**
     * Write contact data to CSV file (overwrites existing file)
     */
    async write(contactDataArray) {
        this.initialize();

        if (!contactDataArray || contactDataArray.length === 0) {
            console.log('No data to export to CSV');
            return { success: true, rowsWritten: 0 };
        }

        try {
            // Convert data to CSV format
            const csvData = contactDataArray.map(contact => this.contactToCsvRow(contact));

            // Write to file
            await this.csvWriter.writeRecords(csvData);

            console.log(`Exported ${csvData.length} contacts to CSV: ${this.filePath}`);
            return { success: true, rowsWritten: csvData.length, filePath: this.filePath };

        } catch (error) {
            console.error('Error writing CSV file:', error);
            throw new Error(`Failed to write CSV file: ${error.message}`);
        }
    }

    /**
     * Append contact data to existing CSV file
     */
    async append(contactDataArray) {
        this.initialize();

        const dataArray = Array.isArray(contactDataArray) ? contactDataArray : [contactDataArray];
        
        if (dataArray.length === 0) {
            return { success: true, rowsAppended: 0 };
        }

        try {
            // Check if file exists to determine if we need headers
            const fileExists = existsSync(this.filePath);
            
            // Create append writer
            const appendWriter = createCsvWriter.createObjectCsvWriter({
                path: this.filePath,
                header: this.headers,
                append: true
            });

            // Convert data to CSV format
            const csvData = dataArray.map(contact => this.contactToCsvRow(contact));

            // If file doesn't exist, write headers first
            if (!fileExists) {
                await this.csvWriter.writeRecords([]); // This creates the file with headers
            }

            // Append data
            await appendWriter.writeRecords(csvData);

            console.log(`Appended ${csvData.length} contacts to CSV: ${this.filePath}`);
            return { success: true, rowsAppended: csvData.length, filePath: this.filePath };

        } catch (error) {
            console.error('Error appending to CSV file:', error);
            throw new Error(`Failed to append to CSV file: ${error.message}`);
        }
    }

    /**
     * Convert contact data to CSV row format
     */
    contactToCsvRow(contact) {
        // Calculate average confidence score
        const confidenceScores = [
            ...(contact.emails || []).map(e => e.confidence || 0.5),
            ...(contact.phones || []).map(p => p.confidence || 0.5),
            ...(contact.names || []).map(n => n.confidence || 0.5)
        ];
        
        const avgConfidence = confidenceScores.length > 0 
            ? (confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length)
            : 0.5;

        return {
            timestamp: new Date(contact.timestamp || Date.now()).toLocaleString(),
            url: contact.url || '',
            title: this.cleanText(contact.title || ''),
            domain: contact.domain || '',
            emails: this.formatContactArray(contact.emails),
            phones: this.formatContactArray(contact.phones),
            names: this.formatContactArray(contact.names),
            browser: contact.browserInfo?.browser || 'Unknown',
            method: contact.method || 'Unknown',
            confidence: Math.round(avgConfidence * 100) + '%'
        };
    }

    /**
     * Format contact arrays for CSV display
     */
    formatContactArray(contactArray) {
        if (!contactArray || contactArray.length === 0) return '';
        
        return contactArray
            .map(item => {
                if (typeof item === 'string') return this.cleanText(item);
                if (typeof item === 'object') {
                    const value = item.email || item.phone || item.name || JSON.stringify(item);
                    return this.cleanText(value);
                }
                return this.cleanText(String(item));
            })
            .join('; '); // Use semicolon separator for CSV compatibility
    }

    /**
     * Clean text for CSV compatibility
     */
    cleanText(text) {
        if (!text) return '';
        
        return text
            .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .substring(0, 1000); // Limit length to prevent issues
    }

    /**
     * Export detailed contact data with separate columns for each contact type
     */
    async writeDetailed(contactDataArray) {
        if (!contactDataArray || contactDataArray.length === 0) {
            return { success: true, rowsWritten: 0 };
        }

        try {
            // Ensure directory exists
            const dir = dirname(this.filePath);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }

            // Create detailed CSV with expanded columns
            const detailedHeaders = [
                { id: 'timestamp', title: 'Timestamp' },
                { id: 'url', title: 'Website URL' },
                { id: 'title', title: 'Website Title' },
                { id: 'domain', title: 'Domain' },
                { id: 'email1', title: 'Email 1' },
                { id: 'email2', title: 'Email 2' },
                { id: 'email3', title: 'Email 3' },
                { id: 'phone1', title: 'Phone 1' },
                { id: 'phone2', title: 'Phone 2' },
                { id: 'phone3', title: 'Phone 3' },
                { id: 'name1', title: 'Name 1' },
                { id: 'name2', title: 'Name 2' },
                { id: 'name3', title: 'Name 3' },
                { id: 'browser', title: 'Browser' },
                { id: 'method', title: 'Scrape Method' },
                { id: 'confidence', title: 'Avg Confidence' }
            ];

            const detailedWriter = createCsvWriter.createObjectCsvWriter({
                path: this.filePath.replace('.csv', '_detailed.csv'),
                header: detailedHeaders
            });

            // Convert data to detailed format
            const detailedData = contactDataArray.map(contact => this.contactToDetailedRow(contact));

            await detailedWriter.writeRecords(detailedData);

            const detailedPath = this.filePath.replace('.csv', '_detailed.csv');
            console.log(`Exported detailed CSV: ${detailedPath}`);
            
            return { 
                success: true, 
                rowsWritten: detailedData.length, 
                filePath: detailedPath 
            };

        } catch (error) {
            console.error('Error writing detailed CSV:', error);
            throw new Error(`Failed to write detailed CSV: ${error.message}`);
        }
    }

    /**
     * Convert contact to detailed row with separate columns
     */
    contactToDetailedRow(contact) {
        const emails = contact.emails || [];
        const phones = contact.phones || [];
        const names = contact.names || [];

        // Extract values, handling both string and object formats
        const emailValues = emails.map(e => typeof e === 'string' ? e : e.email || '').filter(Boolean);
        const phoneValues = phones.map(p => typeof p === 'string' ? p : p.phone || p.formatted || '').filter(Boolean);
        const nameValues = names.map(n => typeof n === 'string' ? n : n.name || '').filter(Boolean);

        // Calculate average confidence
        const confidenceScores = [
            ...emails.map(e => typeof e === 'object' ? e.confidence || 0.5 : 0.5),
            ...phones.map(p => typeof p === 'object' ? p.confidence || 0.5 : 0.5),
            ...names.map(n => typeof n === 'object' ? n.confidence || 0.5 : 0.5)
        ];
        
        const avgConfidence = confidenceScores.length > 0 
            ? (confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length)
            : 0.5;

        return {
            timestamp: new Date(contact.timestamp || Date.now()).toLocaleString(),
            url: contact.url || '',
            title: this.cleanText(contact.title || ''),
            domain: contact.domain || '',
            email1: this.cleanText(emailValues[0] || ''),
            email2: this.cleanText(emailValues[1] || ''),
            email3: this.cleanText(emailValues[2] || ''),
            phone1: this.cleanText(phoneValues[0] || ''),
            phone2: this.cleanText(phoneValues[1] || ''),
            phone3: this.cleanText(phoneValues[2] || ''),
            name1: this.cleanText(nameValues[0] || ''),
            name2: this.cleanText(nameValues[1] || ''),
            name3: this.cleanText(nameValues[2] || ''),
            browser: contact.browserInfo?.browser || 'Unknown',
            method: contact.method || 'Unknown',
            confidence: Math.round(avgConfidence * 100) + '%'
        };
    }

    /**
     * Export summary statistics to CSV
     */
    async writeSummary(stats) {
        try {
            const summaryPath = this.filePath.replace('.csv', '_summary.csv');
            
            const summaryHeaders = [
                { id: 'metric', title: 'Metric' },
                { id: 'value', title: 'Value' }
            ];

            const summaryWriter = createCsvWriter.createObjectCsvWriter({
                path: summaryPath,
                header: summaryHeaders
            });

            const summaryData = [
                { metric: 'Total Sites Scraped', value: stats.totalSites || 0 },
                { metric: 'Total Email Addresses', value: stats.totalEmails || 0 },
                { metric: 'Total Phone Numbers', value: stats.totalPhones || 0 },
                { metric: 'Total Names', value: stats.totalNames || 0 },
                { metric: 'Unique Domains', value: stats.uniqueDomains || 0 },
                { metric: 'Export Date', value: new Date().toLocaleString() }
            ];

            await summaryWriter.writeRecords(summaryData);

            console.log(`Exported summary CSV: ${summaryPath}`);
            return { success: true, filePath: summaryPath };

        } catch (error) {
            console.error('Error writing summary CSV:', error);
            throw new Error(`Failed to write summary CSV: ${error.message}`);
        }
    }

    /**
     * Get file path
     */
    getFilePath() {
        return this.filePath;
    }

    /**
     * Check if CSV file exists
     */
    exists() {
        return existsSync(this.filePath);
    }

    /**
     * Get file size in bytes
     */
    getFileSize() {
        if (!this.exists()) return 0;
        
        try {
            const fs = require('fs');
            const stats = fs.statSync(this.filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Create a backup of the current CSV file
     */
    async backup() {
        if (!this.exists()) return null;

        try {
            const fs = require('fs');
            const backupPath = this.filePath.replace('.csv', `_backup_${Date.now()}.csv`);
            fs.copyFileSync(this.filePath, backupPath);
            
            console.log(`Created backup: ${backupPath}`);
            return backupPath;

        } catch (error) {
            console.error('Error creating backup:', error);
            throw new Error(`Failed to create backup: ${error.message}`);
        }
    }
}