// src/pages/AddEditVesselPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import axios from 'axios'; // REMOVED: Replaced with API functions
import './AddEditVesselPage.css';
import { FaSave, FaTimes, FaShip, FaRulerCombined, FaWeightHanging, FaInfoCircle } from 'react-icons/fa';
// *** ADDED: Import centralized API functions and constants ***
import { 
  fetchVesselDetails, 
  fetchShipTypes, 
  fetchIceClasses, 
  saveVessel,
  VESSEL_IMAGE_BASE_PATH
} from '../api';

// REMOVED: Hardcoded API_BASE_URL is replaced by centralized functions from api.js
// const API_BASE_URL = 'http://localhost:7000/api';

const AddEditVesselPage = () => {
  const { shipId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    IMO_Number: '',
    ShipName: '',
    Short_Name: '',
    VesselTypeKey: '',
    CapacityDWT: '',
    CapacityGT: '',
    YearOfBuild: '',
    IsActive: true,
    NetTonnage: '',
    FlagState: '',
    PortOfRegistry: '',
    CallSign: '',
    MMSI: '',
    EEDI: '',
    EEXI: '',
    HasShaPoLi: false,
    ClassSociety: '',
    CapacityTEU: '',
    CapacityCBM: '',
    CapacityPassengers: '',
    LengthOverall: '',
    Breadth: '',
    MaxDraftForward: '',
    MaxDraftAft: '',
    Depth: '',
    Displacement: '',
    Pitch: '',
    Imagename: '', 
  });
  const [selectedFile, setSelectedFile] = useState(null); 
  const [shipTypes, setShipTypes] = useState([]);
  const [iceClasses, setIceClasses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setError('');
      setLoading(true);
      try {
        // *** UPDATED: Use centralized API functions ***
        const [shipTypesData, iceClassesData] = await Promise.all([
          fetchShipTypes(),
          fetchIceClasses()
        ]);
        
        setShipTypes(shipTypesData);
        setIceClasses(iceClassesData);

        if (shipId) {
          // *** UPDATED: Use centralized API function fetchVesselDetails ***
          const shipData = await fetchVesselDetails(shipId);

          setFormData({
            IMO_Number: shipData.IMO_Number || '',
            ShipName: shipData.ShipName || '',
            Short_Name: shipData.Short_Name || '',
            VesselTypeKey: shipData.VesselTypeKey || '',
            CapacityDWT: shipData.CapacityDWT || '',
            CapacityGT: shipData.CapacityGT || '',
            YearOfBuild: shipData.YearOfBuild || '',
            IsActive: shipData.IsActive !== undefined ? !!shipData.IsActive : true,
            NetTonnage: shipData.NetTonnage || '',
            FlagState: shipData.FlagState || '',
            PortOfRegistry: shipData.PortOfRegistry || '',
            CallSign: shipData.CallSign || '',
            MMSI: shipData.MMSI || '',
            EEDI: shipData.EEDI || '',
            EEXI: shipData.EEXI || '',
            HasShaPoLi: !!shipData.Shaft_Power_Limitation,
            ClassSociety: shipData.ClassSociety || '',
            CapacityTEU: shipData.CapacityTEU || '',
            CapacityCBM: shipData.Capacity_M3 || '',
            CapacityPassengers: shipData.CapacityPassengers || '',
            LengthOverall: shipData.LengthOverall || '',
            Breadth: shipData.Breadth || '',
            MaxDraftForward: shipData.Draft_Fwd || '',
            MaxDraftAft: shipData.Draft_Aft || '',
            Depth: shipData.Depth || '',
            Displacement: shipData.Displacement || '',
            Pitch: shipData.Pitch || '',
            Imagename: shipData.Imagename || '',
          });
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        // The API function throws an Error object with a message property
        setError(err.message || 'Failed to load form data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [shipId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    
    // Create FormData object as before to handle file upload
    const uploadData = new FormData();

    for (const key in formData) {
      // Exclude Imagename from non-file fields only if a new file is being uploaded
      // The original code was fine, iterating all and manually handling the file vs imagename logic later
      if (formData[key] !== null && formData[key] !== undefined) {
          // Note: FormData keys must match backend expectations, which seem to match frontend state names
          uploadData.append(key, formData[key]);
      }
    }
    
    // Ensure boolean fields are converted to the integer format expected by the backend
    uploadData.set('IsActive', formData.IsActive ? 1 : 0);
    uploadData.set('HasShaPoLi', formData.HasShaPoLi ? 1 : 0);

    if (selectedFile) {
      uploadData.append('image', selectedFile);
      // Remove Imagename from FormData if a new file is being uploaded, otherwise the backend might get confused.
      // We rely on the backend to rename the file and update the DB accordingly.
      uploadData.delete('Imagename');
    } else {
        // If no new file is selected, ensure the Imagename is passed (or a default)
        // This is handled by the initial loop if Imagename is in formData. We re-set it here just in case.
        uploadData.set('Imagename', formData.Imagename || 'default.jpg');
    }

    try {
      // *** UPDATED: Use centralized API function saveVessel, passing the constructed FormData ***
      await saveVessel(shipId, uploadData);
      
      navigate('/app/memp/vessel-info');
    } catch (err) {
      console.error("Error saving vessel:", err);
      // The API function throws an Error object with a message property
      setError(err.message || 'Failed to save vessel. Please check the data and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="loading-state">Loading form...</div>;
  if (error && !shipId) return <div className="error-state">{error}</div>;

  return (
    <div className="vessel-form-container">
      <div className="form-header">
        <h1>{shipId ? 'Edit Vessel' : 'Add New Vessel'}</h1>
        <button type="button" className="back-link" onClick={() => navigate('/app/memp/vessel-info')}>&larr; Back to Vessel List</button>
      </div>

      {error && <p className="form-error-message">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h2><FaShip /> General Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Ship Name</label>
              <input type="text" name="ShipName" value={formData.ShipName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Short Name</label>
              <input type="text" name="Short_Name" value={formData.Short_Name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>IMO Number</label>
              <input type="text" name="IMO_Number" value={formData.IMO_Number} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Year of Build</label>
              <input type="number" name="YearOfBuild" value={formData.YearOfBuild} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label>Vessel Image</label>
              <input type="file" name="image" onChange={handleFileChange} />
            </div>
            
            {shipId && formData.Imagename && (
             <div className="form-group">
             <label>Current Image</label>
      <img
        // *** UPDATED: Point the src to the centralized BASE_PATH ***
        src={`${VESSEL_IMAGE_BASE_PATH}${formData.Imagename}`}
        alt="Current Vessel"
        style={{ maxWidth: '150px', maxHeight: '150px', display: 'block', border: '1px solid #ccc', padding: '5px' }}
        />
       </div> )}
            
            <div className="form-group">
              <label>Ship Type</label>
              <select name="VesselTypeKey" value={formData.VesselTypeKey} onChange={handleChange} required>
                <option value="">Select Ship Type</option>
                {shipTypes.map((type) => (
                  <option key={type.ShipTypeKey} value={type.VesselTypeKey}>
                    {type.ShipTypeDescription}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Ice Class</label>
              <select name="IceClass" value={formData.IceClass} onChange={handleChange}>
                <option value="">Not Ice Class</option>
                {iceClasses.map((iceClass) => (
                  <option key={iceClass.IceClassKey} value={iceClass.IceClassKey}>
                    {iceClass.IceClassDescription}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Pitch</label>
              <input type="number" step="0.01" name="Pitch" value={formData.Pitch} onChange={handleChange} />
            </div>
          </div>
          {shipId && (
            <div className="form-group-checkbox">
              <label>
                <input type="checkbox" name="IsActive" checked={formData.IsActive} onChange={handleChange} />
                Is Active
              </label>
            </div>
          )}
        </div>

        <div className="form-section">
          <h2><FaRulerCombined /> Dimensions</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Length Overall (m)</label>
              <input type="number" name="LengthOverall" value={formData.LengthOverall} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Breadth (m)</label>
              <input type="number" name="Breadth" value={formData.Breadth} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Depth (m)</label>
              <input type="number" name="Depth" value={formData.Depth} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Draft Forward (m)</label>
              <input type="number" name="MaxDraftForward" value={formData.MaxDraftForward} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Draft Aft (m)</label>
              <input type="number" name="MaxDraftAft" value={formData.MaxDraftAft} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Displacement (t)</label>
              <input type="number" name="Displacement" value={formData.Displacement} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2><FaWeightHanging /> Capacities & Tonnage</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Deadweight (DWT)</label>
              <input type="number" name="CapacityDWT" value={formData.CapacityDWT} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Gross Tonnage (GT)</label>
              <input type="number" name="CapacityGT" value={formData.CapacityGT} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Net Tonnage</label>
              <input type="number" name="NetTonnage" value={formData.NetTonnage} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>TEU Capacity</label>
              <input type="number" name="CapacityTEU" value={formData.CapacityTEU} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>CBM Capacity (m³)</label>
              <input type="number" name="CapacityCBM" value={formData.CapacityCBM} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Passengers</label>
              <input type="number" name="CapacityPassengers" value={formData.CapacityPassengers} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2><FaInfoCircle /> Identifiers & Compliance</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Flag State</label>
              <input type="text" name="FlagState" value={formData.FlagState} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Port of Registry</label>
              <input type="text" name="PortOfRegistry" value={formData.PortOfRegistry} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Call Sign</label>
              <input type="text" name="CallSign" value={formData.CallSign} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>MMSI</label>
              <input type="text" name="MMSI" value={formData.MMSI} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Class Society</label>
              <input type="text" name="ClassSociety" value={formData.ClassSociety} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>EEDI</label>
              <input type="number" step="0.0001" name="EEDI" value={formData.EEDI} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>EEXI</label>
              <input type="number" step="0.0001" name="EEXI" value={formData.EEXI} onChange={handleChange} />
            </div>
            <div className="form-group-checkbox">
              <label>
                <input type="checkbox" name="HasShaPoLi" checked={formData.HasShaPoLi} onChange={handleChange} />
                Has Shaft Power Limitation
              </label>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={() => navigate('/app/memp/vessel-info')} disabled={isSaving}>
            <FaTimes /> Cancel
          </button>
          <button type="submit" className="btn-save" disabled={isSaving}>
            {isSaving ? 'Saving...' : <><FaSave /> Save</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEditVesselPage;