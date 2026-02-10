// Test Application/viswa-digital-backend/team-service/utils/fileUtils.js
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the directory where member images will be stored
// This path needs to be accessible by your web server (e.g., frontend server or API Gateway serving static files)
// For simplicity, we'll place it inside the team-service's public folder.
// Ensure 'public' and 'member_images' directories exist or are created.
const uploadDir = path.join(__dirname, '..', 'public', 'member_images');

// Ensure the upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate a unique filename: member-<memberId>-timestamp.ext
        const memberId = req.params.memberId || 'unknown'; // Get memberId from params
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `member-${memberId}-${uniqueSuffix}${ext}`);
    }
});

// Filter to allow only image files
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Configure multer upload middleware
export const uploadMemberImage = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB file size limit
    }
});

// Function to delete a file
export const deleteFile = async (filename) => {
    if (!filename || filename === 'default-member.png') { // Prevent deleting default image or null/empty
        return;
    }
    const filePath = path.join(uploadDir, filename);
    try {
        await fs.unlink(filePath);
        console.log(`[FILE_UTIL] Successfully deleted file: ${filePath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`[FILE_UTIL] File not found, skipping deletion: ${filePath}`);
        } else {
            console.error(`[FILE_UTIL] Error deleting file ${filePath}:`, error);
            throw error; // Re-throw if it's another error
        }
    }
};

// Add a default export for convenience if other modules use it this way
export default { uploadMemberImage, deleteFile };