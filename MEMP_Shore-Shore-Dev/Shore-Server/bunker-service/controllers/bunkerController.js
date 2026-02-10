// File: MEMP_Help/viswa-digital-backend/bunker-service/controllers/bunkerController.js
import * as bunkerModel from '../models/bunkerModel.js';
import fs from 'fs';
import path from 'path';
import { bunkerUploadsDir } from '../utils/bunkerFileUtils.js';

export const getAllBunkers = async (req, res) => {
  try {
    const bunkers = await bunkerModel.fetchAllBunkers();
    res.status(200).json(bunkers);
  } catch (error) {
    console.error('Error in getAllBunkers:', error);
    res.status(500).json({ message: 'Error fetching bunkers', error: error.message });
  }
};

export const getBunkersByVessel = async (req, res) => {
  try {
    const { vesselId } = req.params;
    if (!vesselId) {
      return res.status(400).json({ message: 'Vessel ID is required.' });
    }
    const bunkers = await bunkerModel.fetchBunkersByVesselId(vesselId);
    res.status(200).json(bunkers);
  } catch (error) {
    console.error('Error in getBunkersByVessel:', error);
    res.status(500).json({ message: 'Error fetching bunkers for vessel', error: error.message });
  }
};

export const getBunkerById = async (req, res) => {
  try {
    const { id } = req.params;
    const bunkerRecordId = parseInt(id, 10);
    if (isNaN(bunkerRecordId)) {
        console.error(`Invalid BunkerRecordID received: ${id}`);
        return res.status(400).json({ message: 'Invalid Bunker Record ID provided. Must be a number.' });
    }
    const bunker = await bunkerModel.fetchBunkerDetailsById(bunkerRecordId);
    if (bunker) {
      res.status(200).json(bunker);
    } else {
      res.status(404).json({ message: 'Bunker record not found.' });
    }
  } catch (error) {
    console.error('Error in getBunkerById:', error);
    res.status(500).json({ message: 'Error fetching bunker details', error: error.message });
  }
};

export const createBunker = async (req, res, next) => {
  // ADDED: Get uploaded files from the request
  let uploadedFiles = req.files || [];
  try {
    const newBunkerId = await bunkerModel.insertBunker(req.body);
    // ADDED: Loop through uploaded files and save metadata to DB
    if (newBunkerId && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
            const attachmentData = {
                bunkerRecordId: newBunkerId,
                filename: file.filename,
                originalname: file.originalname,
                mimetype: file.mimetype
            };
            await bunkerModel.createBunkerAttachmentInDB(attachmentData);
        }
    }
    res.status(201).json({ message: 'Bunker record created successfully', bunkerRecordId: newBunkerId });
  } catch (error) {
    console.error('Error in createBunker:', error);
    // ADDED: Clean up uploaded files if an error occurs
    if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
            fs.unlinkSync(path.join(bunkerUploadsDir, file.filename));
        }
    }
    res.status(500).json({ message: 'Error creating bunker record', error: error.message });
  }
};

export const updateBunker = async (req, res, next) => {
  const { id } = req.params;
  // ADDED: Get uploaded files from the request
  let uploadedFiles = req.files || [];
  try {
    const bunkerData = req.body;
    const bunkerRecordId = parseInt(id, 10);
    if (isNaN(bunkerRecordId)) {
        console.error(`Invalid BunkerRecordID received for update: ${id}`);
        return res.status(400).json({ message: 'Invalid Bunker Record ID provided for update. Must be a number.' });
    }
    // REMOVED: Logic to prevent modification of Bunkered_Quantity and TankAllocations
    await bunkerModel.updateBunker(bunkerRecordId, bunkerData);
    // ADDED: Loop through uploaded files and save metadata to DB
    if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
            const attachmentData = {
                bunkerRecordId: bunkerRecordId,
                filename: file.filename,
                originalname: file.originalname,
                mimetype: file.mimetype
            };
            await bunkerModel.createBunkerAttachmentInDB(attachmentData);
        }
    }
    res.status(200).json({ message: 'Bunker record updated successfully.' });
  } catch (error) {
    console.error('Error in updateBunker:', error);
    // ADDED: Clean up uploaded files if an error occurs
    if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
            fs.unlinkSync(path.join(bunkerUploadsDir, file.filename));
        }
    }
    res.status(500).json({ message: 'Error updating bunker record', error: error.message });
  }
};

export const deactivateBunker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bunkerRecordId = parseInt(id, 10);
    if (isNaN(bunkerRecordId)) {
        console.error(`Invalid BunkerRecordID received for deactivation: ${id}`);
        return res.status(400).json({ message: 'Invalid Bunker Record ID provided for deactivation. Must be a number.' });
    }
    await bunkerModel.setBunkerInactive(bunkerRecordId);
    res.status(200).json({ message: 'Bunker record deactivated successfully' });
  } catch (error) {
    console.error('Error in deactivateBunker:', error);
    res.status(500).json({ message: 'Error deactivating bunker record', error: error.message });
  }
};

// NEW: Controller function to get the next auto-generated BDN number
export const getNewBdnNumber = async (req, res) => {
    try {
        const { shipId } = req.params;
        const shipID = parseInt(shipId, 10);
        if (isNaN(shipID)) {
            return res.status(400).json({ message: 'Invalid Ship ID is required.' });
        }
        const nextBdn = await bunkerModel.fetchNextBdnNumber(shipID);
        if (nextBdn) {
            res.status(200).json({ BDN_Number: nextBdn });
        } else {
            // This happens if the ShipID is valid but Short_Name is null or not found
            res.status(404).json({ message: 'Vessel Short Name not found or unable to generate BDN.' });
        }
    } catch (error) {
        console.error('Error in getNewBdnNumber:', error);
        res.status(500).json({ message: 'Error generating new BDN number', error: error.message });
    }
};

// NEW: Controller function to get the last recorded ROB
export const getLastROB = async (req, res) => {
  try {
    const { shipId, bunkerCategory, itemTypeKey } = req.query;
    if (!shipId || !bunkerCategory || !itemTypeKey) {
      return res.status(400).json({ message: 'Ship ID, Bunker Category, and Item Type Key are required.' });
    }
    const lastRob = await bunkerModel.fetchLastROB(parseInt(shipId, 10), bunkerCategory, itemTypeKey);
    if (lastRob) {
      res.status(200).json(lastRob);
    } else {
      // If no last ROB is found, return zero values
      res.status(200).json({ Final_Quantity_MT: 0, Final_Volume_M3: 0 });
    }
  } catch (error) {
    console.error('Error in getLastROB:', error);
    res.status(500).json({ message: 'Error fetching last ROB', error: error.message });
  }
};

// NEW: Controller function to get a list of all BDN numbers for lookup
export const getAllBdnNumbers = async (req, res) => {
    try {
        const { bunkerCategory } = req.query;
        const bdnNumbers = await bunkerModel.fetchAllBdnNumbers(bunkerCategory);
        res.status(200).json(bdnNumbers);
    } catch (error) {
        console.error('Error in getAllBdnNumbers:', error);
        res.status(500).json({ message: 'Error fetching BDN numbers', error: error.message });
    }
};

// NEW: Controller function to get bunker details by BDN number
export const getBunkerDetailsByBdn = async (req, res) => {
    try {
        const { bdnNumber } = req.params;
        const bunkerDetails = await bunkerModel.fetchBunkerDetailsByBdn(bdnNumber);
        if (bunkerDetails) {
            res.status(200).json(bunkerDetails);
        } else {
            res.status(404).json({ message: 'Bunker details not found.' });
        }
    } catch (error) {
        console.error('Error in getBunkerDetailsByBdn:', error);
        res.status(500).json({ message: 'Error fetching bunker details', error: error.message });
    }
};

// NEW: Controller function to get voyage legs by Voyage ID
export const getVoyageLegsByVoyage = async (req, res) => {
    try {
        const { voyageId } = req.params;
        const voyageID = parseInt(voyageId, 10);
        if (isNaN(voyageID)) {
            return res.status(400).json({ message: 'Invalid Voyage ID is required.' });
        }
        const voyageLegs = await bunkerModel.fetchVoyageLegsByVoyageId(voyageID);
        res.status(200).json(voyageLegs);
    } catch (error) {
        console.error('Error in getVoyageLegsByVoyage:', error);
        res.status(500).json({ message: 'Error fetching voyage legs', error: error.message });
    }
};

export const getActiveShips = async (req, res) => { try { const ships = await bunkerModel.fetchActiveShipsForBunker(); res.status(200).json(ships); } catch (error) { console.error('Error in getActiveShips:', error); res.status(500).json({ message: 'Error fetching active ships', error: error.message }); } };
export const getVoyagesByShip = async (req, res) => { try { const { shipId } = req.params; if (!shipId) { return res.status(400).json({ message: 'Ship ID is required.' }); } const voyages = await bunkerModel.fetchVoyagesByShipId(shipId); res.status(200).json(voyages); } catch (error) { console.error('Error in getVoyagesByShip:', error); res.status(500).json({ message: 'Error fetching voyages for ship', error: error.message }); } };
export const getSeaPorts = async (req, res) => { try { const ports = await bunkerModel.fetchSeaPorts(); res.status(200).json(ports); } catch (error) { console.error('Error in getSeaPorts:', error); res.status(500).json({ message: 'Error fetching sea ports', error: error.message }); } };
export const getFuelTypes = async (req, res) => { try { const fuelTypes = await bunkerModel.fetchFuelTypesForBunker(); res.status(200).json(fuelTypes); } catch (error) { console.error('Error in getFuelTypes:', error); res.status(500).json({ message: 'Error fetching fuel types', error: error.message }); } };
export const getLubeOilTypes = async (req, res) => { try { const lubeOilTypes = await bunkerModel.fetchLubeOilTypesForBunker(); res.status(200).json(lubeOilTypes); } catch (error) { console.error('Error in getLubeOilTypes:', error); res.status(500).json({ message: 'Error fetching lube oil types', error: error.message }); } };
export const getVesselTanksForBunkering = async (req, res) => { try { const { shipId } = req.params; const { bunkerCategory, itemTypeKey } = req.query; if (!shipId) { return res.status(400).json({ message: 'Ship ID is required.' }); } const vesselTanks = await bunkerModel.fetchVesselTanksForBunkering(shipId, bunkerCategory, itemTypeKey); res.status(200).json(vesselTanks); } catch (error) { console.error('Error in getVesselTanksForBunkering:', error); res.status(500).json({ message: 'Error fetching vessel tanks for bunkering', error: error.message }); } };

// ADDED: New controller function to get attachments for a bunker record
export const getBunkerAttachments = async (req, res, next) => {
    const { bunkerRecordId } = req.params;
    if (isNaN(parseInt(bunkerRecordId, 10))) {
        return res.status(400).json({ error: "Invalid bunker record ID" });
    }
    try {
        const attachments = await bunkerModel.getBunkerAttachmentsFromDB(bunkerRecordId);
        res.json(attachments);
    } catch (err) {
        console.error(`[BunkerService Controller] Error in getBunkerAttachments (ID: ${bunkerRecordId}):`, err);
        next(err);
    }
};

// --- NEW: Controller for Dosing BDN Lookup ---
export const getBDNsForLookup = async (req, res) => {
    try {
        const { shipId, fuelType, dosingDate } = req.query;
        if (!shipId || !fuelType || !dosingDate) {
            return res.status(400).json({ error: "Missing required parameters (shipId, fuelType, dosingDate)" });
        }
        const data = await bunkerModel.fetchBDNsForDosing(shipId, fuelType, dosingDate);
        res.json(data);
    } catch (err) {
        console.error('Error in getBDNsForLookup:', err);
        res.status(500).json({ error: err.message });
    }
};

// --- NEW: Controller for ROB Lookup ---
export const getBDN_ROB = async (req, res) => {
    try {
        const { bdnNumber, dosingDate } = req.query;
        if (!bdnNumber || !dosingDate) {
            return res.status(400).json({ error: "Missing params" });
        }

        const data = await bunkerModel.fetchLatestROB(bdnNumber, dosingDate);
        
        if (data) {
            res.json({ 
                rob: data.Final_Quantity, 
                robDate: data.EntryDate // 🟢 Sending the date back
            });
        } else {
            res.json({ rob: 0, robDate: null });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};