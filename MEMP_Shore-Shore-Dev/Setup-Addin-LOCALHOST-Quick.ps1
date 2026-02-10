#!/usr/bin/env pwsh
# Setup-Addin-LOCALHOST-Quick.ps1
# Quick setup for LOCALHOST testing ONLY

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   MEMP LOCALHOST ADD-IN SETUP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$LOCALHOST_URL = "http://localhost:7011"
$MANIFEST_URL = "$LOCALHOST_URL/office-addin/manifest.xml"
$ADDIN_FOLDER = "$env:USERPROFILE\AppData\Local\MEMP_Shore_Addin"
$MANIFEST_FILE = "$ADDIN_FOLDER\manifest.xml"

# Step 1: Close Excel
Write-Host "📌 Step 1: Closing Excel..." -ForegroundColor Yellow
Get-Process excel -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   ✅ Excel closed`n" -ForegroundColor Green

# Step 2: Clear Office cache
Write-Host "📌 Step 2: Clearing Office cache..." -ForegroundColor Yellow
$cachePaths = @(
    "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef",
    "$env:LOCALAPPDATA\Microsoft\Office\Wef",
    "$env:LOCALAPPDATA\Microsoft\Office\16.0\WEF"
)
foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "   ✅ Cache cleared`n" -ForegroundColor Green

# Step 3: Create folder
Write-Host "📌 Step 3: Creating add-in folder..." -ForegroundColor Yellow
if (-not (Test-Path $ADDIN_FOLDER)) {
    New-Item -ItemType Directory -Path $ADDIN_FOLDER -Force | Out-Null
}
Write-Host "   ✅ Folder created: $ADDIN_FOLDER`n" -ForegroundColor Green

# Step 4: Check if localhost service is running
Write-Host "📌 Step 4: Checking localhost service..." -ForegroundColor Yellow
try {
    $testConnection = Test-NetConnection -ComputerName localhost -Port 7011 -InformationLevel Quiet -WarningAction SilentlyContinue
    if (-not $testConnection) {
        throw "Excel Integration Service is not running on port 7011"
    }
    Write-Host "   ✅ Excel service is running on port 7011`n" -ForegroundColor Green
} catch {
    Write-Host "   ❌ ERROR: Excel Integration Service is not running!" -ForegroundColor Red
    Write-Host "   Please start it first with: cd Shore-Server; npm run dev" -ForegroundColor Yellow
    Write-Host "`nPress any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Step 5: Download manifest from localhost
Write-Host "📌 Step 5: Downloading manifest from localhost..." -ForegroundColor Yellow
try {
    $webClient = New-Object System.Net.WebClient
    $webClient.Headers.Add("User-Agent", "MEMP-Setup")
    $manifestContent = $webClient.DownloadString($MANIFEST_URL)
    
    # Validate
    if (-not $manifestContent.Contains("<OfficeApp")) {
        throw "Invalid manifest content"
    }
    
    # Verify it contains localhost URLs
    if (-not $manifestContent.Contains("localhost")) {
        Write-Host "   ⚠️ WARNING: Manifest doesn't contain 'localhost' URLs!" -ForegroundColor Yellow
        Write-Host "   This might point to production instead." -ForegroundColor Yellow
    }
    
    # Save
    [System.IO.File]::WriteAllText($MANIFEST_FILE, $manifestContent, [System.Text.Encoding]::UTF8)
    
    $fileSize = (Get-Item $MANIFEST_FILE).Length
    Write-Host "   ✅ Manifest downloaded ($fileSize bytes)`n" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ ERROR: Failed to download manifest!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   URL: $MANIFEST_URL`n" -ForegroundColor Gray
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Step 6: Register in registry
Write-Host "📌 Step 6: Registering add-in in Windows Registry..." -ForegroundColor Yellow
try {
    $devKey = "HKCU:\Software\Microsoft\Office\16.0\Wef\Developer"
    
    # Create key if doesn't exist
    if (-not (Test-Path $devKey)) {
        New-Item -Path $devKey -Force | Out-Null
    }
    
    # Register manifest file path (local file, not URL)
    New-ItemProperty -Path $devKey -Name "Manifests" -Value $MANIFEST_FILE -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $devKey -Name "DefaultManifestLocation" -Value $MANIFEST_FILE -PropertyType String -Force | Out-Null
    
    Write-Host "   ✅ Registry updated`n" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ ERROR: Failed to update registry!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Try running as Administrator`n" -ForegroundColor Yellow
}

# Step 7: Setup trusted catalog
Write-Host "📌 Step 7: Setting up trusted catalog..." -ForegroundColor Yellow
try {
    $catalogKey = "HKCU:\Software\Microsoft\Office\16.0\Wef\TrustedCatalogs\{MEMP-SHORE-LOCAL-001}"
    
    if (-not (Test-Path $catalogKey)) {
        New-Item -Path $catalogKey -Force | Out-Null
    }
    
    $addinFolderUrl = "file:///" + $ADDIN_FOLDER.Replace("\", "/")
    New-ItemProperty -Path $catalogKey -Name "Id" -Value "{MEMP-SHORE-LOCAL-001}" -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $catalogKey -Name "Url" -Value $addinFolderUrl -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $catalogKey -Name "Flags" -Value 1 -PropertyType DWord -Force | Out-Null
    
    Write-Host "   ✅ Trusted catalog configured`n" -ForegroundColor Green
    
} catch {
    Write-Host "   ⚠️ WARNING: Could not setup trusted catalog" -ForegroundColor Yellow
    Write-Host "   This is optional and might still work`n" -ForegroundColor Gray
}

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "📋 What was installed:" -ForegroundColor Cyan
Write-Host "   - Manifest file: $MANIFEST_FILE" -ForegroundColor Gray
Write-Host "   - Points to: LOCALHOST (http://localhost:7011)" -ForegroundColor Gray
Write-Host "   - Registry: HKCU\Software\Microsoft\Office\16.0\Wef\Developer`n" -ForegroundColor Gray

Write-Host "📝 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Download a LOCALHOST template:" -ForegroundColor White
Write-Host "      http://localhost:7011/template/vesselreport?shipId=2`n" -ForegroundColor Cyan
Write-Host "   2. Open the template in Excel" -ForegroundColor White
Write-Host "   3. Look for the taskpane on the right side" -ForegroundColor White
Write-Host "   4. If taskpane doesn't appear:" -ForegroundColor White
Write-Host "      - Go to: Insert tab → My Add-ins → MEMP Shore`n" -ForegroundColor White

Write-Host "⚠️  IMPORTANT:" -ForegroundColor Red
Write-Host "   - Keep localhost services RUNNING (npm run dev)" -ForegroundColor Yellow
Write-Host "   - This setup is for LOCALHOST testing only" -ForegroundColor Yellow
Write-Host "   - For production, use MEMP_Production_Setup.bat instead`n" -ForegroundColor Yellow

Write-Host "Press any key to download a test template..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Download template
try {
    $templateUrl = "http://localhost:7011/template/vesselreport?shipId=2"
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $templateFile = "$desktopPath\MEMP_Localhost_Test_Template.xlsx"
    
    Write-Host "`n📥 Downloading template..." -ForegroundColor Cyan
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($templateUrl, $templateFile)
    
    Write-Host "✅ Template saved to desktop: MEMP_Localhost_Test_Template.xlsx`n" -ForegroundColor Green
    
    # Open in Excel
    Write-Host "🚀 Opening template in Excel...`n" -ForegroundColor Cyan
    Start-Process excel.exe -ArgumentList "`"$templateFile`""
    
    Start-Sleep -Seconds 3
    Write-Host "✅ Check the right side of Excel for the taskpane!`n" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Could not download template" -ForegroundColor Red
    Write-Host "Manual download: http://localhost:7011/template/vesselreport?shipId=2`n" -ForegroundColor Yellow
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
