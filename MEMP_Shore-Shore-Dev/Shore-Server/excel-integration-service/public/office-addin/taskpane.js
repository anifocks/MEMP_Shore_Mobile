/* global Office, Excel */
//Taskpane.js
let reportData = null;
let uploadToken = null; // Store embedded token
let templateType = null; // Store detected template type
let mainSheetName = null; // Store the main data sheet name
let lastClickedCell = null; // Track last clicked button cell
let lastClickTime = 0; // Track last click timestamp
const CLICK_DEBOUNCE_MS = 3000; // Prevent same button click within 3 seconds
let isExecuting = false; // Prevent concurrent button executions
let currentlySelectedButtonCell = null; // Track which button cell is currently selected
let keyboardListenerAttached = false; // Track if keyboard listener is active
let lastKeyboardPressTime = 0; // Track last keyboard activation for debounce
let buttonSelectArmed = true; // Allow trigger only after moving off button cell
const ENABLE_KEYBOARD_ACTIVATION = false; // Disable Enter/Space activation by default


// Template detection map - defines sheet names for each template type
const TEMPLATE_CONFIGS = {
    'VesselDailyReports': {
        type: 'VESSEL',
        mainSheet: 'VesselDailyReports',
        endpoint: '/parse/vesselreport',
        importType: 'VESSEL'
    },
    'Bunkering': {
        type: 'BUNKER',
        mainSheet: 'Bunkering',
        endpoint: '/parse/bunker',
        importType: 'BUNKER'
    },
    'Voyages': {
        type: 'VOYAGE',
        mainSheet: 'Voyages',
        endpoint: '/parse/voyage',
        importType: 'VOYAGE'
    },
    'Main Sheet': {
        type: 'BULK',
        mainSheet: 'Main Sheet',
        endpoint: '/parse/bulk-vesselreport',
        importType: 'BULK'
    }
};

Office.onReady(async (info) => {
    if (info.host === Office.HostType.Excel) {
        console.log('✅ MEMP_Shore Report Uploader initialized');
        
        // Pin and lock the taskpane to keep it always visible
        try {
            Office.context.document.settings.set('Office.AutoShowTaskpaneWithDocument', true);
            Office.context.document.settings.set('TaskpaneState', 'pinned');
            if (Office.context.ui && Office.context.ui.setTaskpaneLockState) {
                await Office.context.ui.setTaskpaneLockState({ isLocked: true });
            }
            await Office.context.document.settings.saveAsync();
            console.log('📌 Taskpane pinned and locked');
        } catch (error) {
            console.log('⚠️ Could not lock taskpane:', error.message);
        }
        
        // Prevent accidental close - warn user
        window.addEventListener('beforeunload', (e) => {
            const message = '⚠️ Closing the taskpane will disable all buttons. Keep it open!';
            e.preventDefault();
            e.returnValue = message;
            return message;
        });
        
        // Try to reopen taskpane if it gets closed
        setInterval(async () => {
            try {
                if (Office.context.document.settings.get('TaskpaneState') === 'pinned') {
                    // Taskpane should be open - if not, try to reopen
                    if (document.hidden || !document.body) {
                        console.log('📌 Attempting to reopen taskpane...');
                        // Taskpane appears to be closed, notify user
                    }
                }
            } catch (error) {
                console.log('⚠️ Taskpane monitoring error:', error.message);
            }
        }, 5000); // Check every 5 seconds
        
        // Detect template type
        await detectTemplateType();
        
        // Load saved settings
        const savedUrl = localStorage.getItem('apiUrl');
        const savedToken = localStorage.getItem('authToken');
        
        if (savedUrl) document.getElementById('apiUrl').value = savedUrl;
        if (savedToken) document.getElementById('authToken').value = savedToken;
        
        // Auto-read embedded upload token
        await readEmbeddedToken();
        
        // Auto-populate Report Status Sheet with taskpane values
        await populateReportStatusSheetConfig();
        
        // Start monitoring Report Status Sheet buttons with worksheet change event
        await setupReportStatusSheetButtons();
        
        // Apply visual styling to button cells
        await styleReportStatusSheetButtons();
        
        // Set up keyboard listener for Enter key activation (optional)
        if (ENABLE_KEYBOARD_ACTIVATION) {
            setupKeyboardListener();
        } else {
            console.log('⌨️ Keyboard activation disabled (selection triggers actions)');
        }
    }
});

// NEW: Detect which template type is being used
async function detectTemplateType() {
    try {
        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            
            const sheetNames = sheets.items.map(s => s.name);
            console.log('📊 Available sheets:', sheetNames);
            
            // Check for known sheet names to identify template type
            for (const [sheetName, config] of Object.entries(TEMPLATE_CONFIGS)) {
                if (sheetNames.includes(sheetName)) {
                    templateType = config.type;
                    mainSheetName = config.mainSheet;
                    console.log(`✅ Detected template type: ${templateType}`);
                    console.log(`✅ Main data sheet: ${mainSheetName}`);
                    break;
                }
            }
            
            if (!templateType) {
                console.warn('⚠️ Could not detect template type - defaulting to VESSEL');
                templateType = 'VESSEL';
                mainSheetName = 'VesselDailyReports';
            }
        });
    } catch (error) {
        console.error('Error detecting template type:', error);
        templateType = 'VESSEL';
        mainSheetName = 'VesselDailyReports';
    }
}

// NEW: Read embedded upload token from hidden sheet
async function readEmbeddedToken() {
    try {
        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            const tokenSheet = sheets.getItemOrNullObject('_UploadToken');
            tokenSheet.load('name');
            await context.sync();
            
            if (!tokenSheet.isNullObject) {
                // Read token from B1
                const tokenRange = tokenSheet.getRange('B1');
                tokenRange.load('values');
                
                // Read ship ID from B2
                const shipIdRange = tokenSheet.getRange('B2');
                shipIdRange.load('values');
                
                await context.sync();
                
                if (tokenRange.values[0][0]) {
                    uploadToken = tokenRange.values[0][0];
                    console.log('✅ Upload token found in template:', uploadToken.substring(0, 10) + '...');
                    
                    // Save to localStorage for persistence
                    localStorage.setItem('authToken', uploadToken);
                    
                    // Update taskpane field
                    document.getElementById('authToken').value = uploadToken;
                    
                    // Read and save ship ID
                    if (shipIdRange.values[0][0]) {
                        const embeddedShipId = shipIdRange.values[0][0];
                        console.log('✅ Ship ID found in template:', embeddedShipId);
                        localStorage.setItem('shipId', embeddedShipId);
                        document.getElementById('shipId').value = embeddedShipId;
                    }
                    
                    // Update UI to show token-based authentication
                    const authSection = document.getElementById('authToken').parentElement;
                    const tokenInfo = document.createElement('div');
                    tokenInfo.className = 'token-info';
                    tokenInfo.innerHTML = '✓ Template has embedded auth token';
                    tokenInfo.style.cssText = 'color: #2e7d32; font-size: 12px; margin-top: 5px;';
                    authSection.appendChild(tokenInfo);
                    
                    // Make auth token field optional
                    document.getElementById('authToken').placeholder = 'Optional (template has token)';
                }
            } else {
                console.log('⚠️ No _UploadToken sheet found in template');
            }
        });
    } catch (error) {
        console.log('⚠️ Error reading embedded token:', error.message);
    }
}

// Taskpane buttons are the primary interface for all operations
// Users click the buttons in the taskpane sidebar on the right

function showStatus(message, type = 'info') {
    const statusBox = document.getElementById('statusBox');
    statusBox.textContent = message;
    statusBox.className = `status-box ${type}`;
    statusBox.style.display = 'block';
}

function appendDebug(message) {
    const debugLog = document.getElementById('debugLog');
    if (!debugLog) return;
    const timestamp = new Date().toLocaleTimeString();
    // debugLog.style.display = 'block'; // Hidden by default - uncomment to show debug messages
    debugLog.textContent += `${debugLog.textContent ? '\n' : ''}${timestamp} ${message}`;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('validateBtn').disabled = show;
    document.getElementById('uploadBtn').disabled = show;
}

async function validateReport() {
    showLoading(true);
    document.getElementById('statusBox').style.display = 'none';
    
    try {
        // Re-detect template type in case workbook changed
        await detectTemplateType();
        
        if (!mainSheetName) {
            showStatus('❌ Error: Could not detect report template type!', 'error');
            showLoading(false);
            return;
        }
        
        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            
            // Helper function to format Excel serial date as user entered (YYYY-MM-DD HH:MM:SS)
            // Only convert if it's a numeric serial date, otherwise keep as-is
            const formatDateValue = (serial) => {
                if (typeof serial !== 'number' || serial < 1000) return serial;
                
                const utc_days = Math.floor(serial - 25569);
                const utc_value = utc_days * 86400; 
                const date_info = new Date(utc_value * 1000);
                
                const fractional_day = serial - Math.floor(serial) + 0.0000001;
                let total_seconds = Math.floor(86400 * fractional_day);
                const seconds = total_seconds % 60;
                total_seconds -= seconds;
                const hours = Math.floor(total_seconds / (60 * 60));
                const minutes = Math.floor(total_seconds / 60) % 60;
                
                const year = date_info.getFullYear();
                const month = String(date_info.getMonth() + 1).padStart(2, '0');
                const date = String(date_info.getDate()).padStart(2, '0');
                const hour = String(hours).padStart(2, '0');
                const min = String(minutes).padStart(2, '0');
                const sec = String(seconds).padStart(2, '0');
                
                return `${year}-${month}-${date} ${hour}:${min}:${sec}`;
            };
            
            // Check if main sheet exists
            const reportSheet = sheets.items.find(s => s.name === mainSheetName);
            
            if (!reportSheet) {
                showStatus(`❌ Error: ${mainSheetName} sheet not found!`, 'error');
                showLoading(false);
                return;
            }
            
            // Read the report data
            const usedRange = reportSheet.getUsedRange();
            usedRange.load(['values', 'rowCount']);
            await context.sync();
            
            if (usedRange.rowCount < 2) {
                showStatus(`⚠️ Warning: No data found in ${mainSheetName} sheet!`, 'warning');
                showLoading(false);
                return;
            }
            
            const values = usedRange.values;
            const headers = values[0];
            const dataRows = values.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));
            
            if (dataRows.length === 0) {
                showStatus('⚠️ Warning: No data rows found!', 'warning');
                showLoading(false);
                return;
            }
            
            // Date field patterns to convert
            const dateFields = ['ReportDateTime', 'Date', 'DateTime', 'Timestamp', 'Time', 'ETD', 'ATD', 'ETA', 'ATA'];
            
            // Convert to JSON with date conversion
            reportData = dataRows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    let value = row[index];
                    
                    // Convert Excel date serial numbers to date strings (KEEP DATE FORMAT AS ENTERED)
                    if (header && dateFields.some(df => header.includes(df))) {
                        value = formatDateValue(value);
                    }
                    
                    obj[header] = value;
                });
                return obj;
            });
            
            // Display report information
            const firstReport = reportData[0];
            const lastReport = reportData[reportData.length - 1];
            
            const reportInfo = document.getElementById('reportInfo');
            reportInfo.innerHTML = `
                <div class="info-item">
                    <div class="info-label">Template Type:</div>
                    <div class="info-value" style="color: #1976D2; font-weight: 600;">${templateType}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Status:</div>
                    <div class="info-value" style="color: #2e7d32; font-weight: 600;">✓ Valid</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Total Records:</div>
                    <div class="info-value">${reportData.length} records found</div>
                </div>
                <div class="info-item">
                    <div class="info-label">First Key:</div>
                    <div class="info-value">${firstReport.ShipID || firstReport.VoyageID || firstReport.BDN_Number || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Last Record:</div>
                    <div class="info-value">${Object.values(lastReport).filter(v => v).join(' | ').substring(0, 50)}...</div>
                </div>
            `;            
            showStatus(`✓ Validation successful! Found ${reportData.length} record(s) ready to upload.`, 'success');
            await updateReportStatusSheetStatus(`SUCCESS! Validation passed - ${reportData.length} record(s) ready to upload!`, true);
            document.getElementById('uploadBtn').disabled = false;
            showLoading(false);
        });
    } catch (error) {
        console.error('Validation error:', error);
        showStatus(`❌ Validation failed: ${error.message}`, 'error');
        await updateReportStatusSheetStatus(`ERROR! Validation failed: ${error.message}`, false);
        showLoading(false);
    }
}

async function uploadReport() {
    if (!reportData || reportData.length === 0) {
        showStatus('❌ Please validate the report first!', 'error');
        return;
    }
    
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const authToken = document.getElementById('authToken').value.trim();
    
    // Check if we have either embedded token OR manual auth token
    if (!apiUrl) {
        showStatus('❌ Please enter API URL!', 'error');
        return;
    }

    if (!uploadToken && !authToken) {
        showStatus('❌ No authentication token found. Enter a token or download a template with an embedded token.', 'error');
        return;
    }
    
    // Save settings
    localStorage.setItem('apiUrl', apiUrl);
    if (authToken) localStorage.setItem('authToken', authToken);
    
    showLoading(true);
    document.getElementById('statusBox').style.display = 'none';
    
    try {
        console.log('📦 Starting Excel file extraction...');
        // Get Excel file as binary
        Office.context.document.getFileAsync(Office.FileType.Compressed, { sliceSize: 65536 }, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                const file = result.value;
                const sliceCount = file.sliceCount;
                console.log(`📋 File has ${sliceCount} slices`);
                
                const slicePromises = [];
                
                // Create promises for each slice
                for (let i = 0; i < sliceCount; i++) {
                    slicePromises.push(
                        new Promise((resolve, reject) => {
                            file.getSliceAsync(i, (sliceResult) => {
                                if (sliceResult.status === Office.AsyncResultStatus.Succeeded) {
                                    const sliceData = sliceResult.value.data;
                                    console.log(`✅ Slice ${i + 1}/${sliceCount} read`);
                                    console.log(`   Type: ${sliceData.constructor.name}, Size: ${sliceData.byteLength || sliceData.length} bytes`);
                                    resolve(sliceData);
                                } else {
                                    reject(new Error(`Failed to read slice ${i}: ${sliceResult.error.message}`));
                                }
                            });
                        })
                    );
                }
                
                // Wait for all slices
                Promise.all(slicePromises)
                    .then((arrayBuffers) => {
                        console.log(`🔗 All ${arrayBuffers.length} slices collected, combining...`);
                        
                        // Calculate total size and validate each slice
                        let totalSize = 0;
                        arrayBuffers.forEach((ab, idx) => {
                            const size = ab.byteLength || ab.length || 0;
                            console.log(`  Slice ${idx}: type=${ab.constructor.name}, size=${size} bytes`);
                            totalSize += size;
                        });
                        console.log(`📊 Total file size: ${totalSize} bytes`);
                        
                        if (totalSize === 0) {
                            throw new Error('No data received from file slices');
                        }
                        
                        // Combine all ArrayBuffers into one
                        try {
                            const combined = new Uint8Array(totalSize);
                            let offset = 0;
                            arrayBuffers.forEach((ab, index) => {
                                // Handle both ArrayBuffer and regular arrays
                                let uint8;
                                if (ab instanceof ArrayBuffer) {
                                    uint8 = new Uint8Array(ab);
                                } else if (ArrayBuffer.isView(ab)) {
                                    uint8 = new Uint8Array(ab.buffer, ab.byteOffset, ab.byteLength);
                                } else if (Array.isArray(ab)) {
                                    uint8 = new Uint8Array(ab);
                                } else {
                                    throw new Error(`Unexpected slice type: ${ab.constructor.name}`);
                                }
                                
                                const sliceSize = uint8.length;
                                console.log(`  Combining slice ${index}: size=${sliceSize}, offset=${offset}, space_available=${totalSize - offset}`);
                                
                                if (offset + sliceSize > totalSize) {
                                    throw new Error(`Slice ${index} exceeds buffer. Offset: ${offset}, Size: ${sliceSize}, Total: ${totalSize}`);
                                }
                                
                                combined.set(uint8, offset);
                                offset += sliceSize;
                            });
                            
                            console.log(`✅ File combined successfully (${combined.byteLength} bytes)`);
                            
                            file.closeAsync();
                            
                            // Now upload the combined buffer
                            uploadExcelFile(combined.buffer); // Pass as ArrayBuffer
                        } catch (combineErr) {
                            console.error('❌ Error combining slices:', combineErr.message);
                            console.error('Stack:', combineErr.stack);
                            showStatus(`❌ Failed to combine Excel file: ${combineErr.message}`, 'error');
                            showLoading(false);
                            file.closeAsync();
                        }
                    })
                    .catch((err) => {
                        console.error('Slice reading error:', err);
                        showStatus(`❌ Failed to read Excel file: ${err.message}`, 'error');
                        showLoading(false);
                        file.closeAsync();
                    });
            } else {
                showStatus(`❌ Failed to read Excel file: ${result.error.message}`, 'error');
                showLoading(false);
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        showStatus(`❌ Upload failed: ${error.message}`, 'error');
        showLoading(false);
    }
}

async function uploadExcelFile(arrayBuffer) {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const authToken = document.getElementById('authToken').value.trim();
    
    // Get the configuration for this template type
    const config = Object.values(TEMPLATE_CONFIGS).find(c => c.type === templateType);
    
    if (!config) {
        showStatus('❌ Error: Unknown template type!', 'error');
        showLoading(false);
        return;
    }
    
    try {
        console.log(`📁 Creating Blob from ArrayBuffer (${arrayBuffer.byteLength} bytes)...`);
        
        // Create blob from ArrayBuffer
        const fileBlob = new Blob([arrayBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        console.log(`✅ Blob created, size: ${fileBlob.size} bytes`);
        
        // Create FormData
        const formData = new FormData();
        formData.append('excelFile', fileBlob, `${templateType}Report.xlsx`);
        
        // Build upload URL using template-specific endpoint
        const uploadUrl = `${apiUrl}${config.endpoint}`;
        
        const headers = {};
        if (uploadToken) {
            headers['X-Upload-Token'] = uploadToken;
            console.log('🔑 Using embedded upload token');
        } else if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
            console.log('🔑 Using manual Bearer token');
        } else {
            throw new Error('No authentication token available');
        }
        
        console.log(`📤 Uploading ${templateType} report to: ${uploadUrl}`);
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Upload failed with status ${response.status}`);
        }
        
        const parseResult = await response.json();
        console.log('✅ Excel parsed successfully. Unique ID:', parseResult.uniqueFileId);
        
        // Now import to database using template-specific import type
        console.log('💾 Starting database import...');
        const importUrl = `${apiUrl}/import-csv-to-db`;
        const importResponse = await fetch(importUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(uploadToken ? { 'X-Upload-Token': uploadToken } : { 'Authorization': `Bearer ${authToken}` })
            },
            body: JSON.stringify({
                fileId: parseResult.uniqueFileId,
                type: config.importType
            })
        });
        
        if (!importResponse.ok) {
            const errorData = await importResponse.json().catch(() => ({ message: importResponse.statusText }));
            throw new Error(errorData.message || `Import failed with status ${importResponse.status}`);
        }
        
        const importResult = await importResponse.json();
        console.log('✅ Database import completed');
        
        showStatus(`✅ SUCCESS! ${templateType} report uploaded and imported successfully!`, 'success');
        await updateReportStatusSheetStatus(`SUCCESS! Report uploaded and imported successfully!`, true);
        showLoading(false);
        
        // Reset validation
        reportData = null;
        document.getElementById('uploadBtn').disabled = true;
        
    } catch (error) {
        console.error('Upload error:', error);
        showStatus(`❌ Upload failed: ${error.message}`, 'error');
        await updateReportStatusSheetStatus(`Upload failed: ${error.message}`, false);
        showLoading(false);
    }
}

// NEW: Fetch latest template data and update existing sheets
async function fetchLatestTemplateData() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    let shipIdInput = document.getElementById('shipId').value.trim();
    
    if (!apiUrl) {
        showStatus('❌ Please enter API URL!', 'error');
        return;
    }
    
    // If Ship ID not provided, try to auto-detect from Excel data
    if (!shipIdInput) {
        try {
            console.log('📍 Ship ID not provided. Attempting auto-detection from Excel...');
            shipIdInput = await autoDetectShipId();
            
            if (!shipIdInput) {
                showStatus('❌ Ship ID required! Enter Ship ID or ensure it exists in your template data.', 'error');
                return;
            }
            
            console.log(`✅ Auto-detected Ship ID: ${shipIdInput}`);
            document.getElementById('shipId').value = shipIdInput; // Update UI
        } catch (error) {
            showStatus(`❌ Could not auto-detect Ship ID: ${error.message}. Please enter it manually.`, 'error');
            return;
        }
    }
    
    showLoading(true);
    document.getElementById('statusBox').style.display = 'none';
    appendDebug('Fetch started');
    
    try {
        console.log(`📥 Fetching latest data for Ship ID: ${shipIdInput}, Type: ${templateType}`);
        
        // Fetch template data from API
        // Try both paths: /api/excel/template-data (gateway) and /template-data (direct service)
        const gatewayUrl = `${apiUrl}/api/excel/template-data?shipId=${shipIdInput}&type=${templateType}`;
        const directUrl = `${apiUrl}/template-data?shipId=${shipIdInput}&type=${templateType}`;
        
        console.log(`🔗 Attempting gateway URL: ${gatewayUrl}`);
        let response = await fetch(gatewayUrl).catch((err) => {
            console.log(`⚠️ Gateway fetch failed: ${err.message}`);
            return null;
        });
        
        // If gateway fails, try direct service endpoint
        if (!response || !response.ok) {
            console.log(`⚠️ Gateway endpoint returned ${response?.status || 'no response'}, trying direct service endpoint...`);
            console.log(`🔗 Attempting direct URL: ${directUrl}`);
            response = await fetch(directUrl).catch((err) => {
                console.log(`⚠️ Direct fetch failed: ${err.message}`);
                return null;
            });
        }
        
        if (!response) {
            throw new Error('Both gateway and direct endpoints failed to respond. Check API URL and network connection.');
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error(`❌ Endpoint returned ${response.status}:`, errorData);
            throw new Error(errorData.message || errorData.details || `Failed with status ${response.status}`);
        }
        
        const templateData = await response.json();
        console.log('✅ Template data fetched successfully');
        appendDebug('Template data received from server');
        console.log('📊 Data summary:', {
            lookupsGuideRows: templateData.lookupsGuideRows?.length || 0,
            voyageDetailsRows: templateData.voyageDetailsRows?.length || 0
        });
        
        // Update Excel sheets with fetched data
        console.log('🔄 Starting Excel sheet updates...');
        const updateResult = await updateExcelSheetsWithData(templateData);
        appendDebug(`Sheets updated: ${updateResult.sheetsUpdated}`);
        if (updateResult.sheetsFailed?.length) {
            appendDebug(`Sheets failed: ${updateResult.sheetsFailed.join(', ')}`);
        }
        
        showStatus(`✅ SUCCESS! Template data refreshed for Ship ${shipIdInput}!`, 'success');
        
        // Enable Validate button after successful fetch
        document.getElementById('validateBtn').disabled = false;
        document.getElementById('validateBtn').style.opacity = '1';
        
        showLoading(false);
        
    } catch (error) {
        console.error('Fetch error:', error);
        appendDebug(`Fetch error: ${error.message}`);
        showStatus(`❌ Failed to fetch template data: ${error.message}`, 'error');
        
        // Keep Validate button disabled if fetch fails
        document.getElementById('validateBtn').disabled = true;
        document.getElementById('validateBtn').style.opacity = '0.5';
        
        showLoading(false);
    }
}

// NEW: Auto-detect Ship ID from Excel data
async function autoDetectShipId() {
    return new Promise((resolve, reject) => {
        Excel.run(async (context) => {
            try {
                const sheets = context.workbook.worksheets;
                sheets.load('items/name');
                await context.sync();
                
                const sheetNames = sheets.items.map(s => s.name);
                
                // Check Voyage Details sheet first (most reliable)
                let voyageSheet = sheets.items.find(s => s.name === 'Voyage Details');
                if (voyageSheet) {
                    const firstDataRow = voyageSheet.getRange('A2:Z2');
                    firstDataRow.load('values, formulas');
                    await context.sync();
                    
                    const values = firstDataRow.values[0];
                    const headers = voyageSheet.getRange('A1:Z1');
                    headers.load('values');
                    await context.sync();
                    
                    const headerRow = headers.values[0];
                    const shipIdIndex = headerRow.findIndex(h => h && h.toUpperCase() === 'SHIPID');
                    
                    if (shipIdIndex >= 0 && values[shipIdIndex]) {
                        resolve(values[shipIdIndex]);
                        return;
                    }
                }
                
                // Check VesselDailyReports sheet (second choice)
                let reportSheet = sheets.items.find(s => s.name === 'VesselDailyReports');
                if (reportSheet) {
                    const firstDataRow = reportSheet.getRange('A2:Z2');
                    firstDataRow.load('values');
                    await context.sync();
                    
                    const values = firstDataRow.values[0];
                    const headers = reportSheet.getRange('A1:Z1');
                    headers.load('values');
                    await context.sync();
                    
                    const headerRow = headers.values[0];
                    const shipIdIndex = headerRow.findIndex(h => h && h.toUpperCase() === 'SHIPID');
                    
                    if (shipIdIndex >= 0 && values[shipIdIndex]) {
                        resolve(values[shipIdIndex]);
                        return;
                    }
                }
                
                // Check hidden _ShipConfig sheet if it exists
                let configSheet = sheets.items.find(s => s.name === '_ShipConfig');
                if (configSheet) {
                    const shipIdCell = configSheet.getRange('B1');
                    shipIdCell.load('values');
                    await context.sync();
                    
                    if (shipIdCell.values[0][0]) {
                        resolve(shipIdCell.values[0][0]);
                        return;
                    }
                }
                
                resolve(null); // Could not find Ship ID
            } catch (error) {
                reject(error);
            }
        });
    });
}

// NEW: Update Excel sheets with fetched data - ROBUST VERSION
async function updateExcelSheetsWithData(templateData) {
    let sheetsUpdated = 0;
    let sheetsFailed = [];
    
    console.log('\n📥 ENTERING updateExcelSheetsWithData function');
    
    try {
        console.log('🔍 Template data summary:');
        console.log('  templateType:', templateData.templateType);
        console.log('  lookupsGuideRows:', templateData.lookupsGuideRows?.length || 0, 'rows');
        console.log('  voyageDetailsRows:', templateData.voyageDetailsRows?.length || 0, 'rows');
        console.log('  lookupRows:', templateData.lookupRows?.length || 0, 'rows');
        console.log('  voyageRows:', templateData.voyageRows?.length || 0, 'rows');
        console.log('  portsRows:', templateData.portsRows?.length || 0, 'rows');
        
        console.log('\n📊 Calling Excel.run()...');
        
        await Excel.run(async (context) => {
            console.log('✅ Inside Excel.run context');
            appendDebug('Excel.run entered');
            
            // Get all sheets
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            console.log('📋 Synced sheet names');
            
            const sheetNames = sheets.items.map(s => s.name);
            console.log('📊 Available sheets:', sheetNames);
            appendDebug(`Sheets found: ${sheetNames.join(', ')}`);
            
            // Try each update
            const updates = [
                {
                    data: templateData.lookupsGuideRows,
                    sheetName: 'Lookups Guide',
                    key: 'Lookups Guide'
                },
                {
                    data: templateData.voyageDetailsRows,
                    sheetName: 'Voyage Details',
                    key: 'Voyage Details'
                },
                {
                    data: templateData.lastReportRow,
                    sheetName: 'VesselDailyReports',
                    key: 'Last Report (VesselDailyReports)',
                    isLastReport: true
                },
                {
                    data: templateData.lookupRows,
                    sheetName: 'Bunkering',
                    key: 'Bunkering'
                },
                {
                    data: templateData.voyageRows,
                    sheetName: 'Voyages',
                    key: 'Voyages'
                },
                {
                    data: templateData.portsRows,
                    sheetName: 'Ports',
                    key: 'Ports'
                }
            ];
            
            console.log(`\n🔄 Processing ${updates.length} potential updates...`);
            
            for (const update of updates) {
                console.log(`\n→ Checking ${update.key}...`);
                
                // Special check for last report row (object, not array)
                if (update.isLastReport) {
                    if (!update.data || Object.keys(update.data).length === 0) {
                        console.log(`   ⏭️  Skipping (no data: empty object)`);
                        appendDebug(`Skipping ${update.key} (no data)`);
                        continue;
                    }
                } else {
                    if (!update.data || update.data.length < 2) {
                        console.log(`   ⏭️  Skipping (no data: ${update.data?.length || 0} rows)`);
                        appendDebug(`Skipping ${update.key} (no data)`);
                        continue;
                    }
                }
                
                const sheet = sheets.items.find(s => s.name === update.sheetName);
                if (!sheet) {
                    console.warn(`   ❌ Sheet "${update.sheetName}" not found in workbook`);
                    console.warn(`   Available: ${sheetNames.join(', ')}`);
                    appendDebug(`Sheet not found: ${update.sheetName}`);
                    sheetsFailed.push(update.key);
                    continue;
                }
                
                try {
                    console.log(`   ✨ Sheet found! Starting update...`);
                    appendDebug(`Updating ${update.key}...`);
                    
                    // Special handling for last report row (single row, not array)
                    if (update.isLastReport && update.data) {
                        console.log(`   📄 This is last report data - single row update`);
                        await updateLastReportRow(context, sheet, update.data);
                    } else {
                        await updateSheetDataRobust(context, sheet, update.data);
                    }
                    
                    sheetsUpdated++;
                    console.log(`   ✅ ${update.key} updated successfully!`);
                    appendDebug(`Updated ${update.key}`);
                } catch (error) {
                    console.error(`   ❌ Failed to update ${update.key}:`, error.message);
                    console.error('   Stack:', error.stack);
                    appendDebug(`Failed ${update.key}: ${error.message}`);
                    sheetsFailed.push(update.key);
                }
            }
            
            console.log('\n🔄 Final context.sync()...');
            await context.sync();
            console.log('✅ Final sync completed');
        });
        
        console.log(`\n📊 UPDATE SUMMARY:`);
        console.log(`   ✅ Successfully updated: ${sheetsUpdated} sheets`);
        if (sheetsFailed.length > 0) {
            console.log(`   ❌ Failed to update: ${sheetsFailed.join(', ')}`);
        }
        console.log('✅ updateExcelSheetsWithData completed successfully\n');
        
        return { sheetsUpdated, sheetsFailed };
    } catch (error) {
        console.error('\n❌ CRITICAL ERROR in updateExcelSheetsWithData:');
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
        appendDebug(`Critical error: ${error.message}`);
        throw error;
    }
}

// NEW: Update last report row in VesselDailyReports sheet
async function updateLastReportRow(context, sheet, reportData) {
    console.log(`\n   📝 updateLastReportRow called`);
    appendDebug(`Updating last report row in ${sheet.name}`);
    
    try {
        console.log(`   📊 reportData type: ${typeof reportData}`);
        console.log(`   📊 reportData is null: ${reportData === null}`);
        console.log(`   📊 reportData keys: ${reportData ? Object.keys(reportData).length : 0}`);
        
        if (!reportData || Object.keys(reportData).length === 0) {
            console.log(`   ⏭️  No report data to write - reportData is empty or null`);
            console.log(`   📄 Full reportData:`, reportData);
            appendDebug(`No report data available - skipping`);
            return;
        }
        
        console.log(`   📋 Report data sample:`, Object.entries(reportData).slice(0, 5));
        
        // Get used range to find actual headers
        const usedRange = sheet.getUsedRange();
        usedRange.load('rowCount, columnCount');
        await context.sync();
        
        const maxCol = usedRange.columnCount;
        console.log(`   📐 Sheet has ${maxCol} columns`);
        
        // Get header row using A1:AL1 format
        const endCol = getColumnLetter(maxCol);
        const headerAddress = `A1:${endCol}1`;
        console.log(`   📍 Getting headers from: ${headerAddress}`);
        
        const headerRange = sheet.getRange(headerAddress);
        headerRange.load('values');
        await context.sync();
        
        if (!headerRange.values || !headerRange.values[0]) {
            console.warn(`   ⚠️ Could not read headers from ${headerAddress}`);
            appendDebug(`Could not read headers, skipping last report update`);
            return;
        }
        
        const headers = headerRange.values[0];
        console.log(`   📋 Found ${headers.length} headers`);
        console.log(`   📋 First 5 headers: ${headers.slice(0, 5).map(h => `"${h}"`).join(', ')}`);
        
        // Build row data based on headers
        const rowData = [];
        let filledCount = 0;
        headers.forEach((header, idx) => {
            const value = reportData[header] !== undefined ? reportData[header] : '';
            if (value) filledCount++;
            rowData.push(value);
        });
        
        console.log(`   📝 Built row with ${rowData.length} columns (${filledCount} filled)`);
        console.log(`   📝 Sample data: ${rowData.slice(0, 5).map(v => `"${v}"`).join(', ')}`);
        
        if (filledCount === 0) {
            console.warn(`   ⚠️ WARNING: All 49 columns are empty! No actual data to write.`);
            appendDebug(`WARNING: No data values found to write`);
            return;
        }
        
        console.log(`   📝 Writing report data (${rowData.length} columns) to row 2`);
        const dataAddress = `A2:${endCol}2`;
        const dataRange = sheet.getRange(dataAddress);
        dataRange.values = [rowData];
        await context.sync();
        
        console.log(`   ✅ Last report row updated with ${filledCount} filled columns`);
        appendDebug(`Last report row updated (${filledCount} filled columns)`);
    } catch (error) {
        console.error(`   ❌ Error updating last report row:`, error.message);
        console.error(`   Stack:`, error.stack);
        appendDebug(`Last report update error: ${error.message}`);
        throw error;
    }
}

// NEW: Robust sheet update that handles protection
async function updateSheetDataRobust(context, sheet, dataRows) {
    console.log(`\n   📝 updateSheetDataRobust called`);
    appendDebug(`Sheet ${sheet.name}: start update`);
    
    try {
        const headers = dataRows[0];
        const dataOnly = dataRows.slice(1);
        
        console.log(`   📋 Sheet name: "${sheet.name}"`);
        console.log(`   📊 Data: ${dataOnly.length} data rows × ${headers.length} columns`);
        
        // Get used range FIRST (don't try to load protection)
        console.log(`   📐 Getting sheet dimensions...`);
        const usedRange = sheet.getUsedRange();
        usedRange.load('rowCount, columnCount');
        await context.sync();
        
        const maxRow = usedRange.rowCount;
        const maxCol = usedRange.columnCount;
        console.log(`   📐 Current size: ${maxRow} rows × ${maxCol} columns`);
        
        // Clear old data (rows 2 to maxRow)
        if (maxRow > 1) {
            try {
                const endCol = getColumnLetter(Math.max(maxCol, headers.length));
                const clearAddress = `A2:${endCol}${maxRow}`;
                console.log(`   🗑️  Clearing range: ${clearAddress}`);
                appendDebug(`Sheet ${sheet.name} clear: ${clearAddress}`);
                
                const clearRange = sheet.getRange(clearAddress);
                clearRange.clear(Excel.ClearApplyTo.contents);
                await context.sync();
                console.log(`   ✅ Cleared ${maxRow - 1} old rows`);
                appendDebug(`Sheet ${sheet.name} cleared`);
            } catch (e) {
                console.warn(`   ⚠️ Could not clear: ${e.message}`);
                // Don't fail - continue trying to write
                appendDebug(`Sheet ${sheet.name} clear warning: ${e.message}`);
            }
        }
        
        // Write new data directly (sheets may be protected - that's OK, we write to unlocked cells)
        if (dataOnly.length > 0) {
            try {
                const endCol = getColumnLetter(headers.length);
                const dataAddress = `A2:${endCol}${1 + dataOnly.length}`;
                console.log(`   📝 Writing new data to: ${dataAddress}`);
                appendDebug(`Sheet ${sheet.name} write: ${dataAddress}`);
                
                const dataRange = sheet.getRange(dataAddress);
                dataRange.values = dataOnly;
                await context.sync();
                console.log(`   ✅ Written ${dataOnly.length} new rows`);
                appendDebug(`Sheet ${sheet.name} written ${dataOnly.length} rows`);
            } catch (e) {
                console.error(`   ❌ Write failed: ${e.message}`);
                appendDebug(`Sheet ${sheet.name} write failed: ${e.message}`);
                throw e;
            }
        }
        
        console.log(`   ✨ Sheet update completed successfully`);
        appendDebug(`Sheet ${sheet.name} update done`);
    } catch (error) {
        console.error(`   ❌ Error in updateSheetDataRobust:`, error.message);
        console.error(`   Stack:`, error.stack);
        appendDebug(`Sheet ${sheet.name} error: ${error.message}`);
        throw error;
    }
}

// Helper: Convert number to column letter (1 -> A, 27 -> AA, etc.)
function getColumnLetter(colNum) {
    let letter = '';
    while (colNum > 0) {
        colNum--;
        letter = String.fromCharCode((colNum % 26) + 65) + letter;
        colNum = Math.floor(colNum / 26);
    }
    return letter;
}

// ===== REPORT STATUS SHEET BUTTON INTEGRATION =====

// NOTE: Report Status Sheet layout is created in the template generator.
// Do not modify layout at runtime to avoid wiping user formatting/content.

// Auto-populate Report Status Sheet configuration cells
async function populateReportStatusSheetConfig() {
    try {
        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            
            const reportStatusSheet = sheets.items.find(s => s.name === 'Report Status');
            if (!reportStatusSheet) {
                console.log('⚠️ Report Status sheet not found - skipping auto-population');
                return;
            }
            
            console.log('📝 Auto-populating Report Status Sheet configuration...');
            
            // Get values from taskpane fields OR localStorage OR uploadToken OR defaults
            let apiUrl = document.getElementById('apiUrl').value || localStorage.getItem('apiUrl') || 'http://localhost:4000';
            let authToken = document.getElementById('authToken').value || uploadToken || localStorage.getItem('authToken') || '';
            let shipId = document.getElementById('shipId').value || localStorage.getItem('shipId') || '';
            
            // Fallback: read embedded upload token if still not available
            if (!authToken) {
                console.log('  ⚠️ No token in taskpane or localStorage, checking _UploadToken sheet...');
                const tokenSheet = sheets.getItemOrNullObject('_UploadToken');
                tokenSheet.load('name');
                await context.sync();
                if (!tokenSheet.isNullObject) {
                    const tokenRange = tokenSheet.getRange('B1');
                    const shipIdRange = tokenSheet.getRange('B2');
                    tokenRange.load('values');
                    shipIdRange.load('values');
                    await context.sync();
                    if (tokenRange.values[0][0]) {
                        uploadToken = tokenRange.values[0][0];
                        authToken = uploadToken;
                        console.log('  ✅ Token read from _UploadToken sheet');
                        // Save for future use
                        localStorage.setItem('authToken', authToken);
                        document.getElementById('authToken').value = authToken;
                    }
                    if (shipIdRange.values[0][0] && !shipId) {
                        shipId = shipIdRange.values[0][0];
                        console.log('  ✅ Ship ID read from _UploadToken sheet:', shipId);
                        localStorage.setItem('shipId', shipId);
                        document.getElementById('shipId').value = shipId;
                    }
                } else {
                    console.log('  ⚠️ _UploadToken sheet not found in workbook');
                }
            }
            
            console.log(`  📍 API URL: ${apiUrl}`);
            console.log(`  🔐 Auth Token: ${authToken ? '✓ Found (' + authToken.substring(0, 15) + '...' + authToken.substring(authToken.length - 10) + ')' : '✗ Missing'}`);
            console.log(`  🚢 Ship ID: ${shipId || '(not set)'}`);
            
            // Populate C4 (API URL)
            const apiUrlCell = reportStatusSheet.getRange('C4');
            apiUrlCell.values = [[apiUrl]];
            apiUrlCell.format.font.bold = false;
            apiUrlCell.format.font.italic = false;
            apiUrlCell.format.font.color = '#000000';
            
            // Populate C5 (Auth Token)
            const authTokenCell = reportStatusSheet.getRange('C5');
            if (authToken && !authToken.includes('[Paste')) {
                authTokenCell.values = [[authToken]];
                authTokenCell.format.font.italic = false;
                authTokenCell.format.font.color = '#000000';
            } else {
                authTokenCell.values = [['[Paste your JWT token here]']];
                authTokenCell.format.font.italic = true;
                authTokenCell.format.font.color = '#999999';
            }
            
            // Populate C6 (Ship ID)
            const shipIdCell = reportStatusSheet.getRange('C6');
            if (shipId) {
                shipIdCell.values = [[shipId]];
                shipIdCell.format.font.italic = false;
                shipIdCell.format.font.color = '#000000';
            } else {
                shipIdCell.values = [['[Auto-detected from template]']];
                shipIdCell.format.font.italic = true;
                shipIdCell.format.font.color = '#999999';
            }
            
            await context.sync();
            console.log('✅ Report Status Sheet config populated successfully');
        });
    } catch (error) {
        console.error('Error populating Report Status Sheet:', error);
    }
}

// Set up button click detection for Report Status Sheet
async function setupReportStatusSheetButtons() {
    console.log('🎮 Setting up Report Status Sheet button monitoring...');
    
    try {
        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            
            const reportStatusSheet = sheets.items.find(s => s.name === 'Report Status');
            if (!reportStatusSheet) {
                console.log('⚠️ Report Status sheet not found');
                return;
            }
            
            // Register the event handler - it persists across contexts
            reportStatusSheet.onSelectionChanged.add(onButtonCellSelected);
            await context.sync();
            console.log('✅ Report Status Sheet event listener registered');
        });
    } catch (error) {
        console.error('Error setting up button monitoring:', error);
    }
    
    // Also restore polling as backup in case events don't fire
    setInterval(() => {
        checkReportStatusSheetButtons();
    }, 1000); // Increased to 1 second to reduce overhead
}

// Event handler for button cell selection - triggers action once per selection
async function onButtonCellSelected(event) {
    console.log('📍 Cell selected:', event.address);
    try {
        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            
            const reportStatusSheet = sheets.items.find(s => s.name === 'Report Status');
            if (!reportStatusSheet) return;
            
            const range = reportStatusSheet.getRange(event.address);
            range.load('address');
            await context.sync();
            
            let cellAddress = range.address.split('!')[1] || range.address;
            console.log(`Cell address resolved to: ${cellAddress}`);

            const normalizedAddress = cellAddress.includes('!') ? cellAddress.split('!')[1] : cellAddress;
const isButtonCell = normalizedAddress === 'B10' || normalizedAddress === 'C10' ||
                                normalizedAddress === 'D10' || normalizedAddress === 'E10';

            if (isButtonCell) {
                currentlySelectedButtonCell = normalizedAddress;
                console.log(`📌 Button cell selected: ${normalizedAddress}.`);

                const now = Date.now();
                if (!buttonSelectArmed || isExecuting) {
                    return;
                }

                // Debounce: Prevent same cell trigger within CLICK_DEBOUNCE_MS
                if (normalizedAddress === lastClickedCell && (now - lastClickTime) < CLICK_DEBOUNCE_MS) {
                    return;
                }

                buttonSelectArmed = false;
                lastClickedCell = normalizedAddress;
                lastClickTime = now;

                if (normalizedAddress === 'B10') {
                    console.log('📥 Fetch button activated (selection)');
                    await handleSheetFetchButton();
                } else if (normalizedAddress === 'C10') {
                    console.log('✓ Validate button activated (selection)');
                    await handleSheetValidateButton();
                } else if (normalizedAddress === 'D10' || normalizedAddress === 'E10') {
                    console.log('📤 Send button activated (selection)');
                    await handleSheetSendButton();
                }
            } else {
                currentlySelectedButtonCell = null;
                buttonSelectArmed = true;
            }
        });
    } catch (err) {
        console.error('Error in selection handler:', err);
    }
}

// Keyboard event listener for Enter key on button cells
function setupKeyboardListener() {
    if (!ENABLE_KEYBOARD_ACTIVATION) return;
    if (keyboardListenerAttached) return;
    
    document.addEventListener('keydown', async (event) => {
        // Detect Enter key press
        if (event.key === 'Enter' && currentlySelectedButtonCell) {
            // Check if we're in debounce period
            const now = Date.now();
            if (now - lastKeyboardPressTime < CLICK_DEBOUNCE_MS) {
                console.log('⏳ Keyboard activation debounced - too recent');
                return;
            }
            
            event.preventDefault(); // Prevent Excel's default enter behavior
            console.log(`🔑 ENTER pressed on ${currentlySelectedButtonCell}`);
            lastKeyboardPressTime = now; // Update last keyboard press time
            
            // Activate the appropriate button
            if (currentlySelectedButtonCell === 'B10') {
                console.log('📥 Fetch button activated!');
                await handleSheetFetchButton();
            } else if (currentlySelectedButtonCell === 'C10') {
                console.log('✓ Validate button activated!');
                await handleSheetValidateButton();
            } else if (currentlySelectedButtonCell === 'D10' || currentlySelectedButtonCell === 'E10') {
                console.log('📤 Send button activated!');
                await handleSheetSendButton();
            }
        }
    });
    
    keyboardListenerAttached = true;
    console.log('⌨️ Keyboard listener attached for button activation');
}

// Apply visual styling to button cells to indicate they are clickable
async function styleReportStatusSheetButtons() {
    try {
        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            
            const reportStatusSheet = sheets.items.find(s => s.name === 'Report Status');
            if (!reportStatusSheet) return;
            
            // Style button cells - add border glow effect and ensure locked
            const buttonCells = ['B10', 'C10', 'D10:E10'];
            
            buttonCells.forEach(cellRange => {
                const range = reportStatusSheet.getRange(cellRange);
                // Note: Pointer cursor styling happens on Excel client side (not directly controllable via Office.js)
                // The locked property prevents editing
            });
            
            await context.sync();
            console.log('✅ Button cells styled as read-only and clickable');
        });
    } catch (error) {
        console.error('Error styling button cells:', error);
    }
}

// Backup function for button detection (MONITORING ONLY - do not trigger)
async function checkReportStatusSheetButtons() {
    // This function now only monitors which cell is selected
    // It does NOT trigger button actions - ENTER key does that
    try {
        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            
            const reportStatusSheet = sheets.items.find(s => s.name === 'Report Status');
            if (!reportStatusSheet) return;
            
            // Get the active cell
            const selection = context.workbook.getSelectedRange();
            selection.load('address');
            await context.sync();
            
            const activeCell = selection.address;
            
            // Extract cell address (remove sheet name if present)
            let cellAddress = activeCell;
            if (activeCell.includes('!')) {
                cellAddress = activeCell.split('!')[1];
            }
            
            // Just log which button is selected - don't trigger it
            // Triggering only happens when user presses ENTER
            if (cellAddress.startsWith('B10') || cellAddress.startsWith('C10') || cellAddress.startsWith('D10') || cellAddress.startsWith('E10')) {
                // Button cell selected - wait for ENTER key to trigger
                console.log(`📍 Button cell selected: ${cellAddress} (Press ENTER to activate)`);
            }
        });
    } catch (error) {
        // Silently continue
    }
}

// Read configuration from Report Status Sheet
async function readReportStatusSheetConfig() {
    try {
        return await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            
            const reportStatusSheet = sheets.items.find(s => s.name === 'Report Status');
            if (!reportStatusSheet) {
                return {
                    apiUrl: document.getElementById('apiUrl').value || 'http://localhost:4000',
                    authToken: document.getElementById('authToken').value || uploadToken || '',
                    shipId: document.getElementById('shipId').value || ''
                };
            }
            
            // Read configuration cells
            const apiUrlCell = reportStatusSheet.getRange('C4');
            const authTokenCell = reportStatusSheet.getRange('C5');
            const shipIdCell = reportStatusSheet.getRange('C6');
            
            apiUrlCell.load('values');
            authTokenCell.load('values');
            shipIdCell.load('values');
            await context.sync();
            
            // Use sheet values if available, fallback to taskpane fields
            const apiUrl = (apiUrlCell.values[0][0] || document.getElementById('apiUrl').value || 'http://localhost:4000').toString().trim();
            const rawAuthToken = (authTokenCell.values[0][0] || '').toString().trim();
            const isPlaceholderToken =
                rawAuthToken === '' ||
                rawAuthToken.includes('[Paste your JWT token here]') ||
                rawAuthToken.endsWith('...');
            const authToken = (isPlaceholderToken ? (document.getElementById('authToken').value || uploadToken || '') : rawAuthToken).toString().trim();
            const shipId = (shipIdCell.values[0][0] || document.getElementById('shipId').value || '').toString().trim();
            
            return { apiUrl, authToken, shipId };
        });
    } catch (error) {
        // Fallback to taskpane fields
        return {
            apiUrl: document.getElementById('apiUrl').value || 'http://localhost:4000',
            authToken: document.getElementById('authToken').value || uploadToken || '',
            shipId: document.getElementById('shipId').value || ''
        };
    }
}

// Update Report Status Sheet status area
async function updateReportStatusSheetStatus(message, isSuccess = true) {
    try {
        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load('items/name');
            await context.sync();
            
            const reportStatusSheet = sheets.items.find(s => s.name === 'Report Status');
            if (!reportStatusSheet) {
                console.log('⚠️ Report Status sheet not found for status update');
                return;
            }
            
            // Update status in merged range B13:E14
            const statusCell = reportStatusSheet.getRange('B13');
            const emoji = isSuccess ? '✅' : '⚠️';
            const timestamp = new Date().toLocaleTimeString();
            
            // Set the value in B13 (which is merged to E14)
            statusCell.values = [[`${emoji} ${timestamp}: ${message}`]];
            
            // Apply formatting to the merged range B13:E14
            const mergedRange = reportStatusSheet.getRange('B13:E14');
            mergedRange.format.font.bold = true;
            mergedRange.format.wrapText = true;
            
            if (isSuccess) {
                mergedRange.format.fill.color = '00FF00';  // Green background
                mergedRange.format.font.color = '006400';  // Dark green text
            } else {
                mergedRange.format.fill.color = 'FF0000';  // Red background
                mergedRange.format.font.color = 'FFFFFF';  // White text
            }
            
            await context.sync();
            console.log(`📊 Status updated in B13:E14: ${message}`);
        });
    } catch (error) {
        console.error('❌ Error updating Report Status sheet status:', error);
        console.error('Error details:', error.message, error.stack);
    }
}

// Handle Fetch Latest Data button from sheet
async function handleSheetFetchButton() {
    if (isExecuting) {
        console.log('⏸️ Fetch already executing, skipping duplicate click');
        return;
    }
    
    isExecuting = true;
    try {
        // First, ensure config cells are populated
        console.log('🔄 Ensuring config cells are populated...');
        await populateReportStatusSheetConfig();
        
        const config = await readReportStatusSheetConfig();
        
        // Validate config
        if (!config.apiUrl) {
            showStatus('❌ API URL is missing', 'error');
            await updateReportStatusSheetStatus('API URL is missing. Please enter in C4', false);
            return;
        }
        
        // Sync to taskpane fields
        document.getElementById('apiUrl').value = config.apiUrl;
        document.getElementById('authToken').value = config.authToken;
        document.getElementById('shipId').value = config.shipId;
        
        // Call the main fetch function
        await updateReportStatusSheetStatus('Fetching latest template data...', true);
        await fetchLatestTemplateData();
        
        // Update status with success message
        await updateReportStatusSheetStatus(`SUCCESS! Template data refreshed for Ship ${config.shipId}!`, true);
        
    } catch (error) {
        console.error('Error in sheet fetch button:', error);
        await updateReportStatusSheetStatus(`Fetch failed: ${error.message}`, false);
    } finally {
        isExecuting = false;  // Always reset flag so button can be clicked again
    }
}

// Handle Validate Report button from sheet
async function handleSheetValidateButton() {
    if (isExecuting) {
        console.log('⏸️ Validation already executing, skipping duplicate click');
        return;
    }
    
    isExecuting = true;
    try {
        // First, ensure config cells are populated
        console.log('🔄 Ensuring config cells are populated...');
        await populateReportStatusSheetConfig();
        
        await updateReportStatusSheetStatus('Validating report...', true);
        await validateReport();
        
    } catch (error) {
        console.error('Error in sheet validate button:', error);
        await updateReportStatusSheetStatus(`Validation failed: ${error.message}`, false);
    } finally {
        isExecuting = false;  // Always reset flag so button can be clicked again
    }
}

// Handle Send Report button from sheet
async function handleSheetSendButton() {
    if (isExecuting) {
        console.log('⏸️ Send already executing, skipping duplicate click');
        return;
    }
    
    isExecuting = true;
    try {
        // First, ensure config cells are populated
        console.log('🔄 Ensuring config cells are populated...');
        await populateReportStatusSheetConfig();
        
        const config = await readReportStatusSheetConfig();
        
        // Validate config
        if (!config.apiUrl) {
            showStatus('❌ API URL is missing', 'error');
            await updateReportStatusSheetStatus('API URL is missing. Please enter in C4', false);
            return;
        }
        
        if (!config.authToken) {
            showStatus('❌ Auth Token is missing', 'error');
            await updateReportStatusSheetStatus('Auth Token is missing. Please enter in C5', false);
            return;
        }
        
        // Sync to taskpane fields
        document.getElementById('apiUrl').value = config.apiUrl;
        document.getElementById('authToken').value = config.authToken;
        document.getElementById('shipId').value = config.shipId;
        
        // Call the main upload function
        await updateReportStatusSheetStatus('Sending report...', true);
        await uploadReport();
        
    } catch (error) {
        console.error('Error in sheet send button:', error);
        await updateReportStatusSheetStatus(`Send failed: ${error.message}`, false);
    } finally {
        isExecuting = false;  // Always reset flag so button can be clicked again
    }
}


