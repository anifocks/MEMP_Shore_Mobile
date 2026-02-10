import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDirRelative = '../public/uploads/report_attachments';
const uploadDir = path.join(__dirname, uploadDirRelative);

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const reportAttachmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Filename format: report-timestamp-randomnumber.ext
        const ext = path.extname(file.originalname);
        // Note: Filename generation is simplified here to avoid path issues
        cb(null, `report-${Date.now()}-${Math.floor(Math.random() * 1000000000)}${ext}`);
    }
});

// Middleware for handling file uploads (single file per request)
export const reportAttachmentUpload = multer({
    storage: reportAttachmentStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});


/**
 * Deletes a file from the server's file system.
 * @param {string} filePath - The file path to delete (stored in the database, e.g., 'public/uploads/report_attachments/file.pdf').
 * @returns {Promise<boolean>} - True if deletion was successful or file did not exist, false on error.
 */
export const deleteReportAttachmentFile = (filePath) => {
    return new Promise((resolve, reject) => {
        // Go up from utils/ to reports-service/
        // NOTE: The database stores the path relative to the reports-service root (e.g., 'public/...')
        const serviceRoot = path.join(path.dirname(__dirname), '..'); 
        const fullPath = path.join(serviceRoot, filePath); 
        
        // Check if file exists
        if (fs.existsSync(fullPath)) {
            fs.unlink(fullPath, (err) => {
                if (err) {
                    console.error("[ReportFileUtils] Error deleting file:", err);
                    return resolve(false); 
                }
                resolve(true);
            });
        } else {
            console.log(`[ReportFileUtils] File not found on disk, skipping delete: ${fullPath}`);
            resolve(true);
        }
    });
};

/**
 * Utility to construct a relative web path for the client to access the file.
 * @param {string} filePath - The file path stored in the database (e.g., 'public/uploads/report_attachments/file.pdf').
 * @returns {string} - The public URL path (e.g., '/uploads/report_attachments/file.pdf').
 */
export const getReportAttachmentPublicPath = (filePath) => {
    // The server is configured to serve /uploads static route from public/uploads.
    // The database path is 'public/uploads/report_attachments/...'
    if (filePath && filePath.startsWith('public')) {
        // Find the index of 'uploads' and slice from there to get '/uploads/...'
        const uploadsIndex = filePath.indexOf('uploads');
        if (uploadsIndex !== -1) {
             return '/' + filePath.substring(uploadsIndex);
        }
    }
    return '';
};