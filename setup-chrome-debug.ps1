# Chrome Setup Script for Data Scraper
# This script creates a Chrome shortcut with remote debugging enabled

Write-Host "Setting up Chrome for Data Scraper..." -ForegroundColor Yellow

# Check if Chrome is installed
$chromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (!(Test-Path $chromeExe)) {
    $chromeExe = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    if (!(Test-Path $chromeExe)) {
        Write-Host "Chrome not found! Please install Google Chrome first." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Found Chrome at: $chromeExe" -ForegroundColor Green

# Create debug data directory
$debugDir = "C:\temp\chrome-debug"
if (!(Test-Path $debugDir)) {
    New-Item -ItemType Directory -Path $debugDir -Force | Out-Null
    Write-Host "Created debug directory: $debugDir" -ForegroundColor Green
}

# Create desktop shortcut
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Chrome Debug Mode.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $chromeExe
$shortcut.Arguments = "--remote-debugging-port=9222 --user-data-dir=`"$debugDir`""
$shortcut.WorkingDirectory = (Split-Path $chromeExe)
$shortcut.Description = "Chrome with remote debugging for Data Scraper"
$shortcut.Save()

Write-Host "Created desktop shortcut: Chrome Debug Mode" -ForegroundColor Green

# Instructions
Write-Host "`nSetup Complete!" -ForegroundColor Green
Write-Host "To use the Data Scraper:" -ForegroundColor Cyan
Write-Host "1. Close all existing Chrome windows"
Write-Host "2. Use the 'Chrome Debug Mode' shortcut on your desktop"
Write-Host "3. Start the Data Scraper app"
Write-Host "4. Browse websites - they will be automatically scraped!"

Write-Host "`nNote: You can still use regular Chrome separately if needed." -ForegroundColor Yellow

# Ask if user wants to start Chrome now
$response = Read-Host "`nWould you like to start Chrome in debug mode now? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "Starting Chrome in debug mode..."
    Start-Process -FilePath $chromeExe -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=`"$debugDir`""
    Write-Host "Chrome started! You can now use the Data Scraper." -ForegroundColor Green
}