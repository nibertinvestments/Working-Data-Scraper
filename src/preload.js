const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Scraping controls
  startScraping: () => ipcRenderer.invoke('start-scraping'),
  stopScraping: () => ipcRenderer.invoke('stop-scraping'),
  getScrapingStatus: () => ipcRenderer.invoke('get-scraping-status'),

  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Data export
  exportCSV: (filePath) => ipcRenderer.invoke('export-csv', filePath),
  exportGoogleSheets: () => ipcRenderer.invoke('export-google-sheets'),
  getScrapedData: () => ipcRenderer.invoke('get-scraped-data'),

  // Event listeners
  onDataScraped: (callback) => ipcRenderer.on('data-scraped', callback),
  onScraperError: (callback) => ipcRenderer.on('scraper-error', callback),
  onStatusUpdate: (callback) => ipcRenderer.on('status-update', callback),
  onShowSettings: (callback) => ipcRenderer.on('show-settings', callback),

  // Clean up listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});