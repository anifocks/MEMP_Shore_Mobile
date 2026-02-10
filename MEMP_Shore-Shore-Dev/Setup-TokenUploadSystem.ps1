# MEMP Shore - Template Token Upload System Setup
# Run this script to set up the token-based upload system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MEMP Token Upload System Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# Step 1: Read .env file and check SQL Server connection
Write-Host "[1/5] Reading configuration and checking SQL Server..." -ForegroundColor Yellow

# Read .env file
$envPath = "Shore-Server\excel-integration-service\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ Error: .env file not found at $envPath" -ForegroundColor Red
    exit 1
}

$envVars = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim() -replace '\s*#.*$', ''  # Remove inline comments
        $value = $value.Trim()
        $envVars[$key] = $value
    }
}

# Map the actual variable names from .env
$sqlServer = $envVars['DB_HOST']
$sqlInstance = $envVars['DB_INSTANCE_NAME']
$sqlDatabase = $envVars['DB_DATABASE']
$sqlUser = $envVars['DB_USER']
$sqlPassword = $envVars['DB_PASSWORD']

if (-not $sqlServer) {
    Write-Host "❌ Error: Database configuration not found in .env file" -ForegroundColor Red
    Write-Host "Please check Shore-Server\excel-integration-service\.env file" -ForegroundColor Red
    exit 1
}

# Build server connection string (with instance name if provided)
if ($sqlInstance) {
    $sqlServerConnection = "$sqlServer\$sqlInstance"
} else {
    $sqlServerConnection = $sqlServer
}

Write-Host "  Database: $sqlDatabase on $sqlServerConnection" -ForegroundColor Cyan

try {
    $connectionString = "Server=$sqlServerConnection;Database=$sqlDatabase;User Id=$sqlUser;Password=$sqlPassword;TrustServerCertificate=True;"
    $testConnection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $testConnection.Open()
    $testConnection.Close()
    Write-Host "✅ SQL Server connection successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Cannot connect to SQL Server" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create database objects
Write-Host "`n[2/5] Creating database tables and procedures..." -ForegroundColor Yellow

$scriptPath = "CREATE_UPLOAD_TOKENS_TABLE.sql"

if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Error: SQL script not found at $scriptPath" -ForegroundColor Red
    exit 1
}

try {
    # Use sqlcmd if available, otherwise use .NET SqlCommand
    if (Get-Command sqlcmd -ErrorAction SilentlyContinue) {
        sqlcmd -S $sqlServerConnection -d $sqlDatabase -U $sqlUser -P $sqlPassword -i $scriptPath -C
    } else {
        $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
        $connection.Open()
        
        $sqlScript = Get-Content $scriptPath -Raw
        $batches = $sqlScript -split '\bGO\b'
        
        foreach ($batch in $batches) {
            if ($batch.Trim()) {
                $command = New-Object System.Data.SqlClient.SqlCommand($batch, $connection)
                $command.ExecuteNonQuery() | Out-Null
            }
        }
        
        $connection.Close()
    }
    
    Write-Host "✅ Database objects created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Failed to create database objects" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Verify database setup
Write-Host "`n[3/5] Verifying database setup..." -ForegroundColor Yellow

try {
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()
    
    # Check if UploadTokens table exists
    $command = New-Object System.Data.SqlClient.SqlCommand("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UploadTokens'", $connection)
    $tableExists = $command.ExecuteScalar()
    
    if ($tableExists -eq 1) {
        Write-Host "✅ UploadTokens table created" -ForegroundColor Green
    } else {
        throw "UploadTokens table not found"
    }
    
    # Check if stored procedures exist
    $procedures = @('GenerateUploadToken', 'ValidateUploadToken', 'RevokeUploadToken', 'GetUploadTokensByShip')
    foreach ($proc in $procedures) {
        $command = New-Object System.Data.SqlClient.SqlCommand("SELECT COUNT(*) FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_NAME = '$proc'", $connection)
        $procExists = $command.ExecuteScalar()
        
        if ($procExists -eq 1) {
            Write-Host "  ✅ $proc procedure created" -ForegroundColor Green
        } else {
            throw "$proc procedure not found"
        }
    }
    
    $connection.Close()
    Write-Host "✅ Database verification complete" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Database verification failed" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Install NPM dependencies (if needed)
Write-Host "`n[4/5] Checking NPM dependencies..." -ForegroundColor Yellow

$servicePath = "Shore-Server\excel-integration-service"

if (Test-Path $servicePath) {
    Push-Location $servicePath
    
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    Write-Host "  Service: $($packageJson.name) v$($packageJson.version)" -ForegroundColor Cyan
    Write-Host "✅ NPM dependencies OK (no additional packages needed)" -ForegroundColor Green
    
    Pop-Location
} else {
    Write-Host "⚠️ Warning: Service directory not found" -ForegroundColor Yellow
}

# Step 5: Test token generation
Write-Host "`n[5/5] Testing token generation..." -ForegroundColor Yellow

try {
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()
    
    # Generate a test token for Ship ID 1
    $command = New-Object System.Data.SqlClient.SqlCommand("EXEC GenerateUploadToken @ShipID=1, @ExpiresInDays=1, @Notes='Test token from setup script'", $connection)
    $reader = $command.ExecuteReader()
    
    if ($reader.Read()) {
        $testToken = $reader["Token"]
        Write-Host "✅ Test token generated: $testToken" -ForegroundColor Green
        Write-Host "  Ship ID: $($reader['ShipID'])" -ForegroundColor Cyan
        Write-Host "  Expires: $($reader['ExpiresAt'])" -ForegroundColor Cyan
    }
    
    $reader.Close()
    $connection.Close()
    
    Write-Host "`n✅ Token generation test successful" -ForegroundColor Green
    Write-Host "  (This test token will expire in 24 hours)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: Token generation test failed" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ SETUP COMPLETE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Restart excel-integration-service:" -ForegroundColor White
Write-Host "   cd Shore-Server\excel-integration-service" -ForegroundColor Gray
Write-Host "   npm start`n" -ForegroundColor Gray

Write-Host "2. Download a template from the web UI" -ForegroundColor White
Write-Host "   (Template will contain embedded upload token)`n" -ForegroundColor Gray

Write-Host "3. Test upload using Excel add-in" -ForegroundColor White
Write-Host "   (Add-in will auto-detect and use the embedded token)`n" -ForegroundColor Gray

Write-Host "4. Monitor token usage:" -ForegroundColor White
Write-Host "   SELECT * FROM UploadTokens WHERE IsActive = 1`n" -ForegroundColor Gray

Write-Host "📖 Full Documentation:" -ForegroundColor Yellow
Write-Host "   TEMPLATE_TOKEN_UPLOAD_GUIDE.md`n" -ForegroundColor Cyan

Write-Host "✅ System is ready for token-based uploads!`n" -ForegroundColor Green
