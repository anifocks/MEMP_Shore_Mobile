# ============================================
# MEMP Shore Office Add-in - PRODUCTION SETUP
# ============================================
# Use this for testing PRODUCTION environment
# Run as Administrator

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PRODUCTION Office Add-in Setup" -ForegroundColor Cyan
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

# Register PRODUCTION add-in
Write-Host "Registering PRODUCTION add-in..." -ForegroundColor Yellow
$manifestUrl = "https://veemsonboardupgrade.theviswagroup.com/office-addin/manifest.xml"
$regPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"

if (!(Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

Remove-ItemProperty -Path $regPath -Name "DefaultManifestLocation" -ErrorAction SilentlyContinue
New-ItemProperty -Path $regPath -Name "DefaultManifestLocation" -Value $manifestUrl -PropertyType String -Force | Out-Null

Write-Host "✓ PRODUCTION add-in registered`n" -ForegroundColor Green
Write-Host "  Manifest: $manifestUrl`n" -ForegroundColor Gray

# Check production URL
Write-Host "Checking production URL..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $manifestUrl -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Production manifest accessible`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Unexpected status: $($response.StatusCode)`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Cannot access production manifest" -ForegroundColor Red
    Write-Host "  Make sure files are deployed to production server`n" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ PRODUCTION SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Open Excel" -ForegroundColor White
Write-Host "2. Download template from production:" -ForegroundColor White
Write-Host "   https://veemsonboardupgrade.theviswagroup.com/api/excel/templates/vessel?shipId=1" -ForegroundColor Yellow
Write-Host "3. Open template - taskpane appears`n" -ForegroundColor White

pause
