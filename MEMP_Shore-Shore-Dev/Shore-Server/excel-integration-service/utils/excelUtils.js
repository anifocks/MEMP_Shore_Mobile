// addeditpage breakup/viswa-digital-backend/excel-integration-service/utils/excelUtils.js

import pkg from 'exceljs';
const Workbook = pkg.Workbook || pkg; 
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path'; 
import { fileURLToPath } from 'url'; 
import { createUploadTokenSheet } from './reportStatusSheetHelper.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Global Constants ---
const UPLOADS_BASE_DIR = path.join(__dirname, '../public/uploads/');

// --- Helper functions for formatting and setup ---

// Helper to escape CSV values
const escapeCsv = (value) => {
    if (value === null || value === undefined) return '';
    let str = String(value);
    // If the string contains a comma, quote, or newline, quote the entire field
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        // Escape internal quotes by doubling them (" becomes "")
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

// Sheet mapping for CSV storage (Only includes the 7 requested sheets)
const CSV_SHEET_MAPPING = {
    'VesselDailyReports': { file: 'VesselDailyReports.csv', folder: 'VesselDailyReports' },
    'Machinery Data': { file: 'Machinery_Data.csv', folder: 'MachineryData' },
    'Fuel Consumption': { file: 'Fuel_Consumption.csv', folder: 'Fuel_Consumption' },
    'Lube Oil Consumption': { file: 'LubeOilConsumption.csv', folder: 'LubeOilConsumption' },
    'Bunker ROB': { file: 'Bunker_ROB.csv', folder: 'Bunker_ROB' },
    'Fuel ROB': { file: 'Fuel_ROB.csv', folder: 'Fuel_ROB' },
    'Lube Oil ROB': { file: 'Lube_Oil_ROB.csv', folder: 'Lube_Oil_ROB' },
};

const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    }
};

// NEW STYLE: Green Header Style for highligted columns
const greenHeaderStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '00B050' } }, // Bright Green
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    }
};

const dataStyle = {
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    }
};

// NEW STYLE: Same as dataStyle but without borders - APPLIED TO ALL FUNCTIONAL SHEET DATA ROWS
const dataStyleNoBorder = {
    alignment: { vertical: 'middle', horizontal: 'left' },
};

// Helper: Hide formulas while keeping non-formula cells editable
const applyFormulaProtection = async (sheet, maxRows, allowEditableFormulaCols = []) => {
    if (!sheet || !sheet.columnCount) return;
    const rowLimit = Math.max(1, maxRows || sheet.rowCount || 1);
    const editableFormulaSet = new Set((allowEditableFormulaCols || []).map(col => String(col).toUpperCase()));

    for (let rowNum = 1; rowNum <= rowLimit; rowNum++) {
        const row = sheet.getRow(rowNum);
        for (let col = 1; col <= sheet.columnCount; col++) {
            const cell = row.getCell(col);
            const hasFormula = cell.value && typeof cell.value === 'object' && 'formula' in cell.value;
            if (hasFormula && editableFormulaSet.has(sheet.getColumn(col).letter)) {
                cell.protection = { locked: false, hidden: false };
            } else {
                cell.protection = hasFormula
                    ? { locked: true, hidden: true }
                    : { locked: false, hidden: false };
            }
        }
    }

    await sheet.protect('memp', {
        selectLockedCells: false,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: false,
        insertHyperlinks: false,
        deleteColumns: false,
        deleteRows: false,
        sort: false,
        autoFilter: false,
        pivotTables: false
    });
};


// Helper to format date/time consistently for Excel cells
const formatExcelDateTime = (dateValue, timezone, includeTime = true) => {
    if (!dateValue) return '';
    const FORMAT = includeTime ? 'DD-MM-YYYY HH:mm' : 'DD-MM-YYYY'; 
    try {
        const m = moment.utc(dateValue); 
        // If you want exactly what is in the DB, ignore the 'timezone' logic 
        // that shifts the time, or ensure the conversion logic is strictly what you need.
        return m.format(FORMAT); 
    } catch (e) {
        return String(dateValue);
    }
};

// Helper function to create Report Status Sheet (First Sheet)
const createReportStatusSheet = (workbook) => {
    const statusSheet = workbook.addWorksheet('Report Status', { properties: { tabColor: 'FF0000' } });
    
    // Set column widths for 4-column layout
    statusSheet.columns = [
        { width: 2 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 35 }
    ];

    // Title
    statusSheet.mergeCells('B1:E1');
    const titleCell = statusSheet.getCell('B1');
    titleCell.value = '📋 MEMP_SHORE - VESSEL REPORT UPLOADER';
    titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4788' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    statusSheet.getRow(1).height = 30;

    let rowNum = 3;

    // ===== CONFIGURATION SECTION =====
    statusSheet.mergeCells(`B${rowNum}:E${rowNum}`);
    let cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '⚙️ CONFIGURATION';
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    statusSheet.getRow(rowNum).height = 22;
    rowNum++;

    // API URL Label and Field
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '🔗 API URL:';
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    
    statusSheet.mergeCells(`C${rowNum}:E${rowNum}`);
    cell = statusSheet.getCell(`C${rowNum}`);
    cell.value = 'http://localhost:4000';
    ['C', 'D', 'E'].forEach((col) => {
        statusSheet.getCell(`${col}${rowNum}`).protection = { locked: false };
    });
    rowNum++;

    // Auth Token Label and Field
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '🔐 Auth Token:';
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    
    statusSheet.mergeCells(`C${rowNum}:E${rowNum}`);
    cell = statusSheet.getCell(`C${rowNum}`);
    cell.value = '[Paste your JWT token here]';
    ['C', 'D', 'E'].forEach((col) => {
        statusSheet.getCell(`${col}${rowNum}`).protection = { locked: false };
    });
    rowNum++;

    // Ship ID Label and Field
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '🚢 Ship ID:';
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    
    statusSheet.mergeCells(`C${rowNum}:E${rowNum}`);
    cell = statusSheet.getCell(`C${rowNum}`);
    cell.value = '[Auto-detected from template]';
    ['C', 'D', 'E'].forEach((col) => {
        statusSheet.getCell(`${col}${rowNum}`).protection = { locked: false };
    });
    rowNum += 2;

    // ===== INSTRUCTION ROW =====
    statusSheet.mergeCells(`B${rowNum}:E${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '⚙️ FIRST TIME SETUP: Open add-in (Home tab → MEMP_Shore → Send Report), then SAVE file. Taskpane will auto-open next time!';
    cell.font = { bold: true, size: 9, color: { argb: '0066CC' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E7F3FF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    statusSheet.getRow(rowNum).height = 30;
    rowNum++;

    // ===== CONTROL BUTTONS =====
    statusSheet.mergeCells(`B${rowNum}:E${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '🎮 ACTION BUTTONS - Click any button below';
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9534F' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    statusSheet.getRow(rowNum).height = 22;
    rowNum++;

    // Button 1: Fetch Latest Data
    const fetchButtonRow = rowNum;
    statusSheet.getRow(rowNum).height = 28;
    statusSheet.mergeCells(`B${rowNum}:B${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '📥 FETCH LATEST DATA';
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '70AD47' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
    cell.locked = true; // Make read-only

    // Button 2: Validate Report
    const validateButtonRow = rowNum;
    statusSheet.mergeCells(`C${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`C${rowNum}`);
    cell.value = '✓ VALIDATE REPORT';
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '5CB85C' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
    cell.locked = true; // Make read-only

    // Button 3: Send Report
    const sendButtonRow = rowNum;
    statusSheet.mergeCells(`D${rowNum}:E${rowNum}`);
    cell = statusSheet.getCell(`D${rowNum}`);
    cell.value = '📤 SEND REPORT';
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0275D8' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
    cell.locked = true; // Make read-only
    rowNum += 2;

    // ===== STATUS AREA =====
    // Status header row
    statusSheet.mergeCells(`B${rowNum}:E${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '📊 OPERATION STATUS';
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    statusSheet.getRow(rowNum).height = 20;
    rowNum++;

    // Notification area B13:E14 (merged for all notifications)
    statusSheet.mergeCells(`B${rowNum}:E${rowNum + 1}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = 'Ready. Click a button above to perform an action.';
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    cell.font = { size: 10 };
    cell.protection = { locked: false };  // Allow add-in to write status here
    statusSheet.getRow(rowNum).height = 40;
    
    rowNum += 2;

    // Store cell references for taskpane to use
    statusSheet.apiUrlCell = 'C4';
    statusSheet.authTokenCell = 'C5';
    statusSheet.shipIdCell = 'C6';
    statusSheet.fetchButtonCell = `B${fetchButtonRow}`;
    statusSheet.validateButtonCell = `C${validateButtonRow}`;
    statusSheet.sendButtonCell = `D${sendButtonRow}`;
    statusSheet.statusAreaCell = `B${rowNum - 2}`;
    rowNum++;

    rowNum++;

    // Section 1: Overview
    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '1. OVERVIEW';
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    statusSheet.getRow(rowNum).height = 20;
    rowNum++;

    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = 'This template contains all sheets required for submitting vessel operational data including daily reports, machinery data, fuel consumption, and bunker information.';
    cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    statusSheet.getRow(rowNum).height = 30;
    rowNum++;

    // Section 2: Data Entry Instructions
    rowNum++;
    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '2. DATA ENTRY INSTRUCTIONS';
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    statusSheet.getRow(rowNum).height = 20;
    rowNum++;

    const dataInstructions = [
        '✓ Fill in all required fields marked with green headers in each sheet',
        '✓ Use dropdown menus where available for consistent data entry',
        '✓ Dates should be entered in DD-MM-YYYY format',
        '✓ Do not delete or rename any sheets',
        '✓ Do not modify the "Lookups Guide" and "Voyage Details" sheets',
        '✓ Save your work frequently to avoid data loss'
    ];

    dataInstructions.forEach(instruction => {
        statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
        cell = statusSheet.getCell(`B${rowNum}`);
        cell.value = instruction;
        cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        statusSheet.getRow(rowNum).height = 25;
        rowNum++;
    });

    // Section 3: Submission Steps
    rowNum++;
    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '3. SUBMISSION STEPS';
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    statusSheet.getRow(rowNum).height = 20;
    rowNum++;

    const submissionSteps = [
        'Step 1: Complete all data entry in the relevant sheets',
        'Step 2: Save this file to your computer',
        'Step 3: Open the MEMP_Shore Excel add-in (Home → Send Report)',
        'Step 4: Validate the report in the add-in',
        'Step 5: Click "Send Report" to upload'
    ];

    submissionSteps.forEach((step, index) => {
        statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
        cell = statusSheet.getCell(`B${rowNum}`);
        cell.value = step;
        cell.font = { color: { argb: index < 4 ? '1F4788' : '595959' } };
        cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        statusSheet.getRow(rowNum).height = 22;
        rowNum++;
    });

    // Section 4: Support
    rowNum++;
    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '4. NEED HELP?';
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    statusSheet.getRow(rowNum).height = 20;
    rowNum++;

    const supportInfo = [
        '📧 Email: viswadigital@theviswagroup.com',
        '📞 Phone: +1-800-MEMP-SHIP',
        '🌐 Website: https://veemsonboardupgrade.theviswagroup.com/',
        '📚 Documentation: https://docs.memp-ship.com/excel-upload',
        '⏰ Support Hours: Monday - Friday, 9:00 AM - 6:00 PM IST'
    ];

    supportInfo.forEach(info => {
        statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
        cell = statusSheet.getCell(`B${rowNum}`);
        cell.value = info;
        cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        statusSheet.getRow(rowNum).height = 20;
        rowNum++;
    });

    // Section 5: Status tracking
    rowNum++;
    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '5. TRACK YOUR SUBMISSION';
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    statusSheet.getRow(rowNum).height = 20;
    rowNum++;

    const trackingInfo = [
        'After submission, you will receive a unique Report ID',
        'Use this ID to track the status of your submission',
        'Status updates will be sent to your registered email address',
        'Estimated processing time: 24-48 hours'
    ];

    trackingInfo.forEach(info => {
        statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
        cell = statusSheet.getCell(`B${rowNum}`);
        cell.value = info;
        cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        statusSheet.getRow(rowNum).height = 22;
        rowNum++;
    });

    // Footer
    rowNum++;
    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '✅ Report generated: ' + new Date().toLocaleString();
    cell.font = { italic: true, size: 10, color: { argb: '7F7F7F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Freeze the first row
    statusSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Enable sheet protection to enforce locked cells on button cells
    const protectionOptions = {
        sheet: true,
        objects: true,
        scenarios: true,
        formatRows: false,
        formatColumns: false,
        formatCells: false,
        deleteColumns: false,
        deleteRows: false,
        insertColumns: false,
        insertRows: false,
        insertHyperlinks: false,
        selectLockedCells: true,
        sort: true,
        autoFilter: true,
        pivotTables: false,
        selectUnlockedCells: true
    };
    
    try {
        // ExcelJS protect method: protect(password, options)
        statusSheet.protect('', protectionOptions);
        console.log('✅ Sheet protection enabled for button cells');
    } catch (err) {
        console.warn('Sheet protection may not be fully supported:', err.message);
    }

    return statusSheet;
};

// Static Time Zone List for the lookup sheet
const TIME_ZONES = [
    '(UTC−12:00)', '(UTC−11:00)', '(UTC−10:00)', '(UTC−09:30)', '(UTC−09:00)', '(UTC−08:00)', '(UTC−07:00)', '(UTC−06:00)',
    '(UTC−05:00)', '(UTC−04:00)', '(UTC−03:30)', '(UTC−03:00)', '(UTC−02:00)', '(UTC−01:00)', '(UTC±00:00)', '(UTC+01:00)',
    '(UTC+02:00)', '(UTC+03:00)', '(UTC+03:30)', '(UTC+04:00)', '(UTC+04:30)', '(UTC+05:00)', '(UTC+05:30)', '(UTC+05:45)',
    '(UTC+06:00)', '(UTC+06:30)', '(UTC+07:00)', '(UTC+08:00)', '(UTC+08:30)', '(UTC+08:45)', '(UTC+09:00)', '(UTC+09:30)',
    '(UTC+10:00)', '(UTC+10:30)', '(UTC+11:00)', '(UTC+12:00)'
];

// Helper to get Excel column letter from column key (1-based index conversion)
const getColumnLetter = (sheet, key) => {
    const columnIndex = sheet.columns.findIndex(col => col.key === key);
    if (columnIndex === -1) return null;
    let temp = columnIndex + 1;
    let letter = '';
    while (temp > 0) {
        let remainder = (temp - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        temp = Math.floor((temp - 1) / 26);
    }
    return letter;
};
const addDataRow = (sheet, data, style) => {
    const row = sheet.addRow(data);
    row.eachCell(cell => { cell.style = style; });
    return row;
};


// -----------------------------------------------------------
// ADDED: Helper to read a saved CSV file and manually parse it
// -----------------------------------------------------------
const readCsvFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        // Split by CRLF (which was used for writing)
        const lines = fileContent.trim().split('\r\n');
        if (lines.length < 2) {
            return []; // Only header or empty
        }

        // Clean headers: remove surrounding quotes and un-double internal quotes
        const headers = lines[0].split(',').map(h => 
            h.replace(/^"|"$/g, '').replace(/""/g, '"').trim()
        ); 
        
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === '') continue;

            // Simple split by comma. This is a basic approach that relies on values not having 
            // unescaped internal commas, which should be true based on the existing `escapeCsv` logic.
            const values = line.split(','); 
            const record = {};
            
            for (let j = 0; j < headers.length && j < values.length; j++) {
                let currentKey = headers[j].trim(); // Get the current header name
                
                let value = values[j];
                // Basic un-escape of field value
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1).replace(/""/g, '"');
                }

                // Map to the standardized JSON keys (Replicating logic from parseExcelReport)
                let finalKey = currentKey; 

                // --- START KEY STANDARDIZATION ---
                if (currentKey.includes('ReportTypeKey')) finalKey = 'ReportTypeKey';
                else if (currentKey.includes('FuelTypeKey')) finalKey = 'FuelTypeKey';
                else if (currentKey.includes('LOTypeKey')) finalKey = 'LOTypeKey';
                else if (currentKey.includes('MachineryName')) finalKey = 'MachineryName';
                else if (currentKey.includes('MachineryTypeKey')) finalKey = 'MachineryTypeKey';
                else if (currentKey.includes('SpecificMachineryName')) finalKey = 'SpecificMachineryName';
                else if (currentKey.includes('ConsumedMT')) finalKey = 'ConsumedMT';
                else if (currentKey.includes('Consumed_Quantity')) finalKey = 'Consumed_Quantity';
                else if (currentKey.includes('Bunkered_Quantity')) finalKey = 'Bunkered_Quantity';
                else if (currentKey.includes('Initial_Quantity')) finalKey = 'Initial_Quantity';
                else if (currentKey.includes('Final_Quantity')) finalKey = 'Final_Quantity';
                else if (currentKey.includes('Running_Hrs')) finalKey = 'Running_Hrs';
                else if (currentKey === 'Total_Power') finalKey = 'Total_Power';
                else if (currentKey === 'ChartererSpeed') finalKey = 'ChartererSpeed';
                else if (currentKey.includes('BDN_Number')) finalKey = 'BDN_Number'; // ADDED for robustness
                else if (currentKey.includes('ItemCategory')) finalKey = 'ItemCategory'; // ADDED for robustness
                else if (currentKey === 'ChartererConsumption') finalKey = 'ChartererConsumption';
                // --- END KEY STANDARDIZATION ---

                record[finalKey] = value.trim();
            }

            // Apply simple numeric parsing for common fields expected by the preview display logic
            const numericFields = ['ConsumedMT', 'ConsumedQty', 'Bunkered_Quantity', 'Consumed_Quantity', 'Initial_Quantity', 'Final_Quantity', 'Running_Hrs', 'Power', 'RPM', 'SpeedKnots', 'CourseDEG', 'DistanceSinceLastReportNM', 'EngineDistanceNM', 'DistanceToGoNM', 'DistanceTravelledHS_NM', 'ReportDuration', 'SteamingHoursPeriod', 'TimeAtAnchorageHRS', 'TimeAtDriftingHRS', 'SwellHeightM', 'AirTemperatureC', 'SeaTemperatureC', 'BarometricPressureHPa', 'ReportedCargoQuantityMT', 'ContainersTEU', 'DisplacementMT', 'FwdDraft', 'AftDraft', 'MidDraft', 'Trim', 'ChartererSpeed', 'ChartererConsumption', 'Consumed'];
            
            for (const field of numericFields) {
                if (record[field] !== undefined) {
                    const num = parseFloat(record[field]);
                    // If it's a valid number, use it, otherwise keep the original string
                    record[field] = isNaN(num) || record[field].trim() === '' ? record[field] : num; 
                }
            }
            
            // Only push if the record contains any meaningful data (this check is minimal for CSV read)
            if (Object.values(record).some(v => v !== null && v !== undefined && String(v).trim() !== '')) {
                 data.push(record);
            }
        }

        return data;
    } catch (e) {
        console.error(`Error reading CSV file at ${filePath}: ${e.message}`);
        throw new Error(`Error reading CSV: ${e.message}`);
    }
};

// -----------------------------------------------------------
// EXPORTED: Function to read the saved CSV files for preview
// -----------------------------------------------------------
/**
 * Reads the structured data from the saved CSV files (identified by fileId) for preview.
 * @param {string} fileId - The unique timestamp ID used to name the saved CSV files.
 * @returns {object} The structured JSON object for client review.
 */
export const readCsvPreviewReport = async (fileId) => {
    const parsedData = {};

    for (const sheetName in CSV_SHEET_MAPPING) {
        const mapping = CSV_SHEET_MAPPING[sheetName];
        
        // CSV file name is uniqueId_filename.csv inside the specific folder
        const csvFileName = `${fileId}_${mapping.file}`;
        const filePath = path.join(UPLOADS_BASE_DIR, mapping.folder, csvFileName);

        try {
            // Read and parse the data from the saved CSV file
            const data = readCsvFile(filePath);
            parsedData[sheetName] = data;

        } catch (error) {
            // Log warning but return empty array for resilience
            console.warn(`[CSV PREVIEW WARNING] Failed to process CSV for sheet ${sheetName}: ${error.message}`);
            parsedData[sheetName] = [];
        }
    }
    
    return parsedData;
};

// ... (rest of generateReportTemplate function which is unchanged) ...
export const generateReportTemplate = async (templateData, shipId) => {
    // 🚨 FIX 1: Default lastReportData to ensure safe property access and prevent 500 error
    const lastReportData = templateData.lastReportData || { DailyReport: {}, FuelConsumption: [], LOConsumption: [], MachineryData: [], BunkerROB: [], FuelROB: [], LOROB: [] };
    const { lookups, voyageData } = templateData;
    const lastReport = lastReportData.DailyReport;
    const shipIdFromData = lastReport.ShipID || shipId;

    const workbook = new Workbook(); 
    workbook.creator = 'Viswa Digital';
    workbook.lastModifiedBy = 'Viswa Digital';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Set max range for lists and formulas (Row 2 to 500)
    const MAX_DATA_ROWS = 500; 

    // --- 0. Report Status Sheet (First Sheet) ---
    try {
        const statusSheet = createReportStatusSheet(workbook);
        console.log(`✅ Report Status sheet created with buttons at rows ${statusSheet.validateButtonRow} and ${statusSheet.uploadButtonRow}`);
    } catch (error) {
        console.error('Error creating Report Status sheet:', error);
        // Continue without Report Status sheet if it fails
    }

    // --- 1. VesselDailyReports Sheet ---
    const mainReportSheet = workbook.addWorksheet('VesselDailyReports');
    mainReportSheet.columns = [
        { header: 'ReportID', key: 'ReportID', width: 10 },          // A
        { header: 'ShipID', key: 'ShipID', width: 10, hidden: true },    // B
        // SWITCHED COLUMN: VoyageNumber is now at Column C
        { header: 'VoyageNumber', key: 'VoyageNumber', width: 20 },       // C 
        { header: 'ReportTypeKey', key: 'ReportTypeKey', width: 25 },    // D
        // FIX 2.2: Update numFmt to dd-mm-yyyy hh:mm
        { header: 'ReportDateTimeUTC', key: 'ReportDateTimeUTC', width: 30, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // E
        { header: 'ReportDateTimeLocal', key: 'ReportDateTimeLocal', width: 35, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // F
        { header: 'TimeZoneAtPort', key: 'TimeZoneAtPort', width: 20 },   // G
        { header: 'Latitude', key: 'Latitude', width: 15 },          // H
        { header: 'Longitude', key: 'Longitude', width: 15 },         // I
        { header: 'VesselActivity', key: 'VesselActivity', width: 20 },   // J
        { header: 'CourseDEG', key: 'CourseDEG', width: 15 },         // K
        { header: 'SpeedKnots', key: 'SpeedKnots', width: 15 },       // L
        { header: 'DistanceSinceLastReportNM', key: 'DistanceSinceLastReportNM', width: 30 }, // M
        { header: 'EngineDistanceNM', key: 'EngineDistanceNM', width: 25, hidden: true }, // N
        { header: 'DistanceToGoNM', key: 'DistanceToGoNM', width: 25, hidden: true},    // O
        { header: 'SlipPercent', key: 'SlipPercent', width: 15, hidden: true},        // P
        { header: 'DistanceTravelledHS_NM', key: 'DistanceTravelledHS_NM', width: 30 }, // Q
        { header: 'SteamingHoursPeriod', key: 'SteamingHoursPeriod', width: 30 }, // R
        { header: 'TimeAtAnchorageHRS', key: 'TimeAtAnchorageHRS', width: 25 }, // S
        { header: 'TimeAtDriftingHRS', key: 'TimeAtDriftingHRS', width: 25 }, // T
        { header: 'WindForce', key: 'WindForce', width: 15 },          // U
        { header: 'WindDirection', key: 'WindDirection', width: 20 },     // V
        { header: 'SeaState', key: 'SeaState', width: 20 },          // W
        { header: 'SwellDirection', key: 'SwellDirection', width: 20 },   // X
        { header: 'SwellHeightM', key: 'SwellHeightM', width: 20 },      // Y
        { header: 'AirTemperatureC', key: 'AirTemperatureC', width: 25 }, // Z
        { header: 'SeaTemperatureC', key: 'SeaTemperatureC', width: 25 }, // AA
        { header: 'BarometricPressureHPa', key: 'BarometricPressureHPa', width: 30 }, // AB
        { header: 'CargoActivity', key: 'CargoActivity', width: 25 },    // AC
        { header: 'ReportedCargoType', key: 'ReportedCargoType', width: 30 }, // AD
        { header: 'ReportedCargoQuantityMT', key: 'ReportedCargoQuantityMT', width: 35 }, // AE
        { header: 'ContainersTEU', key: 'ContainersTEU', width: 20 },      // AF
        { header: 'DisplacementMT', key: 'DisplacementMT', width: 20 },    // AG
        { header: 'CurrentPortCode', key: 'CurrentPortCode', width: 20 }, // AH
        { header: 'ReportStatus', key: 'ReportStatus', width: 20 },       // AI
        { header: 'ReportDuration', key: 'ReportDuration', width: 20 },   // AJ
        { header: 'FromPort', key: 'FromPort', width: 20 },           // AK
        { header: 'ToPort', key: 'ToPort', width: 20 },           // AL
        { header: 'FwdDraft', key: 'FwdDraft', width: 15 },           // AM
        { header: 'AftDraft', key: 'AftDraft', width: 15 },           // AN
        { header: 'MidDraft', key: 'MidDraft', width: 15,hidden: true },           // AO
        { header: 'Trim', key: 'Trim', width: 15, hidden: true },              // AP
        // SWITCHED COLUMN: VoyageID is now at Column AQ
        { header: 'VoyageID', key: 'VoyageID', width: 10, hidden: true },          // AQ
        { header: 'VoyageLegID', key: 'VoyageLegID', width: 15, hidden: true },        // AR
        { header: 'LegNumber', key: 'LegNumber', width: 15, hidden: true },          // AS
        { header: 'Remarks', key: 'Remarks', width: 40 },              // AT
        { header: 'ChartererSpeed', key: 'ChartererSpeed', width: 20 },  // AU
        { header: 'ChartererConsumption', key: 'ChartererConsumption', width: 30 }, // AV
        { header: 'SubmittedBy', key: 'SubmittedBy', width: 20 },         // AW
    ];
    mainReportSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // Define column letters for formulas/lookups
    const reportTypeKeyCol = getColumnLetter(mainReportSheet, 'ReportTypeKey'); // D
    const voyageNumberCol = getColumnLetter(mainReportSheet, 'VoyageNumber'); // C (WAS AQ)
    const fwdDraftCol = getColumnLetter(mainReportSheet, 'FwdDraft');           // AM
    const aftDraftCol = getColumnLetter(mainReportSheet, 'AftDraft');            // AN
    const voyageIDCol = getColumnLetter(mainReportSheet, 'VoyageID');            // AQ (WAS C)
    const fromPortCol = getColumnLetter(mainReportSheet, 'FromPort');            // AK
    const toPortCol = getColumnLetter(mainReportSheet, 'ToPort');                // AL
    const midDraftCol = getColumnLetter(mainReportSheet, 'MidDraft');            // AO
    const trimCol = getColumnLetter(mainReportSheet, 'Trim');                    // AP
    const voyageLegIDCol = getColumnLetter(mainReportSheet, 'VoyageLegID');         // AR
    const legNumberCol = getColumnLetter(mainReportSheet, 'LegNumber');          // AS
    const mainReportIDColLetter = getColumnLetter(mainReportSheet, 'ReportID'); // A

    // Add Last Report Data as example/pre-fill (Top 1) - This is always Row 2
    if (Object.keys(lastReport).length > 0) {
        const exampleRow = {
            ReportID: lastReport.ReportID, 
            ShipID: shipIdFromData, 
            VoyageID: lastReport.VoyageID,
            ReportTypeKey: lastReport.ReportTypeKey,
            ReportDateTimeUTC: formatExcelDateTime(lastReport.ReportDateTimeUTC, null),
            ReportDateTimeLocal: formatExcelDateTime(lastReport.ReportDateTimeLocal, lastReport.TimeZoneAtPort),
            TimeZoneAtPort: lastReport.TimeZoneAtPort,
            Latitude: lastReport.Latitude,
            Longitude: lastReport.Longitude,
            VesselActivity: lastReport.VesselActivity,
            CourseDEG: lastReport.CourseDEG,
            SpeedKnots: lastReport.SpeedKnots,
            DistanceSinceLastReportNM: lastReport.DistanceSinceLastReportNM,
            EngineDistanceNM: lastReport.EngineDistanceNM,
            DistanceToGoNM: lastReport.DistanceToGoNM,
            SlipPercent: lastReport.SlipPercent,
            DistanceTravelledHS_NM: lastReport.DistanceTravelledHS_NM,
            SteamingHoursPeriod: lastReport.SteamingHoursPeriod,
            TimeAtAnchorageHRS: lastReport.TimeAtAnchorageHRS,
            TimeAtDriftingHRS: lastReport.TimeAtDriftingHRS,
            WindForce: lastReport.WindForce,
            WindDirection: lastReport.WindDirection,
            SeaState: lastReport.SeaState,
            SwellDirection: lastReport.SwellDirection,
            SwellHeightM: lastReport.SwellHeightM,
            AirTemperatureC: lastReport.AirTemperatureC,
            SeaTemperatureC: lastReport.SeaTemperatureC,
            BarometricPressureHPa: lastReport.BarometricPressureHPa,
            CargoActivity: lastReport.CargoActivity,
            ReportedCargoType: lastReport.ReportedCargoType,
            ReportedCargoQuantityMT: lastReport.ReportedCargoQuantityMT,
            ContainersTEU: lastReport.ContainersTEU,
            DisplacementMT: lastReport.DisplacementMT,
            CurrentPortCode: lastReport.CurrentPortCode,
            ReportStatus: 'Submitted',
            ReportDuration: lastReport.ReportDuration,
            FromPort: lastReport.FromPort,
            ToPort: lastReport.ToPort,
            FwdDraft: lastReport.FwdDraft,
            AftDraft: lastReport.AftDraft,
            MidDraft: lastReport.MidDraft,
            Trim: lastReport.Trim,
            VoyageNumber: lastReport.VoyageNumber,
            VoyageLegID: lastReport.VoyageLegID,
            LegNumber: lastReport.LegNumber,
            Remarks: lastReport.Remarks,
            ChartererSpeed: lastReport.ChartererSpeed, 
            ChartererConsumption: lastReport.ChartererConsumption,
            SubmittedBy: lastReport.SubmittedBy,
        };
        // FIX 1: Use dataStyleNoBorder for all data rows in VesselDailyReports
        addDataRow(mainReportSheet, exampleRow, dataStyleNoBorder);
    } else {
        // FIX 1: Use dataStyleNoBorder for all data rows in VesselDailyReports
        addDataRow(mainReportSheet, { ShipID: shipIdFromData, ReportTypeKey: 'NOON_AT_SEA' }, dataStyleNoBorder);
    }
    
    // --- Apply Conditional Formulas for Rows 3 to MAX_DATA_ROWS (AQ, AK, AL, AO, AP, AR, AS) ---
    // FIX: Apply conditional formulas based on ReportTypeKey (D)
    for (let i = 2; i <= MAX_DATA_ROWS; i++) {
        const row = mainReportSheet.getRow(i);
        
        // FIX 1: Apply data style (without border) to empty rows from row 3 onwards
        if (i >= 3) {
             row.eachCell(cell => { cell.style = dataStyleNoBorder; });
        }
        
        // Formula wrapper based on ReportTypeKey (D) - This implements the blanking requirement
        const conditionalWrapper = (formula) => `IF(${reportTypeKeyCol}${i}="", "", ${formula})`;

        // AQ (Was C): VoyageID =VLOOKUP(Ci,'Voyage Details'!$A:$N,2,FALSE)  <-- VLOOKUP NOW USES COL C
        row.getCell(voyageIDCol).value = { 
            formula: conditionalWrapper(`VLOOKUP(${voyageNumberCol}${i},'Voyage Details'!$A:$N,2,FALSE)`), 
            result: (i === 2 && lastReport.VoyageID) ? lastReport.VoyageID : undefined
        };
        
        // AK: FromPort =VLOOKUP(Ci,'Voyage Details'!$A:$N,4,FALSE)
        row.getCell(fromPortCol).value = { 
            formula: conditionalWrapper(`VLOOKUP(${voyageNumberCol}${i},'Voyage Details'!$A:$N,4,FALSE)`), 
            result: (i === 2 && lastReport.FromPort) ? lastReport.FromPort : undefined
        };
        row.getCell(fromPortCol).protection = { locked: true, hidden: true };
        
        // AL: ToPort =VLOOKUP(Ci,'Voyage Details'!$A:$N,5,FALSE)
        row.getCell(toPortCol).value = { 
            formula: conditionalWrapper(`VLOOKUP(${voyageNumberCol}${i},'Voyage Details'!$A:$N,5,FALSE)`),
            result: (i === 2 && lastReport.ToPort) ? lastReport.ToPort : undefined
        };
        row.getCell(toPortCol).protection = { locked: true, hidden: true };
        
        // AO: MidDraft =(AMi+ANi)/2
        row.getCell(midDraftCol).value = { 
            formula: conditionalWrapper(`(${fwdDraftCol}${i}+${aftDraftCol}${i})/2`),
            result: (i === 2 && lastReport.MidDraft) ? lastReport.MidDraft : undefined
        };

        // AP: Trim =ANi-AMi
        row.getCell(trimCol).value = { 
            formula: conditionalWrapper(`${aftDraftCol}${i}-${fwdDraftCol}${i}`), 
            result: (i === 2 && lastReport.Trim) ? lastReport.Trim : undefined
        };

        // AR: VoyageLegID =VLOOKUP(Ci,'Voyage Details'!$A:$N,14,FALSE)
        row.getCell(voyageLegIDCol).value = { 
            formula: conditionalWrapper(`VLOOKUP(${voyageNumberCol}${i},'Voyage Details'!$A:$N,14,FALSE)`),
            result: (i === 2 && lastReport.VoyageLegID) ? lastReport.VoyageLegID : undefined
        };

        // AS: LegNumber =VLOOKUP(Ci,'Voyage Details'!$A:$N,13,FALSE)
        row.getCell(legNumberCol).value = { 
            formula: conditionalWrapper(`VLOOKUP(${voyageNumberCol}${i},'Voyage Details'!$A:$N,13,FALSE)`),
            result: (i === 2 && lastReport.LegNumber) ? lastReport.LegNumber : undefined
        };

        // Ensure Draft columns get the no border style (redundant but safe)
        // FIX 1: Use dataStyleNoBorder for all cells in VesselDailyReports
        row.getCell(fwdDraftCol).style = dataStyleNoBorder;
        row.getCell(aftDraftCol).style = dataStyleNoBorder;
    }

    // Determine max lookup range for Data Validation
    const lookupEndRow = (lookups ? lookups.fullLookupResults.length : 0) + TIME_ZONES.length + 1; 
    const voyageEndRow = (voyageData ? voyageData.length : 0) + 1; 
    
    // --- Common Lookup Column Definitions (omitted for brevity) ---
    const LOOKUP_MACHINERY_NAME_COL = 'G'; // CustomMachineryName
    // const LOOKUP_FUEL_TYPE_COL = 'K';        // ItemTypeKey1 - NOT USED FOR FILTERING
    // const LOOKUP_LO_TYPE_COL = 'M';          // ItemTypeKey - NOT USED FOR FILTERING
    const LOOKUP_FUEL_ROB_TYPE_COL = 'R';     // FuelTypeKey (Column R)
    const LOOKUP_LO_ROB_TYPE_COL = 'V';       // LubeOilTypeKey (Column V)
    const BDN_ITEM_TYPE_COL = 'Z';           // BDN_ItemType (Key Column for VLOOKUP)
    const BDN_START_COL = 'AA';             // BDN1
    const BDN_END_COL = 'AJ';               // BDN10
    
    // --- NEW CONSTANTS FOR FILTERED LO LIST (AK) ---
    const LOOKUP_LO_FILTERED_TYPE_COL = 'AK'; // Column for only LUBE_OIL types
    // MODIFICATION: Revert to unfiltered list based on LOOKUP_LO_ROB_TYPE_COL (V)
    const LUBE_OIL_TYPE_KEYS = (lookups ? lookups.fullLookupResults : [])
        .map(item => item.LubeOilTypeKey) // Use Column V's data
        .filter((value, index, self) => value && self.indexOf(value) === index); // Deduplicate
    const loFilterEndRow = LUBE_OIL_TYPE_KEYS.length + 1; // +1 for header
    
    // --- NEW CONSTANTS FOR FILTERED FUEL LIST (AL) ---
    const LOOKUP_FUEL_FILTERED_TYPE_COL = 'AL'; // Column for only FUEL types
    // MODIFICATION: Revert to unfiltered list based on LOOKUP_FUEL_ROB_TYPE_COL (R)
    const FUEL_TYPE_KEYS = (lookups ? lookups.fullLookupResults : [])
        .map(item => item.FuelTypeKey) // Use Column R's data
        .filter((value, index, self) => value && self.indexOf(value) === index); // Deduplicate
    const fuelFilterEndRow = FUEL_TYPE_KEYS.length + 1; // +1 for header


    // --- Apply Data Validation Lists (Row 2 to MAX_DATA_ROWS) for VesselDailyReports ---
    // D: ReportTypeKey -> Lookups Guide!A:A
    mainReportSheet.dataValidations.add(`D2:D${MAX_DATA_ROWS}`, {
        type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$A$2:$A$${lookupEndRow}`],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });
    // G: TimeZoneAtPort -> Lookups Guide!Y:Y
    mainReportSheet.dataValidations.add(`G2:G${MAX_DATA_ROWS}`, {
        type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$Y$2:$Y$${lookupEndRow}`],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });
    // J: VesselActivity -> Lookups Guide!B:B
    mainReportSheet.dataValidations.add(`J2:J${MAX_DATA_ROWS}`, {
        type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$B$2:$B$${lookupEndRow}`],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });
    // U: WindDirection -> Lookups Guide!C:C
    mainReportSheet.dataValidations.add(`U2:U${MAX_DATA_ROWS}`, {
        type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$C$2:$C$${lookupEndRow}`],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });
    // W: SwellDirection -> Lookups Guide!C:C
    mainReportSheet.dataValidations.add(`W2:W${MAX_DATA_ROWS}`, {
        type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$C$2:$C$${lookupEndRow}`],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });
    // V: SeaState -> Lookups Guide!D:D
    mainReportSheet.dataValidations.add(`V2:V${MAX_DATA_ROWS}`, {
        type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$D$2:$D$${lookupEndRow}`],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });
    // C: VoyageNumber -> Voyage Details!A:A (LegName) -- (WAS AQ, NOW C)
    mainReportSheet.dataValidations.add(`${voyageNumberCol}2:${voyageNumberCol}${MAX_DATA_ROWS}`, {
        type: 'list', allowBlank: true, formulae: [`'Voyage Details'!$A$2:$A$${voyageEndRow}`],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });

    // --- 2. Machinery Data Sheet ---
    const machineryDataSheet = workbook.addWorksheet('Machinery Data');
    machineryDataSheet.columns = [
        { header: 'ReportID', key: 'ReportID', width: 10 },          // A
        { header: 'ShipID', key: 'ShipID', width: 10, hidden: true },          // B
        { header: 'ShipMachineryRecordID', key: 'ShipMachineryRecordID', width: 25, hidden: true }, // C
        { header: 'MachineryTypeKey', key: 'MachineryTypeKey', width: 30 }, // D
        { header: 'MachineryName', key: 'MachineryName', width: 25 },     // E <-- TARGET FOR GREEN HEADER
        { header: 'Power', key: 'Power', width: 15 },                // F
        { header: 'RPM', key: 'RPM', width: 10 },                    // G
        { header: 'Running_Hrs', key: 'Running_Hrs', width: 20 },        // H
        { header: 'Remarks', key: 'Remarks', width: 40 },              // I
        { header: 'Total_Power', key: 'Total_Power', width: 15 },        // J
        { header: 'Purpose', key: 'Purpose', width: 30 }, // K
        // --- NEW COLUMNS (To be excluded from CSV) ---
        { header: 'FuelTypeKey', key: 'FuelTypeKey', width: 25 },         // L
        { header: 'BDN_Number', key: 'BDN_Number', width: 20 },           // M
        { header: 'ConsumedMT', key: 'ConsumedMT', width: 25 },           // N
        { header: 'Initial_Quantity', key: 'Initial_Quantity', width: 25 }, // O (New)
        { header: 'Final_Quantity', key: 'Final_Quantity', width: 25 },    // P (New)
        { header: 'BDN_Range_Helper', key: 'BDN_Range_Helper', width: 50, hidden: true }, // Q - NEW HELPER COLUMN FOR DYNAMIC DROPDOWN (Shifted from O)
        // --- END NEW COLUMNS ---
    ];
    // Apply default header style
    machineryDataSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // Apply green color to MachineryName header (E)
    const machineryNameHeaderColLetter = getColumnLetter(machineryDataSheet, 'MachineryName');
    if (machineryNameHeaderColLetter) {
        machineryDataSheet.getCell(`${machineryNameHeaderColLetter}1`).style = greenHeaderStyle;
    }

    // FIX: Redefine all Machinery Data Column Constants in the correct scope
    const maxMachineryRows = MAX_DATA_ROWS;
    const machineryReportIDCol = getColumnLetter(machineryDataSheet, 'ReportID');
    const machineryShipIDCol = getColumnLetter(machineryDataSheet, 'ShipID');
    const shipMachineryRecordIDCol = getColumnLetter(machineryDataSheet, 'ShipMachineryRecordID');
    const machineryTypeKeyCol = getColumnLetter(machineryDataSheet, 'MachineryTypeKey');
    const machineryNameCol = getColumnLetter(machineryDataSheet, 'MachineryName');
    const machineryPowerCol = getColumnLetter(machineryDataSheet, 'Power'); // F
    const machineryRunningHrsCol = getColumnLetter(machineryDataSheet, 'Running_Hrs');
    const machineryTotalPowerCol = getColumnLetter(machineryDataSheet, 'Total_Power'); // J
    const machineryPurposeCol = getColumnLetter(machineryDataSheet, 'Purpose'); // K
    const machineryFuelTypeKeyCol = getColumnLetter(machineryDataSheet, 'FuelTypeKey'); // L
    const machineryBDNNumberCol = getColumnLetter(machineryDataSheet, 'BDN_Number');      // M
    const machineryConsumedMTCol = getColumnLetter(machineryDataSheet, 'ConsumedMT');      // N
    const machineryInitialQtyCol = getColumnLetter(machineryDataSheet, 'Initial_Quantity'); // O 
    const machineryFinalQtyCol = getColumnLetter(machineryDataSheet, 'Final_Quantity');      // P 
    const bdnRangeHelperCol = getColumnLetter(machineryDataSheet, 'BDN_Range_Helper'); // Q
    const machineryNameValidationRange = `'Lookups Guide'!$${LOOKUP_MACHINERY_NAME_COL}$2:$${LOOKUP_MACHINERY_NAME_COL}$${lookupEndRow}`;
    // const fuelTypeKeyValidationRange = `'Lookups Guide'!$${LOOKUP_FUEL_TYPE_COL}$2:$${LOOKUP_FUEL_TYPE_COL}$${lookupEndRow}`; // OLD UNFILTERED

    
    // --- Application of Conditional Formulas to ALL possible rows (2 to MAX_DATA_ROWS) ---
    for (let i = 2; i <= maxMachineryRows; i++) {
        const row = machineryDataSheet.getRow(i);
        
        // FIX 1: Apply data style WITHOUT border to all data rows 
        row.eachCell(cell => { 
            cell.style = dataStyleNoBorder; 
        }); 

        // A: ReportID - CONDITIONAL CHAINING FORMULA. Triggered by E{i}
        // Requirement: Blank until value in Col E (MachineryName) is updated.
        const conditionalWrapperMachinery = (formula) => `IF(${machineryNameCol}${i}="", "", ${formula})`;

        const reportIdFormula = i === 2 
            ? conditionalWrapperMachinery(`'VesselDailyReports'!$${mainReportIDColLetter}$${i}`)
            : `IF(${machineryNameCol}${i}="", "", IF('VesselDailyReports'!$${mainReportIDColLetter}$${i}<>"", 'VesselDailyReports'!$${mainReportIDColLetter}$${i}, A${i-1}))`;
            
        row.getCell(machineryReportIDCol).value = {
            formula: reportIdFormula,
            result: undefined 
        };
        
        // B: ShipID = IF(E{i}="", "", shipId). Triggered by E{i}
        row.getCell(machineryShipIDCol).value = {
            formula: conditionalWrapperMachinery(`${shipId}`),
            result: undefined 
        };
        
        // C: ShipMachineryRecordID = IF(E{i}="", "", VLOOKUP(E{i},'Lookups Guide'!$G:$I,3,FALSE)). Triggered by E{i}
        row.getCell(shipMachineryRecordIDCol).value = { 
            formula: conditionalWrapperMachinery(`VLOOKUP(${machineryNameCol}${i},'Lookups Guide'!$G:$I,3,FALSE)`), 
            result: undefined
        };
        
        // D: MachineryTypeKey = IF(E{i}="", "", VLOOKUP(E{i},'Lookups Guide'!$G:$I,2,FALSE)). Triggered by E{i}
        row.getCell(machineryTypeKeyCol).value = { 
            formula: conditionalWrapperMachinery(`VLOOKUP(${machineryNameCol}${i},'Lookups Guide'!$G:$I,2,FALSE)`), 
            result: undefined
        };
        
        // H: Running_Hrs = IF(E{i}="", "", 0). Triggered by E{i}
        row.getCell(machineryRunningHrsCol).value = {
            formula: conditionalWrapperMachinery(`0`),
            result: 0 
        };
        
        // J: Total_Power = IF(E{i}="", "", F{i}*H{i}) 
        row.getCell(machineryTotalPowerCol).value = { 
            formula: conditionalWrapperMachinery(`${machineryPowerCol}${i}*${machineryRunningHrsCol}${i}`),
            result: undefined
        };
        
        // M: BDN_Number. (NO FORMULA HERE - Driven by Dynamic Data Validation)
        // row.getCell(machineryBDNNumberCol).style = dataStyle; 

        // N: ConsumedMT. Triggered by E{i}
        row.getCell(machineryConsumedMTCol).value = {
            formula: conditionalWrapperMachinery(`""`),
            result: undefined
        };
        
        // O: Initial_Quantity =IF(M{i}="","", VLOOKUP(M{i},'Bunker ROB'!$D:$I,5,FALSE))
        const conditionalWrapperBDN = (formula) => `IF(${machineryBDNNumberCol}${i}="","", ${formula})`;

        row.getCell(machineryInitialQtyCol).value = {
            formula: conditionalWrapperBDN(`VLOOKUP(${machineryBDNNumberCol}${i},'Bunker ROB'!$D:$I,5,FALSE)`),
            result: undefined
        };
        
        // P: Final_Quantity =IF(M{i}="","", VLOOKUP(M{i},'Bunker ROB'!$D:$I,6,FALSE))
        row.getCell(machineryFinalQtyCol).value = {
            formula: conditionalWrapperBDN(`VLOOKUP(${machineryBDNNumberCol}${i},'Bunker ROB'!$D:$I,6,FALSE)`),
            result: undefined
        };

        // Q: BDN_Range_Helper (New Dynamic Range Calculation for Dropdown)
        const conditionalWrapperFuelKey = (formula) => `IF(${machineryFuelTypeKeyCol}${i}="","", ${formula})`;
        const matchLookup = `MATCH(${machineryFuelTypeKeyCol}${i},'Lookups Guide'!$${BDN_ITEM_TYPE_COL}:${BDN_ITEM_TYPE_COL}, 0)`;
        const bdnRangeFormula = conditionalWrapperFuelKey(`CONCATENATE("'Lookups Guide'!$${BDN_START_COL}$", ${matchLookup}, ":$${BDN_END_COL}$", ${matchLookup})`);
        
        row.getCell(bdnRangeHelperCol).value = {
            formula: bdnRangeFormula,
            result: undefined
        };
    }


    // Apply Data Validation (dropdowns) globally (Rows 2 to MAX_DATA_ROWS)
    machineryDataSheet.dataValidations.add(`${machineryNameCol}2:${machineryNameCol}${maxMachineryRows}`, {
        type: 'list', allowBlank: true, formulae: [machineryNameValidationRange],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });
    
    // L: FuelTypeKey -> Lookups Guide!AL:AL (FuelTypeKey_Filtered) <-- UPDATED FILTER
    const fuelTypeKeyValidationRangeFiltered = `'Lookups Guide'!$${LOOKUP_FUEL_FILTERED_TYPE_COL}$2:$${LOOKUP_FUEL_FILTERED_TYPE_COL}$${fuelFilterEndRow}`;
    machineryDataSheet.dataValidations.add(`${machineryFuelTypeKeyCol}2:${machineryFuelTypeKeyCol}${maxMachineryRows}`, {
        type: 'list', allowBlank: true, formulae: [fuelTypeKeyValidationRangeFiltered],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the Fuel Type dropdown list.'
    });

    // M: BDN_Number -> Dynamic List based on FuelTypeKey (L) pointing to Hidden Helper (Q)
    for (let i = 2; i <= maxMachineryRows; i++) {
        // Apply Data Validation using INDIRECT pointing to the helper cell
        machineryDataSheet.dataValidations.add(`${machineryBDNNumberCol}${i}`, {
            type: 'list', allowBlank: true, formulae: [`=INDIRECT($${bdnRangeHelperCol}$${i})`],
            showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the BDN list after selecting a Fuel Type.'
        });
    }
    // --- End: Machinery Data Implementation ---

    // --- 3. Fuel Consumption Sheet ---
    const fuelConsumptionSheet = workbook.addWorksheet('Fuel Consumption');
    fuelConsumptionSheet.columns = [
        { header: 'ReportID', key: 'ReportID', width: 10 },          // A
        { header: 'ShipID', key: 'ShipID', width: 10, hidden: true },    // B
        { header: 'MachineryName', key: 'MachineryName', width: 25 }, // C (Lookup/Dropdown Key)
        { header: 'MachineryTypeKey', key: 'MachineryTypeKey', width: 30 }, // D
        { header: 'Purpose', key: 'Purpose', width: 40 }, // E
        { header: 'FuelTypeKey', key: 'FuelTypeKey', width: 25 }, // F (Dropdown Key)
        { header: 'BDN_Number', key: 'BDN_Number', width: 20 }, // G
        { header: 'ConsumedMT', key: 'ConsumedMT', width: 25 }, // H
        // FIX 2.3: Update numFmt to dd-mm-yyyy hh:mm
        { header: 'EntryDate', key: 'EntryDate', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // I
        // --- NEW HELPER COLUMN (To be excluded from CSV) ---
        { header: 'Unique_BDN_Number', key: 'Unique_BDN_Number', width: 25, hidden: true }, // J 
    ];
    fuelConsumptionSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    const maxFuelRows = MAX_DATA_ROWS;
    const fcReportIDCol = getColumnLetter(fuelConsumptionSheet, 'ReportID'); // A
    const fcShipIDCol = getColumnLetter(fuelConsumptionSheet, 'ShipID');      // B
    const fcMachineryNameCol = getColumnLetter(fuelConsumptionSheet, 'MachineryName'); // C
    const fcMachineryTypeKeyCol = getColumnLetter(fuelConsumptionSheet, 'MachineryTypeKey'); // D
    const fcPurposeCol = getColumnLetter(fuelConsumptionSheet, 'Purpose'); // E
    const fcFuelTypeKeyCol = getColumnLetter(fuelConsumptionSheet, 'FuelTypeKey'); // F
    const fcBDNNumberCol = getColumnLetter(fuelConsumptionSheet, 'BDN_Number'); // G
    const fcConsumedMTCol = getColumnLetter(fuelConsumptionSheet, 'ConsumedMT'); // H
    const fcEntryDateCol = getColumnLetter(fuelConsumptionSheet, 'EntryDate'); // I
    
    // NEW HELPER COLUMN CONSTANT
    const fcUniqueBDNCol = getColumnLetter(fuelConsumptionSheet, 'Unique_BDN_Number'); // J

    // Lookups
    const machineryNameRangeFC = `'Machinery Data'!$E$2:$E$${maxMachineryRows}`; 

    // --- Application of Conditional Formulas to ALL possible rows (2 to MAX_DATA_ROWS) ---
    for (let i = 2; i <= maxFuelRows; i++) {
        const row = fuelConsumptionSheet.getRow(i);
        // FIX 1: Apply data style WITHOUT border to all data rows (including Row 2)
        row.eachCell(cell => { cell.style = dataStyleNoBorder; }); 

        // Conditional check cell in Machinery Data (E)
        const machineryDataCheckCell = `'Machinery Data'!$${machineryNameCol}$${i}`; 
        
        // C: MachineryName = IF('Machinery Data'!E{i}="", "", 'Machinery Data'!E{i})
        const machineryNameFormula = `IF(${machineryDataCheckCell}="", "", ${machineryDataCheckCell})`;
        row.getCell(fcMachineryNameCol).value = {
            formula: machineryNameFormula,
            result: undefined
        };
        
        // E: Purpose = IF('Machinery Data'!E{i}="", "", 'Machinery Data'!K{i})
        const PurposeFormula = `IF(${machineryDataCheckCell}="", "", 'Machinery Data'!$${machineryPurposeCol}$${i})`;
        row.getCell(fcPurposeCol).value = {
            formula: PurposeFormula,
            result: undefined
        };
        
        // F: FuelTypeKey = IF('Machinery Data'!E{i}="", "", 'Machinery Data'!L{i})
        const fuelTypeKeyFormula = `IF(${machineryDataCheckCell}="", "", 'Machinery Data'!$${machineryFuelTypeKeyCol}$${i})`;
        row.getCell(fcFuelTypeKeyCol).value = {
            formula: fuelTypeKeyFormula,
            result: undefined
        };

        // G: BDN_Number = IF('Machinery Data'!E{i}="", "", 'Machinery Data'!M{i})
        // BDN_Number must be explicitly read from Machinery Data to ensure the chosen BDN is submitted
        const bdnNumberFormula = `IF(${machineryDataCheckCell}="", "", 'Machinery Data'!$${machineryBDNNumberCol}$${i})`;
        row.getCell(fcBDNNumberCol).value = { 
            formula: bdnNumberFormula, 
            result: undefined
        };
        
        // J: Unique_BDN_Number = IF(AND(G{i}<>"", COUNTIF($G$2:G{i}, G{i})=1), G{i}, "") 
        const conditionalWrapperBdnFc = `IF(AND(${fcBDNNumberCol}${i}<>"", COUNTIF($${fcBDNNumberCol}$2:${fcBDNNumberCol}${i}, ${fcBDNNumberCol}${i})=1), ${fcBDNNumberCol}${i}, "")`;

        row.getCell(fcUniqueBDNCol).value = {
            formula: conditionalWrapperBdnFc, // Formula now uses the wrapper implicitly
            result: undefined
        };
        
        // H: ConsumedMT = IF('Machinery Data'!E{i}="", "", 'Machinery Data'!N{i})
        const consumedMTFormula = `IF(${machineryDataCheckCell}="", "", 'Machinery Data'!$${machineryConsumedMTCol}$${i})`;
        row.getCell(fcConsumedMTCol).value = {
            formula: consumedMTFormula,
            result: undefined
        };
        
        // A: ReportID - CONDITIONAL CHAINING FORMULA (Uses C - MachineryName)
        const reportIdFormula = i === 2 
            ? `IF(${fcMachineryNameCol}${i}="", "", 'VesselDailyReports'!$${mainReportIDColLetter}$${i})`
            : `IF(${fcMachineryNameCol}${i}="", "", IF('VesselDailyReports'!$${mainReportIDColLetter}$${i}<>"", 'VesselDailyReports'!$${mainReportIDColLetter}$${i}, A${i-1}))`;
            
        row.getCell(fcReportIDCol).value = {
            formula: reportIdFormula,
            result: undefined 
        };
        
        // B: ShipID = IF(C{i}="", "", shipId) (Uses C - MachineryName)
        row.getCell(fcShipIDCol).value = {
            formula: `IF(${fcMachineryNameCol}${i}="", "", ${shipId})`,
            result: undefined 
        };
        
        // D: MachineryTypeKey = VLOOKUP(C{i},'Lookups Guide'!G:I,2,FALSE) (Uses C - MachineryName)
        row.getCell(fcMachineryTypeKeyCol).value = { 
            formula: `IF(${fcMachineryNameCol}${i}="", "", VLOOKUP(${fcMachineryNameCol}${i},'Lookups Guide'!$G:$I,2,FALSE))` , 
            result: undefined
        };

        // I: EntryDate - CONDITIONAL CHAINING FORMULA (Uses A - ReportID and C - MachineryName)
        const entryDateFormula = i === 2
            ? `IF(${fcMachineryNameCol}${i}="", "", VLOOKUP(${fcReportIDCol}${i},VesselDailyReports!$A:$F,6,FALSE))`
            : `IF(${fcMachineryNameCol}${i}="", "", IF(ISBLANK(${fcReportIDCol}${i}), ${fcEntryDateCol}${i-1}, VLOOKUP(${fcReportIDCol}${i},VesselDailyReports!$A:$F,6,FALSE)))`;

        row.getCell(fcEntryDateCol).value = {
            formula: entryDateFormula,
            result: undefined
        };
    }
    

    // --- Apply Data Validation Lists (Row 2 to MAX_DATA_ROWS) ---
    // C: MachineryName -> Machinery Data!E:E (MachineryName) 
    fuelConsumptionSheet.dataValidations.add(`${fcMachineryNameCol}2:${fcMachineryNameCol}${maxFuelRows}`, {
        type: 'list', allowBlank: true, formulae: [machineryNameRangeFC],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });


    // --- 4. Lube Oil Consumption Sheet ---
    const loConsumptionSheet = workbook.addWorksheet('Lube Oil Consumption');
    loConsumptionSheet.columns = [
        { header: 'ReportID', key: 'ReportID', width: 10 },          // A
        { header: 'ShipID', key: 'ShipID', width: 10, hidden: true },          // B
        { header: 'SpecificMachineryName', key: 'SpecificMachineryName', width: 30 }, // C <-- TARGET FOR GREEN HEADER
        { header: 'MachineryTypeKey', key: 'MachineryTypeKey', width: 25 }, // D
        { header: 'LOTypeKey', key: 'LOTypeKey', width: 25 },             // E
        { header: 'BDN_Number', key: 'BDN_Number', width: 20 },           // F
        { header: 'ConsumedQty', key: 'ConsumedQty', width: 20 },         // G
        // FIX 2.4: Update numFmt to dd-mm-yyyy hh:mm
        { header: 'EntryDate', key: 'EntryDate', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // H
        { header: 'Unique_BDN_Number', key: 'Unique_BDN_Number', width: 25, hidden: true }, // I 
        { header: 'LO_BDN_Range_Helper', key: 'LO_BDN_Range_Helper', width: 50, hidden: true } // J - NEW HELPER COLUMN FOR DYNAMIC DROPDOWN
    ];
    // Apply default header style
    loConsumptionSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // Apply green color to SpecificMachineryName header (C)
    const loMachineryNameHeaderColLetter = getColumnLetter(loConsumptionSheet, 'SpecificMachineryName');
    if (loMachineryNameHeaderColLetter) {
        loConsumptionSheet.getCell(`${loMachineryNameHeaderColLetter}1`).style = greenHeaderStyle;
    }

    const maxLORows = MAX_DATA_ROWS;
    const loReportIDCol = getColumnLetter(loConsumptionSheet, 'ReportID'); // A
    const loShipIDCol = getColumnLetter(loConsumptionSheet, 'ShipID');      // B
    const loMachineryNameCol = getColumnLetter(loConsumptionSheet, 'SpecificMachineryName'); // C
    const loMachineryTypeKeyCol = getColumnLetter(loConsumptionSheet, 'MachineryTypeKey'); // D
    const loLOTypeKeyCol = getColumnLetter(loConsumptionSheet, 'LOTypeKey'); // E
    const loBDNNumberCol = getColumnLetter(loConsumptionSheet, 'BDN_Number'); // F
    const loEntryDateCol = getColumnLetter(loConsumptionSheet, 'EntryDate'); // H
    const loUniqueBDNCol = getColumnLetter(loConsumptionSheet, 'Unique_BDN_Number'); // I
    const loBdnRangeHelperCol = getColumnLetter(loConsumptionSheet, 'LO_BDN_Range_Helper'); // J
    
    // Lookups
    // Using globally defined constants
    const machineryNameRangeLO = `'Lookups Guide'!$${LOOKUP_MACHINERY_NAME_COL}$2:$${LOOKUP_MACHINERY_NAME_COL}$${lookupEndRow}`;
    // Removed old loTypeKeyValidationRange to use the new filtered list below
    const loMachineryLookupRange = `'Lookups Guide'!$G:$I`;

    // --- Application of Conditional Formulas to ALL possible rows (2 to MAX_DATA_ROWS) ---
    for (let i = 2; i <= maxLORows; i++) {
        const row = loConsumptionSheet.getRow(i);
        
        // FIX 1: Apply data style WITHOUT border to all data rows (including Row 2)
        row.eachCell(cell => { cell.style = dataStyleNoBorder; }); 

        // Conditional wrapper based on SpecificMachineryName (C)
        const conditionalWrapper = (formula) => `IF(${loMachineryNameCol}${i}="", "", ${formula})`;

        // A: ReportID - CONDITIONAL CHAINING FORMULA: (ReportID from DailyReport!A{i}) OR (Previous row A{i-1}). Triggered by C{i}
        const reportIdFormula = i === 2 
            ? conditionalWrapper(`'VesselDailyReports'!$${mainReportIDColLetter}$${i}`) // =VesselDailyReports!A2
            : `IF(${loMachineryNameCol}${i}="", "", IF('VesselDailyReports'!$${mainReportIDColLetter}$${i}<>"", 'VesselDailyReports'!$${mainReportIDColLetter}$${i}, A${i-1}))`;
            
        row.getCell(loReportIDCol).value = {
            formula: reportIdFormula,
            result: undefined 
        };
        
        // B: ShipID = IF(C{i}="", "", shipId). Triggered by C{i}
        row.getCell(loShipIDCol).value = {
            formula: conditionalWrapper(`${shipId}`),
            result: undefined 
        };
        
        // D: MachineryTypeKey = VLOOKUP(C{i},'Lookups Guide'!G:I,2,FALSE). Triggered by C{i}
        row.getCell(loMachineryTypeKeyCol).value = { 
            formula: conditionalWrapper(`VLOOKUP(${loMachineryNameCol}${i},${loMachineryLookupRange},2,FALSE)`), 
            result: undefined
        };

        // F: BDN_Number. (NO FORMULA HERE - Driven by Dynamic Data Validation)
        // row.getCell(loBDNNumberCol).style = dataStyle; 

        // I: Unique_BDN_Number = IF(AND(F{i}<>"", COUNTIF($F$2:F{i}, F{i})=1), F{i}, "")  
        const uniqueBdnFormula = `IF(AND(${loBDNNumberCol}${i}<>"", COUNTIF($${loBDNNumberCol}$2:${loBDNNumberCol}${i}, ${loBDNNumberCol}${i})=1), ${loBDNNumberCol}${i}, "")`;
        row.getCell(loUniqueBDNCol).value = {
            formula: uniqueBdnFormula,
            result: undefined
        };
        
        // J: LO_BDN_Range_Helper (Dynamic Range Calculation for Dropdown)
        // Formula: =IF(E{i}="","", CONCATENATE("'Lookups Guide'!$AA$", MATCH(E{i}, 'Lookups Guide'!$Z:$Z, 0), ":$AJ$", MATCH(E{i}, 'Lookups Guide'!$Z:$Z, 0)))
        const matchLookup = `MATCH(${loLOTypeKeyCol}${i},'Lookups Guide'!$${BDN_ITEM_TYPE_COL}:${BDN_ITEM_TYPE_COL}, 0)`;
        const loBdnRangeFormula = `IF(${loLOTypeKeyCol}${i}="","", CONCATENATE("'Lookups Guide'!$${BDN_START_COL}$", ${matchLookup}, ":$${BDN_END_COL}$", ${matchLookup}))`;

        row.getCell(loBdnRangeHelperCol).value = {
            formula: loBdnRangeFormula,
            result: undefined
        };


        // H: EntryDate - CONDITIONAL CHAINING FORMULA. Triggered by C{i}
        const entryDateFormula = i === 2
            ? conditionalWrapper(`VLOOKUP(${loReportIDCol}${i},VesselDailyReports!$A:$F,6,FALSE)`)
            : `IF(${loMachineryNameCol}${i}="", "", IF(ISBLANK(${loReportIDCol}${i}), ${loEntryDateCol}${i-1}, VLOOKUP(${loReportIDCol}${i},VesselDailyReports!$A:$F,6,FALSE)))`;

        row.getCell(loEntryDateCol).value = {
            formula: entryDateFormula,
            result: undefined
        };
    }
    
    // --- Apply Data Validation Lists (Row 2 to MAX_DATA_ROWS) ---
    // C: SpecificMachineryName -> Lookups Guide!G:G (CustomMachineryName)
    loConsumptionSheet.dataValidations.add(`${loMachineryNameCol}2:${loMachineryNameCol}${maxLORows}`, {
        type: 'list', allowBlank: true, formulae: [machineryNameRangeLO],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });

    // E: LOTypeKey -> Lookups Guide!AK:AK (LubeOilType_Filtered) - Contiguous list
    const loTypeKeyValidationRangeFiltered = `'Lookups Guide'!$${LOOKUP_LO_FILTERED_TYPE_COL}$2:$${LOOKUP_LO_FILTERED_TYPE_COL}$${loFilterEndRow}`;
    loConsumptionSheet.dataValidations.add(`${loLOTypeKeyCol}2:${loLOTypeKeyCol}${maxLORows}`, {
        type: 'list', allowBlank: true, formulae: [loTypeKeyValidationRangeFiltered],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the dropdown list.'
    });

    // F: BDN_Number -> Dynamic List based on LOTypeKey (E) pointing to Hidden Helper (J)
    for (let i = 2; i <= maxLORows; i++) {
        // Apply Data Validation using INDIRECT pointing to the helper cell
        loConsumptionSheet.dataValidations.add(`${loBDNNumberCol}${i}`, {
            type: 'list', allowBlank: true, formulae: [`=INDIRECT($${loBdnRangeHelperCol}$${i})`],
            showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Value must be selected from the BDN list after selecting a Lube Oil Type.'
        });
    }

    // --- 5. Bunker ROB Sheet ---
    const bunkerRobSheet = workbook.addWorksheet('Bunker ROB');
    bunkerRobSheet.columns = [
        { header: 'ShipID', key: 'ShipID', width: 10, hidden: true },          // A
        { header: 'ReportID', key: 'ReportID', width: 10 },         // B // TARGET COLUMN
        // FIX 2.5: Update numFmt to dd-mm-yyyy hh:mm
        { header: 'EntryDate', key: 'EntryDate', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // C
        { header: 'BDN_Number', key: 'BDN_Number', width: 20 },           // D // DRIVING COLUMN
        { header: 'ItemTypeKey', key: 'ItemTypeKey', width: 25 },         // E
        { header: 'Bunkered_Quantity', key: 'Bunkered_Quantity', width: 25 }, // F
        { header: 'Consumed_Quantity', key: 'Consumed_Quantity', width: 25 }, // G
        { header: 'Initial_Quantity', key: 'Initial_Quantity', width: 25 }, // H
        { header: 'Final_Quantity', key: 'Final_Quantity', width: 25 }, // I
        { header: 'ItemCategory', key: 'ItemCategory', width: 20 },       // J
        { header: 'Unique_ItemTypeKey', key: 'Unique_ItemTypeKey', width: 25, hidden: true } // K 
    ];
    bunkerRobSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    
    // --- BUNKER ROB Row Control Constants ---
    const MAX_FUEL_ROB_ROW = 20;
    const START_LO_ROB_ROW = 21; 
    const MAX_LO_ROB_ENTRIES = 50; 
    const END_LO_ROB_ROW = START_LO_ROB_ROW + MAX_LO_ROB_ENTRIES - 1; 
    // --- END Row Control Constants ---

    const brShipIDCol = getColumnLetter(bunkerRobSheet, 'ShipID');           // A
    const brReportIDCol = getColumnLetter(bunkerRobSheet, 'ReportID');          // B
    const brEntryDateCol = getColumnLetter(bunkerRobSheet, 'EntryDate');        // C
    const brBDNNumberCol = getColumnLetter(bunkerRobSheet, 'BDN_Number');          // D
    const brItemTypeKeyCol = getColumnLetter(bunkerRobSheet, 'ItemTypeKey');       // E
    const brBunkeredQuantityCol = getColumnLetter(bunkerRobSheet, 'Bunkered_Quantity'); // F
    const brConsumedQuantityCol = getColumnLetter(bunkerRobSheet, 'Consumed_Quantity'); // G
    const brInitialQuantityCol = getColumnLetter(bunkerRobSheet, 'Initial_Quantity'); // H
    const brFinalQuantityCol = getColumnLetter(bunkerRobSheet, 'Final_Quantity');      // I
    const brItemCategoryCol = getColumnLetter(bunkerRobSheet, 'ItemCategory');       // J
    const brUniqueItemTypeKeyCol = getColumnLetter(bunkerRobSheet, 'Unique_ItemTypeKey'); // K

    // Fuel Consumption Column constants for SUMIF
    const FC_BDN_COL = 'G'; // BDN_Number in Fuel Consumption Sheet
    const FC_CONSUMED_MT_COL = 'H'; // ConsumedMT in Fuel Consumption Sheet

    // LINK TO UNIQUE BDN COLUMN IN FUEL CONSUMPTION SHEET
    const fcUniqueBDNCell = (i) => `'Fuel Consumption'!$${fcUniqueBDNCol}$${i}`; // J in Fuel Consumption
    
    // LO Sheet Columns
    const LO_SHEET_BDN_COL = 'F'; // BDN_Number in Lube Oil Consumption Sheet
    const LO_SHEET_CONSUMED_QTY_COL = 'G'; // ConsumedQty in Lube Oil Consumption Sheet
    const LO_SHEET_BDN_HELPER_COL = 'I'; // Unique_BDN_Number in Lube Oil Consumption Sheet

    // --- Apply Conditional Formulas for FUEL ENTRIES (Rows 2 to 20) ---
    for (let i = 2; i <= MAX_FUEL_ROB_ROW; i++) {
        const row = bunkerRobSheet.getRow(i);
        // FIX 1: Apply data style WITHOUT border to all data rows (including Row 2)
        row.eachCell(cell => { cell.style = dataStyleNoBorder; }); 

        // K: Unique_ItemTypeKey - NEW FORMULA: Filters unique ItemTypeKey (E)
        const uniqueItemTypeKeyFormula = `IF(AND(${brItemTypeKeyCol}${i}<>"", COUNTIF($${brItemTypeKeyCol}$2:${brItemTypeKeyCol}${i}, ${brItemTypeKeyCol}${i})=1), ${brItemTypeKeyCol}${i}, "")`;
        row.getCell(brUniqueItemTypeKeyCol).value = {
            formula: uniqueItemTypeKeyFormula,
            result: undefined
        };

        // D: BDN_Number = 'Fuel Consumption'!J{i} (Link to Unique BDN Helper Column)
        const conditionalWrapperBdnRob = (formula) => `IF(${brBDNNumberCol}${i}="","", ${formula})`;

        row.getCell(brBDNNumberCol).value = {
            formula: `=IF(ISBLANK(${fcUniqueBDNCell(i)}), "", ${fcUniqueBDNCell(i)})`,
            result: undefined
        };

        // B: ReportID - Chaining Logic with D as driver
        // MODIFIED: Apply new LOOKUP logic for all rows >= 3
        let reportIdFormula;
        if (i === 2) {
            // Row 2 Base Case
            reportIdFormula = conditionalWrapperBdnRob(`VesselDailyReports!$${mainReportIDColLetter}$${i}`);
        } else {
            // Rows 3 onwards: =IF(D3="","", IF(VDR!A3<>"", VDR!A3, LOOKUP(2,1/(B$1:B2<>""),B$1:B2)))
            const lookupRange = `${brReportIDCol}$1:${brReportIDCol}${i-1}`;
            reportIdFormula = `IF(${brBDNNumberCol}${i}="","", IF(VesselDailyReports!$${mainReportIDColLetter}$${i}<>"", VesselDailyReports!$${mainReportIDColLetter}$${i}, LOOKUP(2,1/(${lookupRange}<>""),${lookupRange})))`;
        }
            
        row.getCell(brReportIDCol).value = {
            formula: reportIdFormula, // <-- MODIFIED
            result: undefined 
        };
        
        // A: ShipID = shipId (Conditional on D)
        row.getCell(brShipIDCol).value = {
            formula: conditionalWrapperBdnRob(`${shipId}`),
            result: undefined 
        };
        
        // C: EntryDate = IF(D{i}="", "", VLOOKUP(B{i},VesselDailyReports!$A:$F,6,FALSE))
        const entryDateFormula = conditionalWrapperBdnRob(`VLOOKUP(${brReportIDCol}${i},VesselDailyReports!$A:$F,6,FALSE)`);
        row.getCell(brEntryDateCol).value = {
            formula: entryDateFormula,
            result: undefined
        };

        // E: ItemTypeKey = IF(D{i}="", "", VLOOKUP(D{i},'Lookups Guide'!L:M,2,FALSE))
        const itemTypeKeyFormula = conditionalWrapperBdnRob(`VLOOKUP(${brBDNNumberCol}${i},'Lookups Guide'!$L:$P,2,FALSE)`); // Corrected column count for L:P range (ItemTypeKey is Col 2)
        row.getCell(brItemTypeKeyCol).value = {
            formula: itemTypeKeyFormula,
            result: undefined
        };
        
        // F: Bunkered_Quantity = IF(D2="","",0)
        const bunkeredQuantityFormula = conditionalWrapperBdnRob(`0`);
        row.getCell(brBunkeredQuantityCol).value = {
            formula: bunkeredQuantityFormula,
            result: 0
        };

        // G: Consumed_Quantity = SUMIF('Fuel Consumption'!G:G, D2, 'Fuel Consumption'!H:H)
        const consumedQuantityFormula = conditionalWrapperBdnRob(`SUMIF('Fuel Consumption'!$${FC_BDN_COL}:$${FC_BDN_COL}, ${brBDNNumberCol}${i}, 'Fuel Consumption'!$${FC_CONSUMED_MT_COL}:$${FC_CONSUMED_MT_COL})`);
        row.getCell(brConsumedQuantityCol).value = {
            formula: consumedQuantityFormula,
            result: 0
        };

        // H: Initial_Quantity = IF(D2="","",VLOOKUP(D2,'Lookups Guide'!L:P,5,FALSE))
        const initialQuantityFormula = conditionalWrapperBdnRob(`VLOOKUP(${brBDNNumberCol}${i},'Lookups Guide'!$L:$P,5,FALSE)`);
        row.getCell(brInitialQuantityCol).value = {
            formula: initialQuantityFormula,
            result: undefined
        };

        // I: Final_Quantity = IF(D2="","", H2-G2+F2)
        const finalQuantityFormula = conditionalWrapperBdnRob(`$${brInitialQuantityCol}${i}-$${brConsumedQuantityCol}${i}+$${brBunkeredQuantityCol}${i}`);
        row.getCell(brFinalQuantityCol).value = {
            formula: finalQuantityFormula,
            result: undefined
        };

        // J: ItemCategory = IF(D2="","",VLOOKUP(${brBDNNumberCol}${i},'Lookups Guide'!$L:$P,3,FALSE))
        const itemCategoryFormula = conditionalWrapperBdnRob(`VLOOKUP(${brBDNNumberCol}${i},'Lookups Guide'!$L:$P,3,FALSE)`);
        row.getCell(brItemCategoryCol).value = {
            formula: itemCategoryFormula,
            result: undefined
        };
    }

    // --- BEGIN CODE BLOCK FOR LUBE OIL ENTRIES IN BUNKER ROB SHEET (Starting Row 21) ---
    for (let i = 0; i < MAX_LO_ROB_ENTRIES; i++) { 
        const bunkerRobRow = START_LO_ROB_ROW + i; // Starts at 21
        const loSheetRow = 2 + i; // Links to Lube Oil Consumption sheet row 2 onwards

        const row = bunkerRobSheet.getRow(bunkerRobRow);
        // FIX 1: Apply data style WITHOUT border to all data rows (including Row 21)
        row.eachCell(cell => { cell.style = dataStyleNoBorder; }); 
        
        // K: Unique_ItemTypeKey - NEW FORMULA: Filters unique ItemTypeKey (E)
        const uniqueItemTypeKeyFormula = `IF(AND(${brItemTypeKeyCol}${bunkerRobRow}<>"", COUNTIF($${brItemTypeKeyCol}$2:${brItemTypeKeyCol}${bunkerRobRow}, ${brItemTypeKeyCol}${bunkerRobRow})=1), ${brItemTypeKeyCol}${bunkerRobRow}, "")`;
        row.getCell(brUniqueItemTypeKeyCol).value = {
            formula: uniqueItemTypeKeyFormula,
            result: undefined
        };

        const conditionalWrapperLoBdnRob = (formula) => `IF(${brBDNNumberCol}${bunkerRobRow}="","", ${formula})`;

        // D: BDN_Number: Links to 'Lube Oil Consumption'!I{loSheetRow} (Unique BDN Number helper)
        row.getCell(brBDNNumberCol).value = {
            formula: `=IF(ISBLANK('Lube Oil Consumption'!$${LO_SHEET_BDN_HELPER_COL}$${loSheetRow}), "", 'Lube Oil Consumption'!$${LO_SHEET_BDN_HELPER_COL}$${loSheetRow})`,
            result: undefined
        };

        // A: ShipID: =IF(D21="","", shipId)
        const shipIdFormula = conditionalWrapperLoBdnRob(`${shipId}`); 
        row.getCell(brShipIDCol).value = {
            formula: shipIdFormula,
            result: undefined 
        };
        
        // B: ReportID: Chain logic for continuous entries.
        // MODIFIED: Apply new LOOKUP logic for all rows >= 21 (since 21 > 2)
        const lookupRange = `${brReportIDCol}$1:${brReportIDCol}${bunkerRobRow-1}`;
        const reportIdFormula = `IF(${brBDNNumberCol}${bunkerRobRow}="","", IF(VesselDailyReports!$${mainReportIDColLetter}$${bunkerRobRow}<>"", VesselDailyReports!$${mainReportIDColLetter}$${bunkerRobRow}, LOOKUP(2,1/(${lookupRange}<>""),${lookupRange})))`;

        row.getCell(brReportIDCol).value = {
            formula: reportIdFormula, // <-- MODIFIED
            result: undefined 
        };

        // C: EntryDate: VLOOKUP(B{i},VesselDailyReports!$A:$F,6,FALSE) 
        const entryDateFormula = conditionalWrapperLoBdnRob(`VLOOKUP(${brReportIDCol}${bunkerRobRow},VesselDailyReports!$A:$F,6,FALSE)`);
        row.getCell(brEntryDateCol).value = {
            formula: entryDateFormula,
            result: undefined
        };

        // E: ItemTypeKey: VLOOKUP(D{i},'Lookups Guide'!L:M,2,FALSE)
        const itemTypeKeyFormula = conditionalWrapperLoBdnRob(`VLOOKUP(${brBDNNumberCol}${bunkerRobRow},'Lookups Guide'!$L:$P,2,FALSE)`); // Corrected column count for L:P range (ItemTypeKey is Col 2)
        row.getCell(brItemTypeKeyCol).value = {
            formula: itemTypeKeyFormula,
            result: undefined
        };

        // G: Consumed_Quantity: SUMIF('Lube Oil Consumption'!F:F, D{i}, 'Lube Oil Consumption'!G:G) 
        const consumedQuantityFormula = conditionalWrapperLoBdnRob(`SUMIF('Lube Oil Consumption'!$${LO_SHEET_BDN_COL}:$${LO_SHEET_BDN_COL}, ${brBDNNumberCol}${bunkerRobRow}, 'Lube Oil Consumption'!$${LO_SHEET_CONSUMED_QTY_COL}:$${LO_SHEET_CONSUMED_QTY_COL})`);
        row.getCell(brConsumedQuantityCol).value = {
            formula: consumedQuantityFormula,
            result: 0
        };
        
        // F: Bunkered_Quantity: Default to 0 
        const bunkeredQuantityFormula = conditionalWrapperLoBdnRob(`0`);
        row.getCell(brBunkeredQuantityCol).value = {
            formula: bunkeredQuantityFormula,
            result: 0
        };

        // H: Initial_Quantity (Same logic as fuel)
        const initialQuantityFormula = conditionalWrapperLoBdnRob(`VLOOKUP(${brBDNNumberCol}${bunkerRobRow},'Lookups Guide'!$L:$P,5,FALSE)`);
        row.getCell(brInitialQuantityCol).value = {
            formula: initialQuantityFormula,
            result: undefined
        };

        // I: Final_Quantity (Calculation using F, G, H)
        const finalQuantityFormula = conditionalWrapperLoBdnRob(`$${brInitialQuantityCol}${bunkerRobRow}-$${brConsumedQuantityCol}${bunkerRobRow}+$${brBunkeredQuantityCol}${bunkerRobRow}`);
        row.getCell(brFinalQuantityCol).value = {
            formula: finalQuantityFormula,
            result: undefined
        };

        // J: ItemCategory (Same logic as fuel)
        const itemCategoryFormula = conditionalWrapperLoBdnRob(`VLOOKUP(${brBDNNumberCol}${bunkerRobRow},'Lookups Guide'!$L:$P,3,FALSE)`);
        row.getCell(brItemCategoryCol).value = {
            formula: itemCategoryFormula,
            result: undefined
        };
    }
    // --- END CODE BLOCK FOR LUBE OIL ENTRIES IN BUNKER ROB SHEET ---

    // Fill remaining rows (Rows 71 up to a reasonable limit, let's use 500) with empty data style
    for (let i = END_LO_ROB_ROW + 1; i <= 500; i++) {
        const row = bunkerRobSheet.getRow(i);
        // FIX 1: Apply data style WITHOUT border to remaining rows
        row.eachCell(cell => { cell.style = dataStyleNoBorder; });
    }


    // --- 6. Fuel ROB Sheet ---
    const fuelRobSheet = workbook.addWorksheet('Fuel ROB');
    fuelRobSheet.columns = [
        { header: 'ShipID', key: 'ShipID', width: 10, hidden: true },          // A
        { header: 'Report_Consumption_ID', key: 'Report_Consumption_ID', width: 20 }, // B // TARGET COLUMN
        // FIX 2.6: Update numFmt to dd-mm-yyyy hh:mm
        { header: 'EntryDate', key: 'EntryDate', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // C
        { header: 'FuelTypeKey', key: 'FuelTypeKey', width: 25 },     // D // DRIVING COLUMN
        { header: 'Bunkered_Quantity', key: 'Bunkered_Quantity', width: 25 }, // E
        { header: 'Consumed_Quantity', key: 'Consumed_Quantity', width: 25 }, // F
        { header: 'Initial_Quantity', key: 'Initial_Quantity', width: 25 }, // G
        { header: 'Final_Quantity', key: 'Final_Quantity', width: 25 }, // H
        { header: 'entry_mode', key: 'entry_mode', width: 15 },       // I
        // --- NEW HELPER COLUMN (To be excluded from CSV) ---
    ];
    fuelRobSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    const fuelRobShipIDCol = getColumnLetter(fuelRobSheet, 'ShipID');           // A
    const fuelRobReportIDCol = getColumnLetter(fuelRobSheet, 'Report_Consumption_ID'); // B
    const fuelRobEntryDateCol = getColumnLetter(fuelRobSheet, 'EntryDate');       // C
    const fuelRobFuelTypeKeyCol = getColumnLetter(fuelRobSheet, 'FuelTypeKey');     // D
    const fuelRobBunkeredQtyCol = getColumnLetter(fuelRobSheet, 'Bunkered_Quantity'); // E
    const fuelRobConsumedQtyCol = getColumnLetter(fuelRobSheet, 'Consumed_Quantity'); // F
    const fuelRobInitialQtyCol = getColumnLetter(fuelRobSheet, 'Initial_Quantity'); // G
    const fuelRobFinalQtyCol = getColumnLetter(fuelRobSheet, 'Final_Quantity');      // H
    const fuelRobEntryModeCol = getColumnLetter(fuelRobSheet, 'entry_mode');       // I

    // Source Columns from Bunker ROB Sheet
    const BR_ITEM_TYPE_KEY_COL = brItemTypeKeyCol; // E
    const BR_BUNKERED_QTY_COL = brBunkeredQuantityCol; // F
    const BR_CONSUMED_QTY_COL = brConsumedQuantityCol; // G
    const BR_UNIQUE_KEY_COL = brUniqueItemTypeKeyCol; // K

    const MAX_FUEL_ROB_ENTRIES_DISPLAY = MAX_FUEL_ROB_ROW; // Max 20 rows of output

    // --- Apply Formulas for Fuel ROB Sheet (Rows 2 to 20) ---
    for (let i = 2; i <= MAX_FUEL_ROB_ENTRIES_DISPLAY; i++) {
        const row = fuelRobSheet.getRow(i);
        // FIX 1: Apply data style WITHOUT border to all data rows (including Row 2)
        row.eachCell(cell => { cell.style = dataStyleNoBorder; });

        const bunkerRobRow = i; 
        const conditionalWrapperFuelRob = (formula) => `IF(${fuelRobFuelTypeKeyCol}${i}="","", ${formula})`;


        // D: FuelTypeKey - Distinct ItemTypeKey from Bunker ROB Fuel block
        const fuelTypeKeyFormula = `=IF(ISBLANK('Bunker ROB'!$${BR_UNIQUE_KEY_COL}$${bunkerRobRow}), "", 'Bunker ROB'!$${BR_UNIQUE_KEY_COL}$${bunkerRobRow})`;
        row.getCell(fuelRobFuelTypeKeyCol).value = { formula: fuelTypeKeyFormula, result: undefined };
        
        // A: ShipID: =IF(D2="","", shipId)
        const shipIdFormula = conditionalWrapperFuelRob(`${shipId}`);
        row.getCell(fuelRobShipIDCol).value = { formula: shipIdFormula, result: undefined };

        // B: Report_Consumption_ID: Chaining logic
        // MODIFIED: Apply new LOOKUP logic for all rows >= 3
        let reportIdFormula;
        if (i === 2) {
            reportIdFormula = conditionalWrapperFuelRob(`VesselDailyReports!$${mainReportIDColLetter}$${i}`);
        } else {
            // Rows 3 onwards: =IF(D3="","", IF(VDR!A3<>"", VDR!A3, LOOKUP(2,1/(B$1:B2<>""),B$1:B2)))
            const lookupRange = `${fuelRobReportIDCol}$1:${fuelRobReportIDCol}${i-1}`;
            reportIdFormula = `IF(${fuelRobFuelTypeKeyCol}${i}="","", IF(VesselDailyReports!$${mainReportIDColLetter}$${i}<>"", VesselDailyReports!$${mainReportIDColLetter}$${i}, LOOKUP(2,1/(${lookupRange}<>""),${lookupRange})))`;
        }
        row.getCell(fuelRobReportIDCol).value = { formula: reportIdFormula, result: undefined }; // <-- MODIFIED
        
        // C: EntryDate: =IF(D2="", "", VLOOKUP(B2,VesselDailyReports!$A:$F,6,FALSE))
        const entryDateFormula = conditionalWrapperFuelRob(`VLOOKUP(${fuelRobReportIDCol}${i},VesselDailyReports!$A:$F,6,FALSE)`);
        row.getCell(fuelRobEntryDateCol).value = { formula: entryDateFormula, result: undefined };
        
        // E: Bunkered_Quantity: SUMIF('Bunker ROB'!E:E, D2, 'Bunker ROB'!F:F)
        const bunkeredQtyFormula = conditionalWrapperFuelRob(`SUMIF('Bunker ROB'!$${BR_ITEM_TYPE_KEY_COL}:$${BR_ITEM_TYPE_KEY_COL}, ${fuelRobFuelTypeKeyCol}${i}, 'Bunker ROB'!$${BR_BUNKERED_QTY_COL}:$${BR_BUNKERED_QTY_COL})`);
        row.getCell(fuelRobBunkeredQtyCol).value = { formula: bunkeredQtyFormula, result: 0 };

        // F: Consumed_Quantity: SUMIF('Bunker ROB'!E:E, D2, 'Bunker ROB'!G:G)
        const consumedQtyFormula = conditionalWrapperFuelRob(`SUMIF('Bunker ROB'!$${BR_ITEM_TYPE_KEY_COL}:$${BR_ITEM_TYPE_KEY_COL}, ${fuelRobFuelTypeKeyCol}${i}, 'Bunker ROB'!$${BR_CONSUMED_QTY_COL}:$${BR_CONSUMED_QTY_COL})`);
        row.getCell(fuelRobConsumedQtyCol).value = { formula: consumedQtyFormula, result: 0 };

        // G: Initial_Quantity: =IF(D2="","", VLOOKUP(D2,'Lookups Guide'!R:T,3,FALSE))
        const initialQtyFormula = conditionalWrapperFuelRob(`VLOOKUP(${fuelRobFuelTypeKeyCol}${i},'Lookups Guide'!$R:$T,3,FALSE)`);
        row.getCell(fuelRobInitialQtyCol).value = { formula: initialQtyFormula, result: undefined };

        // H: Final_Quantity: =IF(D2="","", G2-F2+E2)
        const finalQtyFormula = conditionalWrapperFuelRob(`${fuelRobInitialQtyCol}${i}-${fuelRobConsumedQtyCol}${i}+${fuelRobBunkeredQtyCol}${i}`);
        row.getCell(fuelRobFinalQtyCol).value = { formula: finalQtyFormula, result: undefined };

        // I: entry_mode: =IF(D2="","", VLOOKUP(B2,VesselDailyReports!A:D,4,FALSE))
        const entryModeFormula = conditionalWrapperFuelRob(`VLOOKUP(${fuelRobReportIDCol}${i},VesselDailyReports!$A:$D,4,FALSE)`);
        row.getCell(fuelRobEntryModeCol).value = { formula: entryModeFormula, result: undefined };
    }


    // --- 7. Lube Oil ROB Sheet ---
    const loRobSheet = workbook.addWorksheet('Lube Oil ROB');
    loRobSheet.columns = [
        { header: 'ShipID', key: 'ShipID', width: 10, hidden: true }, // A
        { header: 'Report_Consumption_ID', key: 'Report_Consumption_ID', width: 20 }, // B // TARGET COLUMN
        // FIX 2.7: Update numFmt to dd-mm-yyyy hh:mm
        { header: 'EntryDate', key: 'EntryDate', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // C
        { header: 'LubeOilTypeKey', key: 'LubeOilTypeKey', width: 25 }, // D // DRIVING COLUMN
        { header: 'Bunkered_Quantity', key: 'Bunkered_Quantity', width: 25 }, // E
        { header: 'Consumed_Quantity', key: 'Consumed_Quantity', width: 25 }, // F
        { header: 'Initial_Quantity', key: 'Initial_Quantity', width: 25 }, // G
        { header: 'Final_Quantity', key: 'Final_Quantity', width: 25 }, // H
        { header: 'entry_mode', key: 'entry_mode', width: 15 }, // I
        // --- NEW HELPER COLUMN (To be excluded from CSV) ---
    ];
    loRobSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    const loRobShipIDCol = getColumnLetter(loRobSheet, 'ShipID');           // A
    const loRobReportIDCol = getColumnLetter(loRobSheet, 'Report_Consumption_ID'); // B
    const loRobEntryDateCol = getColumnLetter(loRobSheet, 'EntryDate');       // C
    const loRobLubeOilTypeKeyCol = getColumnLetter(loRobSheet, 'LubeOilTypeKey'); // D
    const loRobBunkeredQtyCol = getColumnLetter(loRobSheet, 'Bunkered_Quantity'); // E
    const loRobConsumedQtyCol = getColumnLetter(loRobSheet, 'Consumed_Quantity'); // F
    const loRobInitialQtyCol = getColumnLetter(loRobSheet, 'Initial_Quantity'); // G
    const loRobFinalQtyCol = getColumnLetter(loRobSheet, 'Final_Quantity');      // H
    const loRobEntryModeCol = getColumnLetter(loRobSheet, 'entry_mode');       // I
    
    // Total LO entries to display (starting at row 2 in this sheet, linked to row 21 in Bunker ROB)
    const MAX_LO_ROB_ENTRIES_DISPLAY = MAX_LO_ROB_ENTRIES; 

    // --- Apply Formulas for Lube Oil ROB Sheet (Rows 2 onwards) ---
    for (let i = 2; i <= MAX_LO_ROB_ENTRIES_DISPLAY; i++) {
        const row = loRobSheet.getRow(i);
        // FIX 1: Apply data style WITHOUT border to all data rows (including Row 2)
        row.eachCell(cell => { cell.style = dataStyleNoBorder; });

        // Row in Bunker ROB sheet where LO data starts: row 21
        // R2 in LO ROB Sheet links to R21 in Bunker ROB sheet. Index logic: R21 + (i - 2)
        const bunkerRobRow = START_LO_ROB_ROW + (i - 2); 
        const conditionalWrapperLoRob = (formula) => `IF(${loRobLubeOilTypeKeyCol}${i}="","", ${formula})`;


        // D: LubeOilTypeKey - Distinct ItemTypeKey from Bunker ROB LO block
        const lubeOilTypeKeyFormula = `=IF(ISBLANK('Bunker ROB'!$${BR_UNIQUE_KEY_COL}$${bunkerRobRow}), "", 'Bunker ROB'!$${BR_UNIQUE_KEY_COL}$${bunkerRobRow})`;
        row.getCell(loRobLubeOilTypeKeyCol).value = { formula: lubeOilTypeKeyFormula, result: undefined };
        
        // A: ShipID: =IF(D2="","", shipId)
        const shipIdFormula = conditionalWrapperLoRob(`${shipId}`); 
        row.getCell(loRobShipIDCol).value = {
            formula: shipIdFormula,
            result: undefined 
        };

        // B: Report_Consumption_ID: Chaining logic
        // MODIFIED: Apply new LOOKUP logic for all rows >= 3
        let reportIdFormula;
        if (i === 2) {
            reportIdFormula = conditionalWrapperLoRob(`VesselDailyReports!$${mainReportIDColLetter}$${i}`);
        } else {
            // Rows 3 onwards: =IF(D3="","", IF(VDR!A3<>"", VDR!A3, LOOKUP(2,1/(B$1:B2<>""),B$1:B2)))
            const lookupRange = `${loRobReportIDCol}$1:${loRobReportIDCol}${i-1}`;
            reportIdFormula = `IF(${loRobLubeOilTypeKeyCol}${i}="","", IF(VesselDailyReports!$${mainReportIDColLetter}$${i}<>"", VesselDailyReports!$${mainReportIDColLetter}$${i}, LOOKUP(2,1/(${lookupRange}<>""),${lookupRange})))`;
        }
        row.getCell(loRobReportIDCol).value = { formula: reportIdFormula, result: undefined }; // <-- MODIFIED
        
        // C: EntryDate: VLOOKUP(B2,VesselDailyReports!$A:$F,6,FALSE)
        const entryDateFormula = conditionalWrapperLoRob(`VLOOKUP(${loRobReportIDCol}${i},VesselDailyReports!$A:$F,6,FALSE)`);
        row.getCell(loRobEntryDateCol).value = { formula: entryDateFormula, result: undefined };
        
        // E: Bunkered_Quantity: SUMIF('Bunker ROB'!E:E, D2, 'Bunker ROB'!F:F)
        const bunkeredQtyFormula = conditionalWrapperLoRob(`SUMIF('Bunker ROB'!$${BR_ITEM_TYPE_KEY_COL}:$${BR_ITEM_TYPE_KEY_COL}, ${loRobLubeOilTypeKeyCol}${i}, 'Bunker ROB'!$${BR_BUNKERED_QTY_COL}:$${BR_BUNKERED_QTY_COL})`);
        row.getCell(loRobBunkeredQtyCol).value = { formula: bunkeredQtyFormula, result: 0 };

        // F: Consumed_Quantity: SUMIF('Bunker ROB'!E:E, D2, 'Bunker ROB'!G:G)
        const consumedQtyFormula = conditionalWrapperLoRob(`SUMIF('Bunker ROB'!$${BR_ITEM_TYPE_KEY_COL}:$${BR_ITEM_TYPE_KEY_COL}, ${loRobLubeOilTypeKeyCol}${i}, 'Bunker ROB'!$${BR_CONSUMED_QTY_COL}:$${BR_CONSUMED_QTY_COL})`);
        row.getCell(loRobConsumedQtyCol).value = { formula: consumedQtyFormula, result: 0 };

        // G: Initial_Quantity: =IF(D2="","", VLOOKUP(D2,'Lookups Guide'!V:X,3,FALSE)
        const initialQtyFormula = conditionalWrapperLoRob(`VLOOKUP(${loRobLubeOilTypeKeyCol}${i},'Lookups Guide'!$V:$X,3,FALSE)`);
        row.getCell(loRobInitialQtyCol).value = { formula: initialQtyFormula, result: undefined };

        // H: Final_Quantity: =IF(D2="","", G2-F2+E2)
        const finalQtyFormula = conditionalWrapperLoRob(`${loRobInitialQtyCol}${i}-${loRobConsumedQtyCol}${i}+${loRobBunkeredQtyCol}${i}`);
        row.getCell(loRobFinalQtyCol).value = { formula: finalQtyFormula, result: undefined };

        // I: entry_mode: =IF(D2="","", VLOOKUP(B2,VesselDailyReports!A:D,4,FALSE)
        const entryModeFormula = conditionalWrapperLoRob(`VLOOKUP(${loRobReportIDCol}${i},VesselDailyReports!$A:$D,4,FALSE)`);
        row.getCell(loRobEntryModeCol).value = { formula: entryModeFormula, result: undefined };
    }

    
    // --- 8. Voyage Details Sheet (Read-only data - Headers match SQL Output) ---
    const voyageSheet = workbook.addWorksheet('Voyage Details');
    voyageSheet.state = 'hidden';
    voyageSheet.columns = [
        { header: 'LegName', key: 'LegName', width: 25 },
        { header: 'VoyageID', key: 'VoyageID', width: 15 },
        { header: 'ShipID', key: 'ShipID', width: 10 },
        { header: 'DeparturePortCode', key: 'DeparturePortCode', width: 20 },
        { header: 'ArrivalPortCode', key: 'ArrivalPortCode', width: 20 },
        // FIX 2.8: Update numFmt to dd-mm-yyyy hh:mm
        { header: 'ETD', key: 'ETD', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'ATD', key: 'ATD', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'ETA', key: 'ETA', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'ATA', key: 'ATA', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'CargoDescription', key: 'CargoDescription', width: 30 },
        { header: 'CargoWeightMT', key: 'CargoWeightMT', width: 25 },
        { header: 'VoyageNumber', key: 'VoyageNumber', width: 20 },
        { header: 'LegNumber', key: 'LegNumber', width: 15 },
        { header: 'VoyageLegID', key: 'VoyageLegID', width: 15 },
    ];
    
    voyageSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });
    
    voyageData.forEach(voyage => {
        const row = voyageSheet.addRow({
            LegName: voyage.LegName,
            VoyageID: voyage.VoyageID,
            ShipID: voyage.ShipID,
            DeparturePortCode: voyage.DeparturePortCode,
            ArrivalPortCode: voyage.ArrivalPortCode,
            ETD: formatExcelDateTime(voyage.ETD, null),
            ATD: formatExcelDateTime(voyage.ATD, null),
            ETA: formatExcelDateTime(voyage.ETA, null),
            ATA: formatExcelDateTime(voyage.ATA, null),
            CargoDescription: voyage.CargoDescription,
            CargoWeightMT: voyage.CargoWeightMT,
            VoyageNumber: voyage.VoyageNumber,
            LegNumber: voyage.LegNumber,
            VoyageLegID: voyage.VoyageLegID,
        });
        row.eachCell(cell => { cell.style = dataStyle; }); 
    });

    // --- 9. Lookups Guide Sheet (STRICT USER FORMAT: Horizontal Mapping) ---
    const lookupsSheet = workbook.addWorksheet('Lookups Guide');
    lookupsSheet.state = 'hidden';

    
    // Headers MUST match the user's provided comma-separated list
    const lookupHeaders = [
        'ReportTypeKey', 'Vessel_Activity', 'DirectionName', 'StateDescription', 'Cargo_Activity', 'ShipID', 'CustomMachineryName',
        'MachineryTypeKey', 'MachineryRecordID', 'ROB_Entry_ID', 'ItemTypeKey1', 'BDN_Number', 'ItemTypeKey', 'ItemCategory',
        'Initial_Quantity', 'Final_Quantity', 'DailyROB_ReportID', 'FuelTypeKey', 'DR_Initial_Quantity', 'DR_Final_Quantity',
        'LO_ReportID', 'LubeOilTypeKey', 'LO_Initial_Quantity', 'LO_Final_Quantity', 'Time_Zone',
        'BDN_ItemType',   // Column Z (from BG.Item)
        'BDN1',           // Column AA (from BG.BDN1)
        'BDN2',           // Column AB (from BG.BDN2)
        'BDN3',
        'BDN4',
        'BDN5',
        'BDN6',
        'BDN7',
        'BDN8',
        'BDN9',
        'BDN10',          // Column AJ (from BG.BDN10)
        'LubeOilType_Filtered', // Column AK (New dedicated, filtered list column for LO)
        'FuelTypeKey_Filtered' // Column AL (New dedicated, filtered list column for FUEL)
    ];
    
    lookupsSheet.columns = lookupHeaders.map(h => ({ header: h, key: h, width: 25 }));
    lookupsSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    const lookupDataRows = lookups.fullLookupResults || [];
    const maxRows = Math.max(lookupDataRows.length, TIME_ZONES.length);
    
    for (let i = 0; i < maxRows; i++) {
        const data = lookups.fullLookupResults[i] || {};
        const row = {};

        // Map fetched SQL data (data) and static Time Zone data horizontally
        lookupHeaders.forEach(key => {
            if (key === 'Time_Zone') {
                row[key] = TIME_ZONES[i] || '';
            } else if (key === 'LubeOilType_Filtered' || key === 'FuelTypeKey_Filtered') {
                // These columns are populated separately below as a contiguous list
                row[key] = '';
            } else {
                // Use the raw string values from the SQL result set.
                let rawValue = data[key] || '';
                
                // FIX: Trim whitespace and remove quotes/newlines from ItemCategory
                if (key === 'ItemCategory' && typeof rawValue === 'string') {
                    // 1. Trim whitespace
                    rawValue = rawValue.trim();
                    // 2. Remove all internal quotes, double quotes, and newlines
                    // This aggressively cleans the string to ensure simple output.
                    rawValue = rawValue.replace(/['"\n\r]/g, ''); 
                }
                
                row[key] = rawValue;
            }
        });
        addDataRow(lookupsSheet, row, dataStyle);
    }
    
    // --- Populate Filtered Lube Oil Types (AK) into a contiguous list ---
    const loFilteredCol = getColumnLetter(lookupsSheet, 'LubeOilType_Filtered'); // AK

    LUBE_OIL_TYPE_KEYS.forEach((key, index) => {
        const rowNum = index + 2; // Start from row 2
        const row = lookupsSheet.getRow(rowNum);
        row.getCell(loFilteredCol).value = key;
        row.getCell(loFilteredCol).style = dataStyle; 
    });
    
    // --- Populate Filtered Fuel Types (AL) into a contiguous list ---
    const fuelFilteredCol = getColumnLetter(lookupsSheet, 'FuelTypeKey_Filtered'); // AL

    FUEL_TYPE_KEYS.forEach((key, index) => {
        const rowNum = index + 2; // Start from row 2
        const row = lookupsSheet.getRow(rowNum);
        row.getCell(fuelFilteredCol).value = key;
        row.getCell(fuelFilteredCol).style = dataStyle; 
    });


    // --- HIDE FORMULAS + PROTECT SHEETS (allow editing for non-formula cells) ---
    await applyFormulaProtection(mainReportSheet, MAX_DATA_ROWS);
    await applyFormulaProtection(machineryDataSheet, MAX_DATA_ROWS, [
        machineryRunningHrsCol,
        machineryTotalPowerCol,
        machineryConsumedMTCol
    ]);
    await applyFormulaProtection(fuelConsumptionSheet, MAX_DATA_ROWS);
    await applyFormulaProtection(loConsumptionSheet, MAX_DATA_ROWS);
    await applyFormulaProtection(bunkerRobSheet, MAX_DATA_ROWS);
    await applyFormulaProtection(fuelRobSheet, MAX_DATA_ROWS);
    await applyFormulaProtection(loRobSheet, MAX_DATA_ROWS);
    await applyFormulaProtection(voyageSheet, MAX_DATA_ROWS);
    await applyFormulaProtection(lookupsSheet, MAX_DATA_ROWS);

    // --- ADD HIDDEN UPLOAD TOKEN SHEET ---
    // Import token generation function dynamically
    const { generateUploadToken } = await import('../models/excelModel.js');
    
    try {
        // Generate token for this template
        const tokenData = await generateUploadToken(
            shipIdFromData,      // ShipID
            null,               // CreatedBy (optional - can be set from user context)
            365,                // Expires in 365 days
            null,               // Unlimited usage
            `Template generated for Ship ${shipIdFromData}`
        );
        
        // Create hidden sheet
        const tokenSheet = workbook.addWorksheet('_UploadToken');
        tokenSheet.state = 'veryHidden'; // Make it very hidden (not just hidden)
        
        // Store token data
        tokenSheet.getCell('A1').value = 'UPLOAD_TOKEN';
        tokenSheet.getCell('B1').value = tokenData.Token;
        tokenSheet.getCell('A2').value = 'SHIP_ID';
        tokenSheet.getCell('B2').value = tokenData.ShipID;
        tokenSheet.getCell('A3').value = 'EXPIRES_AT';
        tokenSheet.getCell('B3').value = tokenData.ExpiresAt ? tokenData.ExpiresAt.toISOString() : 'Never';
        tokenSheet.getCell('A4').value = 'GENERATED_AT';
        tokenSheet.getCell('B4').value = new Date().toISOString();
        
        console.log(`✅ Upload token embedded in template: ${tokenData.Token}`);
    } catch (tokenError) {
        console.error('⚠️ Failed to generate upload token:', tokenError.message);
        // Continue without token - users can still use manual authentication
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

// --- Function to parse the uploaded Excel file ---
export const parseExcelReport = async (buffer, uniqueId) => { 
    const workbook = new Workbook(); 
    try {
        console.log(`🔄 [${uniqueId}] Loading Excel buffer (${buffer.length} bytes)...`);
        await workbook.xlsx.load(buffer);
        console.log(`✅ [${uniqueId}] Excel workbook loaded successfully`);
    } catch (readErr) {
        console.error(`❌ [${uniqueId}] Excel load error:`, readErr.message);
        console.error(`Error details:`, readErr);
        throw new Error(`Failed to read Excel file: ${readErr.message}`);
    }

    // Removed: const sheets = {};
    const sheetCsvData = {}; 
    const expectedSheets = Object.keys(CSV_SHEET_MAPPING);
    console.log(`📋 [${uniqueId}] Expected sheets:`, expectedSheets);

    // NEW: Define the column limits based on user request (0-based index of headers array)
    const COLUMN_LIMITS = {
        'Machinery Data': 10,     // Column K (Purpose)
        'Lube Oil Consumption': 7,  // Column H (EntryDate)
        'Fuel Consumption': 8,    // Column I (EntryDate)
        'Bunker ROB': 9,          // Column J (ItemCategory)
        // VesselDailyReports, Fuel ROB, Lube Oil ROB use all columns up to the end (implicit no limit)
    };


    
    // Loop over only the 7 requested sheets
    for (const sheetName of expectedSheets) {
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            continue; 
        }

        const rawHeaders = worksheet.getRow(1).values;
        // Slice(1) removes the empty/null element at index 0 from ExcelJS parsing
        const allHeaders = rawHeaders.slice(1).map(h => typeof h === 'object' ? h.result : h); 
        
        // Apply column filter for headers
        const limitIndex = COLUMN_LIMITS[sheetName];
        const headers = limitIndex !== undefined ? allHeaders.slice(0, limitIndex + 1) : allHeaders;


        let csvContent = headers.map(escapeCsv).join(',') + '\r\n'; // CRITICAL FIX: Changed from '\n' to '\r\n' for robust BULK INSERT
        // Removed: const data = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row

            // REMOVED: Example row detection logic based on style

            let rowHasAnyData = false;
            let rowCsvValues = [];
            // Removed: const rowData = {};

            // Collect data and check for content
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const headerIndex = colNumber - 1;
                
                // NEW LOGIC for Issue 2: Filter unwanted columns from being processed
                if (limitIndex !== undefined && headerIndex > limitIndex) {
                    return; // Skip this cell and any subsequent column on this row
                }

                const header = headers[headerIndex]; 
                
                let value = cell.value;
                let parsedValue = null;

                // Handle Excel formula results, rich text, and dates
                if (typeof value === 'object' && value !== null) {
                    if ('result' in value) {
                        parsedValue = value.result;
                        
                        // FIX for Date Shift: Use moment.utc() to format the date without applying 
                        // the server's local time zone offset, preserving the input time.
                        if (parsedValue instanceof Date) {
                            // FIX 2.9: Output format is DD/MM/YYYY HH:mm:ss (SQL style 103 compatible)
                            parsedValue = moment.utc(parsedValue).format('DD/MM/YYYY HH:mm:ss');
                        }
                    } else if ('richText' in value) {
                        parsedValue = value.richText.map(text => text.text).join('');
                    } else if (value instanceof Date) {
                        // FIX for Date Shift: Apply the same fix for plain date objects.
                        // FIX 2.10: Output format is DD/MM/YYYY HH:mm:ss (SQL style 103 compatible)
                        parsedValue = moment.utc(value).format('DD/MM/YYYY HH:mm:ss');
                    }
                } else {
                    parsedValue = value;
                }
                
                // Mark row if it contains any non-empty data
                if (parsedValue !== null && parsedValue !== undefined && String(parsedValue).trim() !== '' && String(parsedValue).toLowerCase() !== 'n/a') {
                    rowHasAnyData = true;
                }

                // Collect CSV values (uses parsedValue which is now correctly formatted)
                rowCsvValues.push(escapeCsv(parsedValue));
                
                // Removed: Map to JSON data structure
                // if (header) {
                //      rowData[header] = parsedValue;
                // }
            });
            
            // --- Decide whether to skip this row ---
            
            // If the row is completely empty, skip it.
            if (!rowHasAnyData) {
                 return; 
            }
            
            // Append row to CSV content (will only run if rowHasAnyAnyData is true)
            csvContent += rowCsvValues.join(',') + '\r\n'; // CRITICAL FIX: Changed from '\n' to '\r\n'
            
            
            // Removed: Add the data to the JSON structure for preview/DB import
            // if (rowHasAnyData) {
            //      const finalRow = {};
            //      for (const header in rowData) {
            //          // ... JSON key standardization logic ...
            //          // Removed logic to build JSON preview data
            //      }
            //      data.push(finalRow);
            // }
        });
        
        // Removed: sheets[sheetName] = data; 
        sheetCsvData[sheetName] = csvContent;
    }
    
    // --- Save CSV Files to Server ---
    const localUploadBaseDir = path.join(__dirname, '../public/uploads/');
    const reportsUploadBaseDir = process.env.REPORTS_UPLOAD_PATH && process.env.REPORTS_UPLOAD_PATH.trim();
    const uploadBaseDirs = [localUploadBaseDir];
    if (reportsUploadBaseDir && reportsUploadBaseDir !== localUploadBaseDir) {
        uploadBaseDirs.push(reportsUploadBaseDir);
    }
    
    for (const sheetName in sheetCsvData) {
        const mapping = CSV_SHEET_MAPPING[sheetName];
        if (!mapping) continue;

        for (const baseDir of uploadBaseDirs) {
            const folderPath = path.join(baseDir, mapping.folder);
            const csvFileName = `${uniqueId}_${mapping.file}`;
            const csvFilePath = path.join(folderPath, csvFileName);

            // 1. Create the folder if it doesn't exist
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            
            // 2. Write the CSV data to the server file system
            try {
                fs.writeFileSync(csvFilePath, sheetCsvData[sheetName]);
            } catch (writeError) {
                console.error(`Failed to save CSV file for ${sheetName} to ${baseDir}:`, writeError);
                // Continue, but log the error
            }
        }
    }


    return {}; // Return empty object since JSON data capture is removed
};