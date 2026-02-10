# Quick Test Guide - Report Status Sheet Buttons

## 🚀 What to Do Right Now:

### Step 1: Open Excel with the Template
```
✓ Download fresh template from server
✓ You should see "Report Status" as first sheet
✓ Scroll down to see VALIDATE and SEND REPORT buttons (green and blue)
```

### Step 2: Test VALIDATE Button
```
✓ Add test data to "VesselDailyReports" sheet
  - At least fill in Row 2 with some values
✓ Go back to "Report Status" sheet
✓ Click on cell B7 (VALIDATE button - green cell)
✓ EXPECTED: Cell B11 should update within 1 second with:
  "✅ Validation Successful - X report(s) ready to send"
✓ Check taskpane sidebar - it should also show the same message
```

### Step 3: Test SEND REPORT Button
```
✓ Click on cell B8 (SEND REPORT button - blue cell)
✓ EXPECTED: Cell B11 should update with:
  "✅ SUCCESS - Report submitted at HH:MM:SS"
✓ You should see log in taskpane showing upload completed
✓ Database should have new entry
```

### Step 4: Test Error Handling
```
✓ Clear all data from VesselDailyReports sheet
✓ Click VALIDATE button (B7)
✓ EXPECTED: Cell B11 shows error in red:
  "❌ Warning: No data rows found!"
✓ SEND REPORT button should be disabled
```

## 🔍 How to Debug:

### Open Browser Console (F12):
```
1. Press F12 in Excel
2. Click "Console" tab
3. Look for messages when you click buttons:
   
Expected output when clicking B7:
   📍 Active cell: 'Report Status'!B7
   🎯 VALIDATE button clicked!
   
Expected output when clicking B8:
   📍 Active cell: 'Report Status'!B8
   🎯 SEND REPORT button clicked!
```

## ✅ Success Criteria:

| Scenario | Expected Result | Status |
|----------|-----------------|--------|
| Click VALIDATE | Status updates in B11 within 1 sec | ✓ Test |
| Click SEND REPORT | File uploads, status shows in B11 | ✓ Test |
| Rapid clicking | Only triggers once (debounce) | ✓ Test |
| Console logs | Shows active cell and button name | ✓ Test |
| Taskpane sync | Shows same status as sheet | ✓ Test |

## ⏱️ Timing:
- **Before fix**: 2-4 seconds to respond
- **After fix**: <1 second to respond

## 💡 Troubleshooting:

| Issue | Solution |
|-------|----------|
| Button doesn't respond | Refresh page, check F12 console for errors |
| Status doesn't update in B11 | Check taskpane is open, verify sheet name is "Report Status" |
| Console shows error | Check if SheetControls is loaded before taskpane.js |
| Upload fails but status shows success | Check API URL in taskpane settings |

## 🎯 Next Step:
If everything works → Ready to push to GitHub!
