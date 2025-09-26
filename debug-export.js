#!/usr/bin/env node

/**
 * DEBUG THE ACTUAL GOOGLE SHEETS EXPORT
 * Find out why the Node.js code isn't actually writing to sheets
 */

import dotenv from 'dotenv';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';
import fs from 'fs/promises';

dotenv.config();

async function debugActualExport() {
    console.log('🔍 DEBUGGING ACTUAL GOOGLE SHEETS EXPORT ISSUE');
    console.log('=' .repeat(60));
    
    try {
        // Load credentials exactly like the app does
        const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
        const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
        
        console.log(`🔑 Loading: ${credentialsPath}`);
        console.log(`📊 Spreadsheet: ${spreadsheetId}\n`);
        
        const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
        const credentials = JSON.parse(credentialsContent);
        
        console.log(`👤 Service Account: ${credentials.client_email}`);
        
        // Initialize the exporter
        const exporter = new GoogleSheetsExporter(credentials, spreadsheetId);
        
        // Test connection with detailed logging
        console.log('\n🔌 Testing connection...');
        const connectionTest = await exporter.testConnection();
        console.log('Connection result:', JSON.stringify(connectionTest, null, 2));
        
        if (!connectionTest.success) {
            throw new Error(`Connection failed: ${connectionTest.error}`);
        }
        
        // Create SIMPLE test data
        const testContact = {
            url: 'https://whitehouse.gov/contact',
            title: 'White House Contact',
            domain: 'whitehouse.gov',
            emails: ['president@whitehouse.gov'],
            phones: ['+1-202-456-1414'],
            names: ['White House Staff'],
            timestamp: new Date().toISOString(),
            method: 'DEBUG_TEST',
            browserInfo: { browser: 'Debug' }
        };
        
        console.log('\n📝 Test data to write:');
        console.log(JSON.stringify(testContact, null, 2));
        
        // Try to write with detailed error handling
        console.log('\n📤 Attempting to write to Google Sheets...');
        
        try {
            // First clear the sheet
            console.log('🧹 Clearing sheet...');
            const clearResult = await exporter.clearData();
            console.log('Clear result:', clearResult);
            
            // Then write the data
            console.log('📝 Writing data...');
            const writeResult = await exporter.write([testContact]);
            console.log('Write result:', JSON.stringify(writeResult, null, 2));
            
            if (writeResult.success) {
                console.log('\n🎉 WRITE CLAIMED SUCCESS!');
                console.log('Now check the Google Sheets manually:');
                console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
                
                // Let's also try to read back from the sheet to verify
                console.log('\n🔍 Trying to read back data to verify...');
                
                // Use the sheets API directly to read
                if (exporter.sheets) {
                    try {
                        const readResult = await exporter.sheets.spreadsheets.values.get({
                            spreadsheetId: spreadsheetId,
                            range: 'Web Data!A1:J10'
                        });
                        
                        console.log('📊 Data in sheet:');
                        if (readResult.data.values) {
                            readResult.data.values.forEach((row, i) => {
                                console.log(`Row ${i + 1}:`, row);
                            });
                        } else {
                            console.log('❌ NO DATA FOUND IN SHEET - EXPORT FAILED!');
                        }
                    } catch (readError) {
                        console.log('❌ Error reading back:', readError.message);
                    }
                } else {
                    console.log('❌ No sheets API object available');
                }
                
            } else {
                console.log('❌ WRITE FAILED');
            }
            
        } catch (writeError) {
            console.error('💥 Write error:', writeError.message);
            console.error('Full error:', writeError);
        }
        
    } catch (error) {
        console.error('💥 Debug failed:', error.message);
        console.error(error.stack);
    }
}

debugActualExport();