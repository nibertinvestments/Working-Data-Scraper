#!/usr/bin/env node

/**
 * SIMPLE GOOGLE SHEETS TEST
 * Just test if we can write to the "Web Data" sheet
 */

import dotenv from 'dotenv';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';
import fs from 'fs/promises';

dotenv.config();

async function testGoogleSheetsWrite() {
    console.log('📊 TESTING GOOGLE SHEETS WRITE TO "Web Data" SHEET');
    console.log('=' .repeat(55));
    
    try {
        // Load credentials
        const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
        const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
        
        console.log(`📊 Spreadsheet: ${spreadsheetId}`);
        
        const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
        const credentials = JSON.parse(credentialsContent);
        
        // Initialize exporter
        const exporter = new GoogleSheetsExporter(credentials, spreadsheetId);
        
        // Test connection
        console.log('🔌 Testing connection...');
        const connectionTest = await exporter.testConnection();
        
        if (!connectionTest.success) {
            throw new Error(`Connection failed: ${connectionTest.error}`);
        }
        
        console.log(`✅ Connected to: "${connectionTest.spreadsheetTitle}"`);
        console.log(`📝 Available sheets: ${connectionTest.sheetCount}`);
        
        // Create simple test data
        const testData = [{
            url: 'https://example.com/test',
            title: 'Simple Test Page',
            domain: 'example.com',
            emails: ['test@example.com'],
            phones: ['+1-555-TEST'],
            names: ['Test User'],
            timestamp: new Date().toISOString(),
            method: 'GoogleSheetsTest',
            browserInfo: { browser: 'TestBrowser' }
        }];
        
        console.log('\n📝 Writing test data to "Web Data" sheet...');
        console.log('Test data:', JSON.stringify(testData[0], null, 2));
        
        // Write the data
        const result = await exporter.write(testData);
        
        console.log('\n📊 Result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log(`\n🎉 SUCCESS! Wrote ${result.rowsAdded} rows to Google Sheets`);
            console.log('Check your Google Sheets now at:');
            console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
        } else {
            console.log('❌ Write failed but no error thrown');
        }
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        console.error(error.stack);
    }
}

testGoogleSheetsWrite();