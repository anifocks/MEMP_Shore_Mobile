import * as tankModel from '../models/tankModel.js';

export const getAllTanks = async (req, res) => {
    try {
        const tanks = await tankModel.fetchAllTanks();
        res.status(200).json(tanks);
    } catch (error) {
        console.error('Error in getAllTanks:', error);
        res.status(500).json({ message: 'Error fetching tanks', error: error.message });
    }
};

export const getTanksByVessel = async (req, res) => {
    try {
        const { vesselId } = req.params;
        if (!vesselId) {
            return res.status(400).json({ message: 'Vessel ID is required.' });
        }
        const tanks = await tankModel.fetchTanksByVesselId(vesselId);
        res.status(200).json(tanks);
    } catch (error) {
        console.error('Error in getTanksByVessel:', error);
        res.status(500).json({ message: 'Error fetching tanks by vessel', error: error.message });
    }
};

export const getTankDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const tank = await tankModel.fetchTankDetailsById(id);
        if (tank) {
            res.status(200).json(tank);
        } else {
            res.status(404).json({ message: 'Tank not found.' });
        }
    } catch (error) {
        console.error('Error in getTankDetails:', error);
        res.status(500).json({ message: 'Error fetching tank details', error: error.message });
    }
};

export const createTank = async (req, res) => {
    try {
        const newTankId = await tankModel.insertTank(req.body);
        res.status(201).json({ message: 'Tank created successfully', tankId: newTankId });
    } catch (error) {
        console.error('Error in createTank:', error);
        res.status(500).json({ message: 'Error creating tank', error: error.message });
    }
};

export const updateTank = async (req, res) => {
    try {
        const { id } = req.params;
        await tankModel.updateTank(id, req.body);
        res.status(200).json({ message: 'Tank updated successfully' });
    } catch (error) {
        console.error('Error in updateTank:', error);
        res.status(500).json({ message: 'Error updating tank', error: error.message });
    }
};

export const deactivateTank = async (req, res) => {
    try {
        const { id } = req.params;
        await tankModel.deactivateTank(id);
        res.status(200).json({ message: 'Tank deactivated successfully' });
    } catch (error) {
        console.error('Error in deactivateTank:', error);
        res.status(500).json({ message: 'Error deactivating tank', error: error.message });
    }
};

// NEW: Controller to fetch current quantities for a list of VesselTankIDs
export const getCurrentQuantitiesForTanks = async (req, res) => {
    try {
        const { tankIds } = req.body; // Expecting an array of tank IDs in the request body
        if (!Array.isArray(tankIds) || tankIds.length === 0) {
            return res.status(400).json({ message: 'An array of tank IDs is required in the request body.' });
        }
        const currentQuantities = await tankModel.fetchCurrentQuantitiesByIds(tankIds);
        res.status(200).json(currentQuantities);
    } catch (error) {
        console.error('Error in getCurrentQuantitiesForTanks:', error);
        res.status(500).json({ message: 'Error fetching current tank quantities', error: error.message });
    }
};

export const getTankDefinitions = async (req, res) => {
    try {
        const definitions = await tankModel.fetchTankDefinitions();
        res.status(200).json(definitions);
    } catch (error) {
        console.error('Error fetching tank definitions:', error);
        res.status(500).json({ message: 'Error fetching tank definitions', error: error.message });
    }
};

export const getFuelTypes = async (req, res) => {
    try {
        const fuelTypes = await tankModel.fetchFuelTypes();
        res.status(200).json(fuelTypes);
    } catch (error) {
        console.error('Error fetching fuel types:', error);
        res.status(500).json({ message: 'Error fetching fuel types', error: error.message });
    }
};

export const getWaterTypes = async (req, res) => {
    try {
        const waterTypes = await tankModel.fetchWaterTypes();
        res.status(200).json(waterTypes);
    } catch (error) {
        console.error('Error fetching water types:', error);
        res.status(500).json({ message: 'Error fetching water types', error: error.message });
    }
};

export const getLubeOilTypes = async (req, res) => {
    try {
        const lubeOilTypes = await tankModel.fetchLubeOilTypes();
        res.status(200).json(lubeOilTypes);
    } catch (error) {
        console.error('Error fetching lube oil types:', error);
        res.status(500).json({ message: 'Error fetching lube oil types', error: error.message });
    }
};

export const getOilyResidueTypes = async (req, res) => {
    try {
        const oilyResidueTypes = await tankModel.fetchOilyResidueTypes();
        res.status(200).json(oilyResidueTypes);
    } catch (error) {
        console.error('Error fetching oily residue types:', error);
        res.status(500).json({ message: 'Error fetching oily residue types', error: error.message });
    }
};