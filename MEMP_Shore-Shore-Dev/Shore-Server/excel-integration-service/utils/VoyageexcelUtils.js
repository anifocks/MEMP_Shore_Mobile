// viswa-digital-backend/excel-integration-service/utils/VoyageexcelUtils.js

import pkg from 'exceljs';
const Workbook = pkg.Workbook || pkg; 
import path from 'path'; 
import fs from 'fs';
import moment from 'moment-timezone'; 
import { fileURLToPath } from 'url'; 
import { createReportStatusSheet, createUploadTokenSheet } from './reportStatusSheetHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Constants ---
const UPLOADS_BASE_DIR = path.join(__dirname, '../public/uploads/');
const VOYAGE_UPLOAD_FOLDER = 'Voyage_Uploads'; 
const VOYAGE_NUMBER_FOLDER = 'VoyageNumber'; // New Folder for Voyages CSV
const VOYAGE_LEGS_FOLDER = 'VoyageNumberLegs'; // New Folder for VoyageLegs CSV

// --- Styles ---
const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } }, // Blue
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
};

const dataStyle = {
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
};

// Italic style for Name columns (User Request)
const italicDataStyle = {
    font: { italic: true },
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
};

const dataStyleNoBorder = {
    alignment: { vertical: 'middle', horizontal: 'left' },
};

// --- Helpers ---

// Helper: Format Date/Time
const formatExcelDateTime = (dateValue, timezone, includeTime = true) => {
    if (!dateValue) return '';
    const FORMAT = includeTime ? 'DD-MM-YYYY HH:mm' : 'DD-MM-YYYY'; 
    try {
        // FIXED: Using moment.utc() exclusively to ensure the database value 
        // is displayed exactly as-is, preventing local machine timezone shifts.
        return moment.utc(dateValue).format(FORMAT);
    } catch (e) {
        return String(dateValue);
    }
};

// Helper: Add Data Row
const addDataRow = (sheet, data, style) => {
    const row = sheet.addRow(data);
    row.eachCell(cell => { cell.style = style; });
    return row;
};

// Helper to escape CSV values
const escapeCsv = (value) => {
    if (value === null || value === undefined) return '';
    let str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

// Helper: Get Excel Column Letter
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

// Helper: Sanitize Filename (Remove illegal chars)
const sanitizeFilename = (name) => {
    if (!name) return '';
    return name.toString().replace(/[^a-zA-Z0-9_\-]/g, '_');
};

// =========================================================================
// 1. GENERATE VOYAGE EXCEL TEMPLATE
// =========================================================================
export const generateVoyageTemplate = async (shipId, templateData) => {
    const { voyageData, portsData } = templateData; 
    const workbook = new Workbook(); 
    workbook.creator = 'Viswa Digital';
    workbook.created = new Date();

    const MAX_DATA_ROWS = 500; 

    // ---------------------------------------------------------
    // 0. Report Status Sheet (Must be first sheet)
    // ---------------------------------------------------------
    createReportStatusSheet(workbook, 'Voyage');

    // ---------------------------------------------------------
    // 1. Voyages Sheet
    // ---------------------------------------------------------
    const voyagesSheet = workbook.addWorksheet('Voyages');
    voyagesSheet.columns = [
        { header: 'ShipID', key: 'ShipID', width: 10 },             // A
        { header: 'DeparturePort', key: 'DeparturePort', width: 25 }, // B (Italic Name)
        { header: 'DeparturePortCode', key: 'DeparturePortCode', width: 20 }, // C (Lookup Code)
        { header: 'ArrivalPort', key: 'ArrivalPort', width: 25 },     // D (Italic Name)
        { header: 'ArrivalPortCode', key: 'ArrivalPortCode', width: 20 }, // E (Lookup Code)
        { header: 'ATD', key: 'ATD', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // F
        { header: 'ETA', key: 'ETA', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // G
        { header: 'ETD', key: 'ETD', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // H
        { header: 'ATA', key: 'ATA', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // I
        { header: 'DistancePlannedNM', key: 'DistancePlannedNM', width: 20, style: { numFmt: '0.00' } }, // J
        { header: 'DistanceSailedNM', key: 'DistanceSailedNM', width: 20, style: { numFmt: '0.00' } }, // K
        { header: 'CargoDescription', key: 'CargoDescription', width: 30 },
        { header: 'CargoWeightMT', key: 'CargoWeightMT', width: 20 },
        { header: 'VoyageNumber', key: 'VoyageNumber', width: 20 },
    ];
    voyagesSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // --- Voyages Formulas & Styles ---
    for (let i = 2; i <= MAX_DATA_ROWS; i++) {
        const row = voyagesSheet.getRow(i);
        row.eachCell({ includeEmpty: true }, cell => { cell.style = dataStyleNoBorder; });

        // A: ShipID = IF(B2="","", shipId)
        row.getCell('A').value = { formula: `IF(B${i}="","", ${shipId})` };

        // C: DeparturePortCode = IF(B2="","", VLOOKUP(B2,PortsLookUp!B:E,4,FALSE))
        // PortsLookUp: B=Name(1), C=Country(2), D=CountryCode(3), E=PortCode(4)
        row.getCell('C').value = { formula: `IF(B${i}="","", IFERROR(VLOOKUP(B${i},'PortsLookUp'!$B:$E,4,FALSE), ""))` };

        // E: ArrivalPortCode = IF(D2="","", VLOOKUP(D2,PortsLookUp!B:E,4,FALSE))
        row.getCell('E').value = { formula: `IF(D${i}="","", IFERROR(VLOOKUP(D${i},'PortsLookUp'!$B:$E,4,FALSE), ""))` };

        // Apply Italic style to Name columns (B and D)
        row.getCell('B').style = italicDataStyle;
        row.getCell('D').style = italicDataStyle;
    }

    // --- Voyages Validations ---
    // Dropdowns for Port Names (B & D) -> PortsLookUp!B
    // Date Validators for F, G, H, I
    const portNameRange = `'PortsLookUp'!$B$2:$B$${(portsData ? portsData.length : 0) + 2}`;
    
    ['B', 'D'].forEach(col => {
        voyagesSheet.dataValidations.add(`${col}2:${col}${MAX_DATA_ROWS}`, {
            type: 'list', allowBlank: true, formulae: [portNameRange],
            showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Select a valid Port from the list.'
        });
    });

    ['F', 'G', 'H', 'I'].forEach(col => {
        voyagesSheet.dataValidations.add(`${col}2:${col}${MAX_DATA_ROWS}`, {
            type: 'date', operator: 'greaterThanOrEqual', formulae: [new Date('2000-01-01')], 
            showInputMessage: true, promptTitle: 'Date Format', prompt: 'DD-MM-YYYY HH:mm',
            showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Date', error: 'Enter valid date/time.'
        });
    });

    // Numeric Validators for J, K
    ['J', 'K'].forEach(col => {
        voyagesSheet.dataValidations.add(`${col}2:${col}${MAX_DATA_ROWS}`, {
            type: 'decimal', operator: 'greaterThanOrEqual', formulae: [0],
            showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Number', error: 'Enter a numeric value.'
        });
    });


    // ---------------------------------------------------------
    // 2. VoyageLegs Sheet
    // ---------------------------------------------------------
    const legsSheet = workbook.addWorksheet('VoyageLegs');
    legsSheet.columns = [
        { header: 'VoyageID', key: 'VoyageID', width: 15 },             // A
        { header: 'VoyageNumber', key: 'VoyageNumber', width: 20 },     // B (Dropdown)
        { header: 'MidPortName', key: 'MidPortName', width: 20 },       // C (Italic Name, Dropdown)
        { header: 'MidPort', key: 'MidPort', width: 15 },               // D (Lookup Code)
        { header: 'MidPort_ATA', key: 'MidPort_ATA', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // E
        { header: 'MidPort_ATD', key: 'MidPort_ATD', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // F
        { header: 'NewArrivalPortName', key: 'NewArrivalPortName', width: 20 }, // G (Italic Name, Dropdown)
        { header: 'NewArrivalPort', key: 'NewArrivalPort', width: 15 }, // H (Lookup Code)
        { header: 'NewArrival_ATD', key: 'NewArrival_ATD', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // I
    ];
    legsSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // --- VoyageLegs Formulas & Styles ---
    for (let i = 2; i <= MAX_DATA_ROWS; i++) {
        const row = legsSheet.getRow(i);
        row.eachCell({ includeEmpty: true }, cell => { cell.style = dataStyleNoBorder; });

        // A: VoyageID = Look up VoyageNumber (B) in VoyageLookups (Col L) and return VoyageID (Col B)
        row.getCell('A').value = { formula: `IF(B${i}="","", INDEX('VoyageLookups'!$B:$B, MATCH(B${i}, 'VoyageLookups'!$L:$L, 0)))` };

        // D: MidPort (Code) = VLOOKUP(C, PortsLookUp!B:E, 4)
        row.getCell('D').value = { formula: `IF(C${i}="","", IFERROR(VLOOKUP(C${i},'PortsLookUp'!$B:$E,4,FALSE), ""))` };

        // H: NewArrivalPort (Code) = VLOOKUP(G, PortsLookUp!B:E, 4)
        row.getCell('H').value = { formula: `IF(G${i}="","", IFERROR(VLOOKUP(G${i},'PortsLookUp'!$B:$E,4,FALSE), ""))` };

        // Apply Italic style to Name columns (C and G)
        row.getCell('C').style = italicDataStyle;
        row.getCell('G').style = italicDataStyle;
    }

    // --- VoyageLegs Validations ---
    const voyageNumRange = `'VoyageLookups'!$L$2:$L$${(voyageData ? voyageData.length : 0) + 2}`;

    legsSheet.dataValidations.add(`B2:B${MAX_DATA_ROWS}`, {
        type: 'list', allowBlank: true, formulae: [voyageNumRange],
        showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Select a valid Voyage Number.'
    });

    ['C', 'G'].forEach(col => {
        legsSheet.dataValidations.add(`${col}2:${col}${MAX_DATA_ROWS}`, {
            type: 'list', allowBlank: true, formulae: [portNameRange],
            showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Select a valid Port.'
        });
    });
    
    ['E', 'F', 'I'].forEach(col => {
        legsSheet.dataValidations.add(`${col}2:${col}${MAX_DATA_ROWS}`, {
            type: 'date', operator: 'greaterThanOrEqual', formulae: [new Date('2000-01-01')], 
            showInputMessage: true, promptTitle: 'Date Format', prompt: 'DD-MM-YYYY HH:mm',
            showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Date', error: 'Enter valid date/time.'
        });
    });


    // ---------------------------------------------------------
    // 3. PortsLookUp Sheet
    // ---------------------------------------------------------
    const portsSheet = workbook.addWorksheet('PortsLookUp');
    // portsSheet.state = 'hidden'; 
    portsSheet.columns = [
        { header: 'PortID', key: 'PortID', width: 10 },
        { header: 'PortName', key: 'PortName', width: 30 },
        { header: 'Country', key: 'Country', width: 20 },
        { header: 'CountryCode', key: 'CountryCode', width: 15 },
        { header: 'PortCode', key: 'PortCode', width: 15 },
    ];
    portsSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    if (portsData && portsData.length > 0) {
        portsData.forEach(port => {
            const row = portsSheet.addRow({
                PortID: port.PortID,
                PortName: port.PortName,
                Country: port.Country,
                CountryCode: port.CountryCode,
                PortCode: port.PortCode
            });
            row.eachCell(cell => { cell.style = dataStyle; });
        });
    }

    // ---------------------------------------------------------
    // 4. VoyageLookups Sheet (Same structure as "Voyage Details")
    // ---------------------------------------------------------
    const voyageLookupSheet = workbook.addWorksheet('VoyageLookups');
    // voyageLookupSheet.state = 'hidden'; 
    voyageLookupSheet.columns = [
        { header: 'LegName', key: 'LegName', width: 25 }, // A
        { header: 'VoyageID', key: 'VoyageID', width: 15 }, // B
        { header: 'ShipID', key: 'ShipID', width: 10 },
        { header: 'DeparturePortCode', key: 'DeparturePortCode', width: 20 },
        { header: 'ArrivalPortCode', key: 'ArrivalPortCode', width: 20 },
        { header: 'ETD', key: 'ETD', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'ATD', key: 'ATD', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'ETA', key: 'ETA', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'ATA', key: 'ATA', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'CargoDescription', key: 'CargoDescription', width: 30 },
        { header: 'CargoWeightMT', key: 'CargoWeightMT', width: 25 },
        { header: 'VoyageNumber', key: 'VoyageNumber', width: 20 }, // L (Column 12)
        { header: 'LegNumber', key: 'LegNumber', width: 15 },
        { header: 'VoyageLegID', key: 'VoyageLegID', width: 15 },
    ];
    voyageLookupSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    if (voyageData && voyageData.length > 0) {
        voyageData.forEach(voyage => {
            const row = voyageLookupSheet.addRow({
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
    }

    // --- Unprotect All Sheets ---
    [voyagesSheet, legsSheet, portsSheet, voyageLookupSheet].forEach(sheet => {
        sheet.properties.sheetProtection = { sheet: false };
    });

    // ===== NEW: Add Upload Token Sheet =====
    createUploadTokenSheet(workbook, templateData.uploadToken || '');

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

// =========================================================================
// 2. PARSE VOYAGE EXCEL (Extract & Save CSVs)
// =========================================================================
export const parseVoyageExcel = async (buffer, uniqueId) => {
    const workbook = new Workbook();
    try {
        await workbook.xlsx.load(buffer);
    } catch (readErr) {
        throw new Error("Failed to read Excel file. It might be corrupted.");
    }

    const VOYAGE_SHEET_MAPPING = {
        'Voyages': 'Voyages.csv',
        'VoyageLegs': 'VoyageLegs.csv'
    };

    const sheetCsvData = {};
    const previewData = {}; // ADDED: Object to hold preview data

    for (const sheetName in VOYAGE_SHEET_MAPPING) {
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) continue;

        const rawHeaders = worksheet.getRow(1).values;
        // Slice(1) to remove null at index 0
        const headers = rawHeaders.slice(1).map(h => 
            (typeof h === 'object' ? h.result : h)?.toString().trim()
        ).filter(h => h);

        if (headers.length === 0) continue;

        // --- FILTERING LOGIC ---
        let indicesToKeep = headers.map((_, i) => i); 
        let finalHeaders = headers;

        if (sheetName === 'VoyageLegs') {
            // Exclude: MidPortName (Index 2/C), NewArrivalPortName (Index 6/G)
            const exclusionIndices = [2, 6];
            indicesToKeep = headers.map((_, i) => i).filter(i => !exclusionIndices.includes(i));
            finalHeaders = indicesToKeep.map(i => headers[i]);
        } else if (sheetName === 'Voyages') {
            // **NEW: Exclude DeparturePort (Index 1/Col B) and ArrivalPort (Index 3/Col D)**
            const exclusionIndices = [1, 3]; 
            indicesToKeep = headers.map((_, i) => i).filter(i => !exclusionIndices.includes(i));
            finalHeaders = indicesToKeep.map(i => headers[i]);
        }

        let csvContent = finalHeaders.map(escapeCsv).join(',') + '\r\n';
        
        // Initialize array for this sheet in preview data
        previewData[sheetName] = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            let rowHasData = false;
            const rowValuesMap = [];
            const rowDataObj = {}; // For preview
            
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber > headers.length) return; 

                let value = cell.value;
                let parsedValue = null;

                // ** FIX for [object Object] **
                if (typeof value === 'object' && value !== null) {
                    if ('result' in value) {
                        parsedValue = value.result;
                    } else if ('richText' in value) {
                        parsedValue = value.richText.map(t => t.text).join('');
                    } else {
                        if (value instanceof Date) {
                            // FIXED: Use moment.utc to preserve user input exactly as entered
                            parsedValue = moment.utc(value).format('YYYY-MM-DD HH:mm:ss');
                        } else {
                            parsedValue = ""; // Return empty instead of [object Object]
                        }
                    }
                } else {
                    parsedValue = value;
                }
                
                // Fix: Ensure undefined is empty string for consistency
                if (parsedValue === null || parsedValue === undefined) parsedValue = "";

                rowValuesMap[colNumber - 1] = parsedValue;
                
                // ADDED: Populate row object for preview (using original headers as keys)
                if (headers[colNumber - 1]) {
                    rowDataObj[headers[colNumber - 1]] = parsedValue;
                }

                if (String(parsedValue).trim() !== '') {
                    rowHasData = true;
                }
            });

            if (rowHasData) {
                const filteredValues = indicesToKeep.map(index => {
                    const val = rowValuesMap[index];
                    return escapeCsv(val);
                });
                csvContent += filteredValues.join(',') + '\r\n';
                
                // ADDED: Push to preview data
                previewData[sheetName].push(rowDataObj);
            }
        });

        sheetCsvData[sheetName] = csvContent;
    }

    // --- Save CSV Files to Specific Folders ---
    const savedFiles = {};

    for (const sheetName in sheetCsvData) {
        let targetFolder = UPLOADS_BASE_DIR; // Default fallback
        let csvFileName;

        if (sheetName === 'Voyages') {
            targetFolder = path.join(UPLOADS_BASE_DIR, VOYAGE_NUMBER_FOLDER);
            // *** CRITICAL FIX: FORCE UNIQUE ID FOR SP COMPATIBILITY ***
            csvFileName = `${uniqueId}_Voyages.csv`; 
        } else if (sheetName === 'VoyageLegs') {
            targetFolder = path.join(UPLOADS_BASE_DIR, VOYAGE_LEGS_FOLDER);
            csvFileName = `${uniqueId}_VoyageLegs.csv`;
        } else {
            targetFolder = path.join(UPLOADS_BASE_DIR, VOYAGE_UPLOAD_FOLDER);
            csvFileName = `${uniqueId}_${sheetName}.csv`;
        }

        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        const csvFilePath = path.join(targetFolder, csvFileName);
        fs.writeFileSync(csvFilePath, sheetCsvData[sheetName]);
        savedFiles[sheetName] = csvFileName;
    }

    return {
        message: 'Voyage Excel parsed and CSVs saved successfully.',
        files: savedFiles,
        uniqueId: uniqueId,
        previewData: previewData // ADDED: Return this for the controller
    };
};