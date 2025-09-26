import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;

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
    titleBarStyle: 'default'
  });

  // Load the HTML file
  const htmlPath = join(__dirname, 'renderer/index.html');
  console.log('Loading HTML file from:', htmlPath);
  mainWindow.loadFile(htmlPath);

  // Open DevTools in development
  mainWindow.webContents.openDevTools();

  // Log when the window is ready
  mainWindow.webContents.once('dom-ready', () => {
    console.log('DOM is ready, window loaded successfully');
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer console (${level}):`, message);
  });
}

// Simple IPC handlers for testing
ipcMain.handle('start-scraping', async () => {
  console.log('start-scraping called');
  try {
    // For now, just return a simple response
    return { success: true, message: 'Scraping functionality will be initialized soon' };
  } catch (error) {
    console.error('Error in start-scraping:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-scraping', async () => {
  console.log('stop-scraping called');
  return { success: true };
});

ipcMain.handle('get-scraping-status', () => {
  console.log('get-scraping-status called');
  return { isActive: false };
});

ipcMain.handle('get-settings', () => {
  console.log('get-settings called');
  return {
    scraping: {
      enabled: true,
      extractEmails: true,
      extractPhones: true,
      extractNames: true,
      delay: 2000
    },
    googleSheets: {
      enabled: false,
      spreadsheetId: '',
      credentials: null
    },
    export: {
      autoExportToCSV: true,
      csvPath: join(process.cwd(), 'scraped_data.csv')
    }
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  console.log('save-settings called with:', settings);
  return { success: true };
});

ipcMain.handle('get-scraped-data', async () => {
  console.log('get-scraped-data called');
  return { success: true, data: [] };
});

ipcMain.handle('export-csv', async (event, filePath) => {
  console.log('export-csv called with path:', filePath);
  return { success: true, message: 'CSV export functionality will be implemented' };
});

ipcMain.handle('export-google-sheets', async () => {
  console.log('export-google-sheets called');
  return { success: true, message: 'Google Sheets export functionality will be implemented' };
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

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

console.log('Main process started');