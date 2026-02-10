# ============================================================
# MEMP SHORE EXCEL ADD-IN - COMPLETE SETUP GUIDE
# ============================================================
# This guide explains all setup files and how to use them
# ============================================================

Write-Host "`n" -NoNewline
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  MEMP SHORE EXCEL ADD-IN - COMPLETE GUIDE" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "📁 AVAILABLE SETUP FILES:" -ForegroundColor Yellow
Write-Host "----------------------------------------`n" -ForegroundColor Gray

Write-Host "1. Setup-Addin-LOCALHOST.ps1" -ForegroundColor Green
Write-Host "   → Use this for DEVELOPMENT/TESTING on your local PC" -ForegroundColor White
Write-Host "   → Registers: http://localhost:7011/office-addin/manifest.xml" -ForegroundColor Gray
Write-Host "   → When to use: Testing with localhost services running`n" -ForegroundColor Gray

Write-Host "2. Setup-Addin-PRODUCTION.ps1" -ForegroundColor Green
Write-Host "   → Use this for TESTING PRODUCTION environment" -ForegroundColor White
Write-Host "   → Registers: https://veemsonboardupgrade.theviswagroup.com/office-addin/manifest.xml" -ForegroundColor Gray
Write-Host "   → When to use: Testing with production server`n" -ForegroundColor Gray

Write-Host "3. TEST-BOTH-ENVIRONMENTS.ps1" -ForegroundColor Green
Write-Host "   → Guide for testing BOTH localhost AND production simultaneously" -ForegroundColor White
Write-Host "   → Shows how templates can work together" -ForegroundColor Gray
Write-Host "   → Educational/tutorial script`n" -ForegroundColor Gray

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  SCENARIO 1: TESTING LOCALHOST ONLY" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "USE CASE:" -ForegroundColor Yellow
Write-Host "You're developing on your PC with all services running locally`n" -ForegroundColor White

Write-Host "STEP 1: Run localhost setup" -ForegroundColor Yellow
Write-Host "   Right-click Setup-Addin-LOCALHOST.ps1 → Run with PowerShell (as Administrator)" -ForegroundColor White
Write-Host "   OR in PowerShell:" -ForegroundColor White
Write-Host "   .\Setup-Addin-LOCALHOST.ps1`n" -ForegroundColor Cyan

Write-Host "STEP 2: Download localhost template" -ForegroundColor Yellow
Write-Host "   Open browser: http://localhost:7011/template/vesselreport?shipId=1" -ForegroundColor Cyan
Write-Host "   Save as: Vessel_Report_LOCALHOST.xlsx`n" -ForegroundColor White

Write-Host "STEP 3: Open template in Excel" -ForegroundColor Yellow
Write-Host "   - Taskpane appears on right side automatically" -ForegroundColor White
Write-Host "   - Go to 'Report Status' sheet → Check cell C4 = http://localhost:7011" -ForegroundColor White
Write-Host "   - Taskpane shows same URL`n" -ForegroundColor White

Write-Host "STEP 4: Test functionality" -ForegroundColor Yellow
Write-Host "   - Click 'Fetch Latest Data' → Pulls from localhost database" -ForegroundColor White
Write-Host "   - Modify data in template" -ForegroundColor White
Write-Host "   - Click 'Send Report' → Uploads to localhost database`n" -ForegroundColor White

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  SCENARIO 2: TESTING PRODUCTION ONLY" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "USE CASE:" -ForegroundColor Yellow
Write-Host "You want to test the production environment`n" -ForegroundColor White

Write-Host "STEP 1: Run production setup" -ForegroundColor Yellow
Write-Host "   Right-click Setup-Addin-PRODUCTION.ps1 → Run with PowerShell (as Administrator)" -ForegroundColor White
Write-Host "   OR in PowerShell:" -ForegroundColor White
Write-Host "   .\Setup-Addin-PRODUCTION.ps1`n" -ForegroundColor Cyan

Write-Host "STEP 2: Download production template" -ForegroundColor Yellow
Write-Host "   Open browser: https://veemsonboardupgrade.theviswagroup.com/api/excel/templates/vessel?shipId=1" -ForegroundColor Cyan
Write-Host "   Save as: Vessel_Report_PRODUCTION.xlsx`n" -ForegroundColor White

Write-Host "STEP 3: Open template in Excel" -ForegroundColor Yellow
Write-Host "   - Taskpane appears on right side automatically" -ForegroundColor White
Write-Host "   - Go to 'Report Status' sheet → Check cell C4 = production URL" -ForegroundColor White
Write-Host "   - Taskpane shows same URL`n" -ForegroundColor White

Write-Host "STEP 4: Test functionality" -ForegroundColor Yellow
Write-Host "   - Click 'Fetch Latest Data' → Pulls from PRODUCTION database" -ForegroundColor White
Write-Host "   - Modify data in template" -ForegroundColor White
Write-Host "   - Click 'Send Report' → Uploads to PRODUCTION database`n" -ForegroundColor White

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  SCENARIO 3: TESTING BOTH SIMULTANEOUSLY" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "USE CASE:" -ForegroundColor Yellow
Write-Host "You want to test BOTH localhost and production at the same time`n" -ForegroundColor White

Write-Host "STEP 1: Register ONE add-in (either localhost or production)" -ForegroundColor Yellow
Write-Host "   Recommended: .\Setup-Addin-LOCALHOST.ps1" -ForegroundColor Cyan
Write-Host "   (It doesn't matter which one, both templates will work!)`n" -ForegroundColor White

Write-Host "STEP 2: Download BOTH templates" -ForegroundColor Yellow
Write-Host "   LOCALHOST:" -ForegroundColor White
Write-Host "   http://localhost:7011/template/vesselreport?shipId=1" -ForegroundColor Cyan
Write-Host "   Save as: Vessel_Report_LOCALHOST.xlsx`n" -ForegroundColor White

Write-Host "   PRODUCTION:" -ForegroundColor White
Write-Host "   https://veemsonboardupgrade.theviswagroup.com/api/excel/templates/vessel?shipId=1" -ForegroundColor Cyan
Write-Host "   Save as: Vessel_Report_PRODUCTION.xlsx`n" -ForegroundColor White

Write-Host "STEP 3: Open BOTH templates in Excel" -ForegroundColor Yellow
Write-Host "   - Open Vessel_Report_LOCALHOST.xlsx" -ForegroundColor White
Write-Host "     → Check Report Status C4 = localhost:7011" -ForegroundColor Gray
Write-Host "     → Taskpane shows localhost URL" -ForegroundColor Gray
Write-Host "`n   - Open Vessel_Report_PRODUCTION.xlsx (in same Excel window)" -ForegroundColor White
Write-Host "     → Check Report Status C4 = production URL" -ForegroundColor Gray
Write-Host "     → Taskpane shows production URL" -ForegroundColor Gray
Write-Host "`n   - Switch between tabs → Each maintains its own URL!`n" -ForegroundColor White

Write-Host "STEP 4: Test each independently" -ForegroundColor Yellow
Write-Host "   Switch to LOCALHOST tab:" -ForegroundColor White
Write-Host "   - Fetch Data → localhost database" -ForegroundColor Gray
Write-Host "   - Upload → localhost database`n" -ForegroundColor Gray

Write-Host "   Switch to PRODUCTION tab:" -ForegroundColor White
Write-Host "   - Fetch Data → production database" -ForegroundColor Gray
Write-Host "   - Upload → production database`n" -ForegroundColor Gray

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  HOW IT WORKS (THE MAGIC EXPLAINED)" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Green

Write-Host "Our implementation uses a 3-LEVEL PRIORITY SYSTEM:" -ForegroundColor Cyan
Write-Host "`n1. TEMPLATE URL (Cell C4 in 'Report Status' sheet)" -ForegroundColor Yellow
Write-Host "   → HIGHEST PRIORITY" -ForegroundColor White
Write-Host "   → This is embedded when template is downloaded" -ForegroundColor Gray
Write-Host "   → NEVER changes or gets overwritten" -ForegroundColor Gray
Write-Host "   → localhost template stays localhost FOREVER" -ForegroundColor Gray
Write-Host "   → production template stays production FOREVER`n" -ForegroundColor Gray

Write-Host "2. MANUAL INPUT (User types URL in taskpane)" -ForegroundColor Yellow
Write-Host "   → Medium priority" -ForegroundColor White
Write-Host "   → Only used if template has no URL in C4" -ForegroundColor Gray
Write-Host "   → Rare scenario`n" -ForegroundColor Gray

Write-Host "3. REGISTRY MANIFEST (Windows Registry)" -ForegroundColor Yellow
Write-Host "   → Lowest priority" -ForegroundColor White
Write-Host "   → Only used if template has no URL AND no manual input" -ForegroundColor Gray
Write-Host "   → This is what the setup scripts configure" -ForegroundColor Gray
Write-Host "   → One-time installation requirement`n" -ForegroundColor Gray

Write-Host "KEY INSIGHT:" -ForegroundColor Cyan
Write-Host "The registry is ONLY for installing the add-in initially." -ForegroundColor White
Write-Host "Once installed, each template uses its OWN URL from cell C4." -ForegroundColor White
Write-Host "That's why localhost and production templates can coexist!" -ForegroundColor Green
Write-Host "`n" -NoNewline

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  TROUBLESHOOTING" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "❌ Problem: Taskpane doesn't appear" -ForegroundColor Red
Write-Host "Solutions:" -ForegroundColor Yellow
Write-Host "   1. Run the setup script again (as Administrator)" -ForegroundColor White
Write-Host "   2. Make sure Excel Integration Service is running:" -ForegroundColor White
Write-Host "      Test: Test-NetConnection localhost -Port 7011" -ForegroundColor Cyan
Write-Host "   3. Close ALL Excel windows and reopen template" -ForegroundColor White
Write-Host "   4. Clear cache: Delete %LOCALAPPDATA%\Microsoft\Office\16.0\Wef`n" -ForegroundColor White

Write-Host "❌ Problem: Taskpane shows wrong URL" -ForegroundColor Red
Write-Host "Solutions:" -ForegroundColor Yellow
Write-Host "   1. Check 'Report Status' sheet cell C4 - this is the source of truth" -ForegroundColor White
Write-Host "   2. Taskpane should match C4 automatically" -ForegroundColor White
Write-Host "   3. If different, re-download template from correct source`n" -ForegroundColor White

Write-Host "❌ Problem: Can't download localhost template" -ForegroundColor Red
Write-Host "Solutions:" -ForegroundColor Yellow
Write-Host "   1. Check Excel service is running: Test-NetConnection localhost -Port 7011" -ForegroundColor White
Write-Host "   2. Start service: cd Shore-Server\excel-integration-service; npm start" -ForegroundColor White
Write-Host "   3. Check all backend services: Shore-Server\npm run dev`n" -ForegroundColor White

Write-Host "❌ Problem: Can't download production template" -ForegroundColor Red
Write-Host "Solutions:" -ForegroundColor Yellow
Write-Host "   1. Make sure files are deployed to production server" -ForegroundColor White
Write-Host "   2. Check production URL is accessible" -ForegroundColor White
Write-Host "   3. Contact server administrator`n" -ForegroundColor White

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  SUMMARY" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Green

Write-Host "✓ 3 setup scripts available:" -ForegroundColor Green
Write-Host "  - Setup-Addin-LOCALHOST.ps1 (for development)" -ForegroundColor White
Write-Host "  - Setup-Addin-PRODUCTION.ps1 (for production testing)" -ForegroundColor White
Write-Host "  - TEST-BOTH-ENVIRONMENTS.ps1 (tutorial guide)`n" -ForegroundColor White

Write-Host "✓ Each script:" -ForegroundColor Green
Write-Host "  - Closes Excel" -ForegroundColor White
Write-Host "  - Clears cache" -ForegroundColor White
Write-Host "  - Registers add-in in Windows Registry" -ForegroundColor White
Write-Host "  - Checks service availability`n" -ForegroundColor White

Write-Host "✓ Templates remember their own URL from cell C4" -ForegroundColor Green
Write-Host "✓ Localhost and production templates work independently" -ForegroundColor Green
Write-Host "✓ Can test both environments on same PC simultaneously" -ForegroundColor Green
Write-Host "✓ No manual URL switching needed - fully automatic!`n" -ForegroundColor Green

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  QUICK START" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "For most users (development/localhost):" -ForegroundColor Yellow
Write-Host "1. .\Setup-Addin-LOCALHOST.ps1" -ForegroundColor Cyan
Write-Host "2. Download: http://localhost:7011/template/vesselreport?shipId=1" -ForegroundColor Cyan
Write-Host "3. Open template in Excel" -ForegroundColor Cyan
Write-Host "4. Taskpane appears - start working!`n" -ForegroundColor Cyan

Write-Host "For production testing:" -ForegroundColor Yellow
Write-Host "1. .\Setup-Addin-PRODUCTION.ps1" -ForegroundColor Cyan
Write-Host "2. Download from production URL" -ForegroundColor Cyan
Write-Host "3. Open template in Excel" -ForegroundColor Cyan
Write-Host "4. Test with production data`n" -ForegroundColor Cyan

Write-Host "`n============================================================`n" -ForegroundColor Cyan

Write-Host "Need more help? Check:" -ForegroundColor Yellow
Write-Host "- INSTALL_ADDIN_INSTRUCTIONS.md (detailed documentation)" -ForegroundColor White
Write-Host "- TEST-BOTH-ENVIRONMENTS.ps1 (testing guide)" -ForegroundColor White
Write-Host "`n" -NoNewline

pause
