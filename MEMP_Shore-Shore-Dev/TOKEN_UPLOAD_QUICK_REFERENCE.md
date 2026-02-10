# Token Upload System - Quick Reference

## ⚡ Quick Setup (5 Minutes)

```powershell
# 1. Run setup script
cd C:\Users\Anil.Ravada\Desktop\MEMP_Test_AI\Dev_Env\MEMP_Shore
.\Setup-TokenUploadSystem.ps1

# 2. Restart service
cd Shore-Server\excel-integration-service
npm start

# 3. Done! System is ready.
```

## 🎯 How It Works (Simple)

**Before (Old Way):**
- User needs web login
- Must have user account
- Requires Bearer token authentication

**After (New Way with Tokens):**
- Download template from web UI
- Template has hidden token
- Anyone with template can upload
- No login needed!

## 📝 User Instructions (For Ship Crew)

### First Time Setup
1. Open Excel template (received via email)
2. Click **"Send Report"** button (in Excel ribbon)
3. Enter API URL: `https://yourdomain.com/api`
4. Auth Token: Leave blank (template has embedded token)
5. Click **"Validate Report"**
6. Click **"Send Report"**
7. Done! ✅

### Subsequent Uploads
1. Fill template
2. Click **"Send Report"**
3. Click **"Validate Report"**
4. Click **"Send Report"**
5. Done! ✅

## 🔑 Key Files Created

| File | Purpose |
|------|---------|
| `CREATE_UPLOAD_TOKENS_TABLE.sql` | Database schema for tokens |
| `TEMPLATE_TOKEN_UPLOAD_GUIDE.md` | Full documentation |
| `Setup-TokenUploadSystem.ps1` | Automated setup script |
| `excelModel.js` (updated) | Token generation & validation functions |
| `excelUtils.js` (updated) | Embeds token in templates |
| `taskpane.js` (updated) | Reads token from template |
| `tokenAuth.js` (new) | Authentication middleware |
| `excelController.js` (updated) | Token API endpoints |
| `excelIntegrationServer.js` (updated) | Applies token middleware |

## 🔍 Quick Tests

### Test 1: Token Generation
```sql
-- Generate a test token
EXEC GenerateUploadToken @ShipID=1, @ExpiresInDays=365, @Notes='Test'

-- Check result
SELECT * FROM UploadTokens WHERE ShipID=1
```

### Test 2: Token Validation
```powershell
$token = "YOUR_TOKEN_HERE"
Invoke-RestMethod -Uri "http://localhost:7011/api/excel/token/validate" `
    -Method POST -ContentType "application/json" `
    -Body (@{token=$token} | ConvertTo-Json)
```

### Test 3: Download Template with Token
1. Open web UI
2. Go to Excel Integration page
3. Select ship
4. Click "Download Template"
5. Open template in Excel
6. Press Alt+F11 → Look for "_UploadToken" sheet
7. Token should be in cell B1

### Test 4: Upload with Token
1. Fill downloaded template
2. Open Excel add-in (Send Report button)
3. Should see: "✓ Template has embedded auth token"
4. Click Validate → Send Report
5. Should succeed ✅

## 🐛 Common Issues & Fixes

### Issue: "Token not found"
**Fix:** Download fresh template from web UI

### Issue: "Token expired"
**Fix:**
```sql
UPDATE UploadTokens SET ExpiresAt = DATEADD(YEAR, 1, GETDATE())
WHERE Token = 'YOUR_TOKEN'
```

### Issue: "Token invalid"
**Fix:** Check token status:
```sql
SELECT Token, IsActive, ExpiresAt, UsageCount, MaxUsageCount
FROM UploadTokens WHERE Token = 'YOUR_TOKEN'
```

### Issue: Add-in doesn't see token
**Fix:**
1. Close Excel completely
2. Reopen template
3. Enable macros if prompted
4. Try again

## 📊 Monitoring Commands

```sql
-- Active tokens
SELECT COUNT(*) AS ActiveTokens FROM UploadTokens WHERE IsActive=1

-- Recent uploads
SELECT TOP 10 Token, ShipID, LastUsedAt, UsageCount
FROM UploadTokens ORDER BY LastUsedAt DESC

-- Expiring soon (next 30 days)
SELECT Token, ShipID, ExpiresAt
FROM UploadTokens
WHERE ExpiresAt BETWEEN GETDATE() AND DATEADD(DAY, 30, GETDATE())
  AND IsActive=1

-- Usage statistics
SELECT ShipID, COUNT(*) AS Tokens, SUM(UsageCount) AS TotalUploads
FROM UploadTokens
WHERE IsActive=1
GROUP BY ShipID
```

## 🔒 Security Checklist

- [x] Tokens stored in database (not in code)
- [x] Tokens are ship-specific
- [x] Tokens have expiration dates
- [x] Tokens can be revoked
- [x] IP addresses tracked
- [x] Usage counted
- [x] Hidden from Excel UI (veryHidden)
- [x] Backward compatible (JWT still works)

## 🎓 Training Users

### For Office Staff
- Download templates as usual
- Share templates with ship crew
- Monitor token usage in database

### For Ship Crew
- Receive template via email
- Fill in Excel (no special software)
- Click "Send Report" button
- No password needed!

## 📞 Support Contacts

**Database Issues:** Check SQL Server connection & UploadTokens table  
**Excel Add-in Issues:** Verify manifest.xml installation  
**Token Issues:** Run `SELECT * FROM UploadTokens WHERE Token='...'`  
**Upload Issues:** Check server logs in excel-integration-service  

## 🚀 Benefits Summary

| Feature | Before | After |
|---------|--------|-------|
| **Authentication** | JWT token required | Template token embedded |
| **User Setup** | Must create account | No account needed |
| **Internet Access** | Full web access | API access only |
| **Training** | 30 min+ | 5 minutes |
| **Security** | Good | Better (auditable) |
| **Offline Work** | No | Yes (fill offline, upload later) |

---

**Status:** ✅ Ready for Production  
**Last Updated:** February 3, 2026  
**Version:** 1.0
