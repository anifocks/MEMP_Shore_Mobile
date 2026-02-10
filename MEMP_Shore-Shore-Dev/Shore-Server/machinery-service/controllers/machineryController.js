import * as MachineryModel from '../models/machineryModel.js';

// --- ASSIGN ---
export const assignMachineryToShip = async (req, res) => {
  try {
    const { shipId } = req.params;
    const { machineryTypeKey, quantity, username } = req.body; 
    const user = username || 'SYSTEM';
    
    await MachineryModel.assignNewMachinery(shipId, machineryTypeKey, quantity, user);
    res.status(201).json({ message: 'Machinery assigned successfully.' });
  } catch (error) {
    console.error('ERROR in assignMachineryToShip Controller:', error);
    res.status(500).json({ error: error.message });
  }
};

// --- LOOKUPS & LISTS ---
export const getFuelTypes = async (req, res) => {
    try {
        const types = await MachineryModel.fetchFuelTypes();
        res.status(200).json(types);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getMachineryTypes = async (req, res) => {
  try {
    const types = await MachineryModel.fetchMachineryTypes();
    res.status(200).json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMachineryForShip = async (req, res) => {
  try {
    const machinery = await MachineryModel.fetchMachineryForShip(req.params.shipId);
    res.status(200).json(machinery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- UPDATE & DELETE ---
export const updateShipMachinery = async (req, res) => {
    try {
        const user = req.body.username || 'SYSTEM';
        await MachineryModel.updateExistingMachinery(req.params.machineryRecordId, req.body, user);
        res.status(200).json({ message: 'Machinery updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteShipMachinery = async (req, res) => {
    try {
        const user = req.body.username || 'SYSTEM';
        await MachineryModel.setMachineryInactive(req.params.machineryRecordId, user);
        res.status(200).json({ message: 'Machinery marked as inactive' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- CONSUMERS ---
export const getFuelConsumers = async (req, res) => {
    try {
        const data = await MachineryModel.fetchFuelConsumers(req.params.shipId);
        res.json(data);
    } catch (err) {
        console.error("Error in getFuelConsumers:", err);
        res.status(500).json({ error: err.message });
    }
};

// --- SINGLE VIEW ---
export const getMachineryById = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await MachineryModel.fetchMachineryById(id);
        
        if (!record) {
            return res.status(404).json({ error: 'Machinery record not found.' });
        }
        
        res.status(200).json(record);
    } catch (error) {
        console.error("Error in getMachineryById:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🟢 UPDATED: Analytics Controller to handle voyage query param
export const getMachineryAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const { fromDate, toDate, voyage } = req.query; // 🟢 Extract voyage from query string

        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'From Date and To Date are required.' });
        }

        // 🟢 Pass the 4th argument (voyage) to the model
        const data = await MachineryModel.getMachineryAnalytics(id, fromDate, toDate, voyage);
        res.status(200).json(data);
    } catch (error) {
        console.error("Error in getMachineryAnalytics Controller:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🟢 NEW: Handles the search from VesselMachineryDataPage.jsx
export const getMachineryPeriodSummary = async (req, res) => {
    try {
        const { shipId, fromDate, toDate } = req.query;
        if (!shipId || !fromDate || !toDate) {
            return res.status(400).json({ error: 'shipId, fromDate, and toDate are required.' });
        }
        const data = await MachineryModel.fetchPeriodSummary(shipId, fromDate, toDate);
        res.status(200).json(data);
    } catch (error) {
        console.error("Error in getMachineryPeriodSummary:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🟢 NEW: SFOC Controller
export const getSFOCAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const { fromDate, toDate } = req.query;

        // Basic validation
        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'From Date and To Date are required.' });
        }

        const data = await MachineryModel.fetchSFOCAnalytics(id, fromDate, toDate);
        res.status(200).json(data);
    } catch (error) {
        console.error("Error in getSFOCAnalytics:", error);
        res.status(500).json({ error: error.message });
    }
};