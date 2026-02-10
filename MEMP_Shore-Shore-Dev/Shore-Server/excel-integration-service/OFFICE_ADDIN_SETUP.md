# MEMP Ship Office Add-in Setup Guide

## Overview
This Office Add-in enables one-click report submission directly from Excel to the MEMP Ship system.

## Prerequisites
- Microsoft Excel 2016 or later (Desktop or Online)
- Node.js installed on your system
- MEMP Ship API running (excel-integration-service)

## Installation Steps

### 1. Generate Self-Signed Certificate (For Local Development)

Since Office Add-ins require HTTPS, you need to generate a self-signed certificate:

```powershell
# Run in PowerShell as Administrator
cd "C:\Users\Anil.Ravada\Desktop\MEMP_Test_AI\Dev_Env\MEMP_Shore\Shore-Server\excel-integration-service"

# Install required package
npm install selfsigned

# Create certificate generation script
node -e "const selfsigned = require('selfsigned'); const pems = selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { days: 365, keySize: 2048 }); require('fs').writeFileSync('server-cert.pem', pems.cert); require('fs').writeFileSync('server-key.pem', pems.private); console.log('Certificate generated!');"
```

### 2. Update Server to Support HTTPS

The server configuration needs to be updated to serve content over HTTPS on port 7013.

### 3. Trust the Self-Signed Certificate

**Windows:**
```powershell
# Import the certificate to Trusted Root
Import-Certificate -FilePath "server-cert.pem" -CertStoreLocation Cert:\LocalMachine\Root
```

**Manual Method:**
1. Double-click `server-cert.pem`
2. Click "Install Certificate"
3. Select "Local Machine"
4. Choose "Place all certificates in the following store"
5. Browse and select "Trusted Root Certification Authorities"
6. Click Finish

### 4. Install the Add-in in Excel

**Method 1: Sideload via File Menu (Excel Desktop)**
1. Open Excel
2. Go to Insert → Add-ins → My Add-ins
3. Click "Manage My Add-ins" (top right)
4. Select "Upload My Add-in"
5. Browse to: `Shore-Server\excel-integration-service\public\office-addin\manifest.xml`
6. Click "Upload"

**Method 2: Using Office Add-ins Developer Settings**
1. File → Options → Trust Center → Trust Center Settings
2. Trusted Add-in Catalogs
3. Add catalog URL: `https://localhost:7013/office-addin/`
4. Check "Show in Menu"
5. Click OK and restart Excel

**Method 3: Registry Method (Windows)**
```powershell
# Run in PowerShell as Administrator
$manifestPath = "C:\Users\Anil.Ravada\Desktop\MEMP_Test_AI\Dev_Env\MEMP_Shore\Shore-Server\excel-integration-service\public\office-addin\manifest.xml"

# Create registry key for add-in
New-Item -Path "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer" -Force
New-ItemProperty -Path "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer" -Name "MEMPShipAddin" -Value $manifestPath -PropertyType String -Force

Write-Host "Add-in registered! Restart Excel to see the add-in."
```

### 5. Start the Excel Integration Service

```powershell
cd "C:\Users\Anil.Ravada\Desktop\MEMP_Test_AI\Dev_Env\MEMP_Shore\Shore-Server\excel-integration-service"
node excelIntegrationServer.js
```

Make sure it's running on HTTPS port 7013.

## Using the Add-in

### Step 1: Download Template
1. Open MEMP Ship web application
2. Navigate to Reports section
3. Click "Download Template"
4. Open the downloaded Excel file

### Step 2: Fill in Report Data
1. Go to "VesselDailyReports" sheet
2. Enter your vessel daily report data
3. Fill in all required fields

### Step 3: Upload via Add-in
1. Click the "Send Report" button in Excel's Home ribbon
2. The MEMP Ship task pane will open on the right
3. Enter your API URL (e.g., `http://localhost:4000`)
4. Enter your authentication token (get from web app)
5. Click "Validate Report" to check your data
6. Click "Send Report" to upload

### Getting Your Auth Token
1. Log in to MEMP Ship web application
2. Press F12 to open Developer Tools
3. Go to Application → Local Storage
4. Find "token" or "authToken"
5. Copy the value
6. Paste into the add-in's "Authentication Token" field

## Troubleshooting

### Add-in Not Appearing in Excel
- Restart Excel completely
- Verify manifest.xml path is correct
- Check if HTTPS server is running on port 7013
- Try clearing Office cache: Delete `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`

### Certificate Errors
- Make sure certificate is trusted in Windows
- Verify server is using HTTPS (not HTTP)
- Try regenerating the certificate

### Upload Fails
- Check authentication token is valid (not expired)
- Verify API URL is correct
- Check network connection
- Look for errors in browser console (F12)

### "VesselDailyReports sheet not found"
- Ensure you're using the official MEMP Ship template
- Don't rename any sheets
- Make sure sheet has data

## Development Notes

### File Structure
```
public/office-addin/
├── manifest.xml          # Add-in configuration
├── taskpane.html         # Main UI
├── taskpane.js           # Core functionality
├── commands.html         # Command definitions
├── help.html            # Help documentation
└── assets/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-64.png
    └── icon-80.png
```

### Updating the Add-in
After making changes:
1. Save all files
2. Restart the excel-integration-service
3. Clear Office cache
4. Restart Excel

### Testing
- Test with valid data first
- Verify validation works before upload
- Check API responses in browser console
- Monitor server logs for errors

## Support
For technical assistance, contact your system administrator.
