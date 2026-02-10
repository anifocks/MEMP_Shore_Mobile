import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AddEditMachineryModal.css';

//const API_BASE_URL = 'http://localhost:7000/api';
const API_BASE_URL = 'https://veemsonboardupgrade.theviswagroup.com/api';

const AddEditMachineryModal = ({ isOpen, onClose, onSaveSuccess, machinery, fuelTypes }) => {
    const getInitialFormData = () => ({
        CustomMachineryName: '', PowerKW: '', Manufacturer: '', Model: '', 
        SFOC_g_kWh: '', PrimaryFuelTypeKey: '', SecondaryFuelTypeKey: '', InstallDate: ''
    });

    const [formData, setFormData] = useState(getInitialFormData());
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (machinery) {
            setFormData({
                CustomMachineryName: machinery.CustomMachineryName || '',
                PowerKW: machinery.PowerKW || '',
                Manufacturer: machinery.Manufacturer || '',
                Model: machinery.Model || '',
                SFOC_g_kWh: machinery.SFOC_g_kWh || '',
                PrimaryFuelTypeKey: machinery.PrimaryFuelTypeKey || '',
                SecondaryFuelTypeKey: machinery.SecondaryFuelTypeKey || '',
                // Format date for the input field
                InstallDate: machinery.InstallDate ? new Date(machinery.InstallDate).toISOString().split('T')[0] : ''
            });
        }
    }, [machinery]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);
        const payload = { ...formData, username: localStorage.getItem('username') || 'SYSTEM' };
        try {
            await axios.put(`${API_BASE_URL}/machinery/${machinery.MachineryRecordID}`, payload);
            onSaveSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update machinery.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay-memp">
            <div className="modal-content-memp edit-machinery-modal">
                <h2>Edit Machinery Details</h2>
                <p className="machinery-type-display">{machinery.MachineryTypeDescription}</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-grid-memp">
                        <div className="form-group-memp"><label>Machinery Name</label><input type="text" name="CustomMachineryName" value={formData.CustomMachineryName} onChange={handleChange} required /></div>
                        <div className="form-group-memp"><label>Power (KW)</label><input type="number" name="PowerKW" value={formData.PowerKW} onChange={handleChange} /></div>
                        <div className="form-group-memp"><label>Manufacturer</label><input type="text" name="Manufacturer" value={formData.Manufacturer} onChange={handleChange} /></div>
                        <div className="form-group-memp"><label>Model</label><input type="text" name="Model" value={formData.Model} onChange={handleChange} /></div>
                        <div className="form-group-memp"><label>SFOC (g/kWh)</label><input type="number" step="any" name="SFOC_g_kWh" value={formData.SFOC_g_kWh} onChange={handleChange} /></div>
                        <div className="form-group-memp"><label>Installation Date</label><input type="date" name="InstallDate" value={formData.InstallDate} onChange={handleChange} /></div>
                        <div className="form-group-memp full-width"><label>Primary Fuel</label><select name="PrimaryFuelTypeKey" value={formData.PrimaryFuelTypeKey} onChange={handleChange}><option value="">-- None --</option>{fuelTypes.map(ft => (<option key={ft.FuelTypeKey} value={ft.FuelTypeKey}>{ft.FuelTypeDescription}</option>))}</select></div>
                        <div className="form-group-memp full-width"><label>Secondary Fuel</label><select name="SecondaryFuelTypeKey" value={formData.SecondaryFuelTypeKey} onChange={handleChange}><option value="">-- None --</option>{fuelTypes.map(ft => (<option key={ft.FuelTypeKey} value={ft.FuelTypeKey}>{ft.FuelTypeDescription}</option>))}</select></div>
                    </div>
                    {error && <p className="form-error-message modal-error">{error}</p>}
                    <div className="modal-actions-memp"><button type="button" onClick={onClose} disabled={isSaving} className="action-btn-memp cancel-btn-memp">Cancel</button><button type="submit" disabled={isSaving} className="action-btn-memp save-btn-memp">{isSaving ? 'Saving...' : 'Save Changes'}</button></div>
                </form>
            </div>
        </div>
    );
};

export default AddEditMachineryModal;