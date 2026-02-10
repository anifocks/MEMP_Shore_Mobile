import * as AdditiveModel from '../models/additiveModel.js';

export const getAdditiveTypes = async (req, res) => {
    try {
        const data = await AdditiveModel.fetchAdditiveTypes();
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getDosingEvents = async (req, res) => {
    try {
        // 🟢 Extract new params
        const { shipId } = req.params; // keep existing param route support
        const { ref, type } = req.query; // get search/filter from query string

        const data = await AdditiveModel.fetchDosingEvents(shipId, ref, type);
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const createEvent = async (req, res) => {
    try {
        const user = req.body.username || 'SYSTEM';
        await AdditiveModel.createDosingEvent(req.body, user);
        res.status(201).json({ message: 'Dosing event recorded.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const deleteEvent = async (req, res) => {
    try {
        const user = req.body.username || 'SYSTEM';
        await AdditiveModel.softDeleteEvent(req.params.id, user);
        res.json({ message: 'Deleted successfully.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const updateEvent = async (req, res) => {
    try {
        const user = req.body.username || 'SYSTEM';
        await AdditiveModel.updateDosingEvent(req.params.id, req.body, user);
        res.json({ message: 'Updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🟢 New Endpoint Function
export const getBDNAvailableQty = async (req, res) => {
    try {
        const { bdn, shipId } = req.query;
        if (!bdn) return res.status(400).json({ error: "BDN required" });
        
        const data = await AdditiveModel.getRealTimeROB(bdn, shipId);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ... existing imports
// 🟢 NEW: Audit Controller
export const getConsumptionAudit = async (req, res) => {
    try {
        const data = await AdditiveModel.fetchConsumptionAudit(req.params.id);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        // 🟢 Extract new params: shipId, dosingRef
        const { from, to, shipId, dosingRef } = req.query;
        const data = await AdditiveModel.getDashboardAnalytics(from, to, shipId, dosingRef);
        res.json(data);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 🟢 NEW: Controller for Reference ID Dropdown
export const getDosingReferences = async (req, res) => {
    try {
        const { shipId } = req.query;
        const data = await AdditiveModel.fetchDosingReferenceIDs(shipId);
        res.json(data);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};