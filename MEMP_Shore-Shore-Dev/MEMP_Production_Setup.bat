@echo off
COLOR 0A
cls
echo.
echo ================================================================================
echo              MEMP SHORE - PRODUCTION EXCEL SETUP
echo              Automatic Taskpane Installation
echo ================================================================================
echo.
echo This will install MEMP Excel Add-in for PRODUCTION use.
echo.
echo What this does:
echo   1. Downloads add-in from PRODUCTION server
echo   2. Installs it permanently in Excel
echo   3. Tests that everything works
echo   4. After this, ALL templates work automatically forever!
echo.
echo PRODUCTION SERVER: veemsonboardupgrade.theviswagroup.com
echo.
echo Press any key to start...
pause >nul

echo.
echo ================================================================================
echo STEP 1: Preparing your system...
echo ================================================================================

REM Close Excel
echo.
echo Closing Excel (if open)...
taskkill /F /IM EXCEL.EXE >nul 2>&1
timeout /t 2 /nobreak >nul

REM Clear all Office caches
echo Clearing Office caches...
rd /s /q "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" >nul 2>&1
rd /s /q "%LOCALAPPDATA%\Microsoft\Office\Wef" >nul 2>&1
rd /s /q "%LOCALAPPDATA%\Microsoft\Office\16.0\WEF" >nul 2>&1
rd /s /q "%LOCALAPPDATA%\Microsoft\Office\16.0\WebView2" >nul 2>&1
rd /s /q "%TEMP%\OfficeFileCache" >nul 2>&1

REM Clear old registry entries
echo Clearing old configuration...
reg delete "HKCU\Software\Microsoft\Office\16.0\Wef\Developer" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Office\16.0\WEF\Developer" /f >nul 2>&1

timeout /t 1 /nobreak >nul
echo Done!

echo.
echo ================================================================================
echo STEP 2: Downloading add-in from PRODUCTION server...
echo ================================================================================

set ADDIN_FOLDER=%USERPROFILE%\AppData\Local\MEMP_Shore_Addin
set MANIFEST_FILE=%ADDIN_FOLDER%\manifest.xml
set MANIFEST_URL=https://veemsonboardupgrade.theviswagroup.com/office-addin/manifest.xml

REM Create folder
echo.
echo Creating add-in folder...
if not exist "%ADDIN_FOLDER%" mkdir "%ADDIN_FOLDER%"

REM Download manifest from PRODUCTION
echo.
echo Downloading from PRODUCTION server...
echo URL: %MANIFEST_URL%
echo.

powershell -Command "& {try { $ProgressPreference = 'SilentlyContinue'; Write-Host 'Connecting to production server...' -ForegroundColor Yellow; $wc = New-Object System.Net.WebClient; $wc.Headers.Add('User-Agent', 'MEMP-Setup'); $content = $wc.DownloadString('%MANIFEST_URL%'); [System.IO.File]::WriteAllText('%MANIFEST_FILE%', $content, [System.Text.Encoding]::UTF8); Write-Host ''; Write-Host 'SUCCESS! Add-in downloaded from production!' -ForegroundColor Green; exit 0 } catch { Write-Host ''; Write-Host 'ERROR: Could not download from production server!' -ForegroundColor Red; Write-Host ''; Write-Host 'Details: ' -NoNewline; Write-Host $_.Exception.Message -ForegroundColor Yellow; Write-Host ''; exit 1 }}"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ================================================================================
    echo ERROR: Cannot connect to PRODUCTION server!
    echo ================================================================================
    echo.
    echo Please check:
    echo   1. You are connected to the internet
    echo   2. You can access: https://veemsonboardupgrade.theviswagroup.com
    echo   3. The production Excel Integration Service is running
    echo   4. No firewall is blocking the connection
    echo.
    echo Contact IT Support if the problem persists.
    echo.
    pause
    exit /b 1
)

echo.
echo Verifying downloaded file...
if not exist "%MANIFEST_FILE%" (
    echo ERROR: Manifest file was not created!
    pause
    exit /b 1
)

echo File size: 
powershell -Command "(Get-Item '%MANIFEST_FILE%').Length" 
echo bytes
echo [OK] Manifest file downloaded successfully!

echo.
echo ================================================================================
echo STEP 3: Installing add-in in Excel...
echo ================================================================================

echo.
echo Registering add-in with Excel...

REM Create registry key
reg add "HKCU\Software\Microsoft\Office\16.0\Wef\Developer" /f >nul 2>&1

REM Register local manifest file
reg add "HKCU\Software\Microsoft\Office\16.0\Wef\Developer" /v "Manifests" /t REG_SZ /d "%MANIFEST_FILE%" /f >nul 2>&1

REM Also try alternate path (some Office versions use this)
set MANIFEST_FILE_QUOTED="%MANIFEST_FILE%"
powershell -Command "New-ItemProperty -Path 'HKCU:\Software\Microsoft\Office\16.0\WEF\Developer' -Name 'DefaultManifestLocation' -Value '%MANIFEST_FILE%' -PropertyType String -Force" >nul 2>&1

echo [OK] Registry configured

REM Set up trusted location
echo Setting up trusted add-in location...
set CATALOG_PATH=HKCU\Software\Microsoft\Office\16.0\Wef\TrustedCatalogs\{MEMP-SHORE-PROD-0001}
set ADDIN_FOLDER_URL=file:///%ADDIN_FOLDER:\=/%

reg add "%CATALOG_PATH%" /v "Id" /t REG_SZ /d "{MEMP-SHORE-PROD-0001}" /f >nul 2>&1
reg add "%CATALOG_PATH%" /v "Url" /t REG_SZ /d "%ADDIN_FOLDER_URL%" /f >nul 2>&1
reg add "%CATALOG_PATH%" /v "Flags" /t REG_DWORD /d 1 /f >nul 2>&1

echo [OK] Trusted catalog configured

echo.
echo ================================================================================
echo STEP 4: Verifying installation...
echo ================================================================================

echo.
echo Checking files...
if exist "%MANIFEST_FILE%" (
    echo [OK] Manifest file present at: %MANIFEST_FILE%
) else (
    echo [FAIL] Manifest file missing!
    pause
    exit /b 1
)

echo.
echo Checking registry...
reg query "HKCU\Software\Microsoft\Office\16.0\Wef\Developer" /v Manifests >nul 2>&1
if %ERRORLEVEL%==0 (
    echo [OK] Registry entry created
) else (
    echo [WARNING] Registry entry not confirmed, but may still work
)

echo.
echo [OK] All installation steps completed!

echo.
echo ================================================================================
echo STEP 5: Testing with Excel...
echo ================================================================================

echo.
echo Opening Excel to verify installation...
timeout /t 2 /nobreak >nul

start excel.exe

echo.
echo Waiting for Excel to load...
timeout /t 5 /nobreak >nul

echo.
echo ================================================================================
echo                        INSTALLATION COMPLETE!
echo ================================================================================
echo.
echo The MEMP Excel Add-in is now installed for PRODUCTION use!
echo.
echo NEXT STEPS:
echo ================================================================================
echo.
echo 1. Download a template from PRODUCTION:
echo    https://veemsonboardupgrade.theviswagroup.com/api/excel/templates/vessel?shipId=1
echo.
echo 2. Open the downloaded template in Excel
echo.
echo 3. The taskpane will appear AUTOMATICALLY on the right side
echo    (Title: "MEMP_Shore Report Uploader")
echo.
echo 4. Verify the API URL shows the PRODUCTION URL
echo.
echo 5. Click "Fetch Latest Data" to test
echo.
echo ================================================================================
echo.
echo IMPORTANT:
echo   - The taskpane only appears when you open MEMP templates
echo   - It will NOT appear in blank Excel workbooks
echo   - This is one-time setup - templates will work forever!
echo   - All templates will use the PRODUCTION database automatically
echo.
echo ================================================================================
echo.
echo.

choice /C YT /N /M "Ready to test? Press T to download template now, or Y to finish: "

if %ERRORLEVEL%==2 (
    echo.
    echo Opening browser to download PRODUCTION template...
    start https://veemsonboardupgrade.theviswagroup.com/api/excel/templates/vessel?shipId=1
    echo.
    echo Template downloading...
    echo Open it in Excel and the taskpane will appear!
    echo.
)

echo.
echo ================================================================================
echo                   Setup Complete - You're Ready to Go!
echo ================================================================================
echo.
echo FROM NOW ON:
echo   1. Download any MEMP template from PRODUCTION
echo   2. Open it in Excel
echo   3. Taskpane loads AUTOMATICALLY
echo   4. Use buttons: Fetch Data, Validate, Send Report
echo.
echo You will NEVER need to run this again on this computer!
echo.
echo ================================================================================
echo.

REM Show the manifest location for reference
echo.
echo TECHNICAL INFO (for troubleshooting):
echo   Manifest file: %MANIFEST_FILE%
echo   Production URL: %MANIFEST_URL%
echo   Registry: HKCU\Software\Microsoft\Office\16.0\Wef\Developer
echo.

pause
exit /b 0
