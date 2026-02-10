// viswa-digital-backend/task-service/routes/taskRoutes.js
import express from 'express';
import * as taskController from '../controllers/taskController.js';
import multer from 'multer';
import { fileStorage, fileFilter } from '../utils/fileUtils.js';

const router = express.Router();
const upload = multer({ storage: fileStorage, fileFilter: fileFilter });

const logHeaders = (routeName) => (req, res, next) => {
    console.log(`\n[TaskRoutes] Incoming request for ${req.method} ${routeName}`);
    next();
};

router.get('/statuses', logHeaders('/statuses'), taskController.getTaskStatuses);
router.get('/products', logHeaders('/products'), taskController.getProducts);
router.get('/', logHeaders('/'), taskController.getAllTasks);
router.get('/bymember/:memberId', logHeaders('/bymember/:memberId'), taskController.getMemberTasks);
router.get('/bymember/:memberId/export', logHeaders('/bymember/:memberId/export'), taskController.exportMemberTasks);
router.get('/:taskId', logHeaders('/:taskId'), taskController.getTaskById);

// NEW: Route to get attachments for a specific task
router.get('/:taskId/attachments', logHeaders('/:taskId/attachments'), taskController.getTaskAttachments);

// UPDATED: Use upload.array() to handle multiple attachments with a single field name
router.post('/', upload.array('attachments'), taskController.createTask);
router.put('/:taskId', upload.array('attachments'), taskController.updateTask);

export default router;