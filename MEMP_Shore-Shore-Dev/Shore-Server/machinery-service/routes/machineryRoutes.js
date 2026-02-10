import express from 'express';
import {
  getMachineryTypes,
  getMachineryForShip,
  assignMachineryToShip,
  updateShipMachinery,
  deleteShipMachinery,
  getFuelTypes,
  getFuelConsumers,
  getMachineryById,
  getMachineryAnalytics,
  getSFOCAnalytics,
  getMachineryPeriodSummary // 🟢 This was missing
} from '../controllers/machineryController.js';

const router = express.Router();

// 1. Lookups
router.get('/lookups/fuel-types', getFuelTypes);
router.get('/types', getMachineryTypes);

// 2. Ship Specific
router.get('/ship/:shipId', getMachineryForShip);
router.post('/ship/:shipId', assignMachineryToShip);

// 3. Consumers
router.get('/consumers/:shipId', getFuelConsumers);

// 4. Analytics & Period Data (Specific routes MUST be before generic /:id)
router.get('/period-summary', getMachineryPeriodSummary); // 🟢 Added for VesselMachineryDataPage
router.get('/:id/analytics', getMachineryAnalytics); 
router.get('/:id/sfoc', getSFOCAnalytics); 

// 5. Modifications
router.put('/:machineryRecordId', updateShipMachinery);
router.delete('/:machineryRecordId', deleteShipMachinery);

// 6. Generic ID lookup (MUST be last)
router.get('/:id', getMachineryById);

export default router;