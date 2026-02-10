// File: Shore-Server/reports-service/routes/reportingRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
// CRITICAL FIX: Ensure the import uses the correct functions for routing
import * as reportingController from '../controllers/reportingController.js';

const router = express.Router();

// Multer configuration for report document uploads (kept for consistency with project structure,
// but not used for report PUT/POST directly as we're using JSON)
const uploadDir = './public/uploads/reports';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const reportDocStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = file.originalname.replace(ext, '');
        cb(null, `${name}-${Date.now()}${ext}`);
    }
});
const reportDocUpload = multer({ storage: reportDocStorage });

// THIS IS THE MULTER INSTANCE FOR PARSING ONLY FIELDS (NO FILES) - also not used for JSON body
const noStorage = multer.memoryStorage();
const uploadNone = multer({ storage: noStorage });


// --- Lookup Routes (New and Existing) ---
// FIX: Added 'reportingController.' prefix to all handlers
router.get('/report-types', reportingController.getReportTypes);
router.get('/disposal-methods', reportingController.getDisposalMethods);
router.get('/lube-oil-types', reportingController.getLubeOilTypes);
router.get('/vessel-activities', reportingController.getVesselActivities);
router.get('/cargo-activities', reportingController.getCargoActivities);

router.get('/wind-directions', reportingController.getWindDirections);
router.get('/sea-states', reportingController.getSeaStates);
router.get('/swell-directions', reportingController.getSwellDirections);

// Existing routes (kept for reference)
router.get('/bunkering/lookup/fuel-types/:vesselId', reportingController.getFuelTypesByVessel);
router.get('/reporting/lube-oil-types/:vesselId', reportingController.getLubeOilTypesByVessel);

// -----------------------------------------------------------
// ROB FILTERING ROUTES
// -----------------------------------------------------------

// 1. Get Fuel Types with Positive ROB for a specific ship
router.get('/ship/:shipId/fuel-types-with-rob', reportingController.getFuelTypesWithPositiveRob);

// 2. Get BDN Numbers with Positive ROB for a specific ship and fuel type
router.get('/ship/:shipId/bdn-numbers-with-rob/:fuelTypeKey', reportingController.getBdnNumbersWithPositiveRob);

// 3. NEW: Get BDN Numbers with Positive ROB for a specific ship and Lube Oil type
router.get('/ship/:shipId/lo-bdn-rob/:loTypeKey', reportingController.getBdnNumbersWithPositiveRobByLubeOilType); 

// 4. Get Lube Oil Types with Positive ROB for a specific ship
router.get('/ship/:shipId/lube-oil-types-with-rob', reportingController.getLubeOilTypesWithPositiveRob);

// -----------------------------------------------------------
// VOYAGE SELECTION ROUTES (FIXED PATHS FOR FRONTEND)
// -----------------------------------------------------------

// NEW ROUTE 1 (Dropdown 1 FIX): Fetch Parent Voyages
// Fixes: GET /api/reporting/voyages/by-ship/:shipId/parents
router.get('/voyages/by-ship/:shipId/parents', reportingController.getVoyageParents); 

// NEW ROUTE 2 (Dropdown 2 FIX): Fetch Legs for a specific Parent Voyage ID
// Fixes: GET /api/reporting/voyages/by-voyage/:voyageId/legs
router.get('/voyages/by-voyage/:voyageId/legs', reportingController.getVoyageLegsByParent); 

// FIX: ADD MISSING ENDPOINT to resolve the 404 error from the frontend (calling /ship/:shipId/voyage-legs/unified)
// Maps the non-existent route to the existing controller that fetches initial voyage data.
router.get('/ship/:shipId/voyage-legs/unified', reportingController.getVoyageParents);


// --- Vessel Daily Report Master Routes ---

// Route for initial report creation - relies on global express.json()
router.post('/ship/:shipId/reports/initial', reportingController.createInitialReport);

router.get('/ship/:shipId/reports', reportingController.getReportsForShip);
router.get('/ship/:shipId/reports/latest', reportingController.getLastReportForShipController);
router.get('/reports/:reportId', reportingController.getFullReportById);
// NEW: Route to get the report immediately preceding a given report ID
router.get('/reports/preceding/:reportId', reportingController.getPrecedingReport);

// CRITICAL FIX: No multer middleware here. Relies on global express.json()
router.put('/reports/:reportId', reportingController.updateFullReport);

// NEW ROUTE (FIXED NAME): Dedicated endpoint for updating the report's voyage/port details
// Fixes frontend call of: /api/reporting/reports/:reportId/voyage-details
router.put('/reports/:reportId/voyage-details', reportingController.updateReportVoyageDetails);


router.put('/reports/:reportId/submit', reportingController.submitReport);
router.delete('/reports/:reportId', reportingController.deleteReport);

// 🚢 CRITICAL FIX: NEW ROUTE for map data - this must be defined!
// Handles: GET /api/reporting/latest-vessel-locations?fleetName=X (fleetName is optional)
router.get('/latest-vessel-locations', reportingController.fetchLatestVesselLocations);

// 🚢 NEW ROUTE: Fetch list of fleets for map filter dropdown
// Handles: GET /api/reporting/fleets
router.get('/fleets', reportingController.getFleets); 

// Latest Report for MEMP Overview Dashboard
router.get('/latest-vessel-reports', reportingController.fetchLatestVesselReports);

// 🟢 NEW: Get list of voyages for dropdown
router.get('/dashboard/voyage-list/:shipId', reportingController.getShipVoyageList);

// --- 🟢 NEW: Vessel Status Dashboard Routes ---
// Component 1: Aggregated stats for the latest voyage (Distance, Time, Fuel)
router.get('/dashboard/voyage-stats/:shipId', reportingController.getLatestVoyageStats);

// Component 2: Single latest submitted report snapshot
router.get('/dashboard/latest-snapshot/:shipId', reportingController.getLatestReportSnapshot);

// Vesel Emission dashboard
router.get('/dashboard/emissions-analytics/:shipId', reportingController.getVesselEmissionsAnalytics);

// --- Verifavia Report Generation ---
// @route   POST /preview/verifavia
// @desc    Preview Verifavia report data as JSON
router.post('/preview/verifavia', reportingController.previewVerifaviaReport);

// @route   POST /generate/verifavia
// @desc    Generate and download Verifavia Excel report
router.post('/generate/verifavia', reportingController.generateVerifaviaReport);

// @route   POST /calculate/cii
// @desc    Calculate CII rating for a vessel
router.post('/calculate/cii', reportingController.calculateCiiReport);

// --- EU MRV Report Generation ---
// @route   POST /preview/eumrv
// @desc    Preview EU MRV report data as JSON (Daily Reports, Voyages Aggregator, Annual Aggregator)
router.post('/preview/eumrv', reportingController.previewEuMrvReport);

// @route   POST /generate/eumrv
// @desc    Generate and download EU MRV Excel report
router.post('/generate/eumrv', reportingController.generateEuMrvReport);

// --- EU ETS Report Generation ---
// @route   POST /preview/euets
// @desc    Preview EU ETS report data as JSON (MRV Voyage Summary, EU ETS Voyage Summary, EU ETS Aggregator)
router.post('/preview/euets', reportingController.previewEuEtsReport);

// @route   POST /generate/euets
// @desc    Generate and download EU ETS Excel report
router.post('/generate/euets', reportingController.generateEuEtsReport);

// --- UK MRV Report Generation ---
// @route   POST /preview/ukmrv
// @desc    Preview UK MRV report data as JSON (UK MRV Basic Data, UK MRV Voyage Summary, UK Annual Aggregator)
router.post('/preview/ukmrv', reportingController.previewUkMrvReport);

// @route   POST /generate/ukmrv
// @desc    Generate and download UK MRV Excel report
router.post('/generate/ukmrv', reportingController.generateUkMrvReport);

// --- UK ETS Report Generation ---
// @route   POST /preview/ukets
// @desc    Preview UK ETS report data as JSON (UK MRV Voyage Summary, UK ETS Voyage Summary, UK ETS Aggregator)
router.post('/preview/ukets', reportingController.previewUkEtsReport);

// @route   POST /generate/ukets
// @desc    Generate and download UK ETS Excel report
router.post('/generate/ukets', reportingController.generateUkEtsReport);

export default router;