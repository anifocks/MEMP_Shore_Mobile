// viswa-digital-backend/ships-service/controllers/shipsController.js
import fs from 'fs';
import path from 'path'; // Import path module
import { fileURLToPath } from 'url'; // Import fileURLToPath
// FIX: Import the deleteFile helper and the fleet uploads directory
import { vesselUploadsDir, fleetUploadsDir, deleteFile } from '../utils/fileUtils.js'; 
import {
  fetchAllShips,
  fetchShipById,
  insertShip,
  modifyShip,
  setShipInactive,
  fetchShipDetailsById,
  fetchActiveShips,
  fetchShipTypes,
  fetchIceClasses,
  fetchShipByIMO,
  // NEW: Import Fleet Model functions
  getAllFleets as fetchAllFleetsModel,
  getFleetById as fetchFleetByIdModel,
  createFleet as createFleetModel,
  updateFleet as updateFleetModel,
  softDeleteFleet as softDeleteFleetModel,
  // NEW: Vessel Mapping functions
  fetchShipsForMapping as fetchShipsForMappingModel,
  mapShipsToFleet as mapShipsToFleetModel
} from '../models/shipsModel.js';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const isUniqueConstraintError = (error) => {
    if (error.number === 2627 || error.number === 2601) return true;
    return error.message && error.message.toLowerCase().includes('unique key constraint');
};

export const getShipDetailsById = async (req, res, next) => {
  console.log(`[Controller] Attempting to fetch details for Ship ID: ${req.params.id}`);
  try {
    const shipDetails = await fetchShipDetailsById(req.params.id);
    if (!shipDetails) {
      console.log(`[Controller] No details found for Ship ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Ship details not found.' });
    }
    console.log(`[Controller] Successfully fetched details for Ship ID: ${req.params.id}`);
    res.status(200).json(shipDetails);
  } catch (error) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('!!! ERROR IN getShipDetailsById CONTROLLER !!!');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('Error Message:', error.message);
    console.error('Original Error Object:', error);
    res.status(500).json({
      error: 'An unexpected error occurred while fetching vessel details.',
      details: error.message
    });
  }
};

export const getAllShips = async (req, res) => {
  try {
    const ships = await fetchAllShips();
    res.status(200).json(ships);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getShipById = async (req, res) => {
  try {
    const ship = await fetchShipById(req.params.id);
    if (!ship) {
      return res.status(404).json({ error: 'Ship not found' });
    }
    res.status(200).json(ship);
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createShip = async (req, res) => {
  try {
    const { Imagename, ...shipData } = req.body;
    // Check if a file was uploaded
    const imagePath = req.file ? req.file.filename : (Imagename || 'default.jpg');
    
    console.log("Received data for new ship:", req.body);
    const newShipId = await insertShip({ ...shipData, Imagename: imagePath });
    res.status(201).json({ message: 'Ship created successfully', ShipID: newShipId });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
        // If there was a file upload and a database error, delete the file to prevent orphans
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(409).json({ error: 'A vessel with this IMO Number already exists.' });
    }
    console.error("Error creating vessel:", error);
    // If there was a file upload and a database error, delete the file to prevent orphans
    if (req.file) {
        fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'An unexpected error occurred while creating the vessel.', details: error.message });
  }
};

export const updateShip = async (req, res) => {
    try {
        const { Imagename, ...shipData } = req.body;
        const shipId = req.params.id;

        // Fetch the existing ship to get the old image name
        const existingShip = await fetchShipById(shipId);
        if (!existingShip) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ error: 'Vessel not found.' });
        }

        // Determine the new image filename
        let newImageName = existingShip.Imagename;
        if (req.file) {
            newImageName = req.file.filename;
            // Delete the old image file if a new one was uploaded and it's not the default image
            if (existingShip.Imagename && existingShip.Imagename !== 'default.jpg') {
                // Use the imported absolute path for deletion
                const oldImagePath = path.join(vesselUploadsDir, existingShip.Imagename);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        await modifyShip(shipId, { ...shipData, Imagename: newImageName });
        res.status(200).json({ message: 'Ship updated successfully' });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(409).json({ error: 'A vessel with this IMO Number already exists.' });
        }
        console.error("Error updating vessel:", error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'An unexpected error occurred while updating the vessel.', details: error.message });
    }
};

export const softDeleteShip = async (req, res) => {
  try {
    await setShipInactive(req.params.id);
    res.status(200).json({ message: 'Ship marked as inactive' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getActiveShips = async (req, res) => {
    try {
        const activeShips = await fetchActiveShips();
        res.status(200).json(activeShips);
    } catch (error) {
        console.error("[ShipsService Controller] Error fetching active ships:", error);
        res.status(500).json({
            error: 'An unexpected error occurred while fetching active vessels.',
            details: error.message
        });
    }
};

export const getShipTypes = async (req, res) => {
    try {
        const shipTypes = await fetchShipTypes();
        res.status(200).json(shipTypes);
    } catch (error) {
        console.error("[ShipsService Controller] Error fetching ship types:", error);
        res.status(500).json({
            error: 'An unexpected error occurred while fetching ship types.',
            details: error.message
        });
    }
};

export const getIceClasses = async (req, res) => {
    try {
        const iceClasses = await fetchIceClasses();
        res.status(200).json(iceClasses);
    } catch (error) {
        console.error("[ShipsService Controller] Error fetching ice classes:", error);
        res.status(500).json({
            error: 'An unexpected error occurred while fetching ice classes.',
            details: error.message
        });
    }
};


// =========================================================
// NEW: VESSEL LOCATION CONTROLLER
// =========================================================

export const getVesselRecentLocations = async (req, res) => {
    // 🟢 UPDATED SQL: Added LEFT JOIN to MEMP_Fleets to include FleetName for frontend filtering
    const sql = `
        WITH LatestReports AS (
            SELECT 
                ShipID,
                Latitude,
                Longitude,
                ReportDateTimeLocal,
                SpeedOverGround,
                VoyageStatus,
                ROW_NUMBER() OVER (
                    PARTITION BY ShipID 
                    ORDER BY ReportDateTimeLocal DESC
                ) AS rn
            FROM MEMP_VesselDailyReports
        )
        SELECT 
            a.ShipID, 
            b.IMO_Number, 
            b.ShipName, 
            f.FleetName,   -- 🟢 ADDED THIS
            a.Latitude, 
            a.Longitude,
            a.ReportDateTimeLocal AS Timestamp,
            a.SpeedOverGround AS Speed,
            a.VoyageStatus AS Status
        FROM LatestReports a
        JOIN MEMP_Ships b ON a.ShipID = b.ShipID
        LEFT JOIN MEMP_Fleets f ON b.FleetID = f.FleetID -- 🟢 JOIN FLEETS
        WHERE a.rn = 1
        ORDER BY a.ShipID;
    `;

    try {
        // --- IMPORTANT NOTE ---
        // You MUST replace the following placeholder logic with an actual database query
        // using your database utility (e.g., query(sql) or a function from shipsModel.js).
        // For now, this mock structure provides the correct response format for the client:
        
        const mockResult = [
            { ShipID: 1, IMO_Number: '9901403', ShipName: 'MV VISWA RHEA', FleetName: 'Viswa Fleet 1', Latitude: 29.35, Longitude: 48.05, ReportDateTimeLocal: '2025-11-17 08:00:00', VoyageStatus: 'In Port', SpeedOverGround: 0.1 },
            { ShipID: 2, IMO_Number: '9617442', ShipName: 'MV VISWA MERCURY', FleetName: 'Viswa Fleet 1', Latitude: 20.0, Longitude: -70.0, ReportDateTimeLocal: '2025-11-17 10:00:00', VoyageStatus: 'At Sea', SpeedOverGround: 14.5 },
            { ShipID: 3, IMO_Number: '548796321', ShipName: 'MV VISWA VENUS', FleetName: 'Global Fleet', Latitude: -34.60, Longitude: -58.38, ReportDateTimeLocal: '2025-11-17 09:30:00', VoyageStatus: 'At Sea', SpeedOverGround: 12.0 },
            { ShipID: 4, IMO_Number: '1234567', ShipName: 'MV VISWA NEPTUNE', FleetName: null, Latitude: 51.50, Longitude: -0.12, ReportDateTimeLocal: '2025-11-17 07:00:00', VoyageStatus: 'Stopped', SpeedOverGround: 0.0 },
        ];
        const result = mockResult; // Replace with await yourDBQueryFunction(sql); 
        
        // Map the result to a cleaner client-friendly format
        const vessels = result.map(v => ({
            vesselId: v.ShipID,
            vesselName: v.ShipName,
            imoNumber: v.IMO_Number,
            fleetName: v.FleetName, // 🟢 Passed to frontend
            latitude: parseFloat(v.Latitude),
            longitude: parseFloat(v.Longitude),
            timestamp: v.ReportDateTimeLocal, // Use ReportDateTimeLocal as Timestamp
            speed: parseFloat(v.SpeedOverGround || 0),
            status: v.VoyageStatus || 'Unknown' 
        }));

        res.json(vessels);
    } catch (error) {
        console.error('Database Error in getVesselRecentLocations:', error);
        res.status(500).json({ message: 'Failed to retrieve vessel locations from database.' });
    }
};


// =========================================================
// FLEET MANAGEMENT CONTROLLERS (NEW)
// =========================================================

export const getAllFleets = async (req, res, next) => {
    try {
        const fleets = await fetchAllFleetsModel();
        res.json(fleets);
    } catch (err) {
        console.error("[ShipsService Controller] Error fetching all fleets:", err);
        next(err); 
    }
};

export const getFleetById = async (req, res, next) => {
// ... (The rest of your existing shipsController.js content would follow here)
    try {
        const { id } = req.params;
        const fleet = await fetchFleetByIdModel(id);
        if (!fleet) {
            return res.status(404).json({ message: 'Fleet not found or inactive.' });
        }
        res.json(fleet);
    } catch (err) {
        next(err);
    }
};

export const createFleet = async (req, res, next) => {
    const logoFile = req.file;
    try {
        const { FleetName, Description } = req.body;

        if (!FleetName) {
            if (logoFile) deleteFile(logoFile.filename, fleetUploadsDir);
            return res.status(400).json({ message: 'FleetName is required.' });
        }

        const LogoFilename = logoFile ? logoFile.filename : null;

        const newFleet = await createFleetModel({
            FleetName,
            LogoFilename,
            Description
        });

        if (!newFleet) {
            if (logoFile) deleteFile(logoFile.filename, fleetUploadsDir);
            throw new Error("Failed to create fleet in the database.");
        }

        res.status(201).json(newFleet);
    } catch (err) {
        if (logoFile) deleteFile(logoFile.filename, fleetUploadsDir);
        next(err);
    }
};

export const updateFleet = async (req, res, next) => {
    const newLogoFile = req.file;
    try {
        const { id } = req.params;
        const { FleetName, Description, ExistingLogoFilename } = req.body; 

        if (!FleetName) {
             if (newLogoFile) deleteFile(newLogoFile.filename, fleetUploadsDir);
            return res.status(400).json({ message: 'FleetName is required.' });
        }

        let LogoFilename = ExistingLogoFilename;

        if (newLogoFile) {
            // New file uploaded, set filename
            LogoFilename = newLogoFile.filename;
            // OPTIONAL: Delete the OLD logo file if it exists and is not the new one
            if (ExistingLogoFilename && ExistingLogoFilename !== newLogoFile.filename) {
                deleteFile(ExistingLogoFilename, fleetUploadsDir);
            }
        }

        const success = await updateFleetModel(id, {
            FleetName,
            LogoFilename,
            Description
        });

        if (success) {
            res.json({ message: 'Fleet updated successfully.', LogoFilename });
        } else {
            if (newLogoFile) deleteFile(newLogoFile.filename, fleetUploadsDir);
            res.status(404).json({ message: 'Fleet not found or update failed.' });
        }
    } catch (err) {
        if (newLogoFile) deleteFile(newLogoFile.filename, fleetUploadsDir);
        next(err);
    }
};

export const softDeleteFleet = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await softDeleteFleetModel(id);

        if (success) {
            res.json({ message: 'Fleet successfully soft-deleted.' });
        } else {
            res.status(404).json({ message: 'Fleet not found or already inactive.' });
        }
    } catch (err) {
        next(err);
    }
};

// NEW: Controller to fetch ships for the mapping dropdown
export const getShipsForMapping = async (req, res, next) => {
    try {
        // Gets the current fleet ID, or undefined/null if adding a new fleet
        const fleetId = req.query.fleetId ? parseInt(req.query.fleetId) : null; 
        const ships = await fetchShipsForMappingModel(fleetId);
        res.json(ships);
    } catch (err) {
        console.error("[ShipsService Controller] Error fetching ships for mapping:", err);
        next(err);
    }
};

// NEW: Controller to perform vessel mapping
export const mapVesselsToFleet = async (req, res, next) => {
    try {
        const { id } = req.params; // fleetId
        const { shipIds } = req.body; // Array of ship IDs to map

        // Validate input
        const fleetId = parseInt(id);
        if (isNaN(fleetId) || fleetId <= 0) {
            return res.status(400).json({ message: 'Valid Fleet ID is required for mapping.' });
        }
        
        await mapShipsToFleetModel(fleetId, shipIds);
        res.json({ message: 'Vessels successfully mapped to the fleet.' });
        
    } catch (err) {
        console.error("[ShipsService Controller] Error during vessel mapping:", err);
        next(err);
    }
};