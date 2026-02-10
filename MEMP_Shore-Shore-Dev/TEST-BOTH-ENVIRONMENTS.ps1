# ============================================
# TESTING BOTH LOCALHOST & PRODUCTION
# ============================================
# This guide shows how to test both environments simultaneously

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TESTING BOTH ENVIRONMENTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "The Windows Registry can only store ONE manifest URL at a time." -ForegroundColor Gray
Write-Host "HOWEVER - Once registered, BOTH localhost and production templates" -ForegroundColor Gray
Write-Host "can work simultaneously because each template stores its own URL!`n" -ForegroundColor Gray

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  STEP-BY-STEP GUIDE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "STEP 1: Register ONE add-in (either localhost or production)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Option A: Run Setup-Addin-LOCALHOST.ps1 (recommended for development)" -ForegroundColor White
Write-Host "Option B: Run Setup-Addin-PRODUCTION.ps1 (if localhost service not running)`n" -ForegroundColor White

Write-Host "STEP 2: Download templates from BOTH environments" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "LOCALHOST template:" -ForegroundColor White
Write-Host "  http://localhost:7011/template/vesselreport?shipId=1" -ForegroundColor Cyan
Write-Host "`nPRODUCTION template:" -ForegroundColor White
Write-Host "  https://veemsonboardupgrade.theviswagroup.com/api/excel/templates/vessel?shipId=1" -ForegroundColor Cyan
Write-Host "`nSave them with different names:" -ForegroundColor White
Write-Host "  - Vessel_Report_LOCALHOST.xlsx" -ForegroundColor Gray
Write-Host "  - Vessel_Report_PRODUCTION.xlsx`n" -ForegroundColor Gray

Write-Host "STEP 3: Open BOTH templates in Excel" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "1. Open Vessel_Report_LOCALHOST.xlsx" -ForegroundColor White
Write-Host "2. Taskpane appears on right side" -ForegroundColor White
Write-Host "3. Check Report Status sheet cell C4 = localhost:7011" -ForegroundColor White
Write-Host "4. Open Vessel_Report_PRODUCTION.xlsx (in same Excel window)" -ForegroundColor White
Write-Host "5. Check Report Status sheet cell C4 = production URL" -ForegroundColor White
Write-Host "6. Switch between templates - each maintains its own URL!`n" -ForegroundColor White

Write-Host "STEP 4: Test each template independently" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "LOCALHOST template:" -ForegroundColor White
Write-Host "  - Click 'Fetch Data' → pulls from localhost database" -ForegroundColor Gray
Write-Host "  - Modify data" -ForegroundColor Gray
Write-Host "  - Click 'Upload' → sends to localhost database`n" -ForegroundColor Gray

Write-Host "PRODUCTION template:" -ForegroundColor White
Write-Host "  - Click 'Fetch Data' → pulls from production database" -ForegroundColor Gray
Write-Host "  - Modify data" -ForegroundColor Gray
Write-Host "  - Click 'Upload' → sends to production database`n" -ForegroundColor Gray

Write-Host "========================================" -ForegroundColor Green
Write-Host "  WHY THIS WORKS" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Our implementation has 3-level priority system:" -ForegroundColor Cyan
Write-Host "1. Template URL (cell C4) = HIGHEST priority" -ForegroundColor White
Write-Host "2. User manual input = Medium priority" -ForegroundColor White
Write-Host "3. Registry manifest = Lowest priority`n" -ForegroundColor White

Write-Host "When you open a template:" -ForegroundColor Yellow
Write-Host "- Taskpane reads URL from cell C4 FIRST" -ForegroundColor Gray
Write-Host "- This URL is PRESERVED and never overwritten" -ForegroundColor Gray
Write-Host "- Even if you have production manifest registered," -ForegroundColor Gray
Write-Host "  the localhost template will STILL use localhost URL!`n" -ForegroundColor Gray

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  QUICK TEST COMMANDS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Open URLs in browser
Write-Host "Want to download templates now? (Y/N): " -ForegroundColor Yellow -NoNewline
$response = Read-Host

if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Host "`nOpening download URLs in browser...`n" -ForegroundColor Green
    
    # Localhost
    Start-Process "http://localhost:7011/template/vesselreport?shipId=1"
    Start-Sleep -Seconds 2
    
    # Production
    Start-Process "https://veemsonboardupgrade.theviswagroup.com/api/excel/templates/vessel?shipId=1"
    
    Write-Host "✓ Templates downloading..." -ForegroundColor Green
    Write-Host "  Save them with different names for easy identification`n" -ForegroundColor Gray
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "  SUMMARY" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "✓ YES - You can test BOTH environments simultaneously" -ForegroundColor Green
Write-Host "✓ Register ONE manifest (either localhost or production)" -ForegroundColor Green
Write-Host "✓ Download templates from BOTH sources" -ForegroundColor Green
Write-Host "✓ Open both in Excel - they work independently" -ForegroundColor Green
Write-Host "✓ Each template maintains its own URL from cell C4`n" -ForegroundColor Green

pause
