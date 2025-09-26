$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Data Scraper.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-Command `"cd 'C:\Users\Josh\Desktop\Github\Data Scraper'; npm start`""
$Shortcut.WorkingDirectory = "C:\Users\Josh\Desktop\Github\Data Scraper"
$Shortcut.IconLocation = "C:\Users\Josh\Desktop\Github\Data Scraper\assets\icon.ico"
$Shortcut.Description = "Data Scraper - Automatically collect contact information"
$Shortcut.Save()