import express from 'express';
// 🟢 FIXED IMPORT LINE BELOW: Added getBDNAvailableQty
import { getAdditiveTypes, getDosingEvents, createEvent, deleteEvent, updateEvent, getBDNAvailableQty, getConsumptionAudit } from '../controllers/additiveController.js';

const router = express.Router();

/**
 * @swagger
 * /types:
 * get:
 * summary: Retrieve a list of additive types
 * tags: [Additive]
 */
router.get('/types', getAdditiveTypes);

/**
 * @swagger
 * /ship/{shipId}:
 * get:
 * summary: Get dosing events for a specific ship
 * tags: [Additive]
 */
router.get('/ship/:shipId', getDosingEvents);

/**
 * @swagger
 * /event:
 * post:
 * summary: Create a new dosing event
 * tags: [Additive]
 */
router.post('/event', createEvent);

/**
 * @swagger
 * /event/{id}:
 * put:
 * summary: Update an existing dosing event
 * tags: [Additive]
 */
router.put('/event/:id', updateEvent);

/**
 * @swagger
 * /event/{id}:
 * delete:
 * summary: Soft delete a dosing event
 * tags: [Additive]
 */
router.delete('/event/:id', deleteEvent);

/**
 * @swagger
 * /bdn-availability:
 * get:
 * summary: Get real-time available ROB for a BDN
 * tags: [Additive]
 */
router.get('/bdn-availability', getBDNAvailableQty);

/**
 * @swagger
 * /audit/{id}:
 * get:
 * summary: Get consumption audit trail for a dosing event
 * tags: [Additive]
 */
router.get('/audit/:id', getConsumptionAudit);

import { getDashboardStats } from '../controllers/additiveController.js';
router.get('/dashboard', getDashboardStats);

import { getDosingReferences // 🟢 Import this new function
} from '../controllers/additiveController.js';
/**
 * @swagger
 * /references:
 * get:
 * summary: Get list of unique Dosing Reference IDs
 * tags: [Additive]
 */
router.get('/references', getDosingReferences);

export default router;