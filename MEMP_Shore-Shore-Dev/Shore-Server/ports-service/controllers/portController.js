// viswa-digital-backend/ports-service/controllers/portController.js
import * as PortModel from '../models/portModel.js';

export const getAllPorts = async (req, res) => {
  try {
    const { search } = req.query; // Accepts 'search' query parameter
    const ports = await PortModel.fetchAllPorts(search); // Passes 'search' to model
    res.status(200).json(ports);
  } catch (error) {
    // --- ENHANCED ERROR LOGGING ---
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('!!! ERROR IN getAllPorts CONTROLLER !!!');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('Error Message:', error.message);
    console.error('Original Error Object:', error);
    console.error('Error Stack:', error.stack);

    res.status(500).json({
      error: 'An unexpected error occurred while fetching ports.',
      details: error.message,
      sqlError: process.env.NODE_ENV === 'development' && error.originalError ? {
        number: error.originalError.number,
        message: error.originalError.message,
        sqlState: error.originalError.sqlState
      } : undefined
    });
  }
};

// NEW: Controller to fetch only PortName and PortCode based on PortName search
export const getFilteredPortNames = async (req, res) => {
  try {
    const { search } = req.query; // Accepts 'search' query parameter
    const ports = await PortModel.fetchPortNamesBySearch(search); // Passes 'search' to model
    res.status(200).json(ports);
  } catch (error) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('!!! ERROR IN getFilteredPortNames CONTROLLER !!!');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('Error Message:', error.message);
    console.error('Original Error Object:', error);
    console.error('Error Stack:', error.stack);

    res.status(500).json({
      error: 'An unexpected error occurred while fetching filtered port names.',
      details: error.message,
      sqlError: process.env.NODE_ENV === 'development' && error.originalError ? {
        number: error.originalError.number,
        message: error.originalError.message,
        sqlState: error.originalError.sqlState
      } : undefined
    });
  }
};

// NEW: Controller to fetch port details by PortCode
export const getPortByCode = async (req, res) => {
    try {
        // FIX: Robustly capture portCode from params, considering possible naming variations/empty strings.
        // Check for common parameter names like portCode, code, or id in params
        const portCodeParam = req.params.portCode || req.params.code || req.params.id; 
        
        // Use trimmed code to ensure non-empty value is passed
        const portCode = portCodeParam ? portCodeParam.trim() : null;

        if (!portCode) {
            // This condition was likely the source of the 400 error.
            return res.status(400).json({ error: 'Port Code is required.' });
        }
        
        const port = await PortModel.fetchPortByCode(portCode);
        if (!port) return res.status(404).json({ message: 'Port not found for the given code.' });
        res.status(200).json(port);
    } catch (error) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('!!! ERROR IN getPortByCode CONTROLLER !!!');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('Error Message:', error.message);
        console.error('Original Error Object:', error);
        console.error('Error Stack:', error.stack);
        res.status(500).json({
            error: 'An unexpected error occurred while fetching port details by code.',
            details: error.message
        });
    }
};

export const getPortById = async (req, res) => {
    try {
        // Ensure portId is converted to a number to prevent EPARAM errors
        const portId = parseInt(req.params.portId, 10);
        if (isNaN(portId)) {
            return res.status(400).json({ error: 'Invalid Port ID provided. Must be a number.' });
        }
        const port = await PortModel.fetchPortById(portId);
        if (!port) return res.status(404).json({ message: 'Port not found.' });
        res.status(200).json(port);
    } catch (error) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('!!! ERROR IN getPortById CONTROLLER !!!');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('Error Message:', error.message);
        console.error('Original Error Object:', error);
        console.error('Error Stack:', error.stack);
        res.status(500).json({
            error: 'An unexpected error occurred while fetching port details.',
            details: error.message
        });
    }
};

export const createPort = async (req, res) => {
    try {
        const newPortId = await PortModel.insertPort(req.body);
        res.status(201).json({ message: 'Port created successfully.', PortID: newPortId });
    } catch (error) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('!!! ERROR IN createPort CONTROLLER !!!');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('Error Message:', error.message);
        console.error('Original Error Object:', error);
        console.error('Error Stack:', error.stack);
        if(error.message.includes('UNIQUE KEY')) {
            return res.status(409).json({ error: 'A port with this Port Code already exists.' });
        }
        res.status(500).json({ error: error.message });
    }
};

export const updatePort = async (req, res) => {
    try {
        const portId = parseInt(req.params.portId, 10);
        if (isNaN(portId)) {
            return res.status(400).json({ error: 'Invalid Port ID provided. Must be a number.' });
        }
        await PortModel.updateExistingPort(portId, req.body);
        res.status(200).json({ message: 'Port updated successfully.' });
    } catch (error) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('!!! ERROR IN updatePort CONTROLLER !!!');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('Error Message:', error.message);
        console.error('Original Error Object:', error);
        console.error('Error Stack:', error.stack);
        if(error.message.includes('UNIQUE KEY')) {
            return res.status(409).json({ error: 'A port with this Port Code already exists.' });
        }
        res.status(500).json({ error: error.message });
    }
};

export const softDeletePort = async (req, res) => {
    try {
        const portId = parseInt(req.params.portId, 10);
        if (isNaN(portId)) {
            return res.status(400).json({ error: 'Invalid Port ID provided. Must be a number.' });
        }
        await PortModel.setPortInactive(portId, req.body.username);
        res.status(200).json({ message: 'Port marked as inactive.' });
    } catch (error) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('!!! ERROR IN softDeletePort CONTROLLER !!!');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('Error Message:', error.message);
        console.error('Original Error Object:', error);
        console.error('Error Stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
};