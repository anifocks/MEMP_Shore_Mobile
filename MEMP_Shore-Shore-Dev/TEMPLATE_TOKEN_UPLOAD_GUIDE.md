# Template-Embedded Token Upload System

## Overview
This system enables **secure, anywhere access** for Excel report uploads. Templates downloaded from the web UI contain embedded upload tokens that allow **anyone with the template to upload data** - even without web UI access or user accounts.

## 🔒 Security Features

✅ **Token-Based Authentication**
- Each template contains a unique, cryptographically secure token
- Tokens are ship-specific (can only upload to designated ship)
- Configurable expiration (default: 365 days)
- Optional usage limits
- IP address tracking
- Revocable anytime

✅ **Audit Trail**
- Every upload logged with token ID
- Tracks usage count, last used date, IP address
- Full audit history per ship

## 🚀 Setup Instructions

### 1. Database Setup

Run the SQL script to create the token management tables:

```powershell
# Execute in your SQL Server
sqlcmd -S YOUR_SERVER -d YOUR_DATABASE -i CREATE_UPLOAD_TOKENS_TABLE.sql
```

Or run the SQL file manually in SSMS:
- Location: `MEMP_Shore/CREATE_UPLOAD_TOKENS_TABLE.sql`
- Creates: `UploadTokens` table
- Creates: 4 stored procedures for token management

### 2. Server Restart

Restart the excel-integration-service to load new code:

```powershell
cd Shore-Server/excel-integration-service
npm start
```

### 3. Test Token Generation

Download a template from the web UI:
1. Navigate to Reports → Excel Integration
2. Select a ship
3. Click "Download Template"
4. Template now contains embedded token in hidden sheet `_UploadToken`

## 📖 User Workflows

### Workflow 1: Users WITH Web Access

1. **Download**: Get template from web UI
2. **Fill**: Enter report data in Excel
3. **Upload**: Click "Send Report" in Excel
4. **Auto-Auth**: Template token auto-loads (no login needed)
5. **Done**: Data uploaded successfully

### Workflow 2: Users WITHOUT Web Access (e.g., Ship Crew)

1. **Receive**: Get template via email/shared drive
2. **Fill**: Enter report data in Excel
3. **Upload**: Click "Send Report" in Excel
4. **One-Time Setup**:
   - Enter API URL: `https://yourdomain.com/api`
   - Auth token field shows: "Optional (template has token)"
5. **Upload**: Click "Validate" → "Send Report"
6. **Done**: Data uploaded successfully

## 🔧 How It Works

### Template Generation Process

```
User clicks "Download Template"
    ↓
Backend generates unique token
    ↓
Token stored in UploadTokens table
    (Token, ShipID, ExpiresAt, IsActive)
    ↓
Token embedded in Excel hidden sheet
    (_UploadToken sheet: "veryHidden")
    ↓
Template downloaded to user
```

### Upload Process

```
User clicks "Send Report" in Excel
    ↓
Add-in reads _UploadToken sheet
    ↓
Token sent in X-Upload-Token header
    ↓
Server validates token (checks expiry, usage, active status)
    ↓
If valid: Upload proceeds
If invalid: Returns error message
    ↓
Token usage count incremented
Last used IP + timestamp recorded
```

## 🛠️ API Endpoints

### Validate Token
```http
POST /api/excel/token/validate
Content-Type: application/json

{
  "token": "ABC123DEF456..."
}

Response:
{
  "valid": true,
  "shipId": 123,
  "message": "Token is valid"
}
```

### Get Tokens for Ship
```http
GET /api/excel/tokens/ship/:shipId
Authorization: Bearer <admin-jwt-token>

Response:
{
  "shipId": 123,
  "tokens": [
    {
      "TokenID": 1,
      "Token": "ABC123...",
      "ShipID": 123,
      "CreatedAt": "2026-02-03T10:00:00Z",
      "ExpiresAt": "2027-02-03T10:00:00Z",
      "IsActive": true,
      "UsageCount": 5,
      "LastUsedAt": "2026-02-03T15:30:00Z"
    }
  ]
}
```

### Revoke Token
```http
POST /api/excel/token/revoke
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "token": "ABC123DEF456..."
}

Response:
{
  "message": "Token revoked successfully",
  "token": "ABC123DEF456..."
}
```

## 🔍 Verification Steps

### Step 1: Check Token in Template

```powershell
# Open downloaded template in Excel
# Press Alt+F11 (VBA Editor)
# View → Project Explorer
# Look for "_UploadToken" sheet (hidden)
# Or use PowerShell to inspect:

$excel = New-Object -ComObject Excel.Application
$workbook = $excel.Workbooks.Open("C:\path\to\template.xlsx")
$tokenSheet = $workbook.Worksheets | Where-Object { $_.Name -eq "_UploadToken" }
if ($tokenSheet) {
    $token = $tokenSheet.Cells.Item(1,2).Text
    Write-Host "Token found: $token"
}
$workbook.Close($false)
$excel.Quit()
```

### Step 2: Test Token Validation

```powershell
# Test token validation endpoint
$token = "YOUR_TOKEN_HERE"
$apiUrl = "http://localhost:7011"

$response = Invoke-RestMethod -Uri "$apiUrl/api/excel/token/validate" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{token=$token} | ConvertTo-Json)

Write-Host "Valid: $($response.valid)"
Write-Host "Ship ID: $($response.shipId)"
```

### Step 3: Test Upload with Token

Use Postman or PowerShell:

```powershell
$token = "YOUR_TOKEN_HERE"
$apiUrl = "http://localhost:7011"
$filePath = "C:\path\to\filled_template.xlsx"

# Read file as bytes
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileContent = [System.Convert]::ToBase64String($fileBytes)

# Create multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$headers = @{
    "X-Upload-Token" = $token
    "Content-Type" = "multipart/form-data; boundary=$boundary"
}

# Send request
Invoke-RestMethod -Uri "$apiUrl/api/excel/parse/vesselreport" `
    -Method POST `
    -Headers $headers `
    -InFile $filePath
```

## ⚙️ Configuration Options

### Token Expiration

Modify in `excelUtils.js`:

```javascript
const tokenData = await generateUploadToken(
    shipIdFromData,
    null,
    365,  // ← Change expiration days (0 = never expires)
    null,
    `Template generated for Ship ${shipIdFromData}`
);
```

### Usage Limits

Set maximum uses per token:

```javascript
const tokenData = await generateUploadToken(
    shipIdFromData,
    null,
    365,
    10,  // ← Max 10 uses per token
    `Limited use token`
);
```

### Token Format

Tokens are generated as:
```
<UUID>_<ShipID>
Example: a1b2c3d4e5f6g7h8i9j0_123
```

## 🔐 Security Best Practices

1. **HTTPS Only**: Always use HTTPS for production
2. **Token Rotation**: Periodically regenerate tokens for active ships
3. **Monitor Usage**: Check `UsageCount` for anomalies
4. **IP Whitelist**: Optional - restrict to known IP ranges
5. **Revoke Compromised**: Immediately revoke if token leaked
6. **Audit Logs**: Review `LastUsedAt` and `LastUsedIP` regularly

## 🐛 Troubleshooting

### Issue: Token Not Found in Template

**Solution:**
- Ensure database `UploadTokens` table exists
- Check server logs for token generation errors
- Verify token generation code is active in `excelUtils.js`

### Issue: Token Validation Fails

**Possible Causes:**
- Token expired (check `ExpiresAt`)
- Token revoked (check `IsActive = 0`)
- Usage limit reached (check `UsageCount >= MaxUsageCount`)

**Solution:**
```sql
-- Check token status
SELECT * FROM UploadTokens WHERE Token = 'YOUR_TOKEN_HERE'

-- Extend expiration
UPDATE UploadTokens 
SET ExpiresAt = DATEADD(DAY, 365, GETDATE())
WHERE Token = 'YOUR_TOKEN_HERE'

-- Reset usage count
UPDATE UploadTokens 
SET UsageCount = 0
WHERE Token = 'YOUR_TOKEN_HERE'

-- Reactivate token
UPDATE UploadTokens 
SET IsActive = 1
WHERE Token = 'YOUR_TOKEN_HERE'
```

### Issue: Add-in Not Reading Token

**Solution:**
- Check Excel macro security settings
- Ensure `_UploadToken` sheet exists
- Clear browser cache in Excel (File → Options → Trust Center)
- Restart Excel

## 📊 Monitoring & Analytics

### View Token Usage

```sql
-- Active tokens by ship
SELECT 
    s.ShipName,
    COUNT(*) AS ActiveTokens,
    SUM(t.UsageCount) AS TotalUploads,
    MAX(t.LastUsedAt) AS LastUpload
FROM UploadTokens t
JOIN Ships s ON t.ShipID = s.ShipID
WHERE t.IsActive = 1
GROUP BY s.ShipName
ORDER BY TotalUploads DESC;

-- Recent uploads via token
SELECT TOP 10
    s.ShipName,
    t.Token,
    t.LastUsedAt,
    t.LastUsedIP,
    t.UsageCount
FROM UploadTokens t
JOIN Ships s ON t.ShipID = s.ShipID
WHERE t.LastUsedAt IS NOT NULL
ORDER BY t.LastUsedAt DESC;

-- Expired tokens
SELECT 
    s.ShipName,
    t.Token,
    t.ExpiresAt,
    t.UsageCount
FROM UploadTokens t
JOIN Ships s ON t.ShipID = s.ShipID
WHERE t.ExpiresAt < GETDATE()
  AND t.IsActive = 1;
```

## 🎯 Benefits Summary

✅ **For Ship Crew**
- No need for web login
- Works offline (just need API connectivity)
- One-click upload from Excel
- Template = Authentication

✅ **For Administrators**
- Full audit trail
- Granular access control
- Easy token revocation
- IP tracking

✅ **For System**
- Secure authentication
- Scalable (no shared passwords)
- Backward compatible (still supports JWT)
- Rate limiting per token

## 📞 Support

For issues or questions:
- Check server logs: `Shore-Server/excel-integration-service/logs/`
- Review token database records
- Test with Postman/PowerShell first
- Contact system administrator

---

**Last Updated:** February 3, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
