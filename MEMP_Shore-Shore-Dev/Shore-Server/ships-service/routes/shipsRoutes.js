// Shore with user management/MEMP-Shore-Server/ships-service/routes/shipsRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
// UPDATED: Import fileUtils functions
import { vesselUploadsDir, fleetUploadsDir } from '../utils/fileUtils.js'; 
import {
  getAllShips,
  getShipById,
  createShip,
  updateShip,
  softDeleteShip,
  getShipDetailsById,
  getActiveShips,
  getShipTypes,
  getIceClasses,
  // NEW: Import Fleet Controllers
  getAllFleets as getAllFleetsController,
  getFleetById as getFleetByIdController,
  createFleet as createFleetController,
  updateFleet as updateFleetController,
  softDeleteFleet as softDeleteFleetController,
  // NEW: Vessel Mapping Controllers
  getShipsForMapping as getShipsForMappingController,
  mapVesselsToFleet as mapVesselsToFleetController,
  // NEW: Import the vessel location controller
  getVesselRecentLocations 
} from '../controllers/shipsController.js';

const router = express.Router();

// --- Multer Configuration for Ships (Vessels) ---
const vesselStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, vesselUploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const uploadVesselImage = multer({ storage: vesselStorage });

// --- Multer Configuration for Fleets (Logo) ---
const fleetStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, fleetUploadsDir);
    },
    filename: function (req, file, cb) {
        // Use a unique name for fleet logos
        cb(null, `fleet-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
});
const uploadFleetLogo = multer({ storage: fleetStorage });


// =========================================================
// FLEET MANAGEMENT ROUTES (NEW - MUST BE FIRST FOR /fleets)
// =========================================================

// NEW LOOKUP ROUTE: Must be before /fleets/:id
router.get('/fleets/ships-for-mapping', getShipsForMappingController); 

router.get('/fleets', getAllFleetsController);
router.get('/fleets/:id', getFleetByIdController); // This route uses :id
// NEW MAPPING ACTION ROUTE
router.post('/fleets/:id/map-vessels', mapVesselsToFleetController); 


// File upload for fleet logo: The field name should be 'logo'
router.post('/fleets', uploadFleetLogo.single('logo'), createFleetController);
router.put('/fleets/:id', uploadFleetLogo.single('logo'), updateFleetController);

router.delete('/fleets/:id', softDeleteFleetController); // Using DELETE for soft delete for consistency


// =========================================================
// SHIP (VESSEL) ROUTES (Existing)
// =========================================================

// NEW ROUTE: Fetch recent vessel locations
router.get('/recent-locations', getVesselRecentLocations);


router.get('/', getAllShips);
router.get('/active', getActiveShips);
router.get('/details/:id', getShipDetailsById);

router.get('/:id', getShipById); // Generic route for single ship ID (MUST BE LAST in this group)


router.post('/', uploadVesselImage.single('image'), createShip);
router.put('/:id', uploadVesselImage.single('image'), updateShip);

router.patch('/:id/inactive', softDeleteShip);

router.get('/metadata/shiptypes', getShipTypes);
router.get('/metadata/iceclasses', getIceClasses);


export default router;