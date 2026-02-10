import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_GATEWAY_URL } from '../config/apiConfig';
// 🟢 UPDATED: Import secured API functions
import { 
    fetchVessels, 
    fetchAdditiveTypes, 
    fetchFuelTypes, 
    fetchAdditiveDosingRefs, 
    fetchAdditiveEvents, 
    deleteAdditiveEvent 
} from '../api';
import AdditiveReportView from "../components/MEMP/AdditiveReportView.jsx";
import AddEditAdditive from "../components/MEMP/AddEditAdditive.jsx"; 
import './AdditivePage.css';

const AdditivePage = () => {
  const navigate = useNavigate();

  // --- VIEW STATE ---
  const [viewMode, setViewMode] = useState('list');
  
  // --- FILTERS STATE ---
  const [filters, setFilters] = useState({
      shipId: 0,
      typeId: 0,
      searchRef: '' // This will now store the selected dropdown value
  });

  // --- DATA STATE ---
  const [events, setEvents] = useState([]);
  const [ships, setShips] = useState([]);
  const [types, setTypes] = useState([]);
  const [fuels, setFuels] = useState([]);
  
  // 🟢 NEW: State for Dosing Ref Dropdown
  const [dosingRefs, setDosingRefs] = useState([]); 

  const [loading, setLoading] = useState(true);
  const [currentEvent, setCurrentEvent] = useState(null); 

  // --- INITIAL DATA LOADING ---
  useEffect(() => {
    // 🟢 SECURED: Using fetchVessels() from api.js which filters by user access
    fetchVessels().then(setShips).catch(console.error);
    fetchAdditiveTypes().then(setTypes).catch(console.error);
    fetchFuelTypes().then(setFuels).catch(console.error);
  }, []);

  // 🟢 NEW EFFECT: Fetch Dosing References when Ship Filter changes
  useEffect(() => {
      fetchAdditiveDosingRefs(filters.shipId)
        .then(setDosingRefs)
        .catch(console.error);
      
      // Reset ref filter when ship changes to avoid invalid selection
      setFilters(prev => ({ ...prev, searchRef: '' }));
  }, [filters.shipId]);

  // --- FETCH EVENTS (With Filters) ---
  useEffect(() => {
    if (viewMode === 'list') {
        const loadEvents = async () => {
            try {
              setLoading(true);
              // 🟢 SECURED: Using fetchAdditiveEvents which applies filterDataByUserAccess
              const data = await fetchAdditiveEvents(filters.shipId, {
                  ref: filters.searchRef,
                  type: filters.typeId
              });
              setEvents(data);
            } catch (err) { console.error(err); setEvents([]); } 
            finally { setLoading(false); }
        };
        loadEvents();
    }
  }, [filters, viewMode]);

  // --- HANDLERS ---
  const handleAddNew = () => { setCurrentEvent(null); setViewMode('form'); };
  const handleEdit = (event) => { setCurrentEvent(event); setViewMode('form'); };
  const handleViewReport = (event) => { setCurrentEvent(event); setViewMode('view'); };
  const handleCancel = () => { setViewMode('list'); };
  const handleSaveSuccess = () => { setViewMode('list'); setFilters({...filters}); }; 
  
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dosing event?')) return;
    try {
      await deleteAdditiveEvent(id);
      setFilters(prev => ({...prev})); 
    } catch (error) { console.error(error); }
  };

  const calculateRatio = (dosing, fuel) => {
      if(!dosing || !fuel || fuel == 0) return "0.00 L/MT";
      return `${(dosing / fuel).toFixed(2)} L/MT`;
  };

  // --- RENDER ---
  return (
    <div className="additive-page-container">
      
      {/* HEADER SECTION */}
      {viewMode === 'list' && (
          <div className="header-actions">
            <h2 style={{margin:0}}>Additive Dosing Register</h2>
            
            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                
                {/* Vessel Filter */}
                <select 
                    value={filters.shipId} 
                    onChange={(e) => setFilters({...filters, shipId: parseInt(e.target.value)})}
                    className="filter-input"
                >
                    <option value="0">-- All Vessels --</option>
                    {ships.map(s => <option key={s.ShipID || s.shipId} value={s.ShipID || s.shipId}>{s.ShipName || s.shipName}</option>)}
                </select>

                {/* Additive Type Filter */}
                <select 
                    value={filters.typeId} 
                    onChange={(e) => setFilters({...filters, typeId: parseInt(e.target.value)})}
                    className="filter-input"
                >
                    <option value="0">-- All Types --</option>
                    {types.map(t => <option key={t.AdditiveTypeID} value={t.AdditiveTypeID}>{t.CategoryName}</option>)}
                </select>

                {/* 🟢 UPDATED: Dosing Ref Dropdown */}
                <select 
                    value={filters.searchRef} 
                    onChange={(e) => setFilters({...filters, searchRef: e.target.value})}
                    className="filter-input"
                    style={{minWidth:'150px'}}
                >
                    <option value="">-- All Dosing IDs --</option>
                    {dosingRefs.map((ref, idx) => (
                        <option key={idx} value={ref.DosingReferenceID}>
                            {ref.DosingReferenceID}
                        </option>
                    ))}
                </select>

                <button className="btn-secondary" onClick={() => navigate('/app/memp/additives/dashboard')}>
                    📊 Analytics
                </button>
                
                <button className="btn-add" onClick={handleAddNew}>+ New Blend</button>
            </div>
          </div>
      )}

      {/* HEADER FOR FORM MODE */}
      {viewMode === 'form' && (
          <div className="header-actions">
             <h2 style={{margin:0}}>{currentEvent ? 'Edit Blend Operation' : 'New Blend Operation'}</h2>
             <button className="btn-secondary" onClick={handleCancel}>Back to List</button>
          </div>
      )}

      {/* --- LIST VIEW --- */}
      {viewMode === 'list' && (
        <div className="table-container">
            {loading ? <div className="loading-state">Loading records...</div> : (
                <table className="memp-table">
                <thead>
                    <tr>
                    <th>Date</th>
                    <th>Vessel</th>
                    <th>Ref ID</th>
                    <th>Additive</th>
                    <th>Fuel Treated</th>
                    <th>Ratio (L/MT)</th>
                    <th>Machinery</th>
                    <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {events.length === 0 ? (
                        <tr><td colSpan="8" style={{textAlign:'center'}}>No dosing events found.</td></tr>
                    ) : (
                        events.map((e) => (
                            <tr key={e.DosingEventID}>
                            <td>{new Date(e.DosingDateLocal).toLocaleDateString()}</td>
                            <td><strong>{e.ShipName}</strong></td>
                            <td style={{color:'#666', fontSize:'0.85rem'}}>{e.DosingReferenceID}</td>
                            <td>{e.AdditiveName}<br/><small>{e.CategoryName}</small></td>
                            <td>{e.FuelTypeKey}<br/><small>{e.FuelQuantityBlended} MT</small></td>
                            <td>
                                <strong>{calculateRatio(e.DosingQuantity, e.FuelQuantityBlended)}</strong>
                                <br/>
                                <small className="text-muted">
                                    {((e.DosingQuantity / e.FuelQuantityBlended) * 1000).toFixed(0)} PPM
                                </small>
                            </td>
                            <td>{e.TreatedMachinery}</td>
                            <td>
                                <div style={{display:'flex', gap:'5px'}}>
                                    <button className="btn-icon view" title="View" onClick={() => handleViewReport(e)}>👁️</button>
                                    <button className="btn-icon edit" title="Edit" onClick={() => handleEdit(e)}>✏️</button>
                                    <button className="btn-icon delete" title="Delete" onClick={() => handleDelete(e.DosingEventID)}>🗑️</button>
                                </div>
                            </td>
                            </tr>
                        ))
                    )}
                </tbody>
                </table>
            )}
        </div>
      )}

      {/* --- REPORT VIEW --- */}
      {viewMode === 'view' && currentEvent && (
          <AdditiveReportView 
            event={currentEvent} 
            onBack={() => setViewMode('list')}
            onEdit={handleEdit}
          />
      )}

      {/* --- FORM VIEW --- */}
      {viewMode === 'form' && (
        <AddEditAdditive 
            editEvent={currentEvent}
            ships={ships}
            types={types}
            fuels={fuels}
            onSave={handleSaveSuccess}
            onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default AdditivePage;