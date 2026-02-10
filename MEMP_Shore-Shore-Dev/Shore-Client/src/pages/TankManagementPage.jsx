import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaEye, FaTachometerAlt } from 'react-icons/fa';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import AsyncSelect from 'react-select/async'; // For Vessel filter dropdown
import debounce from 'lodash.debounce'; // For AsyncSelect
import './TankManagementPage.css';

const API_BASE_URL = 'http://localhost:7000/api';
//const API_BASE_URL = 'https://veemsonboardupgrade.theviswagroup.com/api';


const TankManagementPage = () => {
    const [tanks, setTanks] = useState([]);
    const [loading, setLoading] = useState(false); // Changed initial loading to false
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tankToDeleteId, setTankToDeleteId] = useState(null);
    const [selectedVessel, setSelectedVessel] = useState(null); // State for selected vessel filter
    const navigate = useNavigate();

    // Modified fetchTanks to fetch only for a specific vessel ID
    // This function is now only called when a vessel is selected.
    const fetchTanksForSelectedVessel = async (vesselId) => {
        setLoading(true);
        setError('');
        try {
            const url = `${API_BASE_URL}/tanks/by-vessel/${vesselId}`;
            const response = await axios.get(url);
            setTanks(response.data);
        } catch (err) {
            setError('Failed to fetch tanks for the selected vessel.');
            console.error('Error fetching tanks by vessel:', err);
        } finally {
            setLoading(false);
        }
    };

    // Effect to refetch tanks when selectedVessel changes, or clear if no vessel
    useEffect(() => {
        if (selectedVessel) {
            fetchTanksForSelectedVessel(selectedVessel.value);
        } else {
            setTanks([]); // Clear tanks if no vessel is selected
            setError(''); // Clear any previous error
            setLoading(false); // Ensure loading state is reset
        }
    }, [selectedVessel]);

    // Debounced function to load vessel options for AsyncSelect
    const loadVesselOptions = useCallback(debounce(async (inputValue, callback) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/ships/active`, {
                params: { search: inputValue }
            });
            const options = response.data.map(v => ({ value: v.ShipID, label: `${v.ShipName} (${v.IMO_Number})` }));
            callback(options);
        } catch (err) {
            console.error("[TankManagementPage] Error loading vessel options:", err);
            callback([]);
        }
    }, 300), []);

    // Handler for vessel filter dropdown change
    const handleVesselFilterChange = (selectedOption) => {
        setSelectedVessel(selectedOption);
    };

    const handleAddNewTank = () => {
        const vesselId = selectedVessel ? selectedVessel.value : '';
        // Navigate to add tank page, optionally with pre-selected vessel ID
        navigate(`/app/memp/tank-management/add${vesselId ? `/${vesselId}` : ''}`);
    };

    const handleEditTank = (tankId) => {
        navigate(`/app/memp/tank-management/edit/${tankId}`);
    };

    const handleDeleteClick = (tankId) => {
        setTankToDeleteId(tankId);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        setShowDeleteModal(false);
        if (tankToDeleteId) {
            try {
                await axios.patch(`${API_BASE_URL}/tanks/${tankToDeleteId}/deactivate`);
                // Only refetch if a vessel is currently selected
                if (selectedVessel) {
                    fetchTanksForSelectedVessel(selectedVessel.value);
                } else {
                    // If no vessel selected, and a tank was deactivated, ensure list remains empty
                    setTanks([]);
                }
            } catch (err) {
                setError('Failed to deactivate tank.');
                console.error('Error deactivating tank:', err);
            } finally {
                setTankToDeleteId(null);
            }
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setTankToDeleteId(null);
    };

    if (loading) return <div className="loading-state">Loading tanks...</div>;
    // Removed the error state check here to allow for initial empty state display
    // if (error) return <div className="error-state">{error}</div>; // Keep for fetching errors

    return (
        <div className="tank-management-container">
            <div className="page-header">
                <h1><FaTachometerAlt className="header-icon" /> Tank Management</h1>
                <div className="header-actions">
                    {/* Vessel Filter Dropdown */}
                    <div className="vessel-filter-dropdown">
                        <AsyncSelect
                            cacheOptions={false}
                            loadOptions={loadVesselOptions}
                            defaultOptions={true}
                            value={selectedVessel}
                            onChange={handleVesselFilterChange}
                            placeholder="Filter by Vessel"
                            isClearable
                            classNamePrefix="react-select"
                            styles={{ menu: (provided) => ({ ...provided, zIndex: 9999 }) }}
                        />
                    </div>
                    <button className="add-button" onClick={handleAddNewTank}>
                        <FaPlus className="btn-icon" /> Add New Tank
                    </button>
                </div>
            </div>

            {error && <div className="error-state">{error}</div>} {/* Display error here */}

            {tanks.length === 0 && !loading && !error ? ( // Check loading and error states
                <p className="no-records-message">{selectedVessel ? `No tanks found for ${selectedVessel.label}.` : `Please select a vessel to view its tanks.`}</p>
            ) : (
                tanks.length > 0 && ( // Only render table if tanks exist
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tank Name</th>
                                    <th>Vessel</th>
                                    <th>Tank Type</th> {/* Tank Type will still show Designation in TankManagementPage */}
                                    <th>Capacity (m³)</th>
                                    <th>Current Qty (MT)</th> {/* ADDED */}
                                    <th>Current Vol (m³)</th> {/* ADDED */}
                                    <th>Content</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tanks.map(tank => (
                                    <tr key={tank.VesselTankID}>
                                        <td>{tank.Tank_Name}</td>
                                        <td>{tank.ShipName} ({tank.IMO_Number})</td>
                                        <td>{tank.TankDesignation || tank.TankType}</td>
                                        <td>{tank.CapacityM3}</td>
                                        <td>{tank.CurrentQuantityMT !== null ? tank.CurrentQuantityMT : 'N/A'}</td> {/* ADDED */}
                                        <td>{tank.CurrentVolumeM3 !== null ? tank.CurrentVolumeM3 : 'N/A'}</td>   {/* ADDED */}
                                        <td>{tank.ContentCategory} - {tank.ContentTypeKey || 'N/A'}</td>
                                        <td>
                                            <span className={`status-badge ${tank.IsActive ? 'active' : 'inactive'}`}>
                                                {tank.IsActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="actions-icons">
                                            <Link to={`/app/memp/tank-management/details/${tank.VesselTankID}`} className="action-icon-btn view-icon">
                                                <FaEye />
                                            </Link>
                                            <button className="action-icon-btn edit-icon" onClick={() => handleEditTank(tank.VesselTankID)}>
                                                <FaEdit />
                                            </button>
                                            {tank.IsActive === 1 && (
                                                <button className="action-icon-btn delete-icon" onClick={() => handleDeleteClick(tank.VesselTankID)}>
                                                    <FaTrash />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {showDeleteModal && (
                <DeleteConfirmationModal
                    message="Are you sure you want to deactivate this tank?"
                    onConfirm={handleConfirmDelete}
                    onCancel={handleCancelDelete}
                />
            )}
        </div>
    );
};

export default TankManagementPage;