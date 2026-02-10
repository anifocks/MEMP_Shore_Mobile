// File: MEMP_Help/viswa-digital-backend/bunker-service/routes/bunkerRoutes.js
import express from 'express';
import * as bunkerController from '../controllers/bunkerController.js';
// UPDATED: Import multer and file utilities
import multer from 'multer';
import { fileStorage, fileFilter } from '../utils/bunkerFileUtils.js';

const router = express.Router();
// UPDATED: Configure multer middleware
const upload = multer({ storage: fileStorage, fileFilter: fileFilter });

router.get('/', bunkerController.getAllBunkers);
router.get('/vessel/:vesselId', bunkerController.getBunkersByVessel);
router.get('/details/:id', bunkerController.getBunkerById);
// UPDATED: Add multer middleware to handle file uploads
router.post('/', upload.array('attachments'), bunkerController.createBunker);
// UPDATED: Add multer middleware to handle file uploads
router.put('/:id', upload.array('attachments'), bunkerController.updateBunker);
router.put('/deactivate/:id', bunkerController.deactivateBunker);

// Example in bunkerRoutes.js
router.get('/lookup/next-bdn-number/:shipId', bunkerController.getNewBdnNumber);

// Lookup routes
router.get('/lookup/ships/active', bunkerController.getActiveShips);
router.get('/lookup/voyages/:shipId', bunkerController.getVoyagesByShip);
router.get('/lookup/voyage-legs/:voyageId', bunkerController.getVoyageLegsByVoyage); 
router.get('/lookup/sea-ports', bunkerController.getSeaPorts);
router.get('/lookup/fuel-types', bunkerController.getFuelTypes);
router.get('/lookup/lube-oil-types', bunkerController.getLubeOilTypes);
router.get('/lookup/vessel-tanks/:shipId', bunkerController.getVesselTanksForBunkering);

// NEW: Route to get the last recorded ROB
router.get('/lookup/last-rob', bunkerController.getLastROB);

// NEW: Routes for de-bunkering and correction
router.get('/lookup/bdn-numbers', bunkerController.getAllBdnNumbers);
router.get('/lookup/bdn-details/:bdnNumber', bunkerController.getBunkerDetailsByBdn);

// ADDED: New route to get attachments for a specific bunker record
router.get('/:bunkerRecordId/attachments', bunkerController.getBunkerAttachments);

// Lookup routes for BDN and ROB for additive service
router.get('/lookup/bdn', bunkerController.getBDNsForLookup);

router.get('/lookup/rob', bunkerController.getBDN_ROB);


export default router;