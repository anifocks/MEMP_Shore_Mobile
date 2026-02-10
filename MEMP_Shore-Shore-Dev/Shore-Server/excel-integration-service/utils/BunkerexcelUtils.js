// viswa-digital-backend/excel-integration-service/utils/BunkerexcelUtils.js

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
const BUNKER_UPLOAD_FOLDER = 'Bunker'; 

// --- Styles ---
const headerStyle = { font: { bold: true, color: { argb: 'FFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } };
const dataStyle = { alignment: { vertical: 'middle', horizontal: 'left' }, border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } };
const dataStyleNoBorder = { alignment: { vertical: 'middle', horizontal: 'left' } };

// --- Helpers ---
const escapeCsv = (value) => { if (value == null) return ''; let str = String(value); if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`; return str; };

// NEW HELPER: Format Date/Time for Template (Added to match your requirement)
const formatExcelDateTime = (dateValue, includeTime = true) => {
    if (!dateValue) return '';
    const FORMAT = includeTime ? 'DD-MM-YYYY HH:mm' : 'DD-MM-YYYY'; 
    try {
        // FIXED: Use moment.utc to prevent the computer from shifting the time
        return moment.utc(dateValue).format(FORMAT);
    } catch (e) {
        return String(dateValue);
    }
};

// =========================================================================
// 1. GENERATE BUNKER EXCEL TEMPLATE
// =========================================================================
export const generateBunkerTemplate = async (shipId, templateData) => {
    // We now receive a single merged array 'lookupData' from the model
    const { lookupData = [] } = templateData;

    const workbook = new Workbook(); 
    workbook.creator = 'Viswa Digital';
    workbook.created = new Date();
    const MAX_DATA_ROWS = 500; 

    // --- 0. Report Status Sheet (Must be first sheet) ---
    createReportStatusSheet(workbook, 'Bunker');

    // --- 1. Bunkering Sheet ---
    const mainSheet = workbook.addWorksheet('Bunkering');
    mainSheet.columns = [
        { header: 'ShipID', key: 'ShipID', width: 10, hidden: true },             // A
        { header: 'VoyageNumber', key: 'VoyageNumber', width: 20 },     // B
        { header: 'VoyageLegNumber', key: 'VoyageLegNumber', width: 25 }, // C (LegName)
        { header: 'BunkeringPort', key: 'BunkeringPort', width: 20 },   // D
        { header: 'BunkerPortCode', key: 'BunkerPortCode', width: 15 }, // E
        { header: 'BunkerDate', key: 'BunkerDate', width: 20, style: { numFmt: 'dd-mm-yyyy hh:mm' } }, // F
        { header: 'OperationType', key: 'OperationType', width: 20 },   // G
        { header: 'BDN_Number', key: 'BDN_Number', width: 20, hidden: true },   // H
        { header: 'BunkerCategory', key: 'BunkerCategory', width: 15 }, // I
        { header: 'FuelTypeKey', key: 'FuelTypeKey', width: 20 },       // J
        { header: 'LubeOilTypeKey', key: 'LubeOilTypeKey', width: 20 }, // K
        { header: 'Bunkered_Quantity', key: 'Bunkered_Quantity', width: 15 },
        { header: 'DensityAt15C', key: 'DensityAt15C', width: 15 },
        { header: 'SulphurContentPercent', key: 'SulphurContentPercent', width: 20 },
        { header: 'FlashPointC', key: 'FlashPointC', width: 15 },
        { header: 'ViscosityAt50C_cSt', key: 'ViscosityAt50C_cSt', width: 20 },
        { header: 'WaterContentPercent', key: 'WaterContentPercent', width: 20 },
        { header: 'LCV', key: 'LCV', width: 15 },
        { header: 'TemperatureC', key: 'TemperatureC', width: 15 },
        { header: 'PressureBar', key: 'PressureBar', width: 15 },
        { header: 'SupplierName', key: 'SupplierName', width: 20 },
        { header: 'BargeName', key: 'BargeName', width: 20 },
        { header: 'MARPOLSampleSealNumber', key: 'MARPOLSampleSealNumber', width: 25 },
        { header: 'Remarks', key: 'Remarks', width: 30 },
        { header: 'VoyageID', key: 'VoyageID', width: 10, hidden: true },             // Y
        { header: 'VoyageLegID', key: 'VoyageLegID', width: 15, hidden: true },
        { header: 'IsActive', key: 'IsActive', width: 10, hidden: true },
    ];
    mainSheet.getRow(1).eachCell(c => c.style = headerStyle);

    // Formulas & Defaults
    for (let i = 2; i <= MAX_DATA_ROWS; i++) {
        const row = mainSheet.getRow(i);
        row.eachCell({ includeEmpty: true }, cell => {
            cell.style = dataStyleNoBorder;
        });

        // Unlock all input columns (user-editable cells)
        const editableCols = ['B','C','D','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X'];
        editableCols.forEach(col => {
            row.getCell(col).protection = { locked: false, hidden: false };
        });

        // A: ShipID
        row.getCell('A').value = { formula: `IF(B${i}="","", ${shipId})` };
        row.getCell('A').protection = { locked: true, hidden: true };
        
        // E: BunkerPortCode (Lookup from PortName in D) -> Lookups J:K
        // Ports are at J(10) and K(11) in the new order
        row.getCell('E').value = { formula: `IF(D${i}="","", IFERROR(VLOOKUP(D${i},'Lookups'!$J:$K,2,FALSE), ""))` };
        row.getCell('E').protection = { locked: true, hidden: true };

        // Y: VoyageID (Lookup from VoyageNumber in B) -> Lookups B:D
        // Lookups: B=VoyageNumber (2), D=VoyageID (4). Index 3.
        row.getCell('Y').value = { formula: `IF(B${i}="","", IFERROR(VLOOKUP(B${i},'Lookups'!$B:$D,3,FALSE), ""))` };
        row.getCell('Y').protection = { locked: true, hidden: true };

        // Z: VoyageLegID (Lookup from LegName in C) -> Lookups C:E
        // Lookups: C=LegName (3), E=VoyageLegID (5). Index 3.
        row.getCell('Z').value = { formula: `IF(C${i}="","", IFERROR(VLOOKUP(C${i},'Lookups'!$C:$E,3,FALSE), ""))` };
        row.getCell('Z').protection = { locked: true, hidden: true };

        // AA: IsActive (dynamic formula)
        row.getCell('AA').value = { formula: `IF(B${i}="","", 1)` };
        row.getCell('AA').protection = { locked: true, hidden: true };
    }

    // --- 2. Lookups Sheet (Mapped to Single Consolidated Result Set) ---
    const lookupSheet = workbook.addWorksheet('Lookups');
    lookupSheet.state = 'hidden';
    lookupSheet.columns = [
        { header: 'ShipID', key: 'ShipID' },                // A
        { header: 'VoyageNumber', key: 'VoyageNumber' },     // B
        { header: 'LegName', key: 'LegName' },               // C
        { header: 'VoyageID', key: 'VoyageID' },             // D
        { header: 'VoyageLegID', key: 'VoyageLegID' },       // E
        { header: 'BunkerCategory', key: 'BunkerCategory' }, // F
        { header: 'FuelTypeKey', key: 'FuelTypeKey' },       // G
        { header: 'LubeOilTypeKey', key: 'LubeOilTypeKey' }, // H
        { header: 'OperationType', key: 'OperationType' },   // I
        { header: 'PortName', key: 'PortName' },             // J
        { header: 'PortCode', key: 'PortCode' }              // K
    ];
    lookupSheet.getRow(1).eachCell(c => c.style = headerStyle);

    // Iterate through the merged dataset
    for (const row of lookupData) {
        lookupSheet.addRow({
            ShipID: row.ShipID || '',
            VoyageNumber: row.VoyageNumber || '',
            LegName: row.LegName || '',
            VoyageID: row.VoyageID || '',
            VoyageLegID: row.VoyageLegID || '',
            BunkerCategory: row.BunkerCategory || '',
            FuelTypeKey: row.FuelTypeKey || '',
            LubeOilTypeKey: row.LubeOilTypeKey || '',
            OperationType: row.OperationType || '',
            PortName: row.PortName || '',
            PortCode: row.PortCode || ''
        });
    }

    // --- Validations ---
    const endRow = (lookupData.length || 0) + 2;
    
    // B: VoyageNumber -> Lookups B
    mainSheet.dataValidations.add(`B2:B${MAX_DATA_ROWS}`, { type: 'list', allowBlank: true, formulae: [`'Lookups'!$B$2:$B$${endRow}`] });
    
    // C: VoyageLegNumber -> Lookups C
    mainSheet.dataValidations.add(`C2:C${MAX_DATA_ROWS}`, { type: 'list', allowBlank: true, formulae: [`'Lookups'!$C$2:$C$${endRow}`] });
    
    // D: BunkeringPort -> Lookups J
    mainSheet.dataValidations.add(`D2:D${MAX_DATA_ROWS}`, { type: 'list', allowBlank: true, formulae: [`'Lookups'!$J$2:$J$${endRow}`] });
    
    // F: BunkerDate (calendar with date/time format)
    mainSheet.dataValidations.add(`F2:F${MAX_DATA_ROWS}`, {
        type: 'date',
        operator: 'greaterThanOrEqual',
        allowBlank: true,
        formulae: [new Date('2000-01-01')],
        showInputMessage: true,
        promptTitle: 'Bunker Date/Time',
        prompt: 'Pick a date from the calendar, then type time (HH:mm). Format: DD-MM-YYYY HH:mm',
        showErrorMessage: true,
        errorTitle: 'Invalid Date/Time',
        error: 'Enter a valid date and time in format DD-MM-YYYY HH:mm'
    });
    
    // G: OperationType -> Lookups I
    mainSheet.dataValidations.add(`G2:G${MAX_DATA_ROWS}`, { type: 'list', allowBlank: true, formulae: [`'Lookups'!$I$2:$I$${endRow}`] });
    
    // I: BunkerCategory -> Lookups F
    mainSheet.dataValidations.add(`I2:I${MAX_DATA_ROWS}`, { type: 'list', allowBlank: true, formulae: [`'Lookups'!$F$2:$F$${endRow}`] });
    
    // J: FuelTypeKey -> Lookups G
    mainSheet.dataValidations.add(`J2:J${MAX_DATA_ROWS}`, { type: 'list', allowBlank: true, formulae: [`'Lookups'!$G$2:$G$${endRow}`] });
    
    // K: LubeOilTypeKey -> Lookups H
    mainSheet.dataValidations.add(`K2:K${MAX_DATA_ROWS}`, { type: 'list', allowBlank: true, formulae: [`'Lookups'!$H$2:$H$${endRow}`] });

    // ===== NEW: Add Upload Token Sheet =====
    createUploadTokenSheet(workbook, templateData.uploadToken || '');

    await mainSheet.protect('memp', {
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
    lookupSheet.protect('memp', { selectLockedCells: false, selectUnlockedCells: false });
    return await workbook.xlsx.writeBuffer();
};

// =========================================================================
// 2. PARSE BUNKER EXCEL
// =========================================================================
export const parseBunkerExcel = async (buffer, uniqueId) => {
    const workbook = new Workbook();
    try { await workbook.xlsx.load(buffer); } catch (e) { throw new Error("Failed to read Excel file."); }

    const worksheet = workbook.getWorksheet('Bunkering');
    if (!worksheet) throw new Error("Bunkering sheet not found.");

    const rawHeaders = worksheet.getRow(1).values;
    const headers = rawHeaders.slice(1).map(h => (typeof h === 'object' ? h.result : h)?.toString().trim()).filter(h => h);
    
    let csvContent = headers.map(escapeCsv).join(',') + '\r\n';
    const previewData = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        let rowHasData = false;
        const rowValuesMap = [];
        const rowObj = {};

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber > headers.length) return;
            let parsedValue = cell.value;
            
            if (typeof cell.value === 'object' && cell.value !== null) {
                if ('result' in cell.value) parsedValue = cell.value.result;
                else if ('richText' in cell.value) parsedValue = cell.value.richText.map(t => t.text).join('');
                // FIXED: Use moment.utc to preserve user input exactly as entered without timezone shifts
                else if (cell.value instanceof Date) parsedValue = moment.utc(cell.value).format('YYYY-MM-DD HH:mm:ss');
                else parsedValue = ""; 
            }
            if (parsedValue === null || parsedValue === undefined) parsedValue = "";

            rowValuesMap[colNumber-1] = escapeCsv(parsedValue);
            if(headers[colNumber-1]) rowObj[headers[colNumber-1]] = parsedValue;

            if (String(parsedValue).trim() !== '') rowHasData = true;
        });

        if (rowHasData) {
            for (let i = 0; i < headers.length; i++) {
                if (rowValuesMap[i] === undefined) rowValuesMap[i] = "";
            }
            csvContent += rowValuesMap.join(',') + '\r\n';
            previewData.push(rowObj);
        }
    });

    const targetFolder = path.join(UPLOADS_BASE_DIR, BUNKER_UPLOAD_FOLDER);
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });
    
    // *** MATCHES SP @SerialNumber ***
    const csvFileName = `${uniqueId}_Bunkering.csv`;
    const csvFilePath = path.join(targetFolder, csvFileName);
    fs.writeFileSync(csvFilePath, csvContent);

    return { 
        message: 'Bunker Excel parsed successfully.', 
        files: { 'Bunkering': csvFileName }, 
        uniqueId, 
        previewData 
    };
};