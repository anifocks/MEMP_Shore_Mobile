// viswa-digital-backend/task-service/utils/fileUtils.js
import multer from 'multer';
import path from 'path';
import { taskUploadsDir } from './db.js';

// Multer storage configuration
export const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, taskUploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        // Naming convention: task-[timestamp]-[random_number].[ext]
        cb(null, 'task-' + uniqueSuffix + fileExtension);
    }
});

// Multer file filter is removed to allow all file types.
export const fileFilter = (req, file, cb) => {
    cb(null, true);
};