// src/pages/AddEditFleetPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchFleetDetails, saveFleet, getFleetLogoUrl, fetchShipsForMapping, mapVesselsToFleet, softDeleteFleet } from '../api.js';
import { FaCamera, FaArrowLeft, FaCheck, FaShip, FaPlus, FaTimes } from 'react-icons/fa';
import './AddEditFleetPage.css'; 

const DEFAULT_FLEET_LOGO_PATH = '/menu-backgrounds/Fleet.jpg'; 

const AddEditFleetPage = () => {
    const { fleetId } = useParams();
    const navigate = useNavigate();
    
    const isEditMode = window.location.pathname.includes('/edit');
    const isViewMode = !isEditMode && fleetId;

    const [fleet, setFleet] = useState({
        fleetId: null,
        fleetName: '',
        description: '',
        logoFilename: null,
        isActive: true,
    });

    // We keep all fetched vessels here
    const [allVessels, setAllVessels] = useState([]);
    // Track selected IDs
    const [selectedShipIds, setSelectedShipIds] = useState([]); 

    const [loading, setLoading] = useState(!!fleetId);
    const [submitting, setSubmitting] = useState(false);
    
    const [file, setFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    const loadFleetAndVessels = useCallback(async () => {
        setLoading(true);
        try {
            let initialFleetData = { fleetId: null, fleetName: '', description: '', logoFilename: null, isActive: true };
            const idToUse = fleetId ? parseInt(fleetId) : 0;
            
            if (idToUse) {
                initialFleetData = await fetchFleetDetails(idToUse);
            }

            // Fetch ships available for mapping (Returns Current + Unmapped)
            const vessels = await fetchShipsForMapping(idToUse);
            setAllVessels(vessels);

            // Determine mapped ships (Pre-check ships belonging to this fleet)
            const currentFleetShipIds = vessels
                .filter(v => v.fleetId === initialFleetData.fleetId)
                .map(v => v.shipId);
            
            setSelectedShipIds(currentFleetShipIds);
            setFleet(initialFleetData);
            
            if (initialFleetData.logoFilename) {
                const fullLogoPath = getFleetLogoUrl(initialFleetData.logoFilename) + `?t=${Date.now()}`;
                setLogoPreview(fullLogoPath);
            } else {
                setLogoPreview(null);
            }
            
        } catch (err) {
            alert(`Error loading data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [fleetId]);

    useEffect(() => {
        loadFleetAndVessels();
    }, [loadFleetAndVessels]);

    const handleChange = (e) => {
        if (isViewMode) return;
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setFleet(prev => ({ ...prev, [name]: val }));
    };

    const toggleShipSelection = (shipId) => {
        if (isViewMode) return;
        setSelectedShipIds(prevIds => {
            if (prevIds.includes(shipId)) {
                return prevIds.filter(id => id !== shipId);
            } else {
                return [...prevIds, shipId];
            }
        });
    };

    const handleFileChange = (e) => {
        if (isViewMode) return;
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const objectUrl = URL.createObjectURL(selectedFile);
            setLogoPreview(objectUrl);
        }
    };

    const handleDeleteFleet = async () => {
        if (!window.confirm("Are you sure you want to deactivate this fleet?")) return;
        try {
            await softDeleteFleet(fleetId);
            alert("Fleet deactivated successfully.");
            navigate('/app/memp/admin/fleets');
        } catch (error) {
            alert(`Failed to delete fleet: ${error.message}`);
        }
    };

    const validateForm = () => {
        if (!fleet.fleetName.trim()) {
            alert('Fleet Name is required.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isViewMode) return;
        if (!validateForm()) return;
        
        setSubmitting(true);
        let finalFleetId = fleetId;

        try {
            const formData = new FormData();
            formData.append('FleetName', fleet.fleetName);
            formData.append('Description', fleet.description || '');
            formData.append('IsActive', fleet.isActive); 

            if (file) {
                formData.append('logo', file);
            } else {
                formData.append('ExistingLogoFilename', fleet.logoFilename || '');
            }

            const saveResponse = await saveFleet(fleetId, formData);
            
            if (!fleetId && saveResponse.FleetID) {
                finalFleetId = saveResponse.FleetID;
            }

            if (finalFleetId) {
                await mapVesselsToFleet(finalFleetId, selectedShipIds);
            }

            alert(`Fleet ${fleetId ? 'updated' : 'added'} successfully!`);
            navigate('/app/memp/admin/fleets');

        } catch (err) {
            alert(`Save failed: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Separate vessels into two groups
    const assignedVessels = allVessels.filter(v => selectedShipIds.includes(v.shipId));
    const availableVessels = allVessels.filter(v => !selectedShipIds.includes(v.shipId));

    // Helper Component for Vessel Chip
    const VesselChip = ({ vessel, isAssigned }) => (
        <div 
            key={vessel.shipId} 
            className={`vessel-chip ${isAssigned ? 'assigned' : 'available'} ${isViewMode ? 'disabled' : ''}`}
            onClick={() => toggleShipSelection(vessel.shipId)}
        >
            <div className="vessel-icon">
                <FaShip />
            </div>
            <div className="vessel-info">
                <span className="v-name">{vessel.shipName}</span>
                <span className="v-imo">IMO: {vessel.imoNumber}</span>
            </div>
            {!isViewMode && (
                <div className="action-icon">
                    {isAssigned ? <FaTimes title="Unmap Vessel" /> : <FaPlus title="Map Vessel" />}
                </div>
            )}
        </div>
    );

    if (loading) return <div className="loading-screen">Loading...</div>;

    const displayImageSrc = logoPreview || DEFAULT_FLEET_LOGO_PATH;
    const pageTitle = fleetId ? (isEditMode ? 'Edit Fleet' : 'Fleet Details') : 'Create Fleet';
    const breadcrumbName = fleet.fleetName || 'New Fleet';

    return (
        <div className="modern-fleet-page">
            
            <div className="page-header-simple">
                <div className="breadcrumb-area">
                    <span className="breadcrumb-link" onClick={() => navigate('/app/memp')}>MEMP</span>
                    <span className="separator">•</span>
                    <span className="breadcrumb-link" onClick={() => navigate('/app/memp/admin/fleets')}>Fleets</span>
                    <span className="separator">•</span>
                    <span className="current-page">{breadcrumbName}</span>
                </div>
                <h1 className="page-heading">{pageTitle}</h1>
            </div>

            <form onSubmit={handleSubmit} className="split-layout-container">
                
                {/* Left Column: Logo Card */}
                <div className="left-column">
                    <div className="profile-card card-shadow">
                        <div className="profile-img-container">
                            <img 
                                src={displayImageSrc} 
                                alt="Fleet Logo" 
                                className="profile-avatar"
                                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_FLEET_LOGO_PATH; }}
                            />
                            {!isViewMode && (
                                <div className="upload-overlay">
                                    <label htmlFor="file-upload" className="upload-btn-icon">
                                        <FaCamera />
                                    </label>
                                </div>
                            )}
                        </div>
                        
                        {!isViewMode && (
                            <>
                                <div className="upload-instruction">
                                    <label htmlFor="file-upload" className="upload-link">Upload Logo</label>
                                    <input id="file-upload" type="file" onChange={handleFileChange} accept="image/*" />
                                </div>
                                <div className="status-toggles">
                                    <div className="toggle-row">
                                        <span className="toggle-label">Active Fleet</span>
                                        <label className="switch">
                                            <input type="checkbox" name="isActive" checked={fleet.isActive} onChange={handleChange} />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                </div>
                                {fleetId && (
                                    <button type="button" className="delete-user-btn" onClick={handleDeleteFleet}>
                                        Deactivate Fleet
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Column: Details Form */}
                <div className="right-column">
                    <div className="details-card card-shadow">
                        <div className="form-grid-1-col">
                            <div className="input-group">
                                <label>Fleet Name <span className="req">*</span></label>
                                <input type="text" name="fleetName" value={fleet.fleetName} onChange={handleChange} required readOnly={isViewMode} className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea name="description" value={fleet.description || ''} onChange={handleChange} readOnly={isViewMode} className="modern-input" rows="3" />
                            </div>
                        </div>

                        {/* VESSEL MAPPING SECTION (SPLIT VIEW) */}
                        <div className="vessel-mapping-section">
                            <h3 className="section-title">Vessel Assignment</h3>
                            
                            {/* 1. ASSIGNED VESSELS */}
                            <div className="vessel-group assigned-group">
                                <div className="group-header">
                                    <span className="group-label">Currently Assigned</span>
                                    <span className="group-count badge-green">{assignedVessels.length}</span>
                                </div>
                                <div className="vessel-list">
                                    {assignedVessels.length > 0 ? (
                                        assignedVessels.map(v => <VesselChip key={v.shipId} vessel={v} isAssigned={true} />)
                                    ) : (
                                        <div className="empty-slot-message">No vessels assigned to this fleet yet.</div>
                                    )}
                                </div>
                            </div>

                            {/* 2. AVAILABLE VESSELS */}
                            {!isViewMode && (
                                <div className="vessel-group available-group">
                                    <div className="group-header">
                                        <span className="group-label">Available to Add (Unmapped)</span>
                                        <span className="group-count badge-gray">{availableVessels.length}</span>
                                    </div>
                                    <div className="vessel-list">
                                        {availableVessels.length > 0 ? (
                                            availableVessels.map(v => <VesselChip key={v.shipId} vessel={v} isAssigned={false} />)
                                        ) : (
                                            <div className="empty-slot-message">No unmapped vessels available.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="card-footer">
                            {!isViewMode && <button type="submit" className="save-changes-btn" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button>}
                            {isViewMode && <button type="button" className="save-changes-btn" onClick={() => navigate(`/app/memp/admin/fleets/${fleetId}/edit`)}>Edit Fleet</button>}
                            <button type="button" className="cancel-btn" onClick={() => navigate('/app/memp/admin/fleets')}>Cancel</button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddEditFleetPage;