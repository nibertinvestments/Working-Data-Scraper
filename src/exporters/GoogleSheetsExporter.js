import { google } from 'googleapis';

/**
 * Google Sheets Exporter - Handles exporting contact data to Google Sheets
 */
export class GoogleSheetsExporter {
    constructor(credentials, spreadsheetId) {
        this.credentials = credentials;
        this.spreadsheetId = spreadsheetId;
        this.sheets = null;
        this.isInitialized = false;
    }

    /**
     * Initialize Google Sheets API client
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Create JWT client
            const auth = new google.auth.GoogleAuth({
                credentials: this.credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            const authClient = await auth.getClient();
            
            // Initialize Sheets API
            this.sheets = google.sheets({ version: 'v4', auth: authClient });
            
            // Verify spreadsheet access and setup headers
            await this.setupSpreadsheet();
            
            this.isInitialized = true;
            console.log('Google Sheets API initialized successfully');

        } catch (error) {
            console.error('Failed to initialize Google Sheets API:', error);
            throw new Error(`Google Sheets initialization failed: ${error.message}`);
        }
    }

    /**
     * Setup spreadsheet with proper headers
     */
    async setupSpreadsheet() {
        try {
            // Check if spreadsheet exists and is accessible
            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            // Check if our data sheet exists
            const sheetName = 'Web Data';
            const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);

            if (!sheet) {
                // Create the data sheet
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: {
                                    title: sheetName,
                                    gridProperties: {
                                        rowCount: 1000,
                                        columnCount: 10
                                    }
                                }
                            }
                        }]
                    }
                });

                // Add headers
                await this.addHeaders(sheetName);
            } else {
                // Verify headers exist
                await this.verifyHeaders(sheetName);
            }

        } catch (error) {
            if (error.code === 404) {
                throw new Error('Spreadsheet not found. Please check the spreadsheet ID.');
            } else if (error.code === 403) {
                throw new Error('Access denied. Please check your credentials and sharing permissions.');
            }
            throw error;
        }
    }

    /**
     * Add headers to the spreadsheet
     */
    async addHeaders(sheetName) {
        const headers = [
            'Timestamp',
            'Website URL',
            'Website Title',
            'Domain',
            'Email Addresses',
            'Phone Numbers',
            'Names',
            'Browser Used',
            'Scrape Method',
            'Confidence Score'
        ];

        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A1:J1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [headers]
            }
        });

        // Format header row
        await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
                requests: [{
                    repeatCell: {
                        range: {
                            sheetId: 0, // Assuming first sheet
                            startRowIndex: 0,
                            endRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: 10
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                                textFormat: {
                                    foregroundColor: { red: 1, green: 1, blue: 1 },
                                    bold: true
                                }
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat)'
                    }
                }]
            }
        });
    }

    /**
     * Verify headers exist and are correct
     */
    async verifyHeaders(sheetName) {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A1:J1`
            });

            if (!response.data.values || response.data.values.length === 0) {
                await this.addHeaders(sheetName);
            }
        } catch (error) {
            console.log('Adding headers to existing sheet...');
            await this.addHeaders(sheetName);
        }
    }

    /**
     * Export contact data to Google Sheets
     */
    async write(contactDataArray) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!contactDataArray || contactDataArray.length === 0) {
            console.log('No data to export to Google Sheets');
            return;
        }

        try {
            const sheetName = 'Web Data';
            
            // Convert data to rows
            const rows = contactDataArray.map(contact => this.contactToRow(contact));
            
            // Find the next empty row
            const nextRow = await this.getNextEmptyRow(sheetName);
            
            // Write data
            const range = `${sheetName}!A${nextRow}:J${nextRow + rows.length - 1}`;
            
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: rows
                }
            });

            console.log(`Exported ${rows.length} contacts to Google Sheets`);
            return { success: true, rowsAdded: rows.length };

        } catch (error) {
            console.error('Error writing to Google Sheets:', error);
            throw new Error(`Failed to write to Google Sheets: ${error.message}`);
        }
    }

    /**
     * Append new contact data to Google Sheets
     */
    async append(contactDataArray) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const dataArray = Array.isArray(contactDataArray) ? contactDataArray : [contactDataArray];
        
        if (dataArray.length === 0) {
            return { success: true, rowsAdded: 0 };
        }

        try {
            const sheetName = 'Web Data';
            const rows = dataArray.map(contact => this.contactToRow(contact));

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:J`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: rows
                }
            });

            console.log(`Appended ${rows.length} contacts to Google Sheets`);
            return { success: true, rowsAdded: rows.length };

        } catch (error) {
            console.error('Error appending to Google Sheets:', error);
            throw new Error(`Failed to append to Google Sheets: ${error.message}`);
        }
    }

    /**
     * Convert contact data to spreadsheet row
     */
    contactToRow(contact) {
        // Calculate average confidence score
        const confidenceScores = [
            ...(contact.emails || []).map(e => e.confidence || 0.5),
            ...(contact.phones || []).map(p => p.confidence || 0.5),
            ...(contact.names || []).map(n => n.confidence || 0.5)
        ];
        
        const avgConfidence = confidenceScores.length > 0 
            ? (confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length)
            : 0.5;

        return [
            new Date(contact.timestamp || Date.now()).toLocaleString(), // Timestamp
            contact.url || '', // Website URL
            contact.title || '', // Website Title
            contact.domain || '', // Domain
            this.formatContactArray(contact.emails), // Email Addresses
            this.formatContactArray(contact.phones), // Phone Numbers
            this.formatContactArray(contact.names), // Names
            contact.browserInfo?.browser || 'Unknown', // Browser Used
            contact.method || 'Unknown', // Scrape Method
            Math.round(avgConfidence * 100) + '%' // Confidence Score
        ];
    }

    /**
     * Format contact arrays for display in sheets
     */
    formatContactArray(contactArray) {
        if (!contactArray || contactArray.length === 0) return '';
        
        return contactArray
            .map(item => {
                if (typeof item === 'string') return item;
                if (typeof item === 'object') {
                    return item.email || item.phone || item.name || JSON.stringify(item);
                }
                return String(item);
            })
            .join(', ');
    }

    /**
     * Get next empty row number
     */
    async getNextEmptyRow(sheetName) {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:A`
            });

            if (!response.data.values) return 2; // Start after header row
            
            return response.data.values.length + 1;

        } catch (error) {
            console.log('Could not determine next empty row, using row 2');
            return 2;
        }
    }

    /**
     * Create a summary sheet with statistics
     */
    async createSummarySheet(stats) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const sheetName = 'Summary';
            
            // Check if summary sheet exists
            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            const summarySheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
            
            if (!summarySheet) {
                // Create summary sheet
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: {
                                    title: sheetName,
                                    gridProperties: {
                                        rowCount: 20,
                                        columnCount: 5
                                    }
                                }
                            }
                        }]
                    }
                });
            }

            // Add summary data
            const summaryData = [
                ['Data Scraper Summary', '', '', '', ''],
                ['Generated at:', new Date().toLocaleString(), '', '', ''],
                ['', '', '', '', ''],
                ['Statistic', 'Count', '', '', ''],
                ['Total Sites Scraped', stats.totalSites || 0, '', '', ''],
                ['Total Email Addresses', stats.totalEmails || 0, '', '', ''],
                ['Total Phone Numbers', stats.totalPhones || 0, '', '', ''],
                ['Total Names', stats.totalNames || 0, '', '', ''],
                ['Unique Domains', stats.uniqueDomains || 0, '', '', ''],
                ['', '', '', '', ''],
                ['Last Updated', new Date().toLocaleString(), '', '', '']
            ];

            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A1:E11`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: summaryData
                }
            });

            // Format summary sheet
            await this.formatSummarySheet(sheetName);

        } catch (error) {
            console.error('Error creating summary sheet:', error);
        }
    }

    /**
     * Format the summary sheet
     */
    async formatSummarySheet(sheetName) {
        // Get sheet ID
        const spreadsheet = await this.sheets.spreadsheets.get({
            spreadsheetId: this.spreadsheetId
        });
        
        const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
        const sheetId = sheet.properties.sheetId;

        await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
                requests: [
                    // Title formatting
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1,
                                startColumnIndex: 0,
                                endColumnIndex: 2
                            },
                            cell: {
                                userEnteredFormat: {
                                    textFormat: {
                                        bold: true,
                                        fontSize: 16
                                    }
                                }
                            },
                            fields: 'userEnteredFormat.textFormat'
                        }
                    },
                    // Header formatting
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 3,
                                endRowIndex: 4,
                                startColumnIndex: 0,
                                endColumnIndex: 2
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                                    textFormat: {
                                        bold: true
                                    }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)'
                        }
                    }
                ]
            }
        });
    }

    /**
     * Test the connection and permissions
     */
    async testConnection() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Try to read the spreadsheet
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            return {
                success: true,
                spreadsheetTitle: response.data.properties.title,
                sheetCount: response.data.sheets.length
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clear all data from the contact sheet
     */
    async clearData() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const sheetName = 'Web Data';
            
            // Clear all data except headers
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A2:J1000`
            });

            console.log('Cleared all data from Google Sheets');
            return { success: true };

        } catch (error) {
            console.error('Error clearing Google Sheets data:', error);
            throw new Error(`Failed to clear data: ${error.message}`);
        }
    }
}