// client/src/pages/VoyageManagementPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios'; // REMOVED
import { Link, useNavigate } from 'react-router-dom'; 
import './VoyageManagementPage.css';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal.jsx';
import { FaPlus, FaEdit, FaTrashAlt, FaEye } from 'react-icons/fa'; 
// *** ADDED: Import centralized API functions ***
// import { fetchVoyages, softDeleteVoyage } from '../api'; // ORIGINAL LINE
// MODIFIED: Import apiClient for direct calls and specific fetchers
import { fetchVoyages, softDeleteVoyage, fetchVessels, apiClient } from '../api';
import AsyncSelect from 'react-select/async'; // ADDED: For Vessel Filter

// REMOVED: Hardcoded API_BASE_URL

// ADDED: Styles for the search dropdown
const customStyles = {
    control: (provided) => ({
        ...provided,
        minWidth: '250px',
        borderColor: '#ccc',
    }),
    menu: (provided) => ({
        ...provided,
        zIndex: 9999,
    })
};

const VoyageManagementPage = () => {
    const navigate = useNavigate();
    const [voyages, setVoyages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingVoyageId, setDeletingVoyageId] = useState(null);

    // ADDED: State for Vessel Filter
    const [selectedVessel, setSelectedVessel] = useState(null);

    // Function to fetch voyages from the backend
    const fetchVoyagesData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // *** UPDATED: Use centralized API function fetchVoyages ***
            // const activeVoyages = await fetchVoyages(); // ORIGINAL LINE COMMENTED
            
            // MODIFIED: Logic to fetch all or filter by ship
            let activeVoyages = [];
            if (selectedVessel) {
                // If a vessel is selected, fetch specific voyages
                const response = await apiClient.get(`/voyages/ship/${selectedVessel.value}`);
                activeVoyages = response.data;
            } else {
                // Otherwise fetch all (Now SECURED in api.js)
                activeVoyages = await fetchVoyages();
            }

            setVoyages(activeVoyages);
        } catch (err) {
            console.error("Error fetching voyages:", err);
            setError(err.message || 'Failed to load voyage data.');
            setVoyages([]);
        } finally {
            setLoading(false);
        }
    }, [selectedVessel]); // ADDED: Dependency on selectedVessel

    // Fetch voyages on component mount
    useEffect(() => {
        fetchVoyagesData();
    }, [fetchVoyagesData]);

    // ADDED: Function to load vessels for the dropdown
    const loadVesselOptions = (inputValue, callback) => {
        // 🟢 SECURED: Using fetchVessels() from api.js which filters by user access
        fetchVessels()
            .then(allShips => {
                // Filter client-side based on search term
                const filtered = allShips.filter(s => 
                    (s.ShipName || s.shipName || '').toLowerCase().includes(inputValue.toLowerCase())
                );
                const options = filtered.map(ship => ({
                    value: ship.ShipID || ship.shipId,
                    label: ship.ShipName || ship.shipName
                }));
                callback(options);
            })
            .catch(err => {
                console.error("Error loading vessels", err);
                callback([]);
            });
    };

    // ADDED: Handler for Vessel Selection
    const handleVesselChange = (selectedOption) => {
        setSelectedVessel(selectedOption);
        // Effect hook will trigger fetchVoyagesData automatically
    };

    // Handlers for page navigation
    const handleAddVoyage = () => {
        navigate('/app/memp/voyages/add');
    };

    const handleEditVoyage = (voyageId) => {
        navigate(`/app/memp/voyages/edit/${voyageId}`);
    };

    const handleViewDetails = (voyageId) => {
        navigate(`/app/memp/voyages/details/${voyageId}`);
    };

    // Handlers for Delete Modal (Soft Delete)
    const handleDeleteClick = (voyageId) => {
        setDeletingVoyageId(voyageId);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingVoyageId) return;

        try {
            // *** UPDATED: Use centralized API function softDeleteVoyage ***
            await softDeleteVoyage(deletingVoyageId);
            alert('Voyage marked as inactive successfully!');
            fetchVoyagesData(); // Refresh the list after soft delete
        } catch (err) {
            console.error("Error soft deleting voyage:", err);
            alert('Failed to mark voyage as inactive: ' + (err.message || 'An unknown error occurred.'));
        } finally {
            setIsDeleteModalOpen(false);
            setDeletingVoyageId(null);
        }
    };

    if (loading && !voyages.length) { // MODIFIED: Only show loading if no data yet (better UX for filtering)
        return <div className="voyage-loading-state">Loading voyages...</div>;
    }

    // if (error) { // REMOVED: Allow rendering with error banner instead of full page block
    //     return <div className="voyage-error-state">Error: {error}</div>;
    // }

    return (
        <div className="voyage-management-container">
            <div className="voyage-page-header">
                <h1>Voyage Management</h1>
                <div className="voyage-actions">
                    {/* RESTORED: Create Button */}
                    {/* COMMENTED OUT ADD BUTTON START */}
                    {/* <button onClick={handleAddVoyage} className="add-voyage-button">
                        <FaPlus /> Create New Voyage
                    </button> */}
                    {/* COMMENTED OUT ADD BUTTON END */}
                    
                    {/* Assuming this link goes to the MEMP Overview page */}
                    <Link to="/app/memp" className="global-back-link">
                        &larr; Back to MEMP Overview
                    </Link>
                </div>
            </div>

            {/* ADDED: Filter Section */}
            <div className="voyage-filters" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '300px' }}>
                    <AsyncSelect
                        cacheOptions
                        loadOptions={loadVesselOptions}
                        defaultOptions
                        value={selectedVessel}
                        onChange={handleVesselChange}
                        placeholder="Filter by Vessel..."
                        isClearable
                        styles={customStyles}
                    />
                </div>
                {/* Reset Button */}
                {selectedVessel && (
                    <button 
                        onClick={() => setSelectedVessel(null)} 
                        style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                        Clear Filter
                    </button>
                )}
            </div>

            {error && <div className="voyage-error-state">Error: {error}</div>}

            <section className="voyage-list-section">
                <h2>Active Voyages Overview</h2>
                {voyages.length === 0 ? (
                    <p className="no-data-info">No active voyages found. Click "Create New Voyage" to add one.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="voyage-table">
                            <thead>
                                <tr>
                                    <th>Vessel Name</th>
                                    <th>Voyage Number</th>
                                    <th>Departure Port</th>
                                    <th>Arrival Port</th>
                                    <th>Status</th>
                                    {/* MODIFIED: Changed Header from Created Date to Departure Date */}
                                    <th>Departure Date</th> 
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {voyages.map(voyage => (
                                    <tr key={voyage.VoyageID} className={!voyage.IsActive ? 'inactive-voyage-row' : ''}>
                                        <td>{voyage.VesselName || 'N/A'}</td>
                                        <td>{voyage.VoyageNumber || 'N/A'}</td>
                                        <td>{voyage.Departure_Port || 'N/A'}</td>
                                        <td>{voyage.Arrival_Port || 'N/A'}</td>
                                        <td>{voyage.VoyageStatus || 'N/A'}</td>
                                        {/* MODIFIED: Smart Date Display (ATD if available, else ETD (Est), else N/A) */}
                                        <td>
                                            {voyage.ATD 
                                                ? new Date(voyage.ATD).toLocaleDateString() 
                                                : (voyage.ETD_UTC 
                                                    ? `${new Date(voyage.ETD_UTC).toLocaleDateString()} (ETA)` 
                                                    : 'N/A')
                                            }
                                        </td>
                                        <td className="voyage-actions-cell">
                                            {/* RESTORED: Action Buttons */}
                                            <button onClick={() => handleViewDetails(voyage.VoyageID)} className="action-button view-button" title="View Details">
                                                <FaEye />
                                            </button>
                                            
                                            {/* COMMENTED OUT EDIT BUTTON START */}
                                            {/* <button onClick={() => handleEditVoyage(voyage.VoyageID)} className="action-button edit-button" title="Edit Voyage">
                                                <FaEdit />
                                            </button> */}
                                            {/* COMMENTED OUT EDIT BUTTON END */}

                                            {/* COMMENTED OUT DELETE BUTTON START */}
                                            {/* <button onClick={() => handleDeleteClick(voyage.VoyageID)} className="action-button delete-button" title="Soft Delete Voyage">
                                                <FaTrashAlt />
                                            </button> */}
                                            {/* COMMENTED OUT DELETE BUTTON END */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Delete Confirmation Modal (still used) */}
            {isDeleteModalOpen && (
                <DeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    message="Are you sure you want to soft delete this voyage? It will be marked as inactive and will not appear in this list."
                />
            )}
        </div>
    );
};

export default VoyageManagementPage;