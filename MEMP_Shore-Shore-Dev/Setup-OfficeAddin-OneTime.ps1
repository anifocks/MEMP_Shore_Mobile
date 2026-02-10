# ============================================
# MEMP Shore Office Add-in - ONE-TIME SETUP
# ============================================
# Run this script ONCE to permanently install the taskpane
# Must run as Administrator

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  MEMP Shore Office Add-in Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must run as Administrator" -ForegroundColor Red
    Write-Host "`nRight-click PowerShell → Run as Administrator, then run this script again.`n" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✓ Running as Administrator`n" -ForegroundColor Green

# Step 2: Check if Excel Integration Service is running
Write-Host "Checking Excel Integration Service..." -ForegroundColor Yellow
$port7011Running = Test-NetConnection localhost -Port 7011 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $port7011Running) {
    Write-Host "❌ Excel Integration Service is NOT running on port 7011`n" -ForegroundColor Red
    Write-Host "Starting the service now..." -ForegroundColor Yellow
    
    # Try to start the service
    $servicePath = "D:\MEMP\MEMP_Production\MEMP_Shore\Shore-Server\excel-integration-service"
    if (Test-Path $servicePath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$servicePath'; npm start" -WindowStyle Minimized
        Write-Host "Waiting for service to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        # Check again
        $port7011Running = Test-NetConnection localhost -Port 7011 -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($port7011Running) {
            Write-Host "✓ Service started successfully`n" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Service may take longer to start. Continuing anyway...`n" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Service path not found: $servicePath`n" -ForegroundColor Red
        Write-Host "Please start the Excel Integration Service manually first.`n" -ForegroundColor Yellow
        pause
        exit 1
    }
} else {
    Write-Host "✓ Excel Integration Service is running`n" -ForegroundColor Green
}

# Step 3: Close all Excel processes
Write-Host "Closing all Excel processes..." -ForegroundColor Yellow
$excelProcesses = Get-Process -Name "EXCEL" -ErrorAction SilentlyContinue
if ($excelProcesses) {
    $excelProcesses | ForEach-Object {
        Write-Host "  Closing Excel (PID: $($_.Id))" -ForegroundColor Gray
        $_.CloseMainWindow() | Out-Null
        Start-Sleep -Milliseconds 500
    }
    Start-Sleep -Seconds 2
    
    # Force kill if still running
    $excelProcesses = Get-Process -Name "EXCEL" -ErrorAction SilentlyContinue
    if ($excelProcesses) {
        Write-Host "  Force stopping Excel..." -ForegroundColor Gray
        Stop-Process -Name "EXCEL" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    Write-Host "✓ All Excel processes closed`n" -ForegroundColor Green
} else {
    Write-Host "✓ No Excel processes running`n" -ForegroundColor Green
}

# Step 4: Clear Excel cache
Write-Host "Clearing Excel Office Add-in cache..." -ForegroundColor Yellow
$cachePath = "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef"
if (Test-Path $cachePath) {
    try {
        Remove-Item -Path $cachePath -Recurse -Force -ErrorAction Stop
        Write-Host "✓ Cache cleared`n" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not clear cache (Excel may be running)`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ No cache to clear`n" -ForegroundColor Green
}

# Step 5: Register add-in via Registry
Write-Host "Registering Office Add-in in Windows Registry..." -ForegroundColor Yellow
$manifestUrl = "http://localhost:7011/office-addin/manifest.xml"
$regPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"

try {
    # Create registry key if not exists
    if (!(Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    
    # Remove old entry if exists
    Remove-ItemProperty -Path $regPath -Name "DefaultManifestLocation" -ErrorAction SilentlyContinue
    
    # Add new entry
    New-ItemProperty -Path $regPath -Name "DefaultManifestLocation" -Value $manifestUrl -PropertyType String -Force | Out-Null
    
    Write-Host "✓ Add-in registered in registry`n" -ForegroundColor Green
    Write-Host "  Registry Path: $regPath" -ForegroundColor Gray
    Write-Host "  Manifest URL: $manifestUrl`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to register add-in: $_`n" -ForegroundColor Red
    pause
    exit 1
}

# Step 6: Verify manifest is accessible
Write-Host "Verifying manifest URL is accessible..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $manifestUrl -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Manifest is accessible`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Manifest returned status: $($response.StatusCode)`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Cannot access manifest URL" -ForegroundColor Red
    Write-Host "  Error: $_`n" -ForegroundColor Gray
    Write-Host "Make sure Excel Integration Service is running on port 7011`n" -ForegroundColor Yellow
}

# Step 7: Final instructions
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✓ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Open Microsoft Excel" -ForegroundColor White
Write-Host "2. The taskpane should appear automatically on the right side" -ForegroundColor White
Write-Host "3. If not, download a template from: http://localhost:7011/template/vesselreport?shipId=1" -ForegroundColor White
Write-Host "4. Open the downloaded template - taskpane will appear`n" -ForegroundColor White

Write-Host "TEMPLATE DOWNLOAD URL:" -ForegroundColor Cyan
Write-Host "http://localhost:7011/template/vesselreport?shipId=1`n" -ForegroundColor Yellow

Write-Host "If taskpane still doesn't appear:" -ForegroundColor Yellow
Write-Host "- Go to Insert tab → Get Add-ins → MY ADD-INS" -ForegroundColor Gray
Write-Host "- Look for 'MEMP Shore Report Uploader'" -ForegroundColor Gray
Write-Host "- Or check Developer tab → Add-ins`n" -ForegroundColor Gray

Write-Host "Press any key to exit..." -ForegroundColor Cyan
pause
