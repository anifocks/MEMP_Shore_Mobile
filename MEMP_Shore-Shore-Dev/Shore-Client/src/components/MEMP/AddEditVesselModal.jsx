import React, { useState, useEffect } from 'react';
// import axios from 'axios'; // REMOVED: Replaced with API functions
import './AddEditVesselModal.css';
// *** ADDED: Import centralized API function ***
import { saveVessel } from '../../api';

// REMOVED: Hardcoded API_BASE_URL is replaced by centralized functions from api.js
// const API_BASE_URL = 'https://veemsonboardupgrade.theviswagroup.com/api';

const AddEditVesselModal = ({ isOpen, onClose, onSaveSuccess, existingShip }) => {
  const [formData, setFormData] = useState({
    IMO_Number: '',
    ShipName: '',
    ShipType: 'BULK_CARRIER_GE_279K',
    CapacityDWT: '',
    CapacityGT: '',
    YearOfBuild: '',
    IsActive: 1,
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingShip) {
      setFormData({
        IMO_Number: existingShip.IMO_Number || '',
        ShipName: existingShip.ShipName || '',
        ShipType: existingShip.ShipType || 'BULK_CARRIER_GE_279K',
        CapacityDWT: existingShip.CapacityDWT || '',
        CapacityGT: existingShip.CapacityGT || '',
        YearOfBuild: existingShip.YearOfBuild || '',
        IsActive: existingShip.IsActive !== undefined ? existingShip.IsActive : 1,
      });
    } else {
      setFormData({
        IMO_Number: '', ShipName: '', ShipType: 'BULK_CARRIER_GE_279K',
        CapacityDWT: '', CapacityGT: '', YearOfBuild: '', IsActive: 1
      });
    }
  }, [existingShip]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    
    // The payload is already in the correct JSON structure for the API call
    const payload = { ...formData };

    try {
      // *** UPDATED: Use centralized API function saveVessel ***
      await saveVessel(existingShip ? existingShip.ShipID : null, payload);
      onSaveSuccess();
    } catch (err) {
      console.error("Error saving vessel:", err);
      // The API function throws an Error object with a message property
      setError(err.message || 'Failed to save vessel. Please check the data and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{existingShip ? 'Edit Vessel' : 'Add New Vessel'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Ship Name</label>
              <input type="text" name="ShipName" value={formData.ShipName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>IMO Number</label>
              <input type="text" name="IMO_Number" value={formData.IMO_Number} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Ship Type</label>
              <select name="ShipType" value={formData.ShipType} onChange={handleChange} required>
                <option value="BULK_CARRIER_GE_279K">Bulk Carrier GE 279K</option>
                <option value="BULK_CARRIER_LT_279K">Bulk Carrier LT 279K</option>
                <option value="CONTAINER_SHIP_ALL_SIZES">Container Ship</option>
                <option value="OIL_TANKER_ALL_SIZES">Oil Tanker</option>
              </select>
            </div>
            <div className="form-group">
              <label>Capacity DWT</label>
              <input type="number" name="CapacityDWT" value={formData.CapacityDWT} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Capacity GT</label>
              <input type="number" name="CapacityGT" value={formData.CapacityGT} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Year of Build</label>
              <input type="number" name="YearOfBuild" value={formData.YearOfBuild} onChange={handleChange} required />
            </div>
          </div>
           {existingShip && (
             <div className="form-group-checkbox">
               <label>
                 <input type="checkbox" name="IsActive" checked={formData.IsActive === 1} onChange={handleChange} />
                 Is Active
               </label>
            </div>
           )}
          {error && <p className="form-error-message">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className="btn-save" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditVesselModal;