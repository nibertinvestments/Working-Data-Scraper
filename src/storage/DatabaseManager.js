import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { join } from 'path';
import { mkdirSync } from 'fs';

/**
 * Database Manager - Handles local storage of scraped contact data
 */
export class DatabaseManager {
    constructor(config = {}) {
        this.config = {
            dbPath: config.dbPath || join(process.cwd(), 'data', 'contacts.db'),
            ...config
        };
        
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Initialize database connection and create tables
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Ensure data directory exists
            const dataDir = join(process.cwd(), 'data');
            mkdirSync(dataDir, { recursive: true });

            // Create database connection
            this.db = new sqlite3.Database(this.config.dbPath);
            
            // Custom promisify for run method to properly handle lastID
            this.dbRun = (sql, params = []) => {
                return new Promise((resolve, reject) => {
                    this.db.run(sql, params, function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ lastID: this.lastID, changes: this.changes });
                        }
                    });
                });
            };
            
            // Promisify other database methods
            this.dbGet = promisify(this.db.get.bind(this.db));
            this.dbAll = promisify(this.db.all.bind(this.db));

            // Create tables
            await this.createTables();
            
            this.isInitialized = true;
            console.log('Database initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * Create database tables
     */
    async createTables() {
        // Main contacts table
        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                title TEXT,
                domain TEXT,
                scrape_method TEXT,
                browser_info TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Emails table
        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS emails (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id INTEGER,
                email TEXT NOT NULL,
                domain TEXT,
                type TEXT,
                confidence REAL,
                source_url TEXT,
                found_at DATETIME,
                FOREIGN KEY (contact_id) REFERENCES contacts (id),
                UNIQUE(contact_id, email)
            )
        `);

        // Phones table
        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS phones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id INTEGER,
                phone TEXT NOT NULL,
                formatted_phone TEXT,
                country TEXT,
                type TEXT,
                confidence REAL,
                source_url TEXT,
                found_at DATETIME,
                FOREIGN KEY (contact_id) REFERENCES contacts (id),
                UNIQUE(contact_id, phone)
            )
        `);

        // Names table
        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS names (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id INTEGER,
                name TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                type TEXT,
                confidence REAL,
                source_url TEXT,
                found_at DATETIME,
                FOREIGN KEY (contact_id) REFERENCES contacts (id),
                UNIQUE(contact_id, name)
            )
        `);

        // Create indexes for better performance
        await this.dbRun(`CREATE INDEX IF NOT EXISTS idx_contacts_url ON contacts (url)`);
        await this.dbRun(`CREATE INDEX IF NOT EXISTS idx_contacts_domain ON contacts (domain)`);
        await this.dbRun(`CREATE INDEX IF NOT EXISTS idx_emails_email ON emails (email)`);
        await this.dbRun(`CREATE INDEX IF NOT EXISTS idx_phones_phone ON phones (phone)`);
        await this.dbRun(`CREATE INDEX IF NOT EXISTS idx_names_name ON names (name)`);
    }

    /**
     * Store contact data in database
     */
    async storeContactData(contactData) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Check if this URL was already scraped recently
            const existingContact = await this.dbGet(
                `SELECT id, created_at FROM contacts WHERE url = ? ORDER BY created_at DESC LIMIT 1`,
                [contactData.url]
            );

            // If scraped within last hour, skip
            if (existingContact) {
                const lastScrape = new Date(existingContact.created_at);
                const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
                
                if (lastScrape > hourAgo) {
                    console.log(`Skipping duplicate scrape for ${contactData.url}`);
                    return existingContact.id;
                }
            }

            // Insert contact record
            const result = await this.dbRun(`
                INSERT INTO contacts (url, title, domain, scrape_method, browser_info)
                VALUES (?, ?, ?, ?, ?)
            `, [
                contactData.url,
                contactData.title || null,
                contactData.domain || null,
                contactData.method || null,
                JSON.stringify(contactData.browserInfo || {})
            ]);

            const contactId = result.lastID;

            // Store emails
            if (contactData.emails && contactData.emails.length > 0) {
                for (const emailObj of contactData.emails) {
                    await this.storeEmail(contactId, emailObj);
                }
            }

            // Store phones
            if (contactData.phones && contactData.phones.length > 0) {
                for (const phoneObj of contactData.phones) {
                    await this.storePhone(contactId, phoneObj);
                }
            }

            // Store names
            if (contactData.names && contactData.names.length > 0) {
                for (const nameObj of contactData.names) {
                    await this.storeName(contactId, nameObj);
                }
            }

            return contactId;

        } catch (error) {
            console.error('Error storing contact data:', error);
            throw error;
        }
    }

    /**
     * Store email data
     */
    async storeEmail(contactId, emailObj) {
        try {
            await this.dbRun(`
                INSERT OR IGNORE INTO emails (
                    contact_id, email, domain, type, confidence, source_url, found_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                contactId,
                emailObj.email || emailObj,
                emailObj.domain || null,
                emailObj.type || null,
                emailObj.confidence || null,
                emailObj.source || null,
                emailObj.foundAt || new Date().toISOString()
            ]);
        } catch (error) {
            // Ignore duplicate key errors
            if (!error.message.includes('UNIQUE constraint')) {
                throw error;
            }
        }
    }

    /**
     * Store phone data
     */
    async storePhone(contactId, phoneObj) {
        try {
            await this.dbRun(`
                INSERT OR IGNORE INTO phones (
                    contact_id, phone, formatted_phone, country, type, confidence, source_url, found_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                contactId,
                phoneObj.phone || phoneObj,
                phoneObj.formatted || null,
                phoneObj.country || null,
                phoneObj.type || null,
                phoneObj.confidence || null,
                phoneObj.source || null,
                phoneObj.foundAt || new Date().toISOString()
            ]);
        } catch (error) {
            if (!error.message.includes('UNIQUE constraint')) {
                throw error;
            }
        }
    }

    /**
     * Store name data
     */
    async storeName(contactId, nameObj) {
        try {
            await this.dbRun(`
                INSERT OR IGNORE INTO names (
                    contact_id, name, first_name, last_name, type, confidence, source_url, found_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                contactId,
                nameObj.name || nameObj,
                nameObj.firstName || null,
                nameObj.lastName || null,
                nameObj.type || null,
                nameObj.confidence || null,
                nameObj.source || null,
                nameObj.foundAt || new Date().toISOString()
            ]);
        } catch (error) {
            if (!error.message.includes('UNIQUE constraint')) {
                throw error;
            }
        }
    }

    /**
     * Get all contact data for export
     */
    async getAllContactData() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const contacts = await this.dbAll(`
                SELECT 
                    c.*,
                    GROUP_CONCAT(DISTINCT e.email) as emails,
                    GROUP_CONCAT(DISTINCT p.phone) as phones,
                    GROUP_CONCAT(DISTINCT n.name) as names
                FROM contacts c
                LEFT JOIN emails e ON c.id = e.contact_id
                LEFT JOIN phones p ON c.id = p.contact_id
                LEFT JOIN names n ON c.id = n.contact_id
                GROUP BY c.id
                ORDER BY c.created_at DESC
            `);

            // Format the results
            return contacts.map(contact => ({
                url: contact.url,
                title: contact.title,
                domain: contact.domain,
                timestamp: contact.created_at,
                method: contact.scrape_method,
                emails: contact.emails ? contact.emails.split(',').filter(Boolean) : [],
                phones: contact.phones ? contact.phones.split(',').filter(Boolean) : [],
                names: contact.names ? contact.names.split(',').filter(Boolean) : []
            }));

        } catch (error) {
            console.error('Error retrieving contact data:', error);
            throw error;
        }
    }

    /**
     * Get recent contact data (last 24 hours)
     */
    async getRecentContactData(hours = 24) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        try {
            const contacts = await this.dbAll(`
                SELECT 
                    c.*,
                    GROUP_CONCAT(DISTINCT e.email) as emails,
                    GROUP_CONCAT(DISTINCT p.phone) as phones,
                    GROUP_CONCAT(DISTINCT n.name) as names
                FROM contacts c
                LEFT JOIN emails e ON c.id = e.contact_id
                LEFT JOIN phones p ON c.id = p.contact_id
                LEFT JOIN names n ON c.id = n.contact_id
                WHERE c.created_at > ?
                GROUP BY c.id
                ORDER BY c.created_at DESC
            `, [cutoffTime]);

            return contacts.map(contact => ({
                url: contact.url,
                title: contact.title,
                domain: contact.domain,
                timestamp: contact.created_at,
                method: contact.scrape_method,
                emails: contact.emails ? contact.emails.split(',').filter(Boolean) : [],
                phones: contact.phones ? contact.phones.split(',').filter(Boolean) : [],
                names: contact.names ? contact.names.split(',').filter(Boolean) : []
            }));

        } catch (error) {
            console.error('Error retrieving recent contact data:', error);
            throw error;
        }
    }

    /**
     * Get contact statistics
     */
    async getContactStats() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const stats = await this.dbGet(`
                SELECT 
                    COUNT(DISTINCT c.id) as total_sites,
                    COUNT(DISTINCT e.email) as total_emails,
                    COUNT(DISTINCT p.phone) as total_phones,
                    COUNT(DISTINCT n.name) as total_names,
                    COUNT(DISTINCT c.domain) as unique_domains
                FROM contacts c
                LEFT JOIN emails e ON c.id = e.contact_id
                LEFT JOIN phones p ON c.id = p.contact_id
                LEFT JOIN names n ON c.id = n.contact_id
            `);

            return stats;

        } catch (error) {
            console.error('Error retrieving contact stats:', error);
            throw error;
        }
    }

    /**
     * Search contacts by domain
     */
    async searchByDomain(domain) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const contacts = await this.dbAll(`
                SELECT 
                    c.*,
                    GROUP_CONCAT(DISTINCT e.email) as emails,
                    GROUP_CONCAT(DISTINCT p.phone) as phones,
                    GROUP_CONCAT(DISTINCT n.name) as names
                FROM contacts c
                LEFT JOIN emails e ON c.id = e.contact_id
                LEFT JOIN phones p ON c.id = p.contact_id
                LEFT JOIN names n ON c.id = n.contact_id
                WHERE c.domain LIKE ?
                GROUP BY c.id
                ORDER BY c.created_at DESC
            `, [`%${domain}%`]);

            return contacts.map(contact => ({
                url: contact.url,
                title: contact.title,
                domain: contact.domain,
                timestamp: contact.created_at,
                emails: contact.emails ? contact.emails.split(',') : [],
                phones: contact.phones ? contact.phones.split(',') : [],
                names: contact.names ? contact.names.split(',') : []
            }));

        } catch (error) {
            console.error('Error searching by domain:', error);
            throw error;
        }
    }

    /**
     * Clear old data (older than specified days)
     */
    async clearOldData(days = 30) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        try {
            // Get contact IDs to delete
            const oldContacts = await this.dbAll(`
                SELECT id FROM contacts WHERE created_at < ?
            `, [cutoffTime]);

            if (oldContacts.length === 0) {
                return 0;
            }

            const contactIds = oldContacts.map(c => c.id);
            const placeholders = contactIds.map(() => '?').join(',');

            // Delete related records
            await this.dbRun(`DELETE FROM emails WHERE contact_id IN (${placeholders})`, contactIds);
            await this.dbRun(`DELETE FROM phones WHERE contact_id IN (${placeholders})`, contactIds);
            await this.dbRun(`DELETE FROM names WHERE contact_id IN (${placeholders})`, contactIds);
            
            // Delete contacts
            const result = await this.dbRun(`DELETE FROM contacts WHERE created_at < ?`, [cutoffTime]);
            
            return result.changes;

        } catch (error) {
            console.error('Error clearing old data:', error);
            throw error;
        }
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.db) {
            await new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            this.db = null;
            this.isInitialized = false;
        }
    }
}