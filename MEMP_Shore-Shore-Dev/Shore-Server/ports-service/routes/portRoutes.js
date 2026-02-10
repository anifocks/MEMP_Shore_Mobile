// viswa-digital-backend/ports-service/routes/portRoutes.js
import express from 'express';
import { getAllPorts, getPortById, createPort, updatePort, softDeletePort, getFilteredPortNames, getPortByCode } from '../controllers/portController.js';

const router = express.Router();

router.get('/', getAllPorts);
router.get('/names-only', getFilteredPortNames); // NEW: Route for fetching only port names
router.get('/by-code/:portCode', getPortByCode); // NEW: Route for fetching port by PortCode
router.get('/:portId', getPortById);
router.post('/', createPort);
router.put('/:portId', updatePort);
router.delete('/:portId', softDeletePort); // Soft delete via PUT

export default router;