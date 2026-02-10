// excel-integration-service/routes/excelRoutes.js

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// MODIFIED: Added Voyage and Bunker Controllers + Token validation
import { 
    parseVesselReport, 
    downloadVesselReportTemplate, 
    downloadBulkVesselReportTemplate, 
    downloadVoyageTemplate, 
    importCSVToDatabase, 
    previewVesselReport,
    uploadBulkVesselReport,
    uploadVoyageExcel,
    downloadBunkerTemplate, // NEW
    uploadBunkerExcel,      // NEW
    uploadVesselReportDirect, // NEW: Direct JSON upload
    fetchTemplateData,      // NEW: Fetch template data
    validateToken,          // NEW: Token validation
    getTokensByShip,        // NEW: Get tokens for ship
    revokeToken             // NEW: Revoke token
} from '../controllers/excelController.js'; 

// ESM setup for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router(); 

// --- 1. Standard Upload Configuration (Excel_Attachments) ---
const uploadDir = path.join(__dirname, '../public/uploads/Excel_Attachments/'); 
if (!fs.existsSync(uploadDir)) { 
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 50 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
            'application/vnd.ms-excel', 
            'text/csv'
        ];
        if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed!'), false);
        }
    }
});

// --- 2. Bulk Upload Configuration (Bulk_Uploads) ---
const bulkUploadDir = path.join(__dirname, '../public/uploads/Bulk_Uploads/');
if (!fs.existsSync(bulkUploadDir)) {
    fs.mkdirSync(bulkUploadDir, { recursive: true });
}

const bulkStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, bulkUploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadBulk = multer({
    storage: bulkStorage,
    limits: { fileSize: 1024 * 1024 * 50 }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.originalname.endsWith('.xlsx')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed for Bulk Upload!'), false);
        }
    }
});

// --- 3. Voyage Upload Configuration (Voyage_Uploads) ---
const voyageUploadDir = path.join(__dirname, '../public/uploads/Voyage_Uploads/');
if (!fs.existsSync(voyageUploadDir)) {
    fs.mkdirSync(voyageUploadDir, { recursive: true });
}

const voyageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, voyageUploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadVoyage = multer({
    storage: voyageStorage,
    limits: { fileSize: 1024 * 1024 * 50 }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.originalname.endsWith('.xlsx')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed for Voyage Upload!'), false);
        }
    }
});

// --- 4. Bunker Upload Configuration (Bunker) ---
const bunkerUploadDir = path.join(__dirname, '../public/uploads/Bunker/');
if (!fs.existsSync(bunkerUploadDir)) {
    fs.mkdirSync(bunkerUploadDir, { recursive: true });
}

const bunkerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, bunkerUploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadBunker = multer({
    storage: bunkerStorage,
    limits: { fileSize: 1024 * 1024 * 50 }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.originalname.endsWith('.xlsx')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed for Bunker Upload!'), false);
        }
    }
});


// RESOLUTION: Retain high payload limit for JSON submission
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Routes ---

router.get('/template/vesselreport', downloadVesselReportTemplate);
// Legacy/alias route for compatibility
router.get('/templates/vessel', downloadVesselReportTemplate);
router.get('/template/bulk-vesselreport', downloadBulkVesselReportTemplate); 
router.get('/template/voyage', downloadVoyageTemplate);
router.get('/template/bunker', downloadBunkerTemplate); // NEW
router.get('/template-data', fetchTemplateData); // NEW

// Standard Parse (Single Report)
router.post('/parse/vesselreport', upload.single('excelFile'), parseVesselReport);

// NEW: Direct JSON upload from Office add-in (no file upload)
router.post('/upload/vesselreport', uploadVesselReportDirect);

// Bulk Parse
router.post('/parse/bulk-vesselreport', uploadBulk.single('excelFile'), uploadBulkVesselReport);

// Voyage Parse
router.post('/parse/voyage', uploadVoyage.single('excelFile'), uploadVoyageExcel);

// Bunker Parse
router.post('/parse/bunker', uploadBunker.single('excelFile'), uploadBunkerExcel); // NEW

// Preview Route
router.post('/preview/vesselreport', previewVesselReport);

// Import Route
router.post('/import-csv-to-db', importCSVToDatabase);

// --- NEW: Token Management Routes ---
router.post('/token/validate', validateToken);
router.get('/tokens/ship/:shipId', getTokensByShip);
router.post('/token/revoke', revokeToken);


export default router;