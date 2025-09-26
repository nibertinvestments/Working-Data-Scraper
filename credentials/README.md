# Google Sheets Setup Guide

Your spreadsheet ID has been configured: `15rFNiDyUtp89RijmXNJidzon5RUpgdCalkU1JxeUNJY`

## Setting up Google Sheets API Access

To enable automatic export to your Google Sheets, you need to:

### 1. Create a Google Cloud Project (if you don't have one)
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select an existing one

### 2. Enable the Google Sheets API
- In the Google Cloud Console, go to "APIs & Services" > "Library"
- Search for "Google Sheets API"
- Click on it and press "Enable"

### 3. Create Service Account Credentials
- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "Service Account"
- Fill in the service account details
- After creation, click on the service account
- Go to the "Keys" tab
- Click "Add Key" > "Create New Key" > "JSON"
- Download the JSON file

### 4. Place Credentials File
- Save the downloaded JSON file as `google-sheets-credentials.json`
- Place it in the `credentials/` folder of this project

### 5. Share Your Spreadsheet
- Open your Google Sheets document: https://docs.google.com/spreadsheets/d/15rFNiDyUtp89RijmXNJidzon5RUpgdCalkU1JxeUNJY/edit
- Click "Share" in the top right
- Add the service account email (found in the JSON file under "client_email")
- Give it "Editor" permissions

## Testing the Connection
Once you've set up the credentials, you can test the connection by:
1. Starting the Data Scraper application
2. Going to Settings
3. Enabling Google Sheets integration
4. The app will verify the connection automatically

## Spreadsheet Structure
The app will automatically create the following sheets in your Google Sheets document:
- **Contact Data**: Main data with columns for URL, title, emails, phones, names, etc.
- **Summary**: Statistics and overview of scraped data

## Troubleshooting
- Make sure the service account email has edit access to your spreadsheet
- Verify the credentials file is properly formatted JSON
- Check that the Google Sheets API is enabled in your Google Cloud project
- Ensure the spreadsheet ID in the .env file matches your actual spreadsheet