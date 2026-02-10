# Production Server Deployment Script
# Run this script ON THE PRODUCTION SERVER after copying files

param(
    [string]$Action = "check"
)

$ErrorActionPreference = "Stop"

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " MEMP Shore - Production Deployment Script" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configuration
$servicePath = "D:\MEMP\MEMP_Production\MEMP_Shore\Shore-Server\excel-integration-service"
$servicePort = 7011
$gatewayPort = 7000

function Test-ServicePort {
    param([int]$Port, [string]$ServiceName)
    
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($connection) {
        Write-Host "  ✅ $ServiceName is running on port $Port" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ❌ $ServiceName is NOT running on port $Port" -ForegroundColor Red
        return $false
    }
}

function Start-ExcelService {
    Write-Host "`n📦 Starting Excel Integration Service..." -ForegroundColor Cyan
    Write-Host "   Path: $servicePath" -ForegroundColor Gray
    
    if (!(Test-Path $servicePath)) {
        Write-Host "   ❌ Service path not found: $servicePath" -ForegroundColor Red
        return $false
    }
    
    # Check if already running
    $existing = Test-NetConnection -ComputerName localhost -Port $servicePort -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($existing) {
        Write-Host "   ⚠️  Service already running on port $servicePort" -ForegroundColor Yellow
        $restart = Read-Host "   Restart service? (Y/N)"
        if ($restart -eq 'Y' -or $restart -eq 'y') {
            Write-Host "   Stopping existing service..." -ForegroundColor Yellow
            $conn = Get-NetTCPConnection -LocalPort $servicePort -ErrorAction SilentlyContinue
            if ($conn) {
                Stop-Process -Id $conn.OwningProcess -Force
                Start-Sleep -Seconds 2
            }
        } else {
            return $true
        }
    }
    
    # Start the service
    Set-Location $servicePath
    $process = Start-Process -FilePath "node" -ArgumentList "excelIntegrationServer.js" -WindowStyle Minimized -PassThru
    
    Start-Sleep -Seconds 3
    
    # Verify
    $running = Test-NetConnection -ComputerName localhost -Port $servicePort -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($running) {
        Write-Host "   ✅ Service started successfully (PID: $($process.Id))" -ForegroundColor Green
        return $true
    } else {
        Write-Host "   ❌ Failed to start service" -ForegroundColor Red
        return $false
    }
}

function Test-Endpoints {
    Write-Host "`n🧪 Testing Endpoints..." -ForegroundColor Cyan
    
    # Test Excel Service directly
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$servicePort/office-addin/manifest.xml" -UseBasicParsing -TimeoutSec 5
        Write-Host "  ✅ Direct Excel Service (port $servicePort): HTTP $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Direct Excel Service failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test through Gateway
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$gatewayPort/office-addin/manifest.xml" -UseBasicParsing -TimeoutSec 5
        Write-Host "  ✅ API Gateway Proxy (port $gatewayPort): HTTP $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ API Gateway Proxy failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test public URL (if on production)
    Write-Host "`n  Testing public URL..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "https://veemsonboardupgrade.theviswagroup.com/office-addin/manifest.xml" -UseBasicParsing -TimeoutSec 5
        Write-Host "  ✅ Public URL: HTTP $($response.StatusCode) - SUCCESS!" -ForegroundColor Green
        Write-Host "     🎉 Office Add-in should work now!" -ForegroundColor Cyan
    } catch {
        Write-Host "  ❌ Public URL failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "     This might be normal if not on production server" -ForegroundColor Gray
    }
}

# Main execution
switch ($Action.ToLower()) {
    "check" {
        Write-Host "📊 Checking Production Server Status...`n" -ForegroundColor Cyan
        
        Test-ServicePort -Port $servicePort -ServiceName "Excel Integration Service"
        Test-ServicePort -Port $gatewayPort -ServiceName "API Gateway"
        
        Write-Host "`n💡 Actions available:" -ForegroundColor Yellow
        Write-Host "   .\DEPLOY_TO_PRODUCTION.ps1 -Action start     # Start services" -ForegroundColor Gray
        Write-Host "   .\DEPLOY_TO_PRODUCTION.ps1 -Action test      # Test endpoints" -ForegroundColor Gray
        Write-Host "   .\DEPLOY_TO_PRODUCTION.ps1 -Action deploy    # Full deployment" -ForegroundColor Gray
    }
    
    "start" {
        $started = Start-ExcelService
        if ($started) {
            Test-Endpoints
        }
    }
    
    "test" {
        Test-Endpoints
    }
    
    "deploy" {
        Write-Host "🚀 Running Full Deployment...`n" -ForegroundColor Cyan
        
        # Step 1: Start Excel Service
        $started = Start-ExcelService
        
        if (!$started) {
            Write-Host "`n❌ Deployment failed - Excel Service did not start" -ForegroundColor Red
            exit 1
        }
        
        # Step 2: Check Gateway
        Write-Host "`n📊 Checking API Gateway..." -ForegroundColor Cyan
        $gatewayRunning = Test-ServicePort -Port $gatewayPort -ServiceName "API Gateway"
        
        if (!$gatewayRunning) {
            Write-Host "   ⚠️  API Gateway is not running. Make sure it's started via IIS or Node" -ForegroundColor Yellow
        }
        
        # Step 3: Test endpoints
        Test-Endpoints
        
        # Step 4: Restart IIS
        Write-Host "`n🔄 Restarting IIS..." -ForegroundColor Cyan
        try {
            iisreset
            Write-Host "   ✅ IIS restarted" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Could not restart IIS: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "   You may need to run this as Administrator" -ForegroundColor Gray
        }
        
        Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
        Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
        Write-Host "   1. Test from client PC: https://veemsonboardupgrade.theviswagroup.com/office-addin/manifest.xml" -ForegroundColor Gray
        Write-Host "   2. Open Excel template - Office Add-in should load" -ForegroundColor Gray
        Write-Host ""
    }
    
    default {
        Write-Host "❌ Unknown action: $Action" -ForegroundColor Red
        Write-Host "   Valid actions: check, start, test, deploy" -ForegroundColor Yellow
    }
}

Write-Host "`n═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
