import express from 'express';
import {
  getAllTanks,
  getTanksByVessel,
  getTankDetails,
  createTank,
  updateTank,
  deactivateTank,
  getCurrentQuantitiesForTanks, // NEW: Import the new controller
  getTankDefinitions,
  getFuelTypes,
  getWaterTypes,
  getLubeOilTypes,
  getOilyResidueTypes
} from '../controllers/tankController.js';

const router = express.Router();

// Existing routes
router.get('/', getAllTanks);
router.get('/by-vessel/:vesselId', getTanksByVessel);
router.get('/details/:id', getTankDetails); // Ensure this path is correct for fetching details

// Tank Management CRUD
router.post('/', createTank);
router.put('/:id', updateTank);
router.patch('/:id/deactivate', deactivateTank);

// NEW: Route to fetch current quantities for a list of tank IDs
router.post('/current-quantities', getCurrentQuantitiesForTanks);

// Metadata routes
router.get('/metadata/definitions', getTankDefinitions);
router.get('/metadata/content-types/fuel', getFuelTypes);
router.get('/metadata/content-types/water', getWaterTypes);
router.get('/metadata/content-types/lubeoil', getLubeOilTypes);
router.get('/metadata/content-types/oilyresidue', getOilyResidueTypes);


export default router;