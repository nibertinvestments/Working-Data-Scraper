#!/usr/bin/env node

/**
 * DEBUG Google Sheets Integration
 * Check if we can actually write to Google Sheets
 */

import dotenv from 'dotenv';
import { GoogleSheetsExporter } from './src/exporters/GoogleSheetsExporter.js';
import fs from 'fs/promises';

dotenv.config();

async function debugGoogleSheets() {
    console.log('🔍 DEBUGGING GOOGLE SHEETS INTEGRATION');
    console.log('=' .repeat(50));
    
    try {
        // Load credentials
        const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
        const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
        
        console.log(`🔑 Credentials path: ${credentialsPath}`);
        console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
        
        const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
        const credentials = JSON.parse(credentialsContent);
        
        console.log(`👤 Service account: ${credentials.client_email}`);
        
        // Initialize exporter
        const exporter = new GoogleSheetsExporter(credentials, spreadsheetId);
        
        // Test connection
        console.log('\n🔌 Testing connection...');
        const connectionTest = await exporter.testConnection();
        
        if (!connectionTest.success) {
            console.error('❌ Connection failed:', connectionTest.error);
            return;
        }
        
        console.log(`✅ Connected to: "${connectionTest.spreadsheetTitle}"`);
        console.log(`📝 Sheets: ${connectionTest.sheetCount}`);
        
        // Try to write simple test data
        console.log('\n📝 Writing test data...');
        
        const testData = [
            {
                url: 'https://test-site.com',
                title: 'Test Website',
                domain: 'test-site.com',
                emails: ['test@example.com', 'info@test.com'],
                phones: ['+1-555-123-4567'],
                names: ['John Doe', 'Jane Smith'],
                timestamp: new Date().toISOString(),
                method: 'Debug Test',
                browserInfo: { browser: 'Test Browser' }
            }
        ];
        
        // Clear existing data first
        await exporter.clearData();
        console.log('🧹 Cleared existing data');
        
        // Write test data
        const result = await exporter.write(testData);
        
        console.log('\n📊 Write result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log(`✅ Successfully wrote ${result.rowsAdded} rows`);
            
            // Try to read back to verify
            console.log('\n🔍 Verifying data was written...');
            console.log('Please check your Google Sheets manually at:');
            console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
            
        } else {
            console.log('❌ Write failed');
        }
        
    } catch (error) {
        console.error('\n💥 Error:', error.message);
        console.error(error.stack);
    }
}

debugGoogleSheets();