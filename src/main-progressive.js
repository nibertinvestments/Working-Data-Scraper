import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let dataScraper = null;
let isScrapingActive = false;

// Simple settings store (we'll replace with electron-store later)
let appSettings = {
  scraping: {
    enabled: true,
    extractEmails: true,
    extractPhones: true,
    extractNames: true,
    delay: 2000
  },
  googleSheets: {
    enabled: true, // Enable by default since we have credentials
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
    credentials: null
  },
  export: {
    autoExportToCSV: true,
    csvPath: join(process.cwd(), 'exports', 'contacts.csv')
  }
};

// Create the main application window
function createWindow() {
  console.log('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    resizable: true,
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Load the HTML file
  const htmlPath = join(__dirname, 'renderer/index.html');
  console.log('Loading HTML file from:', htmlPath);
  mainWindow.loadFile(htmlPath);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Log when the window is ready
  mainWindow.webContents.once('dom-ready', () => {
    console.log('DOM is ready, window loaded successfully');
  });

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            mainWindow.webContents.send('show-settings');
          }
        },
        {
          label: 'Export Data',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              defaultPath: 'scraped_data.csv',
              filters: [
                { name: 'CSV Files', extensions: ['csv'] }
              ]
            });

            if (!result.canceled) {
              await exportToCSV(result.filePath);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Data Scraper',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Data Scraper',
              message: 'Data Scraper v1.0.0',
              detail: 'Automatically scrapes contact information while you browse the web.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Initialize data scraper with proper error handling
async function initializeDataScraper() {
  try {
    console.log('Initializing DataScraper...');
    
    // Import the DataScraper module dynamically
    const { DataScraper } = await import('./scraper/DataScraper.js');
    dataScraper = new DataScraper(appSettings);
    
    // Set up event listeners
    dataScraper.on('data-scraped', async (data) => {
      console.log('Data scraped:', data);
      mainWindow.webContents.send('data-scraped', data);
      
      // Auto-export to CSV if enabled
      if (appSettings.export.autoExportToCSV) {
        await exportToCSV(appSettings.export.csvPath, [data]);
      }
      
      // Auto-export to Google Sheets if enabled
      if (appSettings.googleSheets.enabled) {
        try {
          await exportToGoogleSheets([data]);
        } catch (error) {
          console.error('Auto Google Sheets export failed:', error);
          mainWindow.webContents.send('scraper-error', `Google Sheets export failed: ${error.message}`);
        }
      }
    });

    dataScraper.on('error', (error) => {
      console.error('Scraper error:', error);
      mainWindow.webContents.send('scraper-error', error.message);
    });

    dataScraper.on('status-update', (status) => {
      console.log('Status update:', status);
      mainWindow.webContents.send('status-update', status);
    });
    
    console.log('DataScraper initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize DataScraper:', error);
    return false;
  }
}

// Export functions with error handling
async function exportToCSV(filePath, data = null) {
  try {
    console.log('Exporting to CSV:', filePath);
    
    // For now, create a simple CSV export
    const csvData = data || [];
    const csvContent = csvData.map(item => 
      `"${item.email || ''}","${item.phone || ''}","${item.name || ''}","${item.url || ''}","${new Date(item.timestamp).toISOString()}"`
    ).join('\n');
    
    const header = 'Email,Phone,Name,URL,Timestamp\n';
    
    // Ensure directory exists
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, header + csvContent, 'utf8');
    
    console.log('CSV export successful');
    return { success: true };
  } catch (error) {
    console.error('CSV export error:', error);
    return { success: false, error: error.message };
  }
}

// Google Sheets export function
async function exportToGoogleSheets(data = null) {
  try {
    console.log('Exporting to Google Sheets...');
    
    // Load credentials
    const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    if (!credentialsPath || !spreadsheetId) {
      throw new Error('Google Sheets not configured');
    }
    
    const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
    const credentials = JSON.parse(credentialsContent);
    
    // Import GoogleSheetsExporter
    const { GoogleSheetsExporter } = await import('./exporters/GoogleSheetsExporter.js');
    const exporter = new GoogleSheetsExporter(credentials, spreadsheetId);
    
    // Use provided data or get all scraped data
    const exportData = data || (dataScraper ? await dataScraper.getAllScrapedData() : []);
    
    if (exportData.length === 0) {
      console.log('No data to export to Google Sheets');
      return { success: true, message: 'No data to export' };
    }
    
    // Export the data (append to existing data)
    const result = await exporter.append(exportData);
    
    console.log('Google Sheets export successful');
    return result;
    
  } catch (error) {
    console.error('Google Sheets export error:', error);
    return { success: false, error: error.message };
  }
}

// IPC handlers
ipcMain.handle('start-scraping', async () => {
  try {
    console.log('start-scraping IPC called');
    
    if (!dataScraper) {
      const initialized = await initializeDataScraper();
      if (!initialized) {
        throw new Error('Failed to initialize data scraper');
      }
    }
    
    await dataScraper.start();
    isScrapingActive = true;
    console.log('Scraping started successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to start scraping:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-scraping', async () => {
  try {
    console.log('stop-scraping IPC called');
    
    if (dataScraper) {
      await dataScraper.stop();
    }
    isScrapingActive = false;
    console.log('Scraping stopped successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to stop scraping:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-scraping-status', () => {
  console.log('get-scraping-status IPC called');
  return { isActive: isScrapingActive };
});

ipcMain.handle('get-settings', () => {
  console.log('get-settings IPC called');
  return appSettings;
});

ipcMain.handle('save-settings', (event, settings) => {
  try {
    console.log('save-settings IPC called with:', settings);
    appSettings = { ...appSettings, ...settings };
    
    // Update scraper config if it's active
    if (isScrapingActive && dataScraper) {
      dataScraper.updateConfig(appSettings);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-csv', async (event, filePath) => {
  console.log('export-csv IPC called with path:', filePath);
  return await exportToCSV(filePath);
});

ipcMain.handle('export-google-sheets', async () => {
  console.log('export-google-sheets IPC called');
  try {
    // Get scraped data
    if (!dataScraper) {
      throw new Error('Data scraper not initialized');
    }
    
    const scrapedData = await dataScraper.getAllScrapedData();
    
    if (!scrapedData || scrapedData.length === 0) {
      return { success: false, error: 'No data to export' };
    }
    
    // Load Google Sheets credentials
    const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    if (!credentialsPath || !spreadsheetId) {
      throw new Error('Google Sheets credentials not configured. Check your .env file.');
    }
    
    const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
    const credentials = JSON.parse(credentialsContent);
    
    // Import and use GoogleSheetsExporter
    const { GoogleSheetsExporter } = await import('./exporters/GoogleSheetsExporter.js');
    const exporter = new GoogleSheetsExporter(credentials, spreadsheetId);
    
    // Test connection
    const connectionTest = await exporter.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Google Sheets connection failed: ${connectionTest.error}`);
    }
    
    // Export the data
    const exportResult = await exporter.write(scrapedData);
    
    if (exportResult.success) {
      // Create summary
      const stats = {
        totalSites: scrapedData.length,
        totalEmails: scrapedData.reduce((sum, item) => sum + (item.emails?.length || 0), 0),
        totalPhones: scrapedData.reduce((sum, item) => sum + (item.phones?.length || 0), 0),
        totalNames: scrapedData.reduce((sum, item) => sum + (item.names?.length || 0), 0),
        uniqueDomains: new Set(scrapedData.map(item => item.domain)).size
      };
      
      await exporter.createSummarySheet(stats);
      
      return { 
        success: true, 
        message: `Successfully exported ${exportResult.rowsAdded} rows to Google Sheets`,
        stats 
      };
    } else {
      throw new Error('Export failed');
    }
    
  } catch (error) {
    console.error('Google Sheets export error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-scraped-data', async () => {
  try {
    console.log('get-scraped-data IPC called');
    
    if (!dataScraper) {
      return { success: true, data: [] };
    }
    
    const data = await dataScraper.getAllScrapedData();
    return { success: true, data };
  } catch (error) {
    console.error('Failed to get scraped data:', error);
    return { success: false, error: error.message };
  }
});

// App event handlers
app.whenReady().then(() => {
  console.log('Electron app is ready');
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  console.log('All windows closed');
  
  // Clean up scraper before quitting
  if (dataScraper && isScrapingActive) {
    try {
      await dataScraper.stop();
    } catch (error) {
      console.error('Error stopping scraper on quit:', error);
    }
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  // Ensure scraper is stopped before quitting
  if (dataScraper && isScrapingActive) {
    event.preventDefault();
    try {
      await dataScraper.stop();
      app.quit();
    } catch (error) {
      console.error('Error stopping scraper before quit:', error);
      app.quit();
    }
  }
});

console.log('Main process started');