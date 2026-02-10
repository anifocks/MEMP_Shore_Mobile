// 4 ROB Implementataion/Client/src/pages/VesselInfoPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// import axios from 'axios'; // REMOVED: Replaced with API functions
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa'; 
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import './VesselInfoPage.css';
// *** ADDED: Import centralized API functions ***
import { fetchVessels, deactivateVessel } from '../api';

// REMOVED: Hardcoded API_BASE_URL is replaced by centralized functions from api.js
// const API_BASE_URL = 'http://localhost:7000/api';

const VesselInfoPage = () => {
    const [ships, setShips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [shipToDeleteId, setShipToDeleteId] = useState(null);
    const navigate = useNavigate();

    const fetchShips = async () => {
        setLoading(true);
        setError('');
        try {
            // *** UPDATED: Use centralized API function fetchVessels ***
            const data = await fetchVessels();
            setShips(data);
        } catch (err) {
            // The API function throws an Error object with a message property
            setError(err.message || 'Failed to fetch vessels.');
            console.error('Error fetching ships:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShips();
    }, []);

    const handleAddNewVessel = () => {
        navigate('/app/memp/add-vessel');
    };

    const handleEditVessel = (shipId) => {
        navigate(`/app/memp/edit-vessel/${shipId}`);
    };

    const handleDeleteClick = (shipId) => {
        setShipToDeleteId(shipId);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        setShowDeleteModal(false);
        if (shipToDeleteId) {
            try {
                // *** UPDATED: Use centralized API function deactivateVessel ***
                await deactivateVessel(shipToDeleteId);
                fetchShips(); // Refresh list after deactivation
            } catch (err) {
                // The API function throws an Error object with a message property
                setError(err.message || 'Failed to deactivate vessel.');
                console.error('Error deactivating vessel:', err);
            } finally {
                setShipToDeleteId(null);
            }
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setShipToDeleteId(null);
    };

    if (loading) return <div className="loading-state">Loading vessels...</div>;
    if (error) return <div className="error-state">{error}</div>;

    return (
        <div className="vessel-info-container">
            <div className="vessel-info-header">
                <h1>Vessel Information</h1>
                <button className="add-vessel-btn" onClick={handleAddNewVessel}>
                    <FaPlus className="btn-icon" /> Add New Vessel
                </button>
            </div>

            {ships.length === 0 ? (
                <p className="no-vessels-message">No vessels found. Click "Add New Vessel" to add one.</p>
            ) : (
                <div className="vessel-table-responsive">
                    <table className="vessel-table">
                        <thead>
                            <tr>
                                <th>IMO Number</th>
                                <th>Ship Name</th>
                                <th>Short Name</th> {/* ADD THIS HEADER*/}
                                <th>Ship Type</th>
                                <th>Capacity DWT</th>
                                <th>Year of Build</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ships.map(ship => (
                                <tr key={ship.ShipID}>
                                    <td>{ship.IMO_Number}</td>
                                    <td>{ship.ShipName}</td>
                                    <td>{ship.Short_Name}</td> {/* ADD THIS CELL*/}
                                    <td>{ship.ShipType || ship.VesselTypeKey}</td>
                                    <td>{ship.CapacityDWT}</td>
                                    <td>{ship.YearOfBuild}</td>
                                    <td>
                                        <span className={`status-badge ${ship.IsActive ? 'active' : 'inactive'}`}>
                                            {ship.IsActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="actions-icons">
                                        <Link to={`/app/memp/vessel-details/${ship.ShipID}`} className="action-icon-btn view-icon">
                                            <FaEye />
                                        </Link>
                                        <button className="action-icon-btn edit-icon" onClick={() => handleEditVessel(ship.ShipID)}>
                                            <FaEdit />
                                        </button>
                                        {ship.IsActive === 1 && (
                                            <button className="action-icon-btn delete-icon" onClick={() => handleDeleteClick(ship.ShipID)}>
                                                <FaTrash />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showDeleteModal && (
                <DeleteConfirmationModal
                    message="Are you sure you want to deactivate this vessel?"
                    onConfirm={handleConfirmDelete}
                    onCancel={handleCancelDelete}
                />
            )}
        </div>
    );
};

export default VesselInfoPage;