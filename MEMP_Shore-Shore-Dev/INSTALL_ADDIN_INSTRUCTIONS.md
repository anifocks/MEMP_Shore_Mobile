# How to Install MEMP Shore Office Add-in (Taskpane)

## ⚠️ IMPORTANT - One-Time Setup
The taskpane is NOT inside the Excel templates. It's a separate **Office Add-in** that you need to sideload **ONCE** in Excel.

---

## 🚀 INSTALLATION STEPS (3 minutes)

### **Step 1: Ensure Service is Running**
```powershell
# In PowerShell, check if Excel Integration Service is running:
Test-NetConnection localhost -Port 7011

# If NOT running, start it:
cd D:\MEMP\MEMP_Production\MEMP_Shore\Shore-Server\excel-integration-service
npm start
```

**Manifest URL:** http://localhost:7011/office-addin/manifest.xml

---

### **Step 2: Open Excel**
1. Open Microsoft Excel (any workbook or blank workbook)
2. Go to the **Insert** tab
3. Click **Get Add-ins** (or **Office Add-ins**)

---

### **Step 3: Sideload the Add-in**

#### **Option A: Shared Folder Method (WORKS WITHOUT UPLOAD BUTTON)**
If you don't see "Upload My Add-in" option, use this method:

1. **Create a trusted catalog folder:**
```powershell
# Create a network share folder (or use local folder)
$catalogPath = "C:\OfficeAddins"
New-Item -ItemType Directory -Path $catalogPath -Force

# Copy manifest to this folder
Copy-Item "D:\MEMP\MEMP_Production\MEMP_Shore\Shore-Server\excel-integration-service\public\office-addin\manifest.xml" -Destination $catalogPath
```

2. **Add folder to Office Trusted Catalogs:**
   - Open **File Explorer** → Right-click `C:\OfficeAddins` → **Properties** → **Sharing** tab
   - Click **Share** → Add "Everyone" → Set to "Read" → Share
   - Copy the network path (e.g., `\\YOUR-PC-NAME\OfficeAddins`)

3. **Trust the catalog in Excel:**
   - Excel → **File** → **Options** → **Trust Center** → **Trust Center Settings**
   - Click **Trusted Add-in Catalogs**
   - Paste the network path: `\\YOUR-PC-NAME\OfficeAddins` (or `file:///C:/OfficeAddins`)
   - Check ✓ **Show in Menu**
   - Click **Add catalog** → **OK** → **OK**

4. **Install the add-in:**
   - Restart Excel
   - **Insert** → **Get Add-ins** → **SHARED FOLDER**
   - You should see "MEMP Shore Report Uploader" → Click to install

---

#### **Option B: Registry Method (NO EXCEL UI NEEDED)**
If Shared Folder doesn't work, directly register via Windows Registry:

```powershell
# Run in PowerShell AS ADMINISTRATOR:
$manifestUrl = "http://localhost:7011/office-addin/manifest.xml"
$regPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"

# Create registry key if not exists
if (!(Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

# Add manifest URL
New-ItemProperty -Path $regPath -Name "DefaultManifestLocation" -Value $manifestUrl -PropertyType String -Force

Write-Host "`n✅ Add-in registered! Restart Excel to see it.`n" -ForegroundColor Green
```

**Then restart Excel** - The add-in will load automatically.

---

#### **Option C: Manual File Copy (SIMPLEST)**
Copy the manifest and taskpane files to Office's add-in folder:

```powershell
# Run this command:
$officeAddinPath = "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef"
$targetPath = "$officeAddinPath\MEMP_Shore"

# Create folder
New-Item -ItemType Directory -Path $targetPath -Force

# Copy files
Copy-Item "D:\MEMP\MEMP_Production\MEMP_Shore\Shore-Server\excel-integration-service\public\office-addin\*" -Destination $targetPath -Recurse -Force

Write-Host "`n✅ Files copied to Office add-in folder`n" -ForegroundColor Green
Write-Host "Restart Excel and go to Insert → My Add-ins`n" -ForegroundColor Yellow
```

---

#### **Option D: Using Manifest Upload (IF AVAILABLE)**
1. In the Office Add-ins dialog, click on the **UPLOAD MY ADD-IN** button (top right)
2. Click **Browse...**
3. Navigate to: `D:\MEMP\MEMP_Production\MEMP_Shore\Shore-Server\excel-integration-service\public\office-addin`
4. Select **manifest.xml** file
5. Click **Open** → **Upload**

---

#### **Option E: Using URL Upload (IF AVAILABLE)**
```powershell
# Get the manifest URL:
Write-Host "`n📋 Copy this URL:`n`nhttp://localhost:7011/office-addin/manifest.xml`n" -ForegroundColor Yellow

# Then in Excel:
# 1. Insert → Get Add-ins → Upload MY ADD-IN
# 2. Paste the URL above
```

---

### **Step 4: Open the Taskpane**
After installation, the taskpane should auto-open. If not:
1. Go to **Home** tab
2. Click **Show Taskpane** button (in the ribbon)
3. OR: Right-click any cell → **MEMP Shore Report Uploader**

---

## ✅ VERIFICATION

**If successful, you'll see:**
- Taskpane appears on the right side of Excel
- Title: "MEMP_Shore Report Uploader"
- Fields: API URL, Auth Token, Ship ID
- Buttons: Fetch Data, Upload Report, etc.

---

## 🔄 FOR PRODUCTION ENVIRONMENT

When working with production server:
1. **Change the manifest URL** to production:
   ```
   https://veemsonboardupgrade.theviswagroup.com/office-addin/manifest.xml
   ```
2. Follow the same sideloading steps above
3. Use the production manifest URL instead of localhost

---

## 📝 IMPORTANT NOTES

1. **One-time setup per Excel installation** - You only need to do this ONCE on each computer
2. **Templates are separate** - The taskpane works with ANY template downloaded from localhost OR production
3. **The taskpane is NOT embedded in templates** - It's a standalone Office Add-in
4. **Auto-opens** - Once installed, the taskpane will automatically open when you open MEMP templates
5. **Works for both environments** - Same add-in works with localhost AND production templates

---

## 🐛 TROUBLESHOOTING

### Problem: "Can't upload manifest"
**Solution:** Make sure Excel Integration Service is running on port 7011

### Problem: "Add-in doesn't appear after installation"
**Solution:** 
- Go to Home tab → Show Taskpane button
- OR restart Excel and open a template

### Problem: "Manifest URL gives 404"
**Solution:**
```powershell
# Check service status:
cd D:\MEMP\MEMP_Production\MEMP_Shore\Shore-Server\excel-integration-service
npm start
```

### Problem: "Taskpane shows errors"
**Solution:**
- Clear Excel cache: Close Excel → Delete `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef`
- Restart Excel and try again

---

## 🎯 TESTING WORKFLOW

1. **Install add-in once** (using steps above)
2. **Download localhost template** → Taskpane appears automatically
3. **Download production template** → Same taskpane works, but uses production URL
4. Both templates can be open simultaneously, each maintains its own URL

---

## 📞 SUPPORT

If you still don't see the taskpane after following these steps:
1. Check Excel version (requires Office 2016 or newer)
2. Ensure Excel Integration Service is running
3. Try clearing Excel cache and reinstalling
4. Check browser console in taskpane (F12) for errors
