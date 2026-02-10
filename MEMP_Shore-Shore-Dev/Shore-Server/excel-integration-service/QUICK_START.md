# Quick Start: Office Add-in for MEMP Ship

## Step 1: Install Dependencies & Generate Certificate

```powershell
cd "C:\Users\Anil.Ravada\Desktop\MEMP_Test_AI\Dev_Env\MEMP_Shore\Shore-Server\excel-integration-service"

# Install the selfsigned package
npm install

# Generate self-signed certificate
npm run setup:cert
```

## Step 2: Trust the Certificate (REQUIRED)

**Run in PowerShell as Administrator:**
```powershell
cd "C:\Users\Anil.Ravada\Desktop\MEMP_Test_AI\Dev_Env\MEMP_Shore\Shore-Server\excel-integration-service"
Import-Certificate -FilePath "server-cert.pem" -CertStoreLocation Cert:\LocalMachine\Root
```

## Step 3: Start the Server

```powershell
npm start
```

You should see:
- `🚀 Excel Integration Service running on HTTP port 7011`
- `🔒 Excel Integration Service (HTTPS) running on port 7013`

## Step 4: Install Add-in in Excel (Registry Method - Easiest)

**Run in PowerShell as Administrator:**
```powershell
$manifestPath = "C:\Users\Anil.Ravada\Desktop\MEMP_Test_AI\Dev_Env\MEMP_Shore\Shore-Server\excel-integration-service\public\office-addin\manifest.xml"

# Create registry key for add-in
New-Item -Path "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer" -Force
New-ItemProperty -Path "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer" -Name "MEMPShipAddin" -Value $manifestPath -PropertyType String -Force

Write-Host "✅ Add-in registered! Restart Excel to see the add-in."
```

## Step 5: Restart Excel

1. Close all Excel windows
2. Open Excel
3. Open any vessel report template
4. Look for "MEMP Ship" section in the Home ribbon
5. Click "Send Report" button

## Step 6: Get Your Authentication Token

1. Open MEMP Ship web application in browser
2. Log in to your account
3. Press **F12** to open Developer Tools
4. Go to **Application** tab → **Local Storage**
5. Find `token` or `authToken`
6. **Copy the value**

## Step 7: Use the Add-in

1. In Excel, click the **"Send Report"** button
2. Paste your authentication token
3. Enter API URL: `http://localhost:4000` (or your API URL)
4. Click **"Validate Report"**
5. Click **"Send Report"** to upload!

## Troubleshooting

### "Add-in not appearing"
- Make sure you ran the registry command as Administrator
- Restart Excel completely
- Check if server is running on HTTPS (port 7013)

### "Certificate error"
- Trust the certificate using the PowerShell command in Step 2
- Restart browser and Excel

### "Upload failed"
- Check authentication token is current (tokens expire)
- Verify API URL is correct
- Make sure server is running

## Complete Setup Script (All in One)

```powershell
# Run as Administrator
cd "C:\Users\Anil.Ravada\Desktop\MEMP_Test_AI\Dev_Env\MEMP_Shore\Shore-Server\excel-integration-service"

# Install and generate certificate
npm install
npm run setup:cert

# Trust certificate
Import-Certificate -FilePath "server-cert.pem" -CertStoreLocation Cert:\LocalMachine\Root

# Register add-in
$manifestPath = "$PWD\public\office-addin\manifest.xml"
New-Item -Path "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer" -Force
New-ItemProperty -Path "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer" -Name "MEMPShipAddin" -Value $manifestPath -PropertyType String -Force

Write-Host "✅ Setup complete! Start the server with 'npm start' and restart Excel."
```
