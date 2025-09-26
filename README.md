# Intelligent Web Data Scraper

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-38%2B-blue.svg)](https://electronjs.org/)

An intelligent, automated web data scraper built with Electron and Node.js that monitors your Chrome browsing activity and automatically extracts contact information (emails, phone numbers, names) from visited websites. Data is stored locally and can be exported to Google Sheets or CSV files.

## 🚀 Features

- **🔍 Automatic Browser Monitoring**: Monitors Chrome browsing activity and automatically scrapes visited websites
- **📊 Google Sheets Integration**: Seamlessly exports scraped data to Google Sheets in real-time
- **💾 Local Database Storage**: SQLite database for reliable local data storage
- **📧 Contact Extraction**: Intelligent extraction of emails, phone numbers, and contact names
- **🎯 Smart Deduplication**: Prevents duplicate entries and redundant scraping
- **⚡ High Performance**: Multi-threaded scraping with configurable concurrency
- **🖥️ Desktop Application**: User-friendly Electron-based GUI
- **📁 CSV Export**: Export data to CSV files for external analysis
- **🔒 Privacy-First**: All data processing happens locally on your machine
## 📋 Prerequisites

- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **Google Chrome** - Required for browser monitoring
- **Windows 10/11** - Primary platform (macOS/Linux support planned)
- **Google Cloud Account** - For Google Sheets integration (optional)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/nibertinvestments/Working-Data-Scraper.git
cd Working-Data-Scraper
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and configure your settings:

```env
# Google Sheets Integration (Optional)
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here

# Database Configuration
DATABASE_PATH=./data/contacts.db

# Scraping Configuration
MAX_CONCURRENT_SCRAPES=3
SCRAPE_DELAY_MS=1000
REQUEST_TIMEOUT_MS=15000

# Export Configuration
AUTO_EXPORT_GOOGLE_SHEETS=true
AUTO_EXPORT_CSV=true
CSV_EXPORT_PATH=./exports/contacts.csv
```

### 4. Google Sheets Setup (Optional)

For Google Sheets integration, you need to set up Google Cloud credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Create a Service Account
5. Download the JSON credentials file
6. Save it as `credentials/google-sheets-credentials.json`

### 5. Chrome Browser Setup

The scraper monitors your Chrome browsing activity. For optimal performance:

#### Option A: Automatic Setup (Recommended)
```bash
# Run the setup script
powershell -ExecutionPolicy Bypass -File setup-chrome-debug.ps1
```

#### Option B: Manual Setup
1. Close all Chrome windows
2. Create a desktop shortcut with this target:
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
```
3. Use this shortcut to launch Chrome when scraping

## 🚀 Quick Start

### 1. Start the Application

```bash
npm start
```

### 2. Launch Chrome in Debug Mode

- Use the "Chrome Debug Mode" shortcut created during setup
- Or run Chrome manually with debugging enabled

### 3. Browse Websites

- Visit any website in Chrome
- The scraper will automatically detect and scrape contact information
- View progress in the application interface

### 4. View Results

- **In-App**: Check the "Scraped Data" tab in the application
- **Google Sheets**: Data automatically appears in your configured sheet
- **CSV Export**: Files saved to `exports/` directory

## 📖 Usage Guide

### Basic Operation

1. **Start the Application**: Run `npm start`
2. **Enable Monitoring**: Click "Start Monitoring" in the app
3. **Browse Normally**: Visit websites in Chrome as usual
4. **View Data**: Check the app or your Google Sheet for extracted data

### Advanced Configuration

#### Scraping Settings

Configure scraping behavior in the app settings or `.env` file:

```env
# Maximum concurrent scrapes
MAX_CONCURRENT_SCRAPES=5

# Delay between scrapes (milliseconds)  
SCRAPE_DELAY_MS=2000

# Request timeout (milliseconds)
REQUEST_TIMEOUT_MS=30000
```

#### Data Export Options

- **Real-time Google Sheets**: Enable `AUTO_EXPORT_GOOGLE_SHEETS=true`
- **Periodic CSV Export**: Configure export intervals in settings
- **Manual Export**: Use the "Export" buttons in the application

### Supported Data Types

The scraper extracts:

- **📧 Email Addresses**: All formats, with confidence scoring
- **📞 Phone Numbers**: International and local formats
- **👤 Contact Names**: From various page elements
- **🏢 Company Information**: Business names and domains
- **🌐 Website Metadata**: Titles, descriptions, and structured data

## 🔧 Development

### Project Structure

```
├── src/
│   ├── main-progressive.js     # Main Electron process
│   ├── preload.js             # Preload script for security
│   ├── exporters/             # Google Sheets & CSV exporters
│   ├── monitor/               # Browser activity monitoring
│   ├── processor/             # Data processing and validation
│   ├── renderer/              # Frontend application
│   ├── scraper/               # Web scraping engines
│   └── storage/               # Database management
├── credentials/               # Google Cloud credentials
├── data/                     # SQLite database files
├── exports/                  # CSV export files
├── logs/                     # Application logs
└── scripts/                  # Utility scripts
```

## 🧪 Testing

The project includes comprehensive tests:

```bash
# Test Google Sheets integration
node debug-export.js

# Test Chrome connection
node test-chrome-connection.js

# Test scraping components
node test-components.js
```

## 🔒 Privacy & Security

### Data Handling

- **Local Processing**: All data processing occurs on your machine
- **No Cloud Storage**: Data is not sent to external services (except Google Sheets if configured)
- **Encrypted Credentials**: Google Cloud credentials are stored securely
- **User Control**: Full control over what data is collected and exported

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

⭐ **Star this repository if you find it helpful!**

Built with ❤️ using Electron, Node.js, and Puppeteer

## Next steps

- Define project-specific automation (build, test, deploy) once the underlying stack is wired up.
- Wire CI pipelines to call `node scripts/agent.mjs env:check` before executing workflows.
- Expand the CLI with additional subcommands (`plan`, `deploy`, etc.) as the agent evolves.

Happy shipping! 🚀
