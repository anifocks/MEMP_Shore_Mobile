// addeditpage breakup/viswa-digital-backend/excel-integration-service/controllers/excelController.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

// ESM setup for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const attachUploadToken = async (templateData, shipId, notes) => {
    if (!templateData || !shipId) return;

    try {
        const tokenData = await generateUploadToken(
            shipId,
            null,
            365,
            null,
            notes
        );
        templateData.uploadToken = tokenData.Token;
    } catch (error) {
        console.error('⚠️ Failed to generate upload token for template:', error.message);
    }
};

// MODIFIED: Added new imports from model
import { 
    getTemplateData, 
    importCSVToDBProcedure, 
    importBulkCSVToDBProcedure, 
    importVoyageCSVToDBProcedure, // NEW IMPORT for Voyage SP
    getShipMachineryConfig, 
    createAndLoadStagingTable, 
    createStagingTableOnly,
    getBunkerTemplateData, // NEW: Bunker Data
    importBunkerCSVToDBProcedure, // NEW: Bunker SP
    validateUploadToken, // NEW: Token validation
    getUploadTokensByShip, // NEW: Get tokens
    revokeUploadToken, // NEW: Revoke token
    generateUploadToken // NEW: Generate token for templates
} from '../models/excelModel.js'; 

import { generateReportTemplate, parseExcelReport, readCsvPreviewReport } from '../utils/excelUtils.js'; 
import { 
    generateBulkReportTemplate, 
    parseBulkExcel, 
    getBulkColumnDefinitions 
} from '../utils/bulkExcelUtils.js';

// Helper: format date/time for template refresh
const formatTemplateDateTime = (dateValue) => {
    if (!dateValue) return '';
    try {
        // Format as DD/MM/YYYY HH:mm:ss for SQL style 103 compatibility
        return moment.utc(dateValue).format('DD/MM/YYYY HH:mm:ss');
    } catch (e) {
        return String(dateValue);
    }
};

// Helper: Format all date fields in report object
const formatReportDates = (reportRow) => {
    if (!reportRow || typeof reportRow !== 'object') return reportRow;
    
    const dateFields = [
        'ReportDateTimeUTC',
        'ReportDateTimeLocal',
        'EntryDate',
        'ETD',
        'ATD',
        'ETA',
        'ATA'
    ];
    
    const formatted = { ...reportRow };
    dateFields.forEach(field => {
        if (formatted[field]) {
            formatted[field] = formatTemplateDateTime(formatted[field]);
        }
    });
    return formatted;
};

const buildVoyageDetailsRows = (voyageData = []) => {
    const headers = [
        'LegName', 'VoyageID', 'ShipID', 'DeparturePortCode', 'ArrivalPortCode',
        'ETD', 'ATD', 'ETA', 'ATA', 'CargoDescription', 'CargoWeightMT',
        'VoyageNumber', 'LegNumber', 'VoyageLegID'
    ];

    const rows = [headers];
    voyageData.forEach(voyage => {
        rows.push([
            voyage.LegName || '',
            voyage.VoyageID || '',
            voyage.ShipID || '',
            voyage.DeparturePortCode || '',
            voyage.ArrivalPortCode || '',
            formatTemplateDateTime(voyage.ETD),
            formatTemplateDateTime(voyage.ATD),
            formatTemplateDateTime(voyage.ETA),
            formatTemplateDateTime(voyage.ATA),
            voyage.CargoDescription || '',
            voyage.CargoWeightMT || '',
            voyage.VoyageNumber || '',
            voyage.LegNumber || '',
            voyage.VoyageLegID || ''
        ]);
    });
    return rows;
};

const buildLookupsGuideRows = (lookups = {}) => {
    const TIME_ZONES = [
        'UTC+14:00','UTC+13:00','UTC+12:00','UTC+11:00','UTC+10:00','UTC+09:00','UTC+08:00',
        'UTC+07:00','UTC+06:00','UTC+05:00','UTC+04:00','UTC+03:00','UTC+02:00','UTC+01:00',
        'UTC','UTC-01:00','UTC-02:00','UTC-03:00','UTC-04:00','UTC-05:00','UTC-06:00','UTC-07:00',
        'UTC-08:00','UTC-09:00','UTC-10:00','UTC-11:00','UTC-12:00'
    ];

    const lookupHeaders = [
        'ReportTypeKey', 'Vessel_Activity', 'DirectionName', 'StateDescription', 'Cargo_Activity', 'ShipID', 'CustomMachineryName',
        'MachineryTypeKey', 'MachineryRecordID', 'ROB_Entry_ID', 'ItemTypeKey1', 'BDN_Number', 'ItemTypeKey', 'ItemCategory',
        'Initial_Quantity', 'Final_Quantity', 'DailyROB_ReportID', 'FuelTypeKey', 'DR_Initial_Quantity', 'DR_Final_Quantity',
        'LO_ReportID', 'LubeOilTypeKey', 'LO_Initial_Quantity', 'LO_Final_Quantity', 'Time_Zone',
        'BDN_ItemType', 'BDN1', 'BDN2', 'BDN3', 'BDN4', 'BDN5', 'BDN6', 'BDN7', 'BDN8', 'BDN9', 'BDN10',
        'LubeOilType_Filtered', 'FuelTypeKey_Filtered'
    ];

    const lookupDataRows = lookups.fullLookupResults || [];
    const maxRows = Math.max(lookupDataRows.length, TIME_ZONES.length);
    const rows = [lookupHeaders];

    const LUBE_OIL_TYPE_KEYS = lookupDataRows.map(item => item.LubeOilTypeKey).filter((v, i, a) => v && a.indexOf(v) === i);
    const FUEL_TYPE_KEYS = lookupDataRows.map(item => item.FuelTypeKey).filter((v, i, a) => v && a.indexOf(v) === i);

    for (let i = 0; i < maxRows; i++) {
        const data = lookupDataRows[i] || {};
        const row = lookupHeaders.map(key => {
            if (key === 'Time_Zone') return TIME_ZONES[i] || '';
            if (key === 'LubeOilType_Filtered' || key === 'FuelTypeKey_Filtered') return '';
            return data[key] ?? '';
        });
        rows.push(row);
    }

    LUBE_OIL_TYPE_KEYS.forEach((key, index) => {
        const rowIndex = index + 1;
        if (!rows[rowIndex]) rows[rowIndex] = Array(lookupHeaders.length).fill('');
        rows[rowIndex][lookupHeaders.indexOf('LubeOilType_Filtered')] = key;
    });

    FUEL_TYPE_KEYS.forEach((key, index) => {
        const rowIndex = index + 1;
        if (!rows[rowIndex]) rows[rowIndex] = Array(lookupHeaders.length).fill('');
        rows[rowIndex][lookupHeaders.indexOf('FuelTypeKey_Filtered')] = key;
    });

    return rows;
};

const buildBunkerLookupRows = (lookupData = []) => {
    const headers = [
        'ShipID', 'VoyageNumber', 'LegName', 'VoyageID', 'VoyageLegID',
        'BunkerCategory', 'FuelTypeKey', 'LubeOilTypeKey', 'OperationType', 'PortName', 'PortCode'
    ];
    const rows = [headers];
    lookupData.forEach(row => {
        rows.push([
            row.ShipID || '',
            row.VoyageNumber || '',
            row.LegName || '',
            row.VoyageID || '',
            row.VoyageLegID || '',
            row.BunkerCategory || '',
            row.FuelTypeKey || '',
            row.LubeOilTypeKey || '',
            row.OperationType || '',
            row.PortName || '',
            row.PortCode || ''
        ]);
    });
    return rows;
};

const buildVoyageRows = (voyageData = []) => {
    const headers = [
        'ShipID', 'DeparturePortName', 'DeparturePortCode', 'ArrivalPortName', 'ArrivalPortCode',
        'ETD', 'ATD', 'ETA', 'ATA', 'VoyageNumber', 'LegNumber',
        'DistancePlannedNM', 'DistanceSailedNM'
    ];
    const rows = [headers];
    voyageData.forEach(row => {
        rows.push([
            row.ShipID || '',
            row.DeparturePortName || '',
            row.DeparturePortCode || '',
            row.ArrivalPortName || '',
            row.ArrivalPortCode || '',
            formatTemplateDateTime(row.ETD),
            formatTemplateDateTime(row.ATD),
            formatTemplateDateTime(row.ETA),
            formatTemplateDateTime(row.ATA),
            row.VoyageNumber || '',
            row.LegNumber || '',
            row.DistancePlannedNM || '',
            row.DistanceSailedNM || ''
        ]);
    });
    return rows;
};

const buildPortsRows = (portsData = []) => {
    const headers = ['PortID', 'PortName', 'Country', 'CountryCode', 'PortCode'];
    const rows = [headers];
    portsData.forEach(row => {
        rows.push([
            row.PortID || '',
            row.PortName || '',
            row.Country || '',
            row.CountryCode || '',
            row.PortCode || ''
        ]);
    });
    return rows;
};

// *** NEW IMPORT ***
import { generateVoyageTemplate, parseVoyageExcel } from '../utils/VoyageexcelUtils.js';
import { generateBunkerTemplate, parseBunkerExcel } from '../utils/BunkerexcelUtils.js'; // NEW: Bunker Utils

/**
 * POST /api/excel/parse/vesselreport
 */
export const parseVesselReport = async (req, res) => {
    console.log('📥 parseVesselReport called');
    console.log('File info:', req.file ? { 
        name: req.file.originalname, 
        size: req.file.size, 
        mimetype: req.file.mimetype,
        path: req.file.path
    } : 'NO FILE');
    
    if (!req.file) {
        return res.status(400).send({ message: 'No Excel file uploaded.' });
    }

    const filePath = req.file.path;
    const uniqueId = path.basename(filePath).split('-')[0];
    let parsedData = null; 

    try {
        console.log(`🔍 Starting parse for file: ${filePath}`);
        console.log(`🆔 Unique ID: ${uniqueId}`);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found at ${filePath}`);
        }
        console.log(`✅ File exists, reading buffer...`);
        
        const buffer = fs.readFileSync(filePath);
        console.log(`✅ Buffer read, size: ${buffer.length} bytes`);
        console.log(`🔄 Calling parseExcelReport...`);
        
        const parseResult = await parseExcelReport(buffer, uniqueId);
        console.log(`✅ Parse successful, writing response...`);
        
        res.status(200).send({
            message: 'File uploaded and converted to CSVs successfully. Ready for preview and import.',
            fileName: path.basename(filePath),
            parsedData: parseResult?.parsedData || null,
            uniqueFileId: uniqueId 
        });

    } catch (error) {
        console.error('❌ Parse Error:', error.message);
        console.error('Error stack:', error.stack);
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) console.error('Failed to delete failed temp file:', err);
            });
        }
        res.status(500).send({
            message: 'File upload and CSV conversion failed.',
            details: error.message
        });
    }
};

/**
 * POST /api/excel/preview/vesselreport
 */
export const previewVesselReport = async (req, res) => {
    const { fileId } = req.body;

    if (!fileId) {
        return res.status(400).send({ message: 'Missing unique file ID to generate data preview.' });
    }

    try {
        const parsedData = await readCsvPreviewReport(fileId); 

        if (!parsedData || Object.keys(parsedData).length === 0) {
            throw new Error("No structured data could be read from the saved CSV files.");
        }

        res.status(200).send({
            message: `Data successfully retrieved from CSVs for preview. File ID: ${fileId}`,
            parsedData: parsedData,
            uniqueFileId: fileId
        });

    } catch (error) {
        console.error('CSV Preview Read Error:', error.message);
        res.status(500).send({
            message: 'Failed to retrieve CSV preview.',
            details: error.message
        });
    }
};

/**
 * POST /api/excel/import-csv-to-db
 * MODIFIED: Now handles 'VOYAGE' and 'BUNKER' types.
 */
export const importCSVToDatabase = async (req, res) => {
    const { fileId, type } = req.body; // ADDED: type from frontend

    if (!fileId) {
        return res.status(400).send({ message: 'Missing unique file ID for CSV bulk import.' });
    }

    try {
        let successMessage = '';

        if (type === 'VOYAGE') {
            // *** NEW: Call Voyage SP ***
            successMessage = await importVoyageCSVToDBProcedure(fileId);
        } else if (type === 'BUNKER') {
            // *** NEW: Call Bunker SP ***
            successMessage = await importBunkerCSVToDBProcedure(fileId);
        } else {
            // Default (Single/Bulk Report)
            successMessage = await importCSVToDBProcedure(fileId);
        }

        res.status(200).send({
            message: successMessage
        });

    } catch (error) {
        console.error('CSV Import Procedure Error:', error.message);
        res.status(500).send({
            message: 'CSV Import failed. Check backend logs for SQL error details.',
            details: error.message
        });
    }
};


/**
 * GET /api/excel/template/vesselreport
 */
export const downloadVesselReportTemplate = async (req, res) => {
    const shipId = req.query.shipId; 
    
    if (!shipId) {
        return res.status(400).send({ message: 'Ship ID is required for template generation.' });
    }
    
    try {
        const templateData = await getTemplateData(shipId); 
        const buffer = await generateReportTemplate(templateData, shipId); 
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Vessel_Report_Template_Ship_${shipId}.xlsx`);
        res.send(buffer);
        
    } catch (error) {
        console.error('Template Generation Error:', error);
        res.status(500).send({
            message: 'Failed to generate Excel template.',
            details: error.message
        });
    }
};

/**
 * GET /api/excel/template/bulk-vesselreport
 */
export const downloadBulkVesselReportTemplate = async (req, res) => {
    const shipId = req.query.shipId; 
    
    if (!shipId) {
        return res.status(400).send({ message: 'Ship ID is required for template generation.' });
    }
    
    try {
        const templateData = await getTemplateData(shipId);
        const machineryConfig = await getShipMachineryConfig(shipId);

        await attachUploadToken(templateData, shipId, `Bulk template generated for Ship ${shipId}`);

        const columns = getBulkColumnDefinitions(machineryConfig);
        const headers = columns.map(c => c.key); 
        
        await createStagingTableOnly(shipId, headers);
        console.log(`[Bulk] Staging table pre-created for Ship ${shipId}`);

        const buffer = await generateBulkReportTemplate(templateData, shipId, machineryConfig); 
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Bulk_VesselReport_Template_Ship_${shipId}.xlsx`);
        res.send(buffer);
        
    } catch (error) {
        console.error('Bulk Template Generation Error:', error);
        res.status(500).send({
            message: 'Failed to generate Bulk Excel template.',
            details: error.message
        });
    }
};

// =========================================================================
// *** NEW: VOYAGE CONTROLLERS ***
// =========================================================================

/**
 * GET /api/excel/template/voyage
 */
export const downloadVoyageTemplate = async (req, res) => {
    const shipId = req.query.shipId; 
    
    if (!shipId) {
        return res.status(400).send({ message: 'Ship ID is required for template generation.' });
    }
    
    try {
        // Reuse existing getTemplateData to get Voyage lists and potentially ports if added
        // NOTE: Ensure your SQL query in 'getTemplateData' fetches ports or create a new model function
        const templateData = await getTemplateData(shipId); 
        
        // For now, if portsData isn't in templateData, pass empty array or fetch separate
        if (!templateData.portsData) templateData.portsData = []; 

        await attachUploadToken(templateData, shipId, `Voyage template generated for Ship ${shipId}`);

        const buffer = await generateVoyageTemplate(shipId, templateData); 
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Voyage_Template_Ship_${shipId}.xlsx`);
        res.send(buffer);
        
    } catch (error) {
        console.error('Voyage Template Generation Error:', error);
        res.status(500).send({
            message: 'Failed to generate Voyage Excel template.',
            details: error.message
        });
    }
};

/**
 * POST /api/excel/parse/voyage
 * Uploads Excel, converts to CSVs, returns Preview Data.
 */
export const uploadVoyageExcel = async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'No Excel file uploaded.' });
    }

    const filePath = req.file.path;
    const uniqueId = path.basename(filePath).split('-')[0];

    try {
        const buffer = fs.readFileSync(filePath);
        
        // Call new utility to parse Voyage Excel and save CSVs
        // UPDATED: Now returns 'previewData' in result
        const result = await parseVoyageExcel(buffer, uniqueId);

        // DO NOT call the DB procedure here. Return preview data instead.
        
        res.status(200).send({
            message: 'Voyage Excel uploaded and parsed successfully. Ready for preview and import.',
            details: result, // Contains 'previewData'
            parsedData: result.previewData, // Explicitly send parsedData for frontend consistency
            uniqueFileId: uniqueId
        });

    } catch (error) {
        console.error('Voyage Upload Error:', error.message);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).send({
            message: 'Voyage Upload Failed.',
            details: error.message
        });
    }
};

/**
 * POST /api/excel/parse/bulk-vesselreport
 */
export const uploadBulkVesselReport = async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'No Excel file uploaded.' });
    }

    const shipId = req.body.shipId; 
    if (!shipId) {
        return res.status(400).send({ message: 'ShipID is required for bulk staging.' });
    }

    const filePath = req.file.path;
    const uniqueId = path.basename(filePath).split('-')[0];

    try {
        const buffer = fs.readFileSync(filePath);
        
        // Reuse Single Upload logic to convert Bulk Excel into 7 standard CSVs
        await parseExcelReport(buffer, uniqueId);

        // Call the BULK Stored Procedure
        const dbResult = await importBulkCSVToDBProcedure(uniqueId);

        res.status(200).send({
            message: 'Bulk Upload Processed Successfully.',
            details: dbResult, 
            uniqueFileId: uniqueId
        });

    } catch (error) {
        console.error('Bulk Upload Error:', error.message);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).send({
            message: 'Bulk Upload Failed.',
            details: error.message
        });
    }
};
// =========================================================================
// TOKEN MANAGEMENT CONTROLLERS
// =========================================================================

/**
 * POST /api/excel/token/validate
 * Validate an upload token
 */
export const validateToken = async (req, res) => {
    const { token } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    if (!token) {
        return res.status(400).send({ message: 'Token is required' });
    }
    
    try {
        const result = await validateUploadToken(token, ipAddress);
        
        if (result.IsValid) {
            res.status(200).send({
                valid: true,
                shipId: result.ShipID,
                message: result.Message
            });
        } else {
            res.status(401).send({
                valid: false,
                message: result.Message
            });
        }
    } catch (error) {
        console.error('Token validation error:', error.message);
        res.status(500).send({
            message: 'Token validation failed',
            details: error.message
        });
    }
};

/**
 * GET /api/excel/tokens/ship/:shipId
 * Get all tokens for a specific ship
 */
export const getTokensByShip = async (req, res) => {
    const { shipId } = req.params;
    
    if (!shipId) {
        return res.status(400).send({ message: 'Ship ID is required' });
    }
    
    try {
        const tokens = await getUploadTokensByShip(parseInt(shipId));
        res.status(200).send({
            shipId: parseInt(shipId),
            tokens: tokens
        });
    } catch (error) {
        console.error('Error fetching tokens:', error.message);
        res.status(500).send({
            message: 'Failed to fetch tokens',
            details: error.message
        });
    }
};

/**
 * POST /api/excel/token/revoke
 * Revoke a token
 */
export const revokeToken = async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).send({ message: 'Token is required' });
    }
    
    try {
        const result = await revokeUploadToken(token);
        res.status(200).send({
            message: 'Token revoked successfully',
            token: result.Token
        });
    } catch (error) {
        console.error('Error revoking token:', error.message);
        res.status(500).send({
            message: 'Failed to revoke token',
            details: error.message
        });
    }
};
// =========================================================================
// *** NEW: BUNKER CONTROLLERS ***
// =========================================================================

/**
 * GET /api/excel/template/bunker
 */
export const downloadBunkerTemplate = async (req, res) => {
    const shipId = req.query.shipId; 
    if (!shipId) return res.status(400).send({ message: 'Ship ID required.' });
    
    try {
        const templateData = await getBunkerTemplateData(shipId);

        await attachUploadToken(templateData, shipId, `Bunker template generated for Ship ${shipId}`);

        const buffer = await generateBunkerTemplate(shipId, templateData);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Bunker_Template_Ship_${shipId}.xlsx`);
        res.send(buffer);
        
    } catch (error) {
        console.error('Bunker Template Error:', error);
        res.status(500).send({ message: 'Failed to generate Bunker template.', details: error.message });
    }
};

/**
 * GET /api/excel/template-data
 * Returns latest report data + lookups for existing templates
 */
export const fetchTemplateData = async (req, res) => {
    const { shipId, type } = req.query;
    if (!shipId) return res.status(400).send({ message: 'Ship ID required.' });

    const templateType = (type || 'VESSEL').toUpperCase();

    try {
        console.log(`\n🔍 FETCH TEMPLATE DATA REQUEST`);
        console.log(`   Ship ID: ${shipId}, Type: ${templateType}`);
        
        if (templateType === 'BUNKER') {
            const templateData = await getBunkerTemplateData(shipId);
            const lookupRows = buildBunkerLookupRows(templateData.lookupData || []);
            console.log(`   ✅ BUNKER response: ${lookupRows.length} rows`);
            return res.status(200).send({
                templateType,
                lookupRows
            });
        }

        if (templateType === 'VOYAGE') {
            const templateData = await getTemplateData(shipId);
            const voyageRows = buildVoyageRows(templateData.voyageData || []);
            const portsRows = buildPortsRows(templateData.portsData || []);
            console.log(`   ✅ VOYAGE response: ${voyageRows.length} voyage rows, ${portsRows.length} port rows`);
            return res.status(200).send({
                templateType,
                voyageRows,
                portsRows
            });
        }

        // Default: VESSEL or BULK
        const templateData = await getTemplateData(shipId);
        const lookupsGuideRows = buildLookupsGuideRows(templateData.lookups || {});
        const voyageDetailsRows = buildVoyageDetailsRows(templateData.voyageData || []);
        let lastReportRow = templateData.lastReportData?.DailyReport || {};
        
        // ✅ FORMAT DATES in report row before returning
        lastReportRow = formatReportDates(lastReportRow);
        
        console.log(`   ✅ VESSEL/BULK response:`);
        console.log(`      - Lookups: ${lookupsGuideRows.length} rows, ${lookupsGuideRows[0]?.length || 0} columns`);
        console.log(`      - Voyage Details: ${voyageDetailsRows.length} rows`);
        console.log(`      - Last Report: ${Object.keys(lastReportRow).length} fields`);
        if (Object.keys(lastReportRow).length > 0) {
            console.log(`      - Last Report sample: ${JSON.stringify(Object.entries(lastReportRow).slice(0, 3))}`);
        }
        
        return res.status(200).send({
            templateType,
            lookupsGuideRows,
            voyageDetailsRows,
            lastReportRow
        });
    } catch (error) {
        console.error('❌ Template Data Fetch Error:', error.message);
        console.error(error.stack);
        res.status(500).send({ message: 'Failed to fetch template data.', details: error.message });
    }
};

/**
 * POST /upload/vesselreport
 * NEW: Direct JSON upload from Office add-in
 * Accepts parsedData and shipId directly (no file upload needed)
 */
export const uploadVesselReportDirect = async (req, res) => {
    console.log('📥 Direct upload request received');
    console.log('Headers:', req.headers);
    console.log('Body keys:', Object.keys(req.body));
    
    const { parsedData, shipId } = req.body;

    if (!parsedData || !shipId) {
        console.error('❌ Missing required data:', { hasParsedData: !!parsedData, hasShipId: !!shipId });
        return res.status(400).send({ message: 'Missing parsedData or shipId in request body.' });
    }

    try {
        console.log(`📊 Processing upload for Ship ${shipId}`);
        console.log('Data sheets:', Object.keys(parsedData));
        
        // Generate a unique ID for this upload
        const uniqueId = Date.now().toString();
        console.log(`🆔 Unique ID: ${uniqueId}`);
        
        // Base directory for CSV files (matching the structure used by file uploads)
        const baseDir = path.join(__dirname, '../public/uploads');
        
        // Sheet name to folder mapping (must match stored procedure expectations)
        const folderMapping = {
            'DailyReport': 'VesselDailyReports',
            'FuelConsumption': 'FuelConsumption',
            'LOConsumption': 'LOConsumption',
            'MachineryData': 'MachineryData',
            'BunkerROB': 'BunkerROB',
            'FuelROB': 'FuelROB',
            'LOROB': 'LOROB'
        };

        // Write each sheet to its corresponding CSV folder
        for (const [sheetKey, sheetData] of Object.entries(parsedData)) {
            if (Array.isArray(sheetData) && sheetData.length > 0) {
                const folderName = folderMapping[sheetKey] || sheetKey;
                const csvDir = path.join(baseDir, folderName);
                
                // Ensure directory exists
                if (!fs.existsSync(csvDir)) {
                    fs.mkdirSync(csvDir, { recursive: true });
                }
                
                const csvPath = path.join(csvDir, `${uniqueId}_${folderName}.csv`);
                const headers = Object.keys(sheetData[0]);
                const csvContent = [
                    headers.join(','),
                    ...sheetData.map(row => headers.map(h => {
                        const val = row[h];
                        // Properly escape CSV values
                        if (val === null || val === undefined) return '';
                        return `"${String(val).replace(/"/g, '""')}"`;
                    }).join(','))
                ].join('\n');
                
                fs.writeFileSync(csvPath, csvContent, 'utf8');
                console.log(`✅ Written ${sheetData.length} rows to ${folderName}/${uniqueId}_${folderName}.csv`);
            }
        }

        // Import to database
        console.log(`💾 Starting database import for ID ${uniqueId}`);
        const successMessage = await importCSVToDBProcedure(uniqueId);
        console.log(`✅ Database import successful: ${successMessage}`);

        // Cleanup CSV files
        for (const folderName of Object.values(folderMapping)) {
            const csvDir = path.join(baseDir, folderName);
            if (fs.existsSync(csvDir)) {
                const files = fs.readdirSync(csvDir).filter(f => f.startsWith(uniqueId));
                files.forEach(f => {
                    try {
                        fs.unlinkSync(path.join(csvDir, f));
                    } catch (err) {
                        console.warn(`Failed to delete ${f}:`, err.message);
                    }
                });
            }
        }

        res.status(200).send({
            message: 'Report uploaded successfully!',
            details: successMessage
        });
        
        console.log('✅ Upload completed successfully');

    } catch (error) {
        console.error('❌ Direct Upload Error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).send({
            message: 'Upload failed',
            details: error.message
        });
    }
};

/**
 * POST /api/excel/parse/bunker
 */
export const uploadBunkerExcel = async (req, res) => {
    if (!req.file) return res.status(400).send({ message: 'No Excel file uploaded.' });

    const filePath = req.file.path;
    const uniqueId = path.basename(filePath).split('-')[0];

    try {
        const buffer = fs.readFileSync(filePath);
        
        // Parse Bunker Excel -> CSV
        const result = await parseBunkerExcel(buffer, uniqueId);

        // Return preview data (No DB import yet)
        res.status(200).send({
            message: 'Bunker Excel uploaded. Review and confirm import.',
            parsedData: { 'Bunkering': result.previewData }, // Wrap for consistency
            uniqueFileId: uniqueId
        });

    } catch (error) {
        console.error('Bunker Upload Error:', error.message);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).send({ message: 'Bunker Upload Failed.', details: error.message });
    }
};