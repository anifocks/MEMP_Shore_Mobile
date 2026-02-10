import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define the directory for bunker attachment uploads
export const bunkerUploadsDir = path.join(path.resolve(), 'public/uploads/bunker_attachments');

// Ensure the directory exists
fs.mkdirSync(bunkerUploadsDir, { recursive: true });

export const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, bunkerUploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bunker-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// NEW: Updated fileFilter to only accept PDF files
export const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        // Accept the file
        cb(null, true);
    } else {
        // Reject the file and provide an error message
        cb(new Error('Only PDF files are allowed for BDN documents!'), false);
    }
};