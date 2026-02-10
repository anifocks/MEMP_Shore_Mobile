# ============================================
# MEMP SHORE - PRODUCTION SETUP (Enhanced)
# ============================================
# Full automation with detailed diagnostics

param(
    [switch]$Silent = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$PRODUCTION_URL = "https://veemsonboardupgrade.theviswagroup.com"
$MANIFEST_URL = "$PRODUCTION_URL/office-addin/manifest.xml"
$ADDIN_FOLDER = "$env:USERPROFILE\AppData\Local\MEMP_Shore_Addin"
$MANIFEST_FILE = "$ADDIN_FOLDER\manifest.xml"

function Write-Step {
    param($Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Failure {
    param($Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "→ $Message" -ForegroundColor White
}

# Header
Clear-Host
Write-Step "MEMP SHORE - PRODUCTION EXCEL SETUP"
Write-Host "Automatic Taskpane Installation for PRODUCTION" -ForegroundColor Yellow
Write-Host "`nProduction Server: $PRODUCTION_URL`n" -ForegroundColor Gray

if (-not $Silent) {
    Write-Host "Press any key to start..." -ForegroundColor White
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# STEP 1: Prepare System
Write-Step "STEP 1: Preparing System"

Write-Info "Checking administrator rights..."
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Success "Running as Administrator"
} else {
    Write-Host "⚠️  Not running as Administrator (may need elevated rights)" -ForegroundColor Yellow
}

Write-Info "Closing Excel processes..."
Get-Process -Name "EXCEL" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Success "Excel closed"

Write-Info "Clearing Office caches..."
$cachePaths = @(
    "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef",
    "$env:LOCALAPPDATA\Microsoft\Office\Wef",
    "$env:LOCALAPPDATA\Microsoft\Office\16.0\WEF",
    "$env:LOCALAPPDATA\Microsoft\Office\16.0\WebView2",
    "$env:TEMP\OfficeFileCache"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Success "Caches cleared"

Write-Info "Clearing old registry entries..."
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Office\16.0\Wef\Developer" -Name "Manifests" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Office\16.0\Wef\Developer" -Name "DefaultManifestLocation" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer" -Name "DefaultManifestLocation" -ErrorAction SilentlyContinue
Write-Success "Registry cleaned"

# STEP 2: Download Manifest
Write-Step "STEP 2: Downloading Add-in from PRODUCTION"

Write-Info "Creating add-in folder..."
if (!(Test-Path $ADDIN_FOLDER)) {
    New-Item -ItemType Directory -Path $ADDIN_FOLDER -Force | Out-Null
}
Write-Success "Folder ready: $ADDIN_FOLDER"

Write-Info "Downloading manifest from PRODUCTION..."
Write-Host "   URL: $MANIFEST_URL" -ForegroundColor Gray

try {
    $webClient = New-Object System.Net.WebClient
    $webClient.Headers.Add("User-Agent", "MEMP-Setup")
    $webClient.Headers.Add("Cache-Control", "no-cache")
    
    $manifestContent = $webClient.DownloadString($MANIFEST_URL)
    
    if ($manifestContent.Length -lt 100) {
        throw "Downloaded content is too small (likely an error page)"
    }
    
    if (-not $manifestContent.Contains("<OfficeApp")) {
        throw "Downloaded content is not a valid Office manifest"
    }
    
    [System.IO.File]::WriteAllText($MANIFEST_FILE, $manifestContent, [System.Text.Encoding]::UTF8)
    
    $fileSize = (Get-Item $MANIFEST_FILE).Length
    Write-Success "Manifest downloaded ($fileSize bytes)"
    
    # Verify content
    $content = Get-Content $MANIFEST_FILE -Raw
    if ($content -match $PRODUCTION_URL) {
        Write-Success "Verified: Manifest contains production URLs"
    } else {
        Write-Host "⚠️  Warning: Manifest may not contain correct URLs" -ForegroundColor Yellow
    }
    
} catch {
    Write-Failure "Could not download manifest from PRODUCTION!"
    Write-Host "`nError Details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nPossible Causes:" -ForegroundColor Yellow
    Write-Host "  1. Not connected to internet" -ForegroundColor White
    Write-Host "  2. Production server is down" -ForegroundColor White
    Write-Host "  3. Firewall blocking access" -ForegroundColor White
    Write-Host "  4. URL has changed`n" -ForegroundColor White
    pause
    exit 1
}

# STEP 3: Install in Excel
Write-Step "STEP 3: Installing Add-in in Excel"

Write-Info "Creating registry entries..."

# Create Developer key if not exists
$devKey = "HKCU:\Software\Microsoft\Office\16.0\Wef\Developer"
if (!(Test-Path $devKey)) {
    New-Item -Path $devKey -Force | Out-Null
}

# Register manifest file
New-ItemProperty -Path $devKey -Name "Manifests" -Value $MANIFEST_FILE -PropertyType String -Force | Out-Null
Write-Success "Registry entry created: Manifests"

# Also set DefaultManifestLocation for compatibility
New-ItemProperty -Path $devKey -Name "DefaultManifestLocation" -Value $MANIFEST_FILE -PropertyType String -Force | Out-Null
Write-Success "Registry entry created: DefaultManifestLocation"

# Set up trusted catalog
Write-Info "Configuring trusted catalog..."
$catalogKey = "HKCU:\Software\Microsoft\Office\16.0\Wef\TrustedCatalogs\{MEMP-SHORE-PROD-0001}"
if (!(Test-Path $catalogKey)) {
    New-Item -Path $catalogKey -Force | Out-Null
}

$addinFolderUrl = "file:///" + $ADDIN_FOLDER.Replace("\", "/")
New-ItemProperty -Path $catalogKey -Name "Id" -Value "{MEMP-SHORE-PROD-0001}" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $catalogKey -Name "Url" -Value $addinFolderUrl -PropertyType String -Force | Out-Null
New-ItemProperty -Path $catalogKey -Name "Flags" -Value 1 -PropertyType DWord -Force | Out-Null
Write-Success "Trusted catalog configured"

# STEP 4: Verification
Write-Step "STEP 4: Verification"

Write-Info "Checking installation..."

if (Test-Path $MANIFEST_FILE) {
    Write-Success "Manifest file exists"
} else {
    Write-Failure "Manifest file missing!"
    exit 1
}

$regValue = Get-ItemProperty -Path $devKey -Name "Manifests" -ErrorAction SilentlyContinue
if ($regValue) {
    Write-Success "Registry entry confirmed"
} else {
    Write-Host "⚠️  Registry entry not confirmed" -ForegroundColor Yellow
}

# STEP 5: Test with Excel
Write-Step "STEP 5: Opening Excel"

Write-Info "Launching Excel..."
Start-Sleep -Seconds 1
Start-Process "excel.exe"

Write-Info "Waiting for Excel to load..."
Start-Sleep -Seconds 5

# Final Summary
Write-Step "INSTALLATION COMPLETE!"

Write-Host "✓ The MEMP Excel Add-in is now installed for PRODUCTION use!`n" -ForegroundColor Green

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "============================================`n" -ForegroundColor Gray

Write-Host "1. Download a template from PRODUCTION:" -ForegroundColor White
Write-Host "   $PRODUCTION_URL/api/excel/templates/vessel?shipId=1`n" -ForegroundColor Cyan

Write-Host "2. Open the downloaded template in Excel`n" -ForegroundColor White

Write-Host "3. The taskpane will appear AUTOMATICALLY on the right side" -ForegroundColor White
Write-Host "   (Title: 'MEMP_Shore Report Uploader')`n" -ForegroundColor Gray

Write-Host "4. Verify the API URL shows the PRODUCTION URL`n" -ForegroundColor White

Write-Host "5. Click 'Fetch Latest Data' to test`n" -ForegroundColor White

Write-Host "============================================`n" -ForegroundColor Gray

Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "  • The taskpane only appears when you open MEMP templates" -ForegroundColor White
Write-Host "  • It will NOT appear in blank Excel workbooks" -ForegroundColor White
Write-Host "  • This is one-time setup - templates will work forever!" -ForegroundColor White
Write-Host "  • All templates use PRODUCTION database automatically`n" -ForegroundColor White

Write-Host "============================================`n" -ForegroundColor Gray

if (-not $Silent) {
    Write-Host "Want to download a test template now? (Y/N): " -NoNewline -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host "`nOpening browser to download template...`n" -ForegroundColor Green
        Start-Process "$PRODUCTION_URL/api/excel/templates/vessel?shipId=1"
        Start-Sleep -Seconds 2
        Write-Host "Template downloading..." -ForegroundColor White
        Write-Host "Open it in Excel and the taskpane will appear!`n" -ForegroundColor Green
    }
}

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  Setup Complete - You're Ready to Go!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

Write-Host "TECHNICAL INFO (for troubleshooting):" -ForegroundColor Yellow
Write-Host "  Manifest file: $MANIFEST_FILE" -ForegroundColor Gray
Write-Host "  Production URL: $PRODUCTION_URL" -ForegroundColor Gray
Write-Host "  Registry: $devKey`n" -ForegroundColor Gray

if (-not $Silent) {
    Write-Host "Press any key to exit..." -ForegroundColor White
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
