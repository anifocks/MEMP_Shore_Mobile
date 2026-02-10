// viswa-digital-backend/voyage-service/routes/voyageRoutes.js
import express from 'express';
import {
    getAllVoyages,
    getVoyageById,
    createVoyage,
    updateVoyage,
    deleteVoyage,
    getVoyagesByShipId,
    getVoyageLegs,
    createVoyageLeg,
    updateVoyageLeg,
    getVoyageAttachments,
    downloadVoyageAttachment,
    getVoyageLegAttachments,
    deleteVoyageAttachment,
    getVoyageLegsByShipId,
    getNextVoyageNumber // ADDED: Import the new controller function
} from '../controllers/voyageController.js';
// UPDATED: Import multer and file utilities
import multer from 'multer';
import { fileStorage, fileFilter } from '../utils/voyageFileUtils.js';

const router = express.Router();
// UPDATED: Configure multer middleware
const upload = multer({ storage: fileStorage, fileFilter: fileFilter });

router.get('/', getAllVoyages);
// Route to get attachments for a specific voyage record (main header)
router.get('/:id/attachments', getVoyageAttachments);
// NEW: Route to soft-delete an attachment (used by both header and legs)
router.delete('/attachments/:id', deleteVoyageAttachment);
// Route for file download
router.get('/attachments/:attachmentId/download', downloadVoyageAttachment);
router.get('/details/:id', getVoyageById);

// NEW LOOKUP ROUTE: Auto-generation of Voyage Number (Matched to Frontend call)
router.get('/next-voyage-number/:shipId', getNextVoyageNumber); 

// UPDATED: Add multer middleware to handle file uploads for main voyage
router.post('/', upload.array('attachments'), createVoyage);
router.put('/:id', upload.array('attachments'), updateVoyage);
router.delete('/:id', deleteVoyage);

// UPDATED: Matched to Frontend 'VoyageManagementPage.jsx' call (/ship/:shipId)
router.get('/ship/:shipId', getVoyagesByShipId);

// Routes for Voyage Legs functionality
router.get('/:id/legs', getVoyageLegs);    // API to view all legs for a voyage

// UPDATED: Apply multer for file uploads on leg creation
router.post('/:id/legs', upload.array('attachments'), createVoyageLeg);

// UPDATED: Apply multer for file uploads on leg update
router.put('/legs/:legId', upload.array('attachments'), updateVoyageLeg);

// NEW: API to get attachments for a specific voyage leg
router.get('/legs/:legId/attachments', getVoyageLegAttachments);

// FIX 2: Removed the undefined 'voyageController' prefix and used the direct named import
router.get('/voyage-legs/by-ship/:shipId', getVoyageLegsByShipId);


export default router;