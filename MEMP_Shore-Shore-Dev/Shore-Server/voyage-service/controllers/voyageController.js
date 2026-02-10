// viswa-digital-backend/voyage-service/controllers/voyageController.js
import * as VoyageModel from '../models/voyageModel.js';
// NEW: Imports for file handling
import fs from 'fs';
import path from 'path';
import { voyageUploadsDir } from '../utils/voyageFileUtils.js';

// Function to handle file cleanup on error
const cleanupFiles = (uploadedFiles) => {
    if (uploadedFiles && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
            // Note: The file's unique name is in file.filename
            fs.unlink(path.join(voyageUploadsDir, file.filename), (err) => {
                if (err) console.error(`Failed to delete file: ${file.filename}`, err);
            });
        }
    }
};

// NEW HELPER FUNCTION: To safely parse numeric and date fields from strings ('', 'undefined') to null.
const cleanVoyageData = (rawBody, isCreate = false) => {
// ... (rest of cleanVoyageData function remains unchanged)
    // Helper to return null if value is empty string, undefined, or null
    const nullIfEmpty = (value) => (value === '' || value === undefined || value === null) ? null : value;
    
    // Safely parse numbers, ensuring empty string becomes null, and allowing 0 to pass.
    const safeParseFloat = (value) => {
        const cleaned = nullIfEmpty(value);
        return cleaned === null ? null : parseFloat(cleaned);
    };

    const safeParseInt = (value) => {
        const cleaned = nullIfEmpty(value);
        return cleaned === null ? null : parseInt(cleaned, 10);
    };

    const ShipID = safeParseInt(rawBody.ShipID);

    const voyageData = {
        // Copy all string fields directly first
        ...rawBody,

        // Apply cleaning and parsing for DB-specific types
        ShipID: ShipID,
        
        // Date/Time fields (must be null if empty string)
        ETD_UTC: nullIfEmpty(rawBody.ETD_UTC),
        ATD_UTC: nullIfEmpty(rawBody.ATD_UTC),
        ETA_UTC: nullIfEmpty(rawBody.ETA_UTC),
        ATA_UTC: nullIfEmpty(rawBody.ATA_ATA), // This was correct for cleanVoyageData, but was ATA_UTC in the request body.

        // Numeric fields (must be null if empty string, explicitly parse)
        DistancePlannedNM: safeParseFloat(rawBody.DistancePlannedNM),
        DistanceSailedNM: safeParseFloat(rawBody.DistanceSailedNM),
        CargoWeightMT: safeParseFloat(rawBody.CargoWeightMT),
        
        // Internal fields
        LastLegNumber: isCreate ? 0 : safeParseInt(rawBody.LastLegNumber),
        // Handle boolean field passed as string
        IsActive: rawBody.IsActive === 'true' || rawBody.IsActive === true || rawBody.IsActive === 1 || rawBody.IsActive === '1', 
        
        // Audit fields
        CreatedBy: rawBody.CreatedBy || (isCreate ? 'System_Create' : undefined),
        ModifiedBy: rawBody.ModifiedBy || (isCreate ? undefined : 'System_Update')
    };

    // Final check to ensure no rogue empty strings remain
    for (const key in voyageData) {
        if (voyageData[key] === '') {
            voyageData[key] = null;
        }
    }

    return voyageData;
};


export const getAllVoyages = async (req, res) => {
  try {
    const voyages = await VoyageModel.fetchAllVoyages();
    res.status(200).json(voyages);
  } catch (error) {
    console.error('Error fetching all voyages:', error);
    res.status(500).json({ message: 'Failed to retrieve voyages.' });
  }
};

// MODIFIED: Controller to fetch voyage details and all legs/port coordinates
export const getVoyageById = async (req, res) => {
// ... (rest of function remains unchanged)
  try {
    const { id } = req.params;
    
    // 1. Fetch main voyage details (now includes main port coordinates)
    const voyage = await VoyageModel.fetchVoyageDetailsById(id);
    if (!voyage) {
      return res.status(404).json({ message: 'Voyage not found.' });
    }

    // 2. Fetch all legs with coordinates (NEW)
    const voyageLegs = await VoyageModel.fetchVoyageLegsByVoyageId(id);

    // 3. Combine and return
    res.status(200).json({ ...voyage, voyageLegs });

  } catch (error) {
    console.error('Error fetching voyage by ID:', error);
    res.status(500).json({ message: 'Failed to retrieve voyage details.' });
  }
};

// MODIFIED: Controller to fetch parent voyages by ShipID
export const getVoyagesByShipId = async (req, res) => {
// ... (rest of function remains unchanged)
  try {
    const { shipId } = req.params; 
    if (!shipId) {
      return res.status(400).json({ message: 'Ship ID is required.' });
    }
    // This fetches the Parent Voyage Records (MEMP_Voyages)
    const voyages = await VoyageModel.fetchVoyagesByShipId(shipId); 
    res.status(200).json(voyages);
  } catch (error) {
    console.error('Error fetching voyages by ship ID:', error);
    res.status(500).json({ message: 'Failed to retrieve voyages for the selected ship.' });
  }
};

// NEW: Controller to fetch ALL active Voyage LEGS by ShipID (Fixes 404)
export const getVoyageLegsByShipId = async (req, res) => {
// ... (rest of function remains unchanged)
  try {
    const { shipId } = req.params; 
    if (!shipId) {
      return res.status(400).json({ message: 'Ship ID is required.' });
    }
    // This fetches the individual Voyage Leg Records (MEMP_VoyageLegs)
    const legs = await VoyageModel.fetchActiveVoyageLegsByShipId(shipId); 
    res.status(200).json(legs);
  } catch (error) {
    console.error('Error fetching voyage legs by ship ID:', error);
    res.status(500).json({ message: 'Failed to retrieve voyage legs.' });
  }
};

// NEW: Controller to fetch legs for a voyage (viewing option)
export const getVoyageLegs = async (req, res) => {
// ... (rest of function remains unchanged)
  try {
    const { id } = req.params; // VoyageID
    // IMPORTANT: This now returns legs WITH coordinates, but the map logic relies on getVoyageById.
    const legs = await VoyageModel.fetchVoyageLegsByVoyageId(id);
    res.status(200).json(legs);
  } catch (error) {
    console.error(`Error fetching voyage legs for voyage ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to retrieve voyage legs.' });
  }
};

// **MODIFIED:** Now handles file uploads for leg creation
export const createVoyageLeg = async (req, res) => {
// ... (rest of function remains unchanged)
  let uploadedFiles = req.files || [];
  try {
    const { id } = req.params; // VoyageID
    // Ensure all variables that might be used are destructured or accessed safely
    const { 
      lastLegNumber, 
      voyageNumber, 
      departurePortCode,
      ArrivalPortCode, 
      ETD_UTC, ETA_UTC, ATD_UTC, ATA_UTC, // Corrected variable names
      CargoDescription, CargoWeightMT
    } = req.body;

    if (!lastLegNumber || !voyageNumber || !departurePortCode) {
        cleanupFiles(uploadedFiles);
        return res.status(400).json({ message: 'lastLegNumber, voyageNumber, and departurePortCode are required to create a new leg.' });
    }

    // Prepare optional details with proper null handling
    const optionalDetails = { 
      ETD_UTC: ETD_UTC || null, 
      ETA_UTC: ETA_UTC || null, 
      ATD_UTC: ATD_UTC || null, 
      ATA_UTC: ATA_UTC || null, 
      CargoDescription: CargoDescription || null, 
      CargoWeightMT: parseFloat(CargoWeightMT) || null 
    };

    const newLegId = await VoyageModel.addVoyageLeg(
        Number(id), 
        Number(lastLegNumber), 
        voyageNumber, 
        departurePortCode,
        ArrivalPortCode || null, // Pass the explicit ArrivalPortCode
        optionalDetails // Pass optional details
    );
    
    // NEW LOGIC: Save attachments for the newly created leg
    if (newLegId && uploadedFiles.length > 0) {
        // Fetch metadata reliably from the model (VoyageNumber/ShipID) using the parent Voyage ID
        const metadata = await VoyageModel.fetchVoyageAttachmentMetadata(id);
        const { ShipID, VoyageNumber } = metadata; 

        for (const file of uploadedFiles) {
            const attachmentData = {
                VoyageID: Number(id), // Parent Voyage ID
                VoyageLegID: newLegId, // <-- Associate with the new leg ID
                FilePath: file.filename,
                OriginalName: file.originalname,
                MimeType: file.mimetype,
                ShipID: ShipID,
                VoyageNumber: VoyageNumber
            };
            await VoyageModel.createVoyageAttachmentInDB(attachmentData);
        }
    }
    
    res.status(201).json({ message: 'Voyage leg created successfully.', voyageLegId: newLegId });
  } catch (error) {
    console.error(`Error creating new voyage leg for voyage ID ${req.params.id}:`, error);
    cleanupFiles(uploadedFiles);
    res.status(500).json({ message: 'Failed to create voyage leg.' });
  }
};

// MODIFIED: Controller to update a voyage leg, now handles files
export const updateVoyageLeg = async (req, res) => {
// ... (rest of function remains unchanged)
  let uploadedFiles = req.files || []; 
  try {
    const { legId } = req.params; 
    if (!legId) {
        cleanupFiles(uploadedFiles);
        return res.status(400).json({ message: 'Voyage Leg ID is required for update.' });
    }
    
    // Prepare body for model, ensuring fields are nullable
    const rawBody = req.body;
    const legData = {
        ArrivalPortCode: rawBody.ArrivalPortCode || null,
        ETD_UTC: rawBody.ETD_UTC || null,
        ATD_UTC: rawBody.ATD_UTC || null,
        ETA_UTC: rawBody.ETA_UTC || null,
        ATA_UTC: rawBody.ATA_ATA || null,
        CargoDescription: rawBody.CargoDescription || null,
        CargoWeightMT: parseFloat(rawBody.CargoWeightMT) || null,
        IsActive: rawBody.IsActive === 'true' || rawBody.IsActive === true || rawBody.IsActive === 1 || rawBody.IsActive === '1', 
    };

    // Update the core leg record
    await VoyageModel.modifyVoyageLeg(legId, legData); 

    // NEW LOGIC: Save attachments for the updated leg
    if (uploadedFiles.length > 0) {
        // Fetch metadata (VoyageID, ShipID, VoyageNumber) from the updated leg
        const legDetails = await VoyageModel.fetchVoyageLegDetails(legId); 
        if (!legDetails) {
             throw new Error(`Voyage Leg ID ${legId} not found for attachment processing.`);
        }
        const { VoyageID, ShipID, VoyageNumber } = legDetails;

        for (const file of uploadedFiles) {
            const attachmentData = {
                VoyageID: VoyageID, 
                VoyageLegID: Number(legId), // <-- Associate with the updated leg ID
                FilePath: file.filename, 
                OriginalName: file.originalname,
                MimeType: file.mimetype,
                ShipID: ShipID,
                VoyageNumber: VoyageNumber
            };
            await VoyageModel.createVoyageAttachmentInDB(attachmentData);
        }
    }
    
    res.status(200).json({ message: 'Voyage leg updated successfully.' });
  } catch (error) {
    console.error(`Error updating voyage leg ID ${req.params.legId}:`, error);
    cleanupFiles(uploadedFiles);
    res.status(500).json({ message: 'Failed to update voyage leg.' });
  }
};

// NEW: Controller function to get the next auto-generated Voyage Number
export const getNextVoyageNumber = async (req, res) => {
    try {
        const { shipId } = req.params;
        const shipID = parseInt(shipId, 10);
        if (isNaN(shipID)) {
            return res.status(400).json({ message: 'Invalid Ship ID is required.' });
        }
        const nextVoyageNumber = await VoyageModel.fetchNextVoyageNumber(shipID);
        if (nextVoyageNumber) {
            res.status(200).json({ VoyageNumber: nextVoyageNumber });
        } else {
            res.status(404).json({ message: 'Vessel Short Name not found or unable to generate Voyage Number.' });
        }
    } catch (error) {
        console.error('Error in getNextVoyageNumber:', error);
        res.status(500).json({ message: 'Error generating new Voyage Number', error: error.message });
    }
};

export const createVoyage = async (req, res) => {
// ... (rest of function remains unchanged)
  // ADDED: Get uploaded files from the request
  let uploadedFiles = req.files || [];
  try {
    const rawBody = req.body;
    
    // --- ADDED: Auto-generate Voyage Number if missing in payload ---
    if (!rawBody.VoyageNumber || rawBody.VoyageNumber.trim() === '') {
        const shipID = parseInt(rawBody.ShipID, 10);
        if (!isNaN(shipID)) {
            const nextNum = await VoyageModel.fetchNextVoyageNumber(shipID);
            if (nextNum) {
                rawBody.VoyageNumber = nextNum;
            } else {
                throw new Error("Failed to auto-generate Voyage Number. Please enter manually.");
            }
        }
    }

    // 1. Prepare data for model with robust cleaning
    const voyageData = cleanVoyageData(rawBody, true); // Pass true for isCreate

    // The insertVoyage model function is modified to only create the voyage header
    const newVoyageId = await VoyageModel.insertVoyage(voyageData); // Use cleaned data

    // ADDED: Loop through uploaded files and save metadata to DB
    if (newVoyageId && uploadedFiles.length > 0) {
        // CRITICAL FIX: Fetch metadata reliably from the DB. Use the ShipID and VoyageNumber
        // from the cleaned data since we assume they are present due to validation.
        const { ShipID, VoyageNumber } = voyageData;
        
        for (const file of uploadedFiles) {
            const attachmentData = {
                VoyageID: newVoyageId,
                VoyageLegID: null, // Attachments for the main voyage header should have NULL LegID
                FilePath: file.filename, // Store unique filename in FilePath column
                OriginalName: file.originalname,
                MimeType: file.mimetype,
                ShipID: ShipID, // Use reliable data
                VoyageNumber: VoyageNumber // Use reliable data
            };
            await VoyageModel.createVoyageAttachmentInDB(attachmentData);
        }
    }

    res.status(201).json({ message: 'Voyage created successfully. Initial legs must be defined via edit flow.', voyageId: newVoyageId });
  } catch (error) {
    console.error('Error creating voyage:', error);
    // ADDED: Clean up uploaded files if an error occurs
    cleanupFiles(uploadedFiles); 
    res.status(500).json({ message: 'Failed to create voyage.' });
  }
};

export const updateVoyage = async (req, res) => {
// ... (rest of function remains unchanged)
  // ADDED: Get uploaded files from the request
  let uploadedFiles = req.files || [];
  try {
    const { id } = req.params;
    const rawBody = req.body; // rawBody fields are strings from multipart/form-data

    // 1. Prepare data for model with robust cleaning
    const voyageData = cleanVoyageData(rawBody, false); // Pass false for isCreate
    
    // 2. Update the main voyage record
    await VoyageModel.modifyVoyage(id, voyageData);

    // 3. Attachment logic: Runs only if the voyage update was successful
    if (uploadedFiles.length > 0) {
        // CRITICAL FIX: Fetch required metadata reliably from the DB
        // This prevents the TypeError: Cannot read properties of undefined (reading 'ShipID')
        const metadata = await VoyageModel.fetchVoyageAttachmentMetadata(id);
        if (!metadata) {
             throw new Error(`Voyage ID ${id} not found for attachment processing.`);
        }
        const { ShipID, VoyageNumber } = metadata;

        for (const file of uploadedFiles) {
            const attachmentData = {
                VoyageID: parseInt(id, 10),
                VoyageLegID: null, // Attachments for the main voyage header should have NULL LegID
                FilePath: file.filename, // Store unique filename in FilePath column
                OriginalName: file.originalname,
                MimeType: file.mimetype,
                ShipID: ShipID, // Use reliable data fetched from DB
                VoyageNumber: VoyageNumber // Use reliable data fetched from DB
            };
            await VoyageModel.createVoyageAttachmentInDB(attachmentData);
        }
    }

    res.status(200).json({ message: 'Voyage updated successfully.' });
  } catch (error) {
    console.error('Error updating voyage:', error);
    // ADDED: Clean up uploaded files if an error occurs
    cleanupFiles(uploadedFiles);
    res.status(500).json({ message: 'Failed to update voyage.' });
  }
};

export const deleteVoyage = async (req, res) => {
// ... (rest of function remains unchanged)
  try {
    const { id } = req.params;
    await VoyageModel.softDeleteVoyage(id);
    res.status(200).json({ message: 'Voyage deactivated successfully.' });
  } catch (error) {
    console.error('Error deactivating voyage:', error);
    res.status(500).json({ message: 'Failed to deactivate voyage.' });
  }
};

// NEW: Controller to soft-delete an attachment (for both header and legs)
export const deleteVoyageAttachment = async (req, res, next) => {
// ... (rest of function remains unchanged)
    const { id } = req.params; // This is the Attachment_Id
    const attachmentId = parseInt(id, 10);
    
    if (isNaN(attachmentId)) {
        return res.status(400).json({ error: "Invalid attachment ID" });
    }
    
    try {
        await VoyageModel.softDeleteVoyageAttachment(attachmentId);
        res.status(200).json({ message: "Attachment deleted successfully." });
    } catch (err) {
        console.error(`[VoyageService Controller] Error in deleteVoyageAttachment (ID: ${attachmentId}):`, err);
        next(err);
    }
};

// NEW: Controller function to get attachments for a voyage record (main header only)
export const getVoyageAttachments = async (req, res, next) => {
// ... (rest of function remains unchanged)
    const { id } = req.params; // VoyageID
    const voyageId = parseInt(id, 10);
    if (isNaN(voyageId)) {
        return res.status(400).json({ error: "Invalid voyage ID" });
    }
    try {
        // Fetches attachments where VoyageLegID IS NULL
        const attachments = await VoyageModel.getVoyageAttachmentsFromDB(voyageId);
        res.json(attachments);
    } catch (err) {
        console.error(`[VoyageService Controller] Error in getVoyageAttachments (ID: ${voyageId}):`, err);
        next(err);
    }
};

// NEW: Controller function to get attachments for a voyage leg record
export const getVoyageLegAttachments = async (req, res, next) => {
// ... (rest of function remains unchanged)
    const { legId } = req.params; 
    const voyageLegId = parseInt(legId, 10);
    if (isNaN(voyageLegId)) {
        return res.status(400).json({ error: "Invalid voyage leg ID" });
    }
    try {
        const attachments = await VoyageModel.getVoyageAttachmentsByLegId(voyageLegId); 
        res.json(attachments);
    } catch (err) {
        console.error(`[VoyageService Controller] Error in getVoyageLegAttachments (ID: ${voyageLegId}):`, err);
        next(err);
    }
};


// NEW: Controller function to handle file download 
export const downloadVoyageAttachment = async (req, res) => {
// ... (rest of function remains unchanged)
    const { attachmentId } = req.params;
    const attId = parseInt(attachmentId, 10);

    if (isNaN(attId)) {
        return res.status(400).json({ message: 'Invalid attachment ID.' });
    }

    try {
        const attachment = await VoyageModel.getAttachmentDetailsForDownload(attId);
        if (!attachment) {
            return res.status(404).json({ message: 'Attachment not found.' });
        }

        const filePath = path.join(voyageUploadsDir, attachment.FilePath);

        // Check if file exists on disk
        if (!fs.existsSync(filePath)) {
            console.error(`File not found on disk: ${filePath}`);
            return res.status(404).json({ message: 'File not found on server.' });
        }

        // Use res.download to send the file with the original name
        res.download(filePath, attachment.OriginalName, (err) => {
            if (err) {
                console.error(`Error downloading file ${attachment.FilePath}:`, err);
                // Handle error, but don't expose internal path info
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Failed to download file.' });
                }
            }
        });

    } catch (error) {
        console.error(`Error downloading voyage attachment ID ${attachmentId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve attachment for download.' });
    }
};