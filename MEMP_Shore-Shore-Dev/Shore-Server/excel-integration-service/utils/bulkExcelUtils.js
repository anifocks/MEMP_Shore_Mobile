// viswa-digital-backend/excel-integration-service/utils/bulkExcelUtils.js

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
const BULK_UPLOAD_FOLDER = 'Bulk_Uploads'; 

// --- Styles ---
const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } }, // Blue
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
};

const machineryHeaderStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ED7D31' } }, // Orange
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
};

// NEW STYLE: Grey style for read-only columns (Stock)
const readOnlyHeaderStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B7B7B' } }, // Grey
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
};

const dataStyle = {
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
    const FORMAT = includeTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'; 
    try {
        // CHANGE: Use .utc() to ensure the DB value is formatted exactly as stored
        // without applying the server's local timezone offset.
        return moment.utc(dateValue).format(FORMAT);
    } catch (e) {
        return String(dateValue);
    }
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

// Helper: Get letter from a columns definition array
const getColumnLetterFromArray = (columns, key) => {
    const columnIndex = columns.findIndex(col => col.key === key);
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

// Helper: Add Data Row
const addDataRow = (sheet, data, style) => {
    const row = sheet.addRow(data);
    row.eachCell(cell => { cell.style = style; });
    return row;
};

// Helper: Sanitize Column Name
const sanitizeName = (name) => {
    if (!name) return '';
    // User Requirement: "TypicalNamePrefix_#1"
    let safe = name.replace(/\./g, ''); 
    safe = safe.trim();
    safe = safe.replace(/\s+/g, '_'); 
    return safe;
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


const SHEET_PASSWORD = 'Singapore787501';

// =========================================================================
// FIX 1: UPDATED CELL PROTECTION
// Iterates through ALL defined columns and rows to ensure editableFormulaCols are NEVER locked
// Headers (row 1) are locked, data rows (2+) are unlocked unless they contain formulas
// =========================================================================
const applyCellProtection = (sheet, allowEditableFormulaCols = []) => {
    const totalCols = sheet.columns ? sheet.columns.length : 0;
    const editableFormulaSet = new Set((allowEditableFormulaCols || []).map(col => String(col).toUpperCase()));

    // Get ALL rows with any content, plus additional rows for future data
    const actualRowCount = sheet.actualRowCount || 0;
    const maxRows = Math.max(actualRowCount + 500, 1000); // Include buffer for future data entry
    
    for (let r = 1; r <= maxRows; r++) {
        const row = sheet.getRow(r);
        for (let c = 1; c <= totalCols; c++) {
            const cell = row.getCell(c);
            const colLetter = sheet.getColumn(c).letter;
            const isEditableCol = editableFormulaSet.has(colLetter);

            // RULE 1: Header row (row 1) → ALWAYS lock
            if (r === 1) {
                cell.protection = { locked: true };
            }
            // RULE 2: If column is in the editable list → ALWAYS unlock (even formulas can be edited)
            else if (isEditableCol) {
                cell.protection = { locked: false, hidden: false };
            }
            // RULE 3: If cell has a formula AND column is NOT editable → lock and hide
            else if (cell.value && typeof cell.value === 'object' && cell.value.formula) {
                cell.protection = { locked: true, hidden: true };
            }
            // RULE 4: Data rows (2+) without formulas → UNLOCK for user entry
            else {
                cell.protection = { locked: false };
            }
        }
    }
};

// Protect sheet with password
const protectSheet = async (sheet) => {
    await sheet.protect(SHEET_PASSWORD, {
        selectLockedCells: false,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertRows: false,
        insertColumns: false,
        deleteRows: false,
        deleteColumns: false,
        sort: false,
        autoFilter: true,
        pivotTables: false
    });
};

// =========================================================================
// NEW EXPORT: Get Column Definitions (Shared by Template & Staging Logic)
// =========================================================================
export const getBulkColumnDefinitions = (machineryConfig) => {
    // 1. Static Columns
    const staticColumns = [
        { header: 'ReportID', key: 'ReportID', width: 15 }, 
        { header: 'ShipID', key: 'ShipID', width: 10, hidden: true },
        { header: 'VoyageNumber', key: 'VoyageNumber', width: 20 },
        { header: 'ReportTypeKey', key: 'ReportTypeKey', width: 25 },
        // User FIX: Apply numFmt with YYYY-MM-DD format
        { header: 'ReportDateTimeUTC', key: 'ReportDateTimeUTC', width: 30, style: { numFmt: 'yyyy-mm-dd hh:mm' } }, 
        { header: 'ReportDateTimeLocal', key: 'ReportDateTimeLocal', width: 35, style: { numFmt: 'yyyy-mm-dd hh:mm' } }, 
        { header: 'TimeZoneAtPort', key: 'TimeZoneAtPort', width: 20 },
        { header: 'Latitude', key: 'Latitude', width: 15 },
        { header: 'Longitude', key: 'Longitude', width: 15 },
        { header: 'VesselActivity', key: 'VesselActivity', width: 20 },
        { header: 'CourseDEG', key: 'CourseDEG', width: 15 },
        { header: 'SpeedKnots', key: 'SpeedKnots', width: 15 },
        { header: 'DistanceSinceLastReportNM', key: 'DistanceSinceLastReportNM', width: 30 },
        { header: 'EngineDistanceNM', key: 'EngineDistanceNM', width: 25, hidden: true },
        { header: 'DistanceToGoNM', key: 'DistanceToGoNM', width: 25, hidden: true },
        { header: 'SlipPercent', key: 'SlipPercent', width: 15, hidden: true },
        { header: 'DistanceTravelledHS_NM', key: 'DistanceTravelledHS_NM', width: 30 },
        { header: 'SteamingHoursPeriod', key: 'SteamingHoursPeriod', width: 30 },
        { header: 'TimeAtAnchorageHRS', key: 'TimeAtAnchorageHRS', width: 25 },
        { header: 'TimeAtDriftingHRS', key: 'TimeAtDriftingHRS', width: 25 },
        { header: 'WindForce', key: 'WindForce', width: 15 },
        { header: 'WindDirection', key: 'WindDirection', width: 20 },
        { header: 'SeaState', key: 'SeaState', width: 20 },
        { header: 'SwellDirection', key: 'SwellDirection', width: 20 },
        { header: 'SwellHeightM', key: 'SwellHeightM', width: 20 },
        { header: 'AirTemperatureC', key: 'AirTemperatureC', width: 25 },
        { header: 'SeaTemperatureC', key: 'SeaTemperatureC', width: 25 },
        { header: 'BarometricPressureHPa', key: 'BarometricPressureHPa', width: 30 },
        { header: 'CargoActivity', key: 'CargoActivity', width: 25 },
        { header: 'ReportedCargoType', key: 'ReportedCargoType', width: 30 },
        { header: 'ReportedCargoQuantityMT', key: 'ReportedCargoQuantityMT', width: 35 },
        { header: 'ContainersTEU', key: 'ContainersTEU', width: 20 },
        { header: 'DisplacementMT', key: 'DisplacementMT', width: 20 },
        { header: 'CurrentPortCode', key: 'CurrentPortCode', width: 20 },
        { header: 'ReportStatus', key: 'ReportStatus', width: 20 },
        { header: 'ReportDuration', key: 'ReportDuration', width: 20 },
        { header: 'FromPort', key: 'FromPort', width: 20 },
        { header: 'ToPort', key: 'ToPort', width: 20 },
        { header: 'FwdDraft', key: 'FwdDraft', width: 15 },
        { header: 'AftDraft', key: 'AftDraft', width: 15 },
        { header: 'MidDraft', key: 'MidDraft', width: 15, hidden: true },
        { header: 'Trim', key: 'Trim', width: 15, hidden: true },
        { header: 'VoyageID', key: 'VoyageID', width: 10, hidden: true },
        { header: 'VoyageLegID', key: 'VoyageLegID', width: 15, hidden: true },
        { header: 'LegNumber', key: 'LegNumber', width: 15 },
        { header: 'Remarks', key: 'Remarks', width: 40 },
        { header: 'ChartererSpeed', key: 'ChartererSpeed', width: 20 },
        { header: 'ChartererConsumption', key: 'ChartererConsumption', width: 30 },
        { header: 'SubmittedBy', key: 'SubmittedBy', width: 20 },
    ];

    // 2. Dynamic Columns
    const dynamicColumns = [];
    if (machineryConfig && machineryConfig.length > 0) {
        machineryConfig.forEach(machine => {
            const safeName = sanitizeName(machine.CustomMachineryName);
            const { FlagPower, FlagRpm, FlagFuel, FlagElectrical } = machine;

            if (FlagPower) {
                dynamicColumns.push({ 
                    header: `${safeName}_Power`, key: `${safeName}_Power`, width: 20,
                    style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } } } 
                });
                if (FlagElectrical) {
                    dynamicColumns.push({ header: `${safeName}_Total_Power`, key: `${safeName}_Total_Power`, width: 20 });
                }
            }
            if (FlagRpm) {
                dynamicColumns.push({ header: `${safeName}_RPM`, key: `${safeName}_RPM`, width: 15 });
            }
            // Always appear
            dynamicColumns.push({ header: `${safeName}_Running_Hrs`, key: `${safeName}_Running_Hrs`, width: 20 });
            dynamicColumns.push({ header: `${safeName}_Purpose`, key: `${safeName}_Purpose`, width: 25 });

            if (FlagFuel) {
                dynamicColumns.push({ header: `${safeName}_Fuel`, key: `${safeName}_Fuel`, width: 15 });
                dynamicColumns.push({ header: `${safeName}_Bunker`, key: `${safeName}_Bunker`, width: 15 });
                // --- NEW COLUMN: Initial Quantity Stock (Read Only) ---
                dynamicColumns.push({ header: `${safeName}_Bunker_Stock`, key: `${safeName}_Bunker_Stock`, width: 15 }); 
                // ------------------------------------------------------
                dynamicColumns.push({ header: `${safeName}_Consumption`, key: `${safeName}_Consumption`, width: 20 });
            }
        });
    }

    return [...staticColumns, ...dynamicColumns];
};

// =========================================================================
// 1. GENERATE BULK REPORT TEMPLATE
// =========================================================================
export const generateBulkReportTemplate = async (templateData, shipId, machineryConfig) => {
    // 1. EXTRACT LAST REPORT DATA (Same logic as Single Upload)
    const lastReportData = templateData.lastReportData || { DailyReport: {}, FuelConsumption: [], LOConsumption: [], MachineryData: [], BunkerROB: [], FuelROB: [], LOROB: [] };
    const { lookups, voyageData } = templateData;
    const lastReport = lastReportData.DailyReport || {};
    // const shipIdFromData = lastReport.ShipID || shipId; // Not strictly needed here as we pass shipId

    const workbook = new Workbook(); 
    workbook.creator = 'Viswa Digital';
    workbook.created = new Date();

    const MAX_DATA_ROWS = 1000; 

    // =========================================================================
    // 0. Report Status Sheet (Must be first sheet)
    // =========================================================================
    createReportStatusSheet(workbook, 'Bulk');

    // ---------------------------------------------------------
    // 1. VesselDailyReports Sheet (BULK)
    // ---------------------------------------------------------
    const mainReportSheet = workbook.addWorksheet('VesselDailyReports');
    
    // Get Combined Columns using shared helper
    const allColumns = getBulkColumnDefinitions(machineryConfig);
    mainReportSheet.columns = allColumns;

    // ---------------------------------------------------------
    // FIX: Register all dynamic columns so Excel does not wrap after CN
    // ---------------------------------------------------------
    for (let i = 1; i <= allColumns.length; i++) {
        const col = mainReportSheet.getColumn(i);
        if (!col.width) col.width = 20;
    }

    // Apply Header Styles (Blue for Static, Orange for Dynamic, Grey for Stock)
    const staticColCount = 51; // Number of static columns

    mainReportSheet.getRow(1).eachCell((cell, colNumber) => {
        if (colNumber > staticColCount) {
            // Check if it's a Stock column (Header ends with _Bunker_Stock)
            if (cell.value && cell.value.toString().endsWith('_Bunker_Stock')) {
                cell.style = readOnlyHeaderStyle; // Grey Header
            } else {
                cell.style = machineryHeaderStyle; // Orange Header
            }
        } else {
            cell.style = headerStyle; // Blue Header
        }
    });
    
    mainReportSheet.getCell('A1').note = "BULK UPLOAD: Enter a unique number (e.g. 1, 2, 3) in ReportID. Fill extended machinery columns to the right.";

    // Apply styles to empty rows and ADD FORMULAS
    const voyageNumCol = getColumnLetter(mainReportSheet, 'VoyageNumber');
    const voyageIdCol = getColumnLetter(mainReportSheet, 'VoyageID');
    const fromPortCol = getColumnLetter(mainReportSheet, 'FromPort');
    const toPortCol = getColumnLetter(mainReportSheet, 'ToPort');
    const voyageLegIdCol = getColumnLetter(mainReportSheet, 'VoyageLegID');
    const legNumberCol = getColumnLetter(mainReportSheet, 'LegNumber');
    
    const fwdDraftCol = getColumnLetter(mainReportSheet, 'FwdDraft');
    const aftDraftCol = getColumnLetter(mainReportSheet, 'AftDraft');
    const midDraftCol = getColumnLetter(mainReportSheet, 'MidDraft');
    const trimCol = getColumnLetter(mainReportSheet, 'Trim');

    for (let i = 2; i <= MAX_DATA_ROWS; i++) {
        const row = mainReportSheet.getRow(i);

        // =========================================================================
        // FIX 2: FORCE ITERATION OVER ALL COLUMNS FOR STYLING
        // Using explicit loop instead of eachCell ensures columns far to the right 
        // (dynamic columns beyond CN) are initialized so protection works.
        // =========================================================================
        for (let c = 1; c <= allColumns.length; c++) {
            row.getCell(c).style = dataStyleNoBorder;
        }

        // --- NEW LOGIC START: AUTO-POPULATE ROW 2 WITH LAST REPORT DATA ---
        if (i === 2 && Object.keys(lastReport).length > 0) {
            // Map values from lastReport to the columns
            // Using direct key assignment based on columns definition
            row.getCell('ShipID').value = shipId;
            // FIX: UNCOMMENTED ReportID Population
            if (lastReport.ReportID) row.getCell('ReportID').value = lastReport.ReportID;
            
            // Populate Basic Fields
            if (lastReport.ReportTypeKey) row.getCell('ReportTypeKey').value = lastReport.ReportTypeKey;
            if (lastReport.ReportDateTimeUTC) row.getCell('ReportDateTimeUTC').value = formatExcelDateTime(lastReport.ReportDateTimeUTC, null);
            if (lastReport.ReportDateTimeLocal) row.getCell('ReportDateTimeLocal').value = formatExcelDateTime(lastReport.ReportDateTimeLocal, lastReport.TimeZoneAtPort);
            if (lastReport.TimeZoneAtPort) row.getCell('TimeZoneAtPort').value = lastReport.TimeZoneAtPort;
            
            if (lastReport.Latitude) row.getCell('Latitude').value = lastReport.Latitude;
            if (lastReport.Longitude) row.getCell('Longitude').value = lastReport.Longitude;
            if (lastReport.VesselActivity) row.getCell('VesselActivity').value = lastReport.VesselActivity;
            
            if (lastReport.CourseDEG) row.getCell('CourseDEG').value = lastReport.CourseDEG;
            if (lastReport.SpeedKnots) row.getCell('SpeedKnots').value = lastReport.SpeedKnots;
            
            if (lastReport.DistanceSinceLastReportNM) row.getCell('DistanceSinceLastReportNM').value = lastReport.DistanceSinceLastReportNM;
            if (lastReport.EngineDistanceNM) row.getCell('EngineDistanceNM').value = lastReport.EngineDistanceNM;
            if (lastReport.DistanceToGoNM) row.getCell('DistanceToGoNM').value = lastReport.DistanceToGoNM;
            if (lastReport.SlipPercent) row.getCell('SlipPercent').value = lastReport.SlipPercent;
            if (lastReport.DistanceTravelledHS_NM) row.getCell('DistanceTravelledHS_NM').value = lastReport.DistanceTravelledHS_NM;
            
            if (lastReport.SteamingHoursPeriod) row.getCell('SteamingHoursPeriod').value = lastReport.SteamingHoursPeriod;
            if (lastReport.TimeAtAnchorageHRS) row.getCell('TimeAtAnchorageHRS').value = lastReport.TimeAtAnchorageHRS;
            if (lastReport.TimeAtDriftingHRS) row.getCell('TimeAtDriftingHRS').value = lastReport.TimeAtDriftingHRS;
            
            if (lastReport.WindForce) row.getCell('WindForce').value = lastReport.WindForce;
            if (lastReport.WindDirection) row.getCell('WindDirection').value = lastReport.WindDirection;
            if (lastReport.SeaState) row.getCell('SeaState').value = lastReport.SeaState;
            if (lastReport.SwellDirection) row.getCell('SwellDirection').value = lastReport.SwellDirection;
            if (lastReport.SwellHeightM) row.getCell('SwellHeightM').value = lastReport.SwellHeightM;
            
            if (lastReport.AirTemperatureC) row.getCell('AirTemperatureC').value = lastReport.AirTemperatureC;
            if (lastReport.SeaTemperatureC) row.getCell('SeaTemperatureC').value = lastReport.SeaTemperatureC;
            if (lastReport.BarometricPressureHPa) row.getCell('BarometricPressureHPa').value = lastReport.BarometricPressureHPa;
            
            if (lastReport.CargoActivity) row.getCell('CargoActivity').value = lastReport.CargoActivity;
            if (lastReport.ReportedCargoType) row.getCell('ReportedCargoType').value = lastReport.ReportedCargoType;
            if (lastReport.ReportedCargoQuantityMT) row.getCell('ReportedCargoQuantityMT').value = lastReport.ReportedCargoQuantityMT;
            if (lastReport.ContainersTEU) row.getCell('ContainersTEU').value = lastReport.ContainersTEU;
            if (lastReport.DisplacementMT) row.getCell('DisplacementMT').value = lastReport.DisplacementMT;
            
            if (lastReport.CurrentPortCode) row.getCell('CurrentPortCode').value = lastReport.CurrentPortCode;
            row.getCell('ReportStatus').value = 'Submitted'; // Default to Submitted
            if (lastReport.ReportDuration) row.getCell('ReportDuration').value = lastReport.ReportDuration;
            
            // Fwd/Aft Drafts
            if (lastReport.FwdDraft) row.getCell('FwdDraft').value = lastReport.FwdDraft;
            if (lastReport.AftDraft) row.getCell('AftDraft').value = lastReport.AftDraft;
            
            if (lastReport.VoyageNumber) row.getCell('VoyageNumber').value = lastReport.VoyageNumber;
            if (lastReport.Remarks) row.getCell('Remarks').value = lastReport.Remarks;
            
            if (lastReport.ChartererSpeed) row.getCell('ChartererSpeed').value = lastReport.ChartererSpeed;
            if (lastReport.ChartererConsumption) row.getCell('ChartererConsumption').value = lastReport.ChartererConsumption;
            if (lastReport.SubmittedBy) row.getCell('SubmittedBy').value = lastReport.SubmittedBy;

        } else if (i === 2) {
             // Fallback if no last report
             row.getCell('ShipID').value = shipId;
             row.getCell('ReportTypeKey').value = 'NOON_AT_SEA';
        }
        // --- NEW LOGIC END ---


        // Voyage VLOOKUP Formulas (Existing Logic - Applies to all rows including 2)
        if (voyageNumCol) {
            if(voyageIdCol) mainReportSheet.getCell(`${voyageIdCol}${i}`).value = { 
                formula: `IFERROR(VLOOKUP(${voyageNumCol}${i},'Voyage Details'!$A:$N,2,0),"")`,
                result: (i===2 && lastReport.VoyageID) ? lastReport.VoyageID : undefined 
            };
            if(fromPortCol) mainReportSheet.getCell(`${fromPortCol}${i}`).value = { 
                formula: `IFERROR(VLOOKUP(${voyageNumCol}${i},'Voyage Details'!$A:$N,4,0),"")`,
                result: (i===2 && lastReport.FromPort) ? lastReport.FromPort : undefined
            };
            if(toPortCol) mainReportSheet.getCell(`${toPortCol}${i}`).value = { 
                formula: `IFERROR(VLOOKUP(${voyageNumCol}${i},'Voyage Details'!$A:$N,5,0),"")`,
                result: (i===2 && lastReport.ToPort) ? lastReport.ToPort : undefined
            };
            if(legNumberCol) mainReportSheet.getCell(`${legNumberCol}${i}`).value = { 
                formula: `IFERROR(VLOOKUP(${voyageNumCol}${i},'Voyage Details'!$A:$N,13,0),"")`,
                result: (i===2 && lastReport.LegNumber) ? lastReport.LegNumber : undefined
            };
            if(voyageLegIdCol) mainReportSheet.getCell(`${voyageLegIdCol}${i}`).value = { 
                formula: `IFERROR(VLOOKUP(${voyageNumCol}${i},'Voyage Details'!$A:$N,14,0),"")`,
                result: (i===2 && lastReport.VoyageLegID) ? lastReport.VoyageLegID : undefined
            };
        }

        // Draft Calculations
        if (fwdDraftCol && aftDraftCol) {
            if (midDraftCol) mainReportSheet.getCell(`${midDraftCol}${i}`).value = { 
                formula: `IF(AND(ISNUMBER(${fwdDraftCol}${i}),ISNUMBER(${aftDraftCol}${i})),(${fwdDraftCol}${i}+${aftDraftCol}${i})/2,"")`,
                result: (i===2 && lastReport.MidDraft) ? lastReport.MidDraft : undefined
            };
            if (trimCol) mainReportSheet.getCell(`${trimCol}${i}`).value = { 
                formula: `IF(AND(ISNUMBER(${fwdDraftCol}${i}),ISNUMBER(${aftDraftCol}${i})),${aftDraftCol}${i}-${fwdDraftCol}${i},"")`,
                result: (i===2 && lastReport.Trim) ? lastReport.Trim : undefined
            };
        }
    }
    
    
    // --- UPDATED: Populate Formulas for Dynamic Stock Columns (All Rows) with GLOBAL RUNNING TOTAL ---
    if (machineryConfig && machineryConfig.length > 0) {
        // 1. First, map ALL machines that consume fuel to their Bunker & Consumption columns
        const allMachineCols = [];
        machineryConfig.forEach(machine => {
            if (machine.FlagFuel) {
                const safeName = sanitizeName(machine.CustomMachineryName);
                const bunkerCol = getColumnLetterFromArray(allColumns, `${safeName}_Bunker`);
                const consCol = getColumnLetterFromArray(allColumns, `${safeName}_Consumption`);
                if (bunkerCol && consCol) {
                    allMachineCols.push({ bunkerCol, consCol });
                }
            }
        });

        // 2. Iterate through each machine again to set the Stock Formula
        machineryConfig.forEach(machine => {
            const { FlagFuel } = machine;
            if (FlagFuel) {
                const safeName = sanitizeName(machine.CustomMachineryName);
                const currentBunkerCol = getColumnLetterFromArray(allColumns, `${safeName}_Bunker`);
                const currentStockCol = getColumnLetterFromArray(allColumns, `${safeName}_Bunker_Stock`);
                
                if (currentBunkerCol && currentStockCol) {
                    // Identify which machines are "to the left" of the current machine (Horizontal Check)
                    // We simply filter allMachineCols where the bunkerCol is less than currentBunkerCol (alphabetically/index)
                    // But array order in `allMachineCols` matches sheet order, so we can just grab the preceding index.
                    const currentMachineIndex = allMachineCols.findIndex(m => m.bunkerCol === currentBunkerCol);
                    const leftMachines = allMachineCols.slice(0, currentMachineIndex);

                    for (let i = 2; i <= MAX_DATA_ROWS; i++) {
                        // A. Base Stock (VLOOKUP from DB)
                        const baseLookup = `IFERROR(VLOOKUP(${currentBunkerCol}${i},'Bunker ROB'!$D:$H,5,0), 0)`;
                        
                        // B. Vertical Deductions: Sum consumption from ALL machines in previous rows matching this bunker
                        const verticalDeductions = [];
                        if (i > 2) {
                            allMachineCols.forEach(m => {
                                // SUMIF(Machine_X_Bunker_Range, Current_Bunker, Machine_X_Consumption_Range)
                                verticalDeductions.push(`SUMIF(${m.bunkerCol}$2:${m.bunkerCol}${i-1}, ${currentBunkerCol}${i}, ${m.consCol}$2:${m.consCol}${i-1})`);
                            });
                        }
                        const verticalSum = verticalDeductions.length > 0 ? `(${verticalDeductions.join('+')})` : "0";

                        // C. Horizontal Deductions: Sum consumption from machines TO THE LEFT in the CURRENT row matching this bunker
                        const horizontalDeductions = [];
                        leftMachines.forEach(m => {
                            // IF(Machine_Left_Bunker == Current_Bunker, Machine_Left_Consumption, 0)
                            horizontalDeductions.push(`IF(${m.bunkerCol}${i}=${currentBunkerCol}${i}, ${m.consCol}${i}, 0)`);
                        });
                        const horizontalSum = horizontalDeductions.length > 0 ? `(${horizontalDeductions.join('+')})` : "0";

                        // D. Combine Formula
                        // Formula: IF(Bunker="", "", Base - VerticalSum - HorizontalSum)
                        mainReportSheet.getCell(`${currentStockCol}${i}`).value = {
                            formula: `IF(${currentBunkerCol}${i}="","", ${baseLookup} - ${verticalSum} - ${horizontalSum})`
                        };
                    }
                }
            }
        });
    }


    // ---------------------------------------------------------
    // 2. RESTORED ADDITIONAL SHEETS (Pre-filled via Formulas)
    // ---------------------------------------------------------

    // A. Machinery Data
    const machineryDataSheet = workbook.addWorksheet('Machinery Data');
    machineryDataSheet.state = 'hidden';

    machineryDataSheet.columns = [
        { header: 'ReportID', key: 'ReportID', width: 15 },
        { header: 'ShipID', key: 'ShipID', width: 10 },
        { header: 'ShipMachineryRecordID', key: 'ShipMachineryRecordID', width: 25 },
        { header: 'MachineryTypeKey', key: 'MachineryTypeKey', width: 30 },
        { header: 'MachineryName', key: 'MachineryName', width: 25 },
        { header: 'Power', key: 'Power', width: 15 },
        { header: 'RPM', key: 'RPM', width: 10 },
        { header: 'Running_Hrs', key: 'Running_Hrs', width: 20 },
        { header: 'Remarks', key: 'Remarks', width: 40 },
        { header: 'Total_Power', key: 'Total_Power', width: 15 },
        { header: 'Purpose', key: 'Purpose', width: 30 },
        { header: 'FuelTypeKey', key: 'FuelTypeKey', width: 25 },
        { header: 'BDN_Number', key: 'BDN_Number', width: 20 },
        { header: 'ConsumedMT', key: 'ConsumedMT', width: 25 },
        { header: 'Initial_Quantity', key: 'Initial_Quantity', width: 25 },
        { header: 'Final_Quantity', key: 'Final_Quantity', width: 25 },
    ];
    machineryDataSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // B. Fuel Consumption
    const fuelConsumptionSheet = workbook.addWorksheet('Fuel Consumption');
    fuelConsumptionSheet.state = 'hidden';
    fuelConsumptionSheet.columns = [
        { header: 'ReportID', key: 'ReportID', width: 15 },
        { header: 'ShipID', key: 'ShipID', width: 10 },
        { header: 'MachineryName', key: 'MachineryName', width: 25 },
        { header: 'MachineryTypeKey', key: 'MachineryTypeKey', width: 30 },
        { header: 'Purpose', key: 'Purpose', width: 40 },
        { header: 'FuelTypeKey', key: 'FuelTypeKey', width: 25 },
        { header: 'BDN_Number', key: 'BDN_Number', width: 20 },
        { header: 'ConsumedMT', key: 'ConsumedMT', width: 25 },
        { header: 'EntryDate', key: 'EntryDate', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'Unique_BDN_Number', key: 'Unique_BDN_Number', width: 25, hidden: true },
    ];
    fuelConsumptionSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // C. Lube Oil Consumption
    const loConsumptionSheet = workbook.addWorksheet('Lube Oil Consumption');
    loConsumptionSheet.state = 'hidden';
    loConsumptionSheet.columns = [
        { header: 'ReportID', key: 'ReportID', width: 15 },
        { header: 'ShipID', key: 'ShipID', width: 10 },
        { header: 'SpecificMachineryName', key: 'SpecificMachineryName', width: 30 },
        { header: 'MachineryTypeKey', key: 'MachineryTypeKey', width: 25 },
        { header: 'LOTypeKey', key: 'LOTypeKey', width: 25 },
        { header: 'BDN_Number', key: 'BDN_Number', width: 20 },
        { header: 'ConsumedQty', key: 'ConsumedQty', width: 20 },
        { header: 'EntryDate', key: 'EntryDate', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'Unique_BDN_Number', key: 'Unique_BDN_Number', width: 25, hidden: true },
        { header: 'LO_BDN_Range_Helper', key: 'LO_BDN_Range_Helper', width: 50, hidden: true },
    ];
    loConsumptionSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // D. Bunker ROB
    const bunkerROBSheet = workbook.addWorksheet('Bunker ROB');
    bunkerROBSheet.state = 'hidden';
    bunkerROBSheet.columns = [
        { header: 'ShipID', key: 'ShipID', width: 10 },
        { header: 'ReportID', key: 'ReportID', width: 15 },
        { header: 'EntryDate', key: 'EntryDate', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'BDN_Number', key: 'BDN_Number', width: 20 },
        { header: 'ItemTypeKey', key: 'ItemTypeKey', width: 25 },
        { header: 'Bunkered_Quantity', key: 'Bunkered_Quantity', width: 20 },
        { header: 'Consumed_Quantity', key: 'Consumed_Quantity', width: 20 },
        { header: 'Initial_Quantity', key: 'Initial_Quantity', width: 20 },
        { header: 'Final_Quantity', key: 'Final_Quantity', width: 20 },
        { header: 'ItemCategory', key: 'ItemCategory', width: 20 },
        // --- NEW COLUMNS ---
        { header: 'Unique_ItemTypeKey', key: 'Unique_ItemTypeKey', width: 20, hidden: true }, // K
        { header: 'Unique_ID', key: 'Unique_ID', width: 20, hidden: true },                   // L
        { header: 'Final_ItemtypeKey', key: 'Final_ItemtypeKey', width: 20, hidden: true },   // M
        { header: 'Final_ReportId', key: 'Final_ReportId', width: 20, hidden: true },         // N
        { header: 'Unique_Bunker', key: 'Unique_Bunker', width: 20, hidden: true },           // O
        { header: 'Initial_Quantity_Origin', key: 'Initial_Quantity_Origin', width: 20, hidden: true }, // P
    ];
    bunkerROBSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // E. Fuel ROB
    const fuelROBSheet = workbook.addWorksheet('Fuel ROB');
    fuelROBSheet.state = 'hidden';
    fuelROBSheet.columns = [
        { header: 'ShipID', key: 'ShipID', width: 10 },
        { header: 'Report_Consumption_ID', key: 'Report_Consumption_ID', width: 15 },
        { header: 'EntryDate', key: 'EntryDate', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'FuelTypeKey', key: 'FuelTypeKey', width: 25 },
        { header: 'Bunkered_Quantity', key: 'Bunkered_Quantity', width: 20 },
        { header: 'Consumed_Quantity', key: 'Consumed_Quantity', width: 20 },
        { header: 'Initial_Quantity', key: 'Initial_Quantity', width: 20 },
        { header: 'Final_Quantity', key: 'Final_Quantity', width: 20 },
        { header: 'entry_mode', key: 'entry_mode', width: 15 },
        { header: 'Dummy_value', key: 'Dummy_value', width: 15, hidden: true }, // J (New)
    ];
    fuelROBSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // F. Lube Oil ROB
    const loROBSheet = workbook.addWorksheet('Lube Oil ROB');
    loROBSheet.state = 'hidden';
    loROBSheet.columns = [
        { header: 'ShipID', key: 'ShipID', width: 10 },
        { header: 'Report_Consumption_ID', key: 'Report_Consumption_ID', width: 15 },
        { header: 'EntryDate', key: 'EntryDate', width: 25, style: { numFmt: 'dd-mm-yyyy hh:mm' } },
        { header: 'LubeOilTypeKey', key: 'LubeOilTypeKey', width: 25 },
        { header: 'Bunkered_Quantity', key: 'Bunkered_Quantity', width: 20 },
        { header: 'Consumed_Quantity', key: 'Consumed_Quantity', width: 20 },
        { header: 'Initial_Quantity', key: 'Initial_Quantity', width: 20 },
        { header: 'Final_Quantity', key: 'Final_Quantity', width: 20 },
        { header: 'entry_mode', key: 'entry_mode', width: 15 },
    ];
    loROBSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // ---------------------------------------------------------
    // PRE-FILL LOGIC: Machinery, Fuel, Lube (Linked to Report Loop)
    // ---------------------------------------------------------
    if (machineryConfig && machineryConfig.length > 0) {
        let machRowIdx = 2; 
        let fuelRowIdx = 2;
        let robRowIdx = 2; 

        for (let reportIdx = 0; reportIdx < MAX_DATA_ROWS; reportIdx++) {
            const reportRow = reportIdx + 2; 
            
            // Loop through each machine
            machineryConfig.forEach(machine => {
                const safeName = sanitizeName(machine.CustomMachineryName);
                const { FlagPower, FlagRpm, FlagFuel, FlagElectrical } = machine;

                const hrsCol = getColumnLetterFromArray(allColumns, `${safeName}_Running_Hrs`);
                const triggerRef = hrsCol ? `${hrsCol}${reportRow}` : `$A$${reportRow}`;
                const checkNotEmpty = `IF('VesselDailyReports'!${triggerRef}="","",`;

                const powerCol = FlagPower ? getColumnLetterFromArray(allColumns, `${safeName}_Power`) : null;
                const rpmCol = FlagRpm ? getColumnLetterFromArray(allColumns, `${safeName}_RPM`) : null;
                const consCol = getColumnLetterFromArray(allColumns, `${safeName}_Purpose`);
                const fuelCol = FlagFuel ? getColumnLetterFromArray(allColumns, `${safeName}_Fuel`) : null;
                const bdnCol = FlagFuel ? getColumnLetterFromArray(allColumns, `${safeName}_Bunker`) : null;
                const mtCol = FlagFuel ? getColumnLetterFromArray(allColumns, `${safeName}_Consumption`) : null;
                const totPwrCol = FlagElectrical ? getColumnLetterFromArray(allColumns, `${safeName}_Total_Power`) : null;

                // 1. Populate Machinery Data Sheet (FROM MASTER)
                const rowValues = {
                    ReportID: { formula: `${checkNotEmpty}'VesselDailyReports'!$A$${reportRow})` },
                    ShipID: { formula: `${checkNotEmpty}'VesselDailyReports'!$B$${reportRow})` }, 
                    ShipMachineryRecordID: { formula: `${checkNotEmpty}"${machine.MachineryRecordID}")` }, 
                    MachineryTypeKey: { formula: `${checkNotEmpty}"${machine.MachineryTypeKey}")` },
                    MachineryName: { formula: `${checkNotEmpty}"${machine.CustomMachineryName}")` },
                    Power: powerCol ? { formula: `${checkNotEmpty}'VesselDailyReports'!${powerCol}${reportRow})` } : null,
                    RPM: rpmCol ? { formula: `${checkNotEmpty}'VesselDailyReports'!${rpmCol}${reportRow})` } : null,
                    Running_Hrs: hrsCol ? { formula: `${checkNotEmpty}'VesselDailyReports'!${hrsCol}${reportRow})` } : null,
                    Purpose: consCol ? { formula: `${checkNotEmpty}'VesselDailyReports'!${consCol}${reportRow})` } : null,
                    Total_Power: totPwrCol ? { formula: `${checkNotEmpty}'VesselDailyReports'!${totPwrCol}${reportRow})` } : null,
                    FuelTypeKey: fuelCol ? { formula: `${checkNotEmpty}'VesselDailyReports'!${fuelCol}${reportRow})` } : null,
                    BDN_Number: bdnCol ? { formula: `${checkNotEmpty}'VesselDailyReports'!${bdnCol}${reportRow})` } : null,
                    ConsumedMT: mtCol ? { formula: `${checkNotEmpty}'VesselDailyReports'!${mtCol}${reportRow})` } : null,
                };

                const currentRow = machineryDataSheet.getRow(machRowIdx);
                machineryDataSheet.columns.forEach((col, idx) => {
                    const key = col.key;
                    if (rowValues[key] !== undefined) {
                        currentRow.getCell(idx + 1).value = rowValues[key];
                    }
                });

                const checkMachRow = `IF('Machinery Data'!$A$${machRowIdx}="","",`;

                // 2. Populate Fuel Consumption Sheet (If machine consumes fuel)
                if (FlagFuel) {
                    const fuelValues = {
                        ReportID: { formula: `${checkMachRow}'Machinery Data'!$A$${machRowIdx})` }, 
                        ShipID: { formula: `${checkMachRow}'Machinery Data'!$B$${machRowIdx})` },   
                        MachineryName: { formula: `${checkMachRow}'Machinery Data'!$E$${machRowIdx})` }, 
                        MachineryTypeKey: { formula: `${checkMachRow}'Machinery Data'!$D$${machRowIdx})` }, 
                        Purpose: { formula: `${checkMachRow}'Machinery Data'!$K$${machRowIdx})` }, 
                        FuelTypeKey: { formula: `${checkMachRow}'Machinery Data'!$L$${machRowIdx})` }, 
                        BDN_Number: { formula: `${checkMachRow}'Machinery Data'!$M$${machRowIdx})` }, 
                        ConsumedMT: { formula: `${checkMachRow}'Machinery Data'!$N$${machRowIdx})` }, 
                        EntryDate: { formula: `IF(A${fuelRowIdx}="", "", VLOOKUP(A${fuelRowIdx},'VesselDailyReports'!$A:$F,6,FALSE))` }
                    };
                    fuelConsumptionSheet.columns.forEach((col, idx) => {
                        if (fuelValues[col.key] !== undefined) fuelConsumptionSheet.getRow(fuelRowIdx).getCell(idx + 1).value = fuelValues[col.key];
                    });
                    fuelRowIdx++;
                }

                machRowIdx++;
            });
        }
    }

    // ---------------------------------------------------------
    // 4. Pre-fill ROB Sheets (Outside Main Loop - 500 rows)
    // ---------------------------------------------------------
    for (let rIdx = 2; rIdx <= MAX_DATA_ROWS; rIdx++) {
        // --- UPDATED BUNKER ROB LOGIC (Column C to J + New Columns K-P) ---
        const brRow = bunkerROBSheet.getRow(rIdx);
        // FIX 1: Apply data style WITHOUT border to all data rows
        brRow.eachCell(cell => { cell.style = dataStyleNoBorder; });
        
        // A: ShipID -> Fuel Consumption B (as requested)
        brRow.getCell(1).value = { formula: `IF('Fuel Consumption'!B${rIdx}="","", 'Fuel Consumption'!B${rIdx})` };

        // B: ReportID -> Fuel Consumption A (as requested)
        brRow.getCell(2).value = { formula: `IF('Fuel Consumption'!A${rIdx}="","", 'Fuel Consumption'!A${rIdx})` };

        // C: EntryDate -> Fuel Consumption C (as requested) 
        // MODIFIED: Use VLOOKUP on Column B (ReportID) and fetch Column 5 (ReportDateTimeUTC) from VesselDailyReports
        brRow.getCell(3).value = { formula: `IF(D${rIdx}="","", VLOOKUP(B${rIdx},'VesselDailyReports'!$A:$F,5,FALSE))` }; 

        // D: BDN_Number -> Fuel Consumption G (as requested: Fuel Consumption G)
        brRow.getCell(4).value = { formula: `IF('Fuel Consumption'!G${rIdx}="","", 'Fuel Consumption'!G${rIdx})` };

        // E: ItemTypeKey
        brRow.getCell(5).value = { formula: `IF(D${rIdx}="","", VLOOKUP(D${rIdx},'Lookups Guide'!$L:$P,2,FALSE))` };

        // F: Bunkered_Quantity
        brRow.getCell(6).value = { formula: `IF(D${rIdx}="","", 0)` };

        // G: Consumed_Quantity
        brRow.getCell(7).value = { formula: `IF(D${rIdx}="","", SUMIFS('Fuel Consumption'!$H:$H, 'Fuel Consumption'!$G:$G, D${rIdx}, 'Fuel Consumption'!$A:$A, B${rIdx}))` };

        // H: Initial_Quantity (UPDATED as requested)
        brRow.getCell(8).value = { formula: `IF(D${rIdx}="","", IFERROR( LOOKUP(2, 1/(D$1:D${rIdx-1} = D${rIdx}), I$1:I${rIdx-1}), P${rIdx} ))` };

        // I: Final_Quantity
        brRow.getCell(9).value = { formula: `IF(D${rIdx}="","", H${rIdx}-G${rIdx}+F${rIdx})` };

        // J: ItemCategory
        brRow.getCell(10).value = { formula: `IF(D${rIdx}="","", VLOOKUP(D${rIdx},'Lookups Guide'!$L:$P,3,FALSE))` };

        // K: Unique_ItemTypeKey (NEW)
        brRow.getCell(11).value = { formula: `IF(AND(E${rIdx}<>"", COUNTIFS($B$2:B${rIdx}, B${rIdx}, $E$2:E${rIdx}, E${rIdx})=1), E${rIdx}, "")` };

        // L: Unique_ID (NEW)
        brRow.getCell(12).value = { formula: `IF(K${rIdx}="","", B${rIdx})` };

        // M: Final ItemtypeKey (NEW) - SIMPLE COPY
        brRow.getCell(13).value = { formula: `IF(A${rIdx}="","", K${rIdx})` };

        // N: Final ReportId (NEW) - SIMPLE COPY
        brRow.getCell(14).value = { formula: `IF(A${rIdx}="","", L${rIdx})` };

        // O: Unique_Bunker (NEW)
        brRow.getCell(15).value = { formula: `IF(AND(D${rIdx}<>"", COUNTIFS($B$2:B${rIdx}, B${rIdx}, $D$2:D${rIdx}, D${rIdx})=1), D${rIdx}, "")` };

        // P: Initial_Quantity_Origin (NEW)
        brRow.getCell(16).value = { formula: `IF(D${rIdx}="","", VLOOKUP(D${rIdx},'Lookups Guide'!$L:$P,5,FALSE))` };


        // --- FUEL ROB SHEET UPDATED LOGIC ---
        const frRow = fuelROBSheet.getRow(rIdx);
        // FIX 1: Apply data style WITHOUT border to all data rows
        frRow.eachCell(cell => { cell.style = dataStyleNoBorder; });
        
        // A: ShipID
        frRow.getCell(1).value = { formula: `IF(B${rIdx}="","", ${shipId})` }; 

        // B: Report_Consumption_ID
        frRow.getCell(2).value = { formula: `='Bunker ROB'!N${rIdx}` };

        // C: EntryDate
        frRow.getCell(3).value = { formula: `IF(B${rIdx}="", "", VLOOKUP(B${rIdx},VesselDailyReports!A:F,6,FALSE))` };

        // D: FuelTypeKey
        frRow.getCell(4).value = { formula: `IF(B${rIdx}="", "", 'Bunker ROB'!M${rIdx})` };

        // E: Bunkered_Quantity
        frRow.getCell(5).value = { formula: `IF(D${rIdx}="","", SUMIF('Bunker ROB'!$E:$E, D${rIdx}, 'Bunker ROB'!$F:$F))` };

        // F: Consumed_Quantity
        frRow.getCell(6).value = { formula: `IF(D${rIdx}="","", SUMIFS('Bunker ROB'!$G:$G, 'Bunker ROB'!$E:$E, D${rIdx}, 'Bunker ROB'!$B:$B, B${rIdx}))` };

        // G: Initial_Quantity
        frRow.getCell(7).value = { formula: `IF(D${rIdx}="","", IFERROR(LOOKUP(2, 1/(D$1:D${rIdx-1} = D${rIdx}), H$1:H${rIdx-1}), J${rIdx}))` };

        // H: Final_Quantity
        frRow.getCell(8).value = { formula: `IF(D${rIdx}="","", G${rIdx}-F${rIdx}+E${rIdx})` };

        // I: entry_mode
        frRow.getCell(9).value = { formula: `IF(D${rIdx}="","", VLOOKUP(B${rIdx},VesselDailyReports!A:D,4,FALSE))` };

        // J: Dummy_value
        frRow.getCell(10).value = { formula: `IF(D${rIdx}="","", VLOOKUP(D${rIdx},'Lookups Guide'!$R:$T,3,FALSE))` };


        // --- LUBE OIL ROB (Keep existing link logic but in new loop) ---
        const loRow = loROBSheet.getRow(rIdx);
        // Link to Lube Oil Consumption Sheet
        loRow.getCell(1).value = { formula: `IF('Lube Oil Consumption'!B${rIdx}="","", 'Lube Oil Consumption'!B${rIdx})` }; // ShipID
        loRow.getCell(2).value = { formula: `IF('Lube Oil Consumption'!A${rIdx}="","", 'Lube Oil Consumption'!A${rIdx})` }; // ReportID
    }

    // ---------------------------------------------------------
    // 3. Voyage Details & Lookups Sheets (Standard)
    // ---------------------------------------------------------
    const voyageSheet = workbook.addWorksheet('Voyage Details');
    voyageSheet.state = 'hidden'; 
    voyageSheet.columns = [
        { header: 'LegName', key: 'LegName', width: 25 },
        { header: 'VoyageID', key: 'VoyageID', width: 15 },
        { header: 'ShipID', key: 'ShipID', width: 10 },
        { header: 'DeparturePortCode', key: 'DeparturePortCode', width: 20 },
        { header: 'ArrivalPortCode', key: 'ArrivalPortCode', width: 20 },
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
    
    if (voyageData && voyageData.length > 0) {
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
    }

    // ---------------------------------------------------------
    // 4. Lookups Guide Sheet
    // ---------------------------------------------------------
    const lookupsSheet = workbook.addWorksheet('Lookups Guide');
    lookupsSheet.state = 'hidden';
    const lookupHeaders = [
        'ReportTypeKey', 'Vessel_Activity', 'DirectionName', 'StateDescription', 'Cargo_Activity', 'ShipID', 'CustomMachineryName',
        'MachineryTypeKey', 'MachineryRecordID', 'ROB_Entry_ID', 'ItemTypeKey1', 'BDN_Number', 'ItemTypeKey', 'ItemCategory',
        'Initial_Quantity', 'Final_Quantity', 'DailyROB_ReportID', 'FuelTypeKey', 'DR_Initial_Quantity', 'DR_Final_Quantity',
        'LO_ReportID', 'LubeOilTypeKey', 'LO_Initial_Quantity', 'LO_Final_Quantity', 'Time_Zone',
        'BDN_ItemType', 'BDN1', 'BDN2', 'BDN3', 'BDN4', 'BDN5', 'BDN6', 'BDN7', 'BDN8', 'BDN9', 'BDN10',
        'LubeOilType_Filtered', 'FuelTypeKey_Filtered'
    ];
    lookupsSheet.columns = lookupHeaders.map(h => ({ header: h, key: h, width: 25 }));
    lookupsSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    const lookupDataRows = lookups.fullLookupResults || [];
    const TIME_ZONES = [
        '(UTC−12:00)', '(UTC−11:00)', '(UTC−10:00)', '(UTC−09:30)', '(UTC−09:00)', '(UTC−08:00)', '(UTC−07:00)', '(UTC−06:00)',
        '(UTC−05:00)', '(UTC−04:00)', '(UTC−03:30)', '(UTC−03:00)', '(UTC−02:00)', '(UTC−01:00)', '(UTC±00:00)', '(UTC+01:00)',
        '(UTC+02:00)', '(UTC+03:00)', '(UTC+03:30)', '(UTC+04:00)', '(UTC+04:30)', '(UTC+05:00)', '(UTC+05:30)', '(UTC+05:45)',
        '(UTC+06:00)', '(UTC+06:30)', '(UTC+07:00)', '(UTC+08:00)', '(UTC+08:30)', '(UTC+08:45)', '(UTC+09:00)', '(UTC+09:30)',
        '(UTC+10:00)', '(UTC+10:30)', '(UTC+11:00)', '(UTC+12:00)'
    ];
    const maxRows = Math.max(lookupDataRows.length, TIME_ZONES.length);
    
    for (let i = 0; i < maxRows; i++) {
        const data = lookups.fullLookupResults[i] || {};
        const row = {};
        lookupHeaders.forEach(key => {
            if (key === 'Time_Zone') row[key] = TIME_ZONES[i] || '';
            else row[key] = data[key] || '';
        });
        addDataRow(lookupsSheet, row, dataStyleNoBorder);
    }

    // ---------------------------------------------------------
    // VALIDATIONS
    // ---------------------------------------------------------
    const lookupEndRow = maxRows + 1;
    const voyageEndRow = (voyageData ? voyageData.length : 0) + 1; 
    
    // 1. Static Dropdowns
    const validations = [
        { colKey: 'ReportTypeKey', lookupCol: 'A', title: 'Report Type' },
        { colKey: 'VesselActivity', lookupCol: 'B', title: 'Vessel Activity' },
        { colKey: 'WindDirection', lookupCol: 'C', title: 'Wind Direction' },
        { colKey: 'SwellDirection', lookupCol: 'C', title: 'Swell Direction' },
        { colKey: 'SeaState', lookupCol: 'D', title: 'Sea State' },
        { colKey: 'CargoActivity', lookupCol: 'E', title: 'Cargo Activity' },
        { colKey: 'TimeZoneAtPort', lookupCol: 'Y', title: 'Time Zone' }
    ];

    validations.forEach(val => {
        const colLetter = getColumnLetter(mainReportSheet, val.colKey);
        if (colLetter) {
            mainReportSheet.dataValidations.add(`${colLetter}2:${colLetter}${MAX_DATA_ROWS}`, {
                type: 'list',
                allowBlank: true,
                formulae: [`'Lookups Guide'!$${val.lookupCol}$2:$${val.lookupCol}$${lookupEndRow}`],
                showErrorMessage: true,
                errorStyle: 'stop',
                errorTitle: 'Invalid Selection',
                error: `Select a valid ${val.title} from the list.`
            });
        }
    });

    if (voyageNumCol) {
        mainReportSheet.dataValidations.add(`${voyageNumCol}2:${voyageNumCol}${MAX_DATA_ROWS}`, {
            type: 'list',
            allowBlank: true,
            formulae: [`'Voyage Details'!$A$2:$A$${voyageEndRow}`],
            showErrorMessage: true,
            errorStyle: 'stop',
            errorTitle: 'Invalid Selection',
            error: 'Value must be selected from the dropdown list.'
        });
    }

    // 2. Dynamic Fuel/Bunker Validations (VesselDailyReports Sheet)
    allColumns.forEach(col => {
        if (col.key && col.key.endsWith('_Fuel')) {
            const colLetter = getColumnLetter(mainReportSheet, col.key);
            if (colLetter) {
                mainReportSheet.dataValidations.add(`${colLetter}2:${colLetter}${MAX_DATA_ROWS}`, {
                    type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$R$2:$R$${lookupEndRow}`],
                    showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Select valid Fuel.'
                });
            }
        }
        if (col.key && col.key.endsWith('_Bunker')) {
            const bunkerColLetter = getColumnLetter(mainReportSheet, col.key);
            const fuelKey = col.key.replace('_Bunker', '_Fuel');
            const fuelColLetter = getColumnLetter(mainReportSheet, fuelKey);
            if (bunkerColLetter && fuelColLetter) {
                const formula = `OFFSET('Lookups Guide'!$AA$1,MATCH(${fuelColLetter}2,'Lookups Guide'!$Z:$Z,0)-1,0,1,10)`;
                mainReportSheet.dataValidations.add(`${bunkerColLetter}2:${bunkerColLetter}${MAX_DATA_ROWS}`, {
                    type: 'list', allowBlank: true, formulae: [formula],
                    showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Selection', error: 'Select Fuel First.'
                });
            }
        }
    });

    // 3. Date Validations for E (UTC) and F (Local)
    // Notes: Uses 'date' type. 'greaterThanOrEqual' 1900 checks numeric serial, allowing both Date and Date+Time.
    ['E', 'F'].forEach(col => {
        mainReportSheet.dataValidations.add(`${col}2:${col}${MAX_DATA_ROWS}`, {
            type: 'date',
            operator: 'greaterThanOrEqual',
            formulae: [new Date('2000-01-01')], 
            showInputMessage: true,
            promptTitle: 'Date Format',
            prompt: 'Please enter date in DD-MM-YYYY HH:mm format',
            showErrorMessage: true,
            errorStyle: 'stop',
            errorTitle: 'Invalid Date',
            error: 'Value must be a valid date.'
        });
    });

    // 4. RESTORED LOOKUPS FOR ROB SHEETS 
    const brItemTypeCol = getColumnLetter(bunkerROBSheet, 'ItemTypeKey');
    const brItemCatCol = getColumnLetter(bunkerROBSheet, 'ItemCategory');
    if (brItemTypeCol) {
        bunkerROBSheet.dataValidations.add(`${brItemTypeCol}2:${brItemTypeCol}${MAX_DATA_ROWS}`, {
            type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$R$2:$R$${lookupEndRow}`], 
            showErrorMessage: true, errorStyle: 'stop', error: 'Select valid Fuel Type.'
        });
    }
    if (brItemCatCol) {
        bunkerROBSheet.dataValidations.add(`${brItemCatCol}2:${brItemCatCol}${MAX_DATA_ROWS}`, {
            type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$N$2:$N$${lookupEndRow}`],
            showErrorMessage: true, errorStyle: 'stop', error: 'Select valid Category.'
        });
    }

    const frFuelTypeCol = getColumnLetter(fuelROBSheet, 'FuelTypeKey');
    if (frFuelTypeCol) {
        fuelROBSheet.dataValidations.add(`${frFuelTypeCol}2:${frFuelTypeCol}${MAX_DATA_ROWS}`, {
            type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$R$2:$R$${lookupEndRow}`],
            showErrorMessage: true, errorStyle: 'stop', error: 'Select valid Fuel Type.'
        });
    }

    const loTypeColROB = getColumnLetter(loROBSheet, 'LubeOilTypeKey');
    if (loTypeColROB) {
        loROBSheet.dataValidations.add(`${loTypeColROB}2:${loTypeColROB}${MAX_DATA_ROWS}`, {
            type: 'list', allowBlank: true, formulae: [`'Lookups Guide'!$V$2:$V$${lookupEndRow}`],
            showErrorMessage: true, errorStyle: 'stop', error: 'Select valid Lube Type.'
        });
    }

    // ---------------------------------------------------------
    // SECURITY PATCH — Hide formulas & protect all sheets
    // ---------------------------------------------------------

    applyCellProtection(mainReportSheet);
    applyCellProtection(machineryDataSheet, ['H', 'J', 'N']);
    applyCellProtection(fuelConsumptionSheet);
    applyCellProtection(loConsumptionSheet);
    applyCellProtection(bunkerROBSheet);
    applyCellProtection(fuelROBSheet);
    applyCellProtection(loROBSheet);
    applyCellProtection(voyageSheet);
    applyCellProtection(lookupsSheet);

    await protectSheet(mainReportSheet);
    await protectSheet(machineryDataSheet);
    await protectSheet(fuelConsumptionSheet);
    await protectSheet(loConsumptionSheet);
    await protectSheet(bunkerROBSheet);
    await protectSheet(fuelROBSheet);
    await protectSheet(loROBSheet);
    await protectSheet(voyageSheet);
    await protectSheet(lookupsSheet);

    // ---------------------------------------------------------
    // NEW: Add Upload Token Sheet
    // ---------------------------------------------------------
    createUploadTokenSheet(workbook, templateData.uploadToken || '');

    // ---------------------------------------------------------
    // FINAL WRITE BUFFER (REQUIRED)
    // ---------------------------------------------------------
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};


// =========================================================================
// 2. PARSE BULK EXCEL (Extract Headers & Save CSV)
// =========================================================================
export const parseBulkExcel = async (buffer, uniqueId) => {
    const workbook = new Workbook();
    try {
        await workbook.xlsx.load(buffer);
    } catch (readErr) {
        throw new Error("Failed to read Excel file. It might be corrupted.");
    }

    const sheetName = 'VesselDailyReports';
    const worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
        throw new Error(`Missing required sheet: ${sheetName}`);
    }

    const rawHeaders = worksheet.getRow(1).values;
    // ExcelJS row.values is 1-based, index 0 is null. Filter and map.
    const headers = rawHeaders.slice(1).map(h => 
        (typeof h === 'object' ? h.result : h)?.toString().trim()
    ).filter(h => h); 

    if (headers.length === 0) {
        throw new Error("The VesselDailyReports sheet appears to be empty or missing headers.");
    }

    // Convert Data to CSV
    let csvContent = headers.map(escapeCsv).join(',') + '\r\n';
    
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; 

        let rowHasData = false;
        let rowCsvValues = [];

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber > headers.length) return;

            let value = cell.value;
            let parsedValue = null;

            if (typeof value === 'object' && value !== null) {
            if ('result' in value) parsedValue = value.result;
            else if ('richText' in value) parsedValue = value.richText.map(t => t.text).join('');
            else parsedValue = value;
        
            if (parsedValue instanceof Date) {
                // CHANGE: Use moment.utc to preserve the exact time digits from the Excel cell
                parsedValue = moment.utc(parsedValue).format('YYYY-MM-DD HH:mm:ss');
            }
            } else {
                parsedValue = value;
            }

            if (parsedValue !== null && parsedValue !== undefined && String(parsedValue).trim() !== '') {
                rowHasData = true;
            }
            rowCsvValues.push(escapeCsv(parsedValue));
        });

        if (rowHasData) {
            while (rowCsvValues.length < headers.length) {
                rowCsvValues.push('');
            }
            csvContent += rowCsvValues.join(',') + '\r\n';
        }
    });

    const folderPath = path.join(UPLOADS_BASE_DIR, BULK_UPLOAD_FOLDER);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    const csvFileName = `${uniqueId}_${sheetName}.csv`;
    const csvFilePath = path.join(folderPath, csvFileName);
    fs.writeFileSync(csvFilePath, csvContent);

    return {
        headers: headers,
        csvFilePath: csvFilePath,
        fileName: csvFileName
    };
};