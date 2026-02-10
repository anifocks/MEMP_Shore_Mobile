# Start Excel Integration Service
# This script starts the excel-integration-service and keeps it running in the background

$servicePath = "D:\MEMP\MEMP_Production\MEMP_Shore\Shore-Server\excel-integration-service"
$servicePort = 7011

Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host " MEMP Shore - Excel Integration Service Startup " -ForegroundColor White -NoNewline
Write-Host "=" -ForegroundColor Cyan

# Check if service is already running
Write-Host "`nChecking if service is already running on port $servicePort..." -ForegroundColor Yellow
$process = Get-NetTCPConnection -LocalPort $servicePort -ErrorAction SilentlyContinue

if ($process) {
    Write-Host "✓ Service is already running on port $servicePort" -ForegroundColor Green
    $ownerPID = $process.OwningProcess
    $ownerProcess = Get-Process -Id $ownerPID -ErrorAction SilentlyContinue
    Write-Host "  Process: $($ownerProcess.Name) (PID: $ownerPID)" -ForegroundColor Cyan
    
    $response = Read-Host "`nDo you want to restart the service? (Y/N)"
    if ($response -ne 'Y' -and $response -ne 'y') {
        Write-Host "`n✓ Keeping existing service running" -ForegroundColor Green
        exit 0
    }
    
    Write-Host "`nStopping existing service..." -ForegroundColor Yellow
    Stop-Process -Id $ownerPID -Force
    Start-Sleep -Seconds 2
}

# Navigate to service directory
Set-Location $servicePath

# Start the service
Write-Host "`nStarting Excel Integration Service..." -ForegroundColor Cyan
Write-Host "Path: $servicePath" -ForegroundColor Gray
Write-Host "Port: $servicePort" -ForegroundColor Gray

$process = Start-Process -FilePath "node" -ArgumentList "excelIntegrationServer.js" -WindowStyle Minimized -PassThru

Start-Sleep -Seconds 3

# Verify service started
$connection = Test-NetConnection -ComputerName localhost -Port $servicePort -InformationLevel Quiet

if ($connection) {
    Write-Host "`n✓ Excel Integration Service started successfully!" -ForegroundColor Green
    Write-Host "  Process ID: $($process.Id)" -ForegroundColor Cyan
    Write-Host "  Port: $servicePort" -ForegroundColor Cyan
    Write-Host "`n✓ Service URLs:" -ForegroundColor Green
    Write-Host "  Internal: http://localhost:$servicePort" -ForegroundColor Cyan
    Write-Host "  Manifest: http://localhost:$servicePort/office-addin/manifest.xml" -ForegroundColor Cyan
    Write-Host "`nNote: This service needs to keep running. Don't close this if running in foreground." -ForegroundColor Yellow
} else {
    Write-Host "`n✗ Failed to start service" -ForegroundColor Red
    Write-Host "Check the service logs for errors" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n" -NoNewline
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host " Press Ctrl+C to stop the service " -ForegroundColor White -NoNewline
Write-Host "=" -ForegroundColor Cyan
Write-Host ""
