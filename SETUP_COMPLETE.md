# 🔍 Data Scraper - Setup Complete!

## ✅ What's Been Built

Your desktop data scraper application is now complete with the following features:

### 🖥️ **Desktop Application**
- Modern Electron-based GUI with start/stop buttons
- Real-time status indicators and statistics
- Settings panel for configuration
- Data table showing recently scraped contacts

### 🌐 **Browser Monitoring**
- Automatically detects when you visit new websites
- Monitors Chrome, Firefox, Edge, Safari, and other browsers
- Filters out irrelevant sites (social media, search engines, etc.)

### 🤖 **Web Scraping Engine**
- Extracts emails, phone numbers, and names from websites
- Uses both static and dynamic scraping methods
- Handles JavaScript-heavy websites with Puppeteer
- Built-in rate limiting and error handling

### 🧹 **Data Processing**
- Validates and cleans contact information
- Removes duplicates and false positives
- Assigns confidence scores to extracted data
- Filters out spam and placeholder data

### 📊 **Export Options**
- **Google Sheets**: Automatic export to your configured spreadsheet
- **CSV Files**: Local export for backup and analysis
- **Database**: Local SQLite storage for quick access

## 🚀 **How to Use**

### 1. **First Time Setup**
```powershell
# Navigate to the project directory
cd "c:\Users\Josh\Desktop\Github\Data Scraper"

# Install dependencies (already done)
npm install

# Test the application
npm start
```

### 2. **Configure Google Sheets (Optional)**
Your spreadsheet is already configured: `15rFNiDyUtp89RijmXNJidzon5RUpgdCalkU1JxeUNJY`

To enable automatic Google Sheets export:
1. Follow the guide in `credentials/README.md`
2. Place your Google Sheets API credentials in `credentials/google-sheets-credentials.json`
3. Share your spreadsheet with the service account email

### 3. **Start Scraping**
1. **Launch the app**: `npm start`
2. **Click "Start Scraping"** in the application
3. **Browse the web normally** - the app monitors your browser automatically
4. **View collected data** in the app's data table
5. **Click "Stop Scraping"** when finished

### 4. **Export Your Data**
- **CSV Export**: Click "Export CSV" button in the app
- **Google Sheets**: Automatic if configured, or click "Export to Sheets"
- **Database**: Data is automatically stored locally in `data/contacts.db`

## 📁 **Project Structure**

```
Data Scraper/
├── src/
│   ├── main.js              # Main Electron application (full version)
│   ├── main-simple.js       # Simplified version (currently active)
│   ├── preload.js           # Secure IPC communication
│   ├── renderer/            # User interface
│   ├── monitor/             # Browser monitoring system
│   ├── scraper/             # Web scraping engine
│   ├── processor/           # Data processing and validation
│   ├── exporters/           # Google Sheets & CSV export
│   └── storage/             # Local database management
├── data/                    # Local data storage
├── credentials/             # Google Sheets API credentials
├── exports/                 # CSV export files
└── logs/                    # Application logs
```

## ⚙️ **Configuration**

Key settings in your `.env` file:
```bash
# Your Google Sheets ID (already configured)
GOOGLE_SHEETS_SPREADSHEET_ID=15rFNiDyUtp89RijmXNJidzon5RUpgdCalkU1JxeUNJY

# Scraping behavior
SCRAPE_DELAY_MS=2000              # Wait time between scrapes
MAX_CONCURRENT_SCRAPES=2          # Maximum parallel scrapes
BROWSER_POLL_INTERVAL_MS=1000     # Browser check frequency

# File paths
CSV_EXPORT_PATH=./exports/contacts.csv
DATABASE_PATH=./data/contacts.db
```

## 🔧 **Available Commands**

```powershell
npm start        # Start the simple version
npm run start-full    # Start the full-featured version
npm run dev      # Start in development mode with debugging
npm test         # Test core components
npm run setup    # Full setup and test
```

## 🎯 **What Gets Scraped**

The app automatically extracts:

### 📧 **Email Addresses**
- Contact emails (info@, contact@, etc.)
- Personal emails
- Business emails
- Validates format and filters spam

### 📞 **Phone Numbers**
- US and international formats
- Business phone numbers
- Formatted consistently
- Country detection

### 👤 **Names**
- Contact person names
- Business owner names  
- Team member names
- Validates real names vs placeholders

## 🛡️ **Privacy & Security**

- **No data leaves your computer** unless you explicitly export to Google Sheets
- **Local database storage** keeps your data private
- **No tracking or analytics** - purely local operation
- **Respects robots.txt** and implements rate limiting

## 📊 **Your Google Sheets**

When configured, your spreadsheet will contain:

### 📋 **Contact Data Sheet**
- Timestamp, Website URL, Title
- Email addresses found
- Phone numbers found
- Names found
- Browser used, confidence scores

### 📈 **Summary Sheet**  
- Total statistics
- Unique domains visited
- Data quality metrics

## 🔍 **Tips for Best Results**

1. **Visit contact pages** - these typically have the most information
2. **Browse business websites** - they contain more structured contact data
3. **Let pages load completely** - the app waits for dynamic content
4. **Check the data table** regularly to see what's being collected
5. **Export regularly** to avoid losing data

## 🆘 **Troubleshooting**

### App won't start
- Make sure Node.js is installed
- Run `npm install` to reinstall dependencies
- Try `npm run setup` for full setup

### No data being collected  
- Check that the scraper is actually started (green indicator)
- Visit pages with contact information
- Some sites may block automated access

### Google Sheets not working
- Verify credentials file exists and is valid JSON
- Check that spreadsheet is shared with service account email
- Ensure Google Sheets API is enabled

### Browser not being monitored
- The app uses system APIs to detect active windows
- Make sure you're using supported browsers (Chrome, Firefox, Edge)
- Some browsers may require additional permissions

## 🎉 **You're All Set!**

Your Data Scraper is ready to use! Start the application with `npm start` and begin collecting contact information automatically as you browse the web.

**Spreadsheet configured**: https://docs.google.com/spreadsheets/d/15rFNiDyUtp89RijmXNJidzon5RUpgdCalkU1JxeUNJY/edit

**Need help?** Check the documentation in each folder or review the source code - it's well-commented and modular.