import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DataScraper } from './scraper/DataScraper.js';
import { GoogleSheetsExporter } from './exporters/GoogleSheetsExporter.js';
import { CSVExporter } from './exporters/CSVExporter.js';
import Store from 'electron-store';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize configuration store
const store = new Store({
  defaults: {
    googleSheets: {
      enabled: false,
      spreadsheetId: '',
      credentials: null
    },
    scraping: {
      enabled: true,
      extractEmails: true,
      extractPhones: true,
      extractNames: true,
      delay: 2000
    },
    export: {
      autoExportToCSV: true,
      csvPath: join(process.cwd(), 'scraped_data.csv')
    }
  }
});

let mainWindow;
let dataScraper;
let isScrapingActive = false;

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    icon: join(__dirname, '../assets/icon.png'),
    resizable: true,
    titleBarStyle: 'default'
  });

  // Load the HTML file
  mainWindow.loadFile(join(__dirname, 'renderer/index.html'));

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Set up menu
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

// Initialize data scraper
function initializeDataScraper() {
  const config = store.get();
  dataScraper = new DataScraper(config);
  
  // Set up event listeners for scraped data
  dataScraper.on('data-scraped', async (data) => {
    mainWindow.webContents.send('data-scraped', data);
    
    // Auto-export to CSV if enabled
    if (config.export.autoExportToCSV) {
      await exportToCSV(config.export.csvPath, [data]);
    }
    
    // Auto-export to Google Sheets if configured
    if (config.googleSheets.enabled && config.googleSheets.credentials) {
      await exportToGoogleSheets([data]);
    }
  });

  dataScraper.on('error', (error) => {
    console.error('Scraper error:', error);
    mainWindow.webContents.send('scraper-error', error.message);
  });

  dataScraper.on('status-update', (status) => {
    mainWindow.webContents.send('status-update', status);
  });
}

// Export functions
async function exportToCSV(filePath, data = null) {
  try {
    const exporter = new CSVExporter(filePath);
    if (data) {
      await exporter.append(data);
    } else {
      const allData = await dataScraper.getAllScrapedData();
      await exporter.write(allData);
    }
    return { success: true };
  } catch (error) {
    console.error('CSV export error:', error);
    return { success: false, error: error.message };
  }
}

async function exportToGoogleSheets(data = null) {
  try {
    const config = store.get('googleSheets');
    if (!config.enabled || !config.credentials) {
      throw new Error('Google Sheets not configured');
    }
    
    const exporter = new GoogleSheetsExporter(config.credentials, config.spreadsheetId);
    if (data) {
      await exporter.append(data);
    } else {
      const allData = await dataScraper.getAllScrapedData();
      await exporter.write(allData);
    }
    return { success: true };
  } catch (error) {
    console.error('Google Sheets export error:', error);
    return { success: false, error: error.message };
  }
}

// IPC handlers
ipcMain.handle('start-scraping', async () => {
  try {
    if (!dataScraper) {
      initializeDataScraper();
    }
    
    await dataScraper.start();
    isScrapingActive = true;
    return { success: true };
  } catch (error) {
    console.error('Failed to start scraping:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-scraping', async () => {
  try {
    if (dataScraper) {
      await dataScraper.stop();
    }
    isScrapingActive = false;
    return { success: true };
  } catch (error) {
    console.error('Failed to stop scraping:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-scraping-status', () => {
  return { isActive: isScrapingActive };
});

ipcMain.handle('get-settings', () => {
  return store.store;
});

ipcMain.handle('save-settings', (event, settings) => {
  try {
    store.set(settings);
    
    // Reinitialize scraper with new settings if it's active
    if (isScrapingActive && dataScraper) {
      dataScraper.updateConfig(settings);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-csv', async (event, filePath) => {
  return await exportToCSV(filePath);
});

ipcMain.handle('export-google-sheets', async () => {
  return await exportToGoogleSheets();
});

ipcMain.handle('get-scraped-data', async () => {
  try {
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
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  // Clean up scraper before quitting
  if (dataScraper) {
    await dataScraper.stop();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Ensure scraper is stopped before quitting
  if (dataScraper && isScrapingActive) {
    await dataScraper.stop();
  }
});