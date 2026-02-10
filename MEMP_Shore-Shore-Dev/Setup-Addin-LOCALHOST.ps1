# ============================================
# MEMP Shore Office Add-in - LOCALHOST SETUP
# ============================================
# Use this on your DEVELOPMENT PC for testing with localhost
# Run as Administrator

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  LOCALHOST Office Add-in Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell → Run as Administrator`n" -ForegroundColor Yellow
    pause
    exit 1
}

# Close Excel
Write-Host "Closing Excel..." -ForegroundColor Yellow
Get-Process -Name "EXCEL" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "✓ Excel closed`n" -ForegroundColor Green

# Clear cache
Write-Host "Clearing cache..." -ForegroundColor Yellow
$cachePath = "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef"
if (Test-Path $cachePath) {
    Remove-Item -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "✓ Cache cleared`n" -ForegroundColor Green

# Register localhost add-in
Write-Host "Registering LOCALHOST add-in..." -ForegroundColor Yellow
$manifestUrl = "http://localhost:7011/office-addin/manifest.xml"
$regPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"

if (!(Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

Remove-ItemProperty -Path $regPath -Name "DefaultManifestLocation" -ErrorAction SilentlyContinue
New-ItemProperty -Path $regPath -Name "DefaultManifestLocation" -Value $manifestUrl -PropertyType String -Force | Out-Null

Write-Host "✓ LOCALHOST add-in registered`n" -ForegroundColor Green
Write-Host "  Manifest: $manifestUrl`n" -ForegroundColor Gray

# Check service
Write-Host "Checking Excel service..." -ForegroundColor Yellow
$serviceRunning = Test-NetConnection localhost -Port 7011 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($serviceRunning) {
    Write-Host "✓ Service running on port 7011`n" -ForegroundColor Green
} else {
    Write-Host "❌ Service NOT running on port 7011" -ForegroundColor Red
    Write-Host "Start it manually: cd Shore-Server\excel-integration-service; npm start`n" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ LOCALHOST SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Open Excel" -ForegroundColor White
Write-Host "2. Download template: http://localhost:7011/template/vesselreport?shipId=1" -ForegroundColor Yellow
Write-Host "3. Open template - taskpane appears`n" -ForegroundColor White

pause
