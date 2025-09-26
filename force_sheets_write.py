#!/usr/bin/env python3
"""
DIRECT GOOGLE SHEETS WRITE TEST
Using Python and Google Sheets API directly to force data into the sheet
"""

import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os
from datetime import datetime

def write_to_sheets():
    print("🔥 FORCING DATA INTO GOOGLE SHEETS")
    print("=" * 50)
    
    # Load credentials
    creds_path = "./credentials/google-sheets-credentials.json"
    spreadsheet_id = "15rFNiDyUtp89RijmXNJidzon5RUpgdCalkU1JxeUNJY"
    
    print(f"📊 Spreadsheet ID: {spreadsheet_id}")
    print(f"🔑 Credentials: {creds_path}")
    
    # Load service account credentials
    creds = service_account.Credentials.from_service_account_file(
        creds_path, 
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    
    # Build the service
    service = build('sheets', 'v4', credentials=creds)
    
    # Test data to write
    test_data = [
        ['Timestamp', 'Website', 'Domain', 'Emails', 'Phones', 'Names', 'Status'],
        [
            datetime.now().isoformat(),
            'https://whitehouse.gov/contact',
            'whitehouse.gov', 
            'president@whitehouse.gov, contact@whitehouse.gov',
            '+1-202-456-1414',
            'President Biden, White House Staff',
            'REAL DATA TEST'
        ],
        [
            datetime.now().isoformat(),
            'https://nasa.gov/contact',
            'nasa.gov',
            'info@nasa.gov, public@nasa.gov', 
            '+1-202-358-0001',
            'NASA Administrator, Public Affairs',
            'REAL DATA TEST'
        ]
    ]
    
    try:
        # Clear the sheet first
        print("🧹 Clearing Web Data sheet...")
        
        clear_request = service.spreadsheets().values().clear(
            spreadsheetId=spreadsheet_id,
            range='Web Data!A:Z'
        )
        clear_result = clear_request.execute()
        print("✅ Sheet cleared")
        
        # Write the test data
        print("📝 Writing test data...")
        
        write_request = service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range='Web Data!A1',
            valueInputOption='USER_ENTERED',
            body={'values': test_data}
        )
        
        result = write_request.execute()
        
        print(f"✅ SUCCESS! Updated {result.get('updatedRows', 0)} rows")
        print(f"📊 Updated range: {result.get('updatedRange', 'Unknown')}")
        print(f"🔗 View at: https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    success = write_to_sheets()
    if not success:
        exit(1)