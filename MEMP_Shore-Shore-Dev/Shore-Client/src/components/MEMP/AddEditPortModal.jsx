import React, { useState, useEffect } from 'react';
// import axios from 'axios'; // REMOVED: Replaced with API functions
import './AddEditPortModal.css';
// *** ADDED: Import centralized API function ***
import { savePort } from '../../api';

// REMOVED: Hardcoded API_BASE_URL is replaced by centralized functions from api.js
// const API_BASE_URL = 'https://veemsonboardupgrade.theviswagroup.com/api';

const AddEditPortModal = ({ isOpen, onClose, onSaveSuccess, port }) => {
    // --- FIX: Defaulting to 'No' to match the database constraint ---
    const initialFormState = {
        PortName: '', PortCode: '', Country: '', CountryCode: '', UTCOffSet: '',
        Latitude: '', Longitude: '', EuInd: 'No', UkInd: 'No', IsActive: true,
    };
    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState('');

    useEffect(() => {
        if (port) {
            setFormData({
                PortName: port.PortName || '', PortCode: port.PortCode || '',
                Country: port.Country || '', CountryCode: port.CountryCode || '',
                UTCOffSet: port.UTCOffSet || '', Latitude: port.Latitude || '',
                Longitude: port.Longitude || '', 
                // --- FIX: Correctly handle 'Yes'/'No' when editing ---
                EuInd: port.EuInd === 'Yes' ? 'Yes' : 'No', 
                UkInd: port.UkInd === 'Yes' ? 'Yes' : 'No', 
                IsActive: port.IsActive,
            });
        } else {
            setFormData(initialFormState);
        }
    }, [port]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const portId = port ? port.PortID : null;
        const payload = { ...formData, username: localStorage.getItem('username') || 'SYSTEM' };

        try {
            // *** UPDATED: Use centralized API function savePort ***
            await savePort(portId, payload);
            
            onSaveSuccess();
        } catch (err) {
            // Catch the standardized Error thrown by API functions
            setError(err.message || 'Failed to save port.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay-memp">
            <div className="modal-content-memp port-edit-modal-content">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">{port ? 'Edit Port' : 'Add New Port'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Other form fields remain the same */}
                        <div className="form-group-memp"><label>Port Name</label><input type="text" name="PortName" value={formData.PortName} onChange={handleChange} required /></div>
                        <div className="form-group-memp"><label>Port Code</label><input type="text" name="PortCode" value={formData.PortCode} onChange={handleChange} required /></div>
                        <div className="form-group-memp"><label>Country</label><input type="text" name="Country" value={formData.Country} onChange={handleChange} required /></div>
                        <div className="form-group-memp"><label>Country Code</label><input type="text" name="CountryCode" value={formData.CountryCode} onChange={handleChange} /></div>
                        <div className="form-group-memp"><label>Latitude</label><input type="number" step="any" name="Latitude" value={formData.Latitude} onChange={handleChange} required /></div>
                        <div className="form-group-memp"><label>Longitude</label><input type="number" step="any" name="Longitude" value={formData.Longitude} onChange={handleChange} required /></div>
                        <div className="form-group-memp"><label>UTC Offset</label><input type="text" name="UTCOffSet" value={formData.UTCOffSet} onChange={handleChange} /></div>
                        
                        {/* --- FIX: Using 'Yes' and 'No' as values for the dropdown --- */}
                        <div className="form-group-memp"><label>EU Port</label><select name="EuInd" value={formData.EuInd} onChange={handleChange}><option value="No">No</option><option value="Yes">Yes</option></select></div>
                        <div className="form-group-memp"><label>UK Port</label><select name="UkInd" value={formData.UkInd} onChange={handleChange}><option value="No">No</option><option value="Yes">Yes</option></select></div>

                        <div className="form-group-memp form-group-checkbox-memp"><input type="checkbox" id="IsActive" name="IsActive" checked={formData.IsActive} onChange={handleChange} /><label htmlFor="IsActive">Is Active</label></div>
                    </div>
                    {error && <p className="form-error-message modal-error mt-4">{error}</p>}
                    <div className="modal-actions-memp mt-6">
                        <button type="button" onClick={onClose} className="action-btn-memp cancel-btn-memp">Cancel</button>
                        <button type="submit" className="action-btn-memp save-btn-memp">Save Port</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditPortModal;