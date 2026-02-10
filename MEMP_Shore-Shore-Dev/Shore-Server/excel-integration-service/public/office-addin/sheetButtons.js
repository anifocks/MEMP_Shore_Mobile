// Shared button handling logic for Report Status sheet
// This file is loaded by both taskpane.js and commands.html to enable buttons without taskpane

let isButtonExecuting = false;

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
            
            // Update status area (B12:E13 - merged cell below status header)
            const statusCell = reportStatusSheet.getRange('B12');
            const emoji = isSuccess ? '✅' : '❌';
            const timestamp = new Date().toLocaleTimeString();
            
            // Set the value in B12 (which is merged to E13)
            statusCell.values = [[`${emoji} ${timestamp}: ${message}`]];
            
            // Apply formatting to the merged range
            const mergedRange = reportStatusSheet.getRange('B12:E13');
            mergedRange.format.font.bold = true;
            
            if (isSuccess) {
                mergedRange.format.fill.color = '00FF00';  // Green background
                mergedRange.format.font.color = '006400';  // Dark green text
            } else {
                mergedRange.format.fill.color = 'FF0000';  // Red background
                mergedRange.format.font.color = 'FFFFFF';  // White text
            }
            
            await context.sync();
            console.log(`📊 Status updated in B12: ${message}`);
        });
    } catch (error) {
        console.error('❌ Error updating Report Status sheet status:', error);
        console.error('Error details:', error.message, error.stack);
    }
}

// Read configuration from Report Status Sheet
async function readReportStatusSheetConfig() {
    return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load('items/name');
        await context.sync();
        
        const reportStatusSheet = sheets.items.find(s => s.name === 'Report Status');
        if (!reportStatusSheet) {
            console.log('⚠️ Report Status sheet not found');
            return {};
        }
        
        const apiUrlCell = reportStatusSheet.getRange('C4');
        const authTokenCell = reportStatusSheet.getRange('C5');
        const shipIdCell = reportStatusSheet.getRange('C6');
        
        apiUrlCell.load('values');
        authTokenCell.load('values');
        shipIdCell.load('values');
        await context.sync();
        
        return {
            apiUrl: apiUrlCell.values[0][0],
            authToken: authTokenCell.values[0][0],
            shipId: shipIdCell.values[0][0]
        };
    });
}

// Handle Fetch Latest Data button
async function handleSheetFetchButton() {
    if (isButtonExecuting) {
        console.log('⏸️ Action already executing, skipping');
        return;
    }
    
    isButtonExecuting = true;
    try {
        console.log('📥 Fetching latest template data from sheet button...');
        await updateReportStatusSheetStatus('Fetching latest template data...', true);
        
        const config = await readReportStatusSheetConfig();
        
        if (!config.apiUrl) {
            await updateReportStatusSheetStatus('API URL is missing. Please enter in C4', false);
            return;
        }
        
        if (!config.shipId) {
            await updateReportStatusSheetStatus('Ship ID is missing. Please enter in C6', false);
            return;
        }
        
        // Build fetch URL
        const gatewayUrl = `${config.apiUrl}/api/excel/template-data?shipId=${config.shipId}&type=VESSEL`;
        const directUrl = `${config.apiUrl.replace(':4000', ':5008')}/api/excel/template-data?shipId=${config.shipId}&type=VESSEL`;
        
        console.log(`🔗 Fetching from: ${gatewayUrl}`);
        
        let response = await fetch(gatewayUrl).catch(() => null);
        if (!response || !response.ok) {
            console.log('⚠️ Gateway failed, trying direct...');
            response = await fetch(directUrl).catch(() => null);
        }
        
        if (!response || !response.ok) {
            throw new Error('Both gateway and direct endpoints failed');
        }
        
        const templateData = await response.json();
        console.log('✅ Template data fetched successfully');
        
        // Update Excel sheets
        await updateExcelSheetsWithData(templateData);
        
        await updateReportStatusSheetStatus(`SUCCESS! Data refreshed for Ship ${config.shipId}!`, true);
        
    } catch (error) {
        console.error('❌ Fetch error:', error);
        await updateReportStatusSheetStatus(`Fetch failed: ${error.message}`, false);
    } finally {
        isButtonExecuting = false;
    }
}

// Update Excel sheets with fetched data
async function updateExcelSheetsWithData(templateData) {
    // This is a simplified version - expand as needed
    console.log('📊 Updating Excel sheets with data...');
    // Add your sheet update logic here
}

// Monitor Report Status sheet for button clicks
async function startButtonMonitoring() {
    console.log('🎮 Starting button monitoring...');
    
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
            
            // Add keyboard event listener
            context.workbook.onSelectionChanged.add(async (event) => {
                await handleSelectionChange(event);
            });
            
            await context.sync();
            console.log('✅ Button monitoring active');
        });
    } catch (error) {
        console.error('Error setting up monitoring:', error);
    }
}

// Handle selection changes to detect button activation
async function handleSelectionChange(event) {
    try {
        await Excel.run(async (context) => {
            const range = context.workbook.getSelectedRange();
            range.load(['address', 'worksheet']);
            await context.sync();
            
            const sheetName = range.worksheet.name;
            if (sheetName !== 'Report Status') return;
            
            const address = range.address.split('!')[1];
            
            // Detect button cells
            if (address === 'B9') {
                console.log('📥 FETCH button selected - Click to activate');
            } else if (address === 'C9') {
                console.log('✓ VALIDATE button selected - Click to activate');
            } else if (address === 'D9' || address === 'E9') {
                console.log('📤 SEND button selected - Click to activate');
            }
        });
    } catch (error) {
        // Ignore errors during selection changes
    }
}
