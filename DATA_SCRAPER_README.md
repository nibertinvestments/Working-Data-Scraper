# 🔍 Data Scraper Desktop Application

A powerful desktop application that automatically scrapes contact information (emails, phone numbers, names) from websites while you browse, then exports the data to CSV files or Google Sheets.

## ✨ Features

- **Automatic Browser Monitoring**: Detects when you visit new websites across multiple browsers (Chrome, Firefox, Edge, etc.)
- **Smart Contact Extraction**: Uses AI-powered scraping to find emails, phone numbers, and names
- **Real-time Processing**: Validates, cleans, and deduplicates contact data automatically
- **Multiple Export Options**: Save to CSV files or automatically sync to Google Sheets
- **Privacy-Focused**: All data stays local unless you choose to export to Google Sheets
- **User-Friendly Interface**: Simple start/stop controls with real-time status updates

## 🚀 Quick Start

### Prerequisites

- **Node.js 22 LTS or newer** ([Download here](https://nodejs.org/))
- **PowerShell 7.4+ on Windows** (`winget install Microsoft.PowerShell`)
- A modern web browser (Chrome, Firefox, Edge, etc.)

### Installation

1. **Clone and setup the project:**
   ```powershell
   git clone <your-repo-url>
   cd "Data Scraper"
   npm install
   ```

2. **Configure environment (optional):**
   ```powershell
   copy .env.example .env
   # Edit .env with your Google Sheets credentials if desired
   ```

3. **Start the application:**
   ```powershell
   npm start
   ```

## 📖 How to Use

### Basic Usage

1. **Launch the app** and click the "Start Scraping" button
2. **Browse websites** normally in your preferred browser
3. **Watch the app** automatically detect and extract contact information
4. **Export your data** using the CSV or Google Sheets export buttons
5. **Click "Stop Scraping"** when you're done

### Google Sheets Integration (Optional)

To automatically sync data to Google Sheets:

1. **Create a Google Cloud Project** and enable the Sheets API
2. **Create a Service Account** and download the JSON credentials
3. **Share your spreadsheet** with the service account email
4. **Configure the app** by going to Settings and uploading your credentials
5. **Enable Google Sheets** export in settings with your spreadsheet ID

### CSV Export

- **Auto-export**: Enable in settings to automatically save data as you browse
- **Manual export**: Click "Export CSV" to save current data
- **File location**: Default is `./scraped_data.csv` (configurable in settings)

## 🛠️ Configuration

### Settings Panel

Access via the Settings button to configure:

- **Scraping Options**: Choose what to extract (emails, phones, names)
- **Timing**: Adjust delay between site scrapes (default: 2 seconds)
- **Google Sheets**: Upload credentials and set spreadsheet ID
- **CSV Export**: Configure auto-export and file paths

### Environment Variables

Optional configuration via `.env` file:

```bash
# Google Sheets (if using)
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials/service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id

# Application behavior
SCRAPE_DELAY_MS=2000
MAX_CONCURRENT_SCRAPES=2
DEBUG_MODE=false
```

## 🔧 Technical Details

### Architecture

- **Frontend**: Electron app with HTML/CSS/JavaScript
- **Backend**: Node.js with Puppeteer for web scraping
- **Browser Monitoring**: Native OS integration to detect active browser tabs
- **Data Storage**: Local SQLite database with export capabilities
- **Processing**: Advanced text processing for contact extraction and validation

### Supported Browsers

- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Opera
- Brave Browser
- Vivaldi

### Data Processing

The app includes sophisticated processing to:
- **Validate** contact information format
- **Remove duplicates** across all scraped sources  
- **Filter spam/fake** contacts automatically
- **Calculate confidence scores** for data quality
- **Clean and format** data for export

## 📊 Data Export Formats

### CSV Export
- Standard format with all contact data
- Detailed format with separate columns for each contact
- Summary statistics file

### Google Sheets Export
- Real-time sync to your spreadsheet
- Automatic formatting and organization
- Summary dashboard with statistics

## 🔒 Privacy & Security

- **Local-first**: All data stored locally unless you enable Google Sheets
- **No tracking**: The app doesn't collect or send any telemetry
- **Secure credentials**: Google Sheets credentials stored securely on your device
- **Data control**: You control what gets scraped and where it's exported

## 🚨 Important Notes

### Legal Compliance
- **Respect robots.txt** and website terms of service
- **Follow applicable laws** regarding data scraping in your jurisdiction
- **Use responsibly** - this tool is for legitimate business/research purposes
- **Consider privacy** of individuals whose contact information you collect

### Performance
- **Rate limiting** built-in to avoid overwhelming websites
- **Resource monitoring** to prevent excessive CPU/memory usage
- **Browser compatibility** may vary based on your system

## 🛠️ Development

### Project Structure

```
src/
├── main.js              # Electron main process
├── preload.js           # IPC bridge
├── renderer/            # UI components
├── scraper/             # Web scraping logic
├── monitor/             # Browser monitoring
├── processor/           # Data cleaning/validation
├── exporters/           # CSV and Google Sheets export
└── storage/             # Database management
```

### Building

```powershell
# Development mode
npm run dev

# Production build
npm run build

# Run tests
npm test
```

### Scripts

- `npm start` - Launch the application
- `npm run dev` - Development mode with debugging
- `npm run build` - Create distributable packages
- `npm run lint` - Code quality checks
- `npm run format` - Auto-format code

## 📝 Changelog

### Version 1.0.0
- Initial release
- Browser monitoring across major browsers
- Contact extraction for emails, phones, names
- CSV and Google Sheets export
- Real-time UI with statistics
- Local SQLite storage
- Settings configuration panel

## 🤝 Support

### Troubleshooting

**App won't start:**
- Ensure Node.js 22+ is installed
- Run `npm install` to install dependencies
- Check antivirus isn't blocking the app

**Browser monitoring not working:**
- Make sure supported browsers are installed
- Check if app has necessary system permissions
- Try running as administrator (Windows)

**Export issues:**
- Verify file paths have write permissions
- Check Google Sheets credentials and permissions
- Ensure spreadsheet is shared with service account

**No data being scraped:**
- Verify websites contain contact information
- Check if sites are blocking automated access
- Try adjusting scrape delay in settings

### Getting Help

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Review error messages in the app status area
3. Check system compatibility requirements
4. Contact support with detailed error descriptions

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**⚠️ Disclaimer**: This software is provided for legitimate business and research purposes. Users are responsible for complying with applicable laws and website terms of service when scraping data.