import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define the directory for voyage attachment uploads
export const voyageUploadsDir = path.join(path.resolve(), 'public/uploads/voyage_attachments');

// Ensure the directory exists
fs.mkdirSync(voyageUploadsDir, { recursive: true });

export const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, voyageUploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Using 'voyage' prefix and original extension
        cb(null, 'voyage-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter: Accept PDF, JPG, and PNG files for general voyage documents
export const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
        // Accept the file
        cb(null, true);
    } else {
        // Reject the file and provide an error message
        cb(new Error('Only PDF and image files (JPG/PNG) are allowed for Voyage documents!'), false);
    }
};