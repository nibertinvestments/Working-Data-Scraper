// Renderer process script for Data Scraper UI
class DataScraperUI {
    constructor() {
        this.isScrapingActive = false;
        this.scrapedData = [];
        this.settings = {};
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadInitialData();
    }

    initializeElements() {
        // Control buttons
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        
        // Status elements
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');
        this.statsPanel = document.getElementById('stats-panel');
        this.sitesCount = document.getElementById('sites-count');
        this.contactsCount = document.getElementById('contacts-count');
        
        // Data table
        this.dataTable = document.getElementById('data-table-body');
        
        // Export buttons
        this.exportCSVBtn = document.getElementById('export-csv-btn');
        this.exportSheetsBtn = document.getElementById('export-sheets-btn');
        
        // Footer buttons
        this.settingsBtn = document.getElementById('settings-btn');
        this.clearDataBtn = document.getElementById('clear-data-btn');
        
        // Settings modal
        this.settingsModal = document.getElementById('settings-modal');
        this.closeSettingsBtn = document.getElementById('close-settings');
        this.saveSettingsBtn = document.getElementById('save-settings');
        this.cancelSettingsBtn = document.getElementById('cancel-settings');
        
        // Settings form elements
        this.extractEmailsCheck = document.getElementById('extract-emails');
        this.extractPhonesCheck = document.getElementById('extract-phones');
        this.extractNamesCheck = document.getElementById('extract-names');
        this.scrapingDelayInput = document.getElementById('scraping-delay');
        this.enableSheetsCheck = document.getElementById('enable-sheets');
        this.spreadsheetIdInput = document.getElementById('spreadsheet-id');
        this.credentialsFileInput = document.getElementById('credentials-file');
        this.autoExportCSVCheck = document.getElementById('auto-export-csv');
        this.csvPathInput = document.getElementById('csv-path');
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
    }

    setupEventListeners() {
        // Main control buttons
        this.startBtn.addEventListener('click', () => this.startScraping());
        this.stopBtn.addEventListener('click', () => this.stopScraping());
        
        // Export buttons
        this.exportCSVBtn.addEventListener('click', () => this.exportToCSV());
        this.exportSheetsBtn.addEventListener('click', () => this.exportToGoogleSheets());
        
        // Footer buttons
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.clearDataBtn.addEventListener('click', () => this.clearAllData());
        
        // Settings modal
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
        
        // Modal background click to close
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });
        
        // File input for credentials
        this.credentialsFileInput.addEventListener('change', (e) => this.handleCredentialsFile(e));
        
        // IPC event listeners
        window.electronAPI.onDataScraped((event, data) => this.handleNewData(data));
        window.electronAPI.onScraperError((event, error) => this.showToast(error, 'error'));
        window.electronAPI.onStatusUpdate((event, status) => this.updateStatus(status));
        window.electronAPI.onShowSettings(() => this.openSettings());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case ',':
                        e.preventDefault();
                        this.openSettings();
                        break;
                    case 's':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.startScraping();
                        }
                        break;
                    case 'e':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.exportToCSV();
                        }
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        });
    }

    async loadInitialData() {
        try {
            // Load scraping status
            const statusResult = await window.electronAPI.getScrapingStatus();
            this.isScrapingActive = statusResult.isActive;
            this.updateUIState();
            
            // Load settings
            const settingsResult = await window.electronAPI.getSettings();
            this.settings = settingsResult;
            
            // Load existing scraped data
            const dataResult = await window.electronAPI.getScrapedData();
            if (dataResult.success) {
                this.scrapedData = dataResult.data || [];
                this.updateDataTable();
                this.updateStats();
            }
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showToast('Failed to load initial data', 'error');
        }
    }

    async startScraping() {
        try {
            this.startBtn.disabled = true;
            this.showToast('Starting scraper...', 'info');
            
            const result = await window.electronAPI.startScraping();
            
            if (result.success) {
                this.isScrapingActive = true;
                this.updateUIState();
                this.showToast('Scraping started! Browse websites to collect data.', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to start scraping:', error);
            this.showToast(`Failed to start scraping: ${error.message}`, 'error');
        } finally {
            this.startBtn.disabled = false;
        }
    }

    async stopScraping() {
        try {
            this.stopBtn.disabled = true;
            this.showToast('Stopping scraper...', 'info');
            
            const result = await window.electronAPI.stopScraping();
            
            if (result.success) {
                this.isScrapingActive = false;
                this.updateUIState();
                this.showToast('Scraping stopped.', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to stop scraping:', error);
            this.showToast(`Failed to stop scraping: ${error.message}`, 'error');
        } finally {
            this.stopBtn.disabled = false;
        }
    }

    updateUIState() {
        if (this.isScrapingActive) {
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.statusDot.className = 'status-dot active';
            this.statusText.textContent = 'Actively scraping...';
            this.statsPanel.classList.remove('hidden');
        } else {
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.statusDot.className = 'status-dot inactive';
            this.statusText.textContent = 'Ready to start';
        }
    }

    handleNewData(data) {
        this.scrapedData.unshift(data); // Add to beginning of array
        this.updateDataTable();
        this.updateStats();
        
        const contactInfo = [data.emails, data.phones, data.names]
            .flat()
            .filter(Boolean)
            .join(', ');
        
        this.showToast(`New contact data found: ${contactInfo}`, 'success');
    }

    updateDataTable() {
        if (this.scrapedData.length === 0) {
            this.dataTable.innerHTML = `
                <tr class="empty-state">
                    <td colspan="5">No data collected yet. Click "Start Scraping" to begin.</td>
                </tr>
            `;
            return;
        }

        this.dataTable.innerHTML = this.scrapedData
            .slice(0, 50) // Show only latest 50 entries
            .map(data => `
                <tr>
                    <td><a href="${data.url}" target="_blank" title="${data.url}">${this.truncateText(data.domain || data.url, 30)}</a></td>
                    <td>${this.formatArray(data.emails)}</td>
                    <td>${this.formatArray(data.phones)}</td>
                    <td>${this.formatArray(data.names)}</td>
                    <td>${this.formatTimestamp(data.timestamp)}</td>
                </tr>
            `).join('');
    }

    updateStats() {
        const uniqueSites = new Set(this.scrapedData.map(d => d.domain || d.url)).size;
        const totalContacts = this.scrapedData.reduce((sum, data) => 
            sum + (data.emails?.length || 0) + (data.phones?.length || 0) + (data.names?.length || 0), 0
        );
        
        this.sitesCount.textContent = uniqueSites;
        this.contactsCount.textContent = totalContacts;
    }

    updateStatus(status) {
        this.statusText.textContent = status;
    }

    async exportToCSV() {
        try {
            const result = await window.electronAPI.exportCSV();
            
            if (result.success) {
                this.showToast('Data exported to CSV successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('CSV export failed:', error);
            this.showToast(`CSV export failed: ${error.message}`, 'error');
        }
    }

    async exportToGoogleSheets() {
        try {
            if (!this.settings.googleSheets?.enabled) {
                this.showToast('Google Sheets not configured. Please check settings.', 'warning');
                this.openSettings();
                return;
            }
            
            const result = await window.electronAPI.exportGoogleSheets();
            
            if (result.success) {
                this.showToast('Data exported to Google Sheets successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Google Sheets export failed:', error);
            this.showToast(`Google Sheets export failed: ${error.message}`, 'error');
        }
    }

    openSettings() {
        // Populate settings form with current values
        this.extractEmailsCheck.checked = this.settings.scraping?.extractEmails !== false;
        this.extractPhonesCheck.checked = this.settings.scraping?.extractPhones !== false;
        this.extractNamesCheck.checked = this.settings.scraping?.extractNames !== false;
        this.scrapingDelayInput.value = this.settings.scraping?.delay || 2000;
        
        this.enableSheetsCheck.checked = this.settings.googleSheets?.enabled || false;
        this.spreadsheetIdInput.value = this.settings.googleSheets?.spreadsheetId || '';
        
        this.autoExportCSVCheck.checked = this.settings.export?.autoExportToCSV !== false;
        this.csvPathInput.value = this.settings.export?.csvPath || '';
        
        this.settingsModal.classList.remove('hidden');
    }

    closeSettings() {
        this.settingsModal.classList.add('hidden');
    }

    async saveSettings() {
        try {
            const newSettings = {
                scraping: {
                    enabled: true,
                    extractEmails: this.extractEmailsCheck.checked,
                    extractPhones: this.extractPhonesCheck.checked,
                    extractNames: this.extractNamesCheck.checked,
                    delay: parseInt(this.scrapingDelayInput.value)
                },
                googleSheets: {
                    enabled: this.enableSheetsCheck.checked,
                    spreadsheetId: this.spreadsheetIdInput.value,
                    credentials: this.settings.googleSheets?.credentials // Keep existing credentials
                },
                export: {
                    autoExportToCSV: this.autoExportCSVCheck.checked,
                    csvPath: this.csvPathInput.value
                }
            };

            const result = await window.electronAPI.saveSettings(newSettings);
            
            if (result.success) {
                this.settings = newSettings;
                this.closeSettings();
                this.showToast('Settings saved successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showToast(`Failed to save settings: ${error.message}`, 'error');
        }
    }

    handleCredentialsFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const credentials = JSON.parse(e.target.result);
                this.settings.googleSheets = this.settings.googleSheets || {};
                this.settings.googleSheets.credentials = credentials;
                this.showToast('Credentials file loaded successfully!', 'success');
            } catch (error) {
                this.showToast('Invalid credentials file format', 'error');
            }
        };
        reader.readAsText(file);
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all scraped data? This cannot be undone.')) {
            this.scrapedData = [];
            this.updateDataTable();
            this.updateStats();
            this.showToast('All data cleared', 'info');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    formatArray(arr) {
        if (!arr || arr.length === 0) return '-';
        if (arr.length === 1) return arr[0];
        return arr.join(', ');
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DataScraperUI();
});