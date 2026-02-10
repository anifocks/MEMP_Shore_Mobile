// viswa-digital-backend/ships-service/utils/fileUtils.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the base directory for vessel image uploads (Existing)
export const vesselUploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'vessel_images');

// NEW: Define the base directory for fleet logo uploads
export const fleetUploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'fleet_logos');

/**
 * Ensures that the upload directory for vessel images exists.
 * If it doesn't exist, it creates the directory recursively.
 */
export const ensureVesselUploadsDirectoryExists = () => {
  if (!fs.existsSync(vesselUploadsDir)) {
    try {
      fs.mkdirSync(vesselUploadsDir, { recursive: true });
      console.log(`[ShipsService FileUtils] Created directory: ${vesselUploadsDir}`);
    } catch (err) {
      console.error(`[ShipsService FileUtils] Error creating directory ${vesselUploadsDir}:`, err);
    }
  }
};

/**
 * NEW: Ensures that the upload directory for fleet logos exists.
 * If it doesn't exist, it creates the directory recursively.
 */
export const ensureFleetUploadsDirectoryExists = () => {
  if (!fs.existsSync(fleetUploadsDir)) {
    try {
      fs.mkdirSync(fleetUploadsDir, { recursive: true });
      console.log(`[ShipsService FileUtils] Created directory: ${fleetUploadsDir}`);
    } catch (err) {
      console.error(`[ShipsService FileUtils] Error creating directory ${fleetUploadsDir}:`, err);
    }
  }
};

/**
 * NEW: General utility function to delete a file.
 * @param {string} filename - The name of the file to delete.
 * @param {string} directory - The directory path where the file is located.
 */
export const deleteFile = (filename, directory) => {
    if (!filename) return;

    const filePath = path.join(directory, filename);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`[ShipsService FileUtils] Successfully deleted file: ${filePath}`);
        } catch (error) {
            console.error(`[ShipsService FileUtils] Error deleting file ${filePath}:`, error);
        }
    }
};