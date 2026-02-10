import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaEye, FaEdit, FaTrashAlt, FaShip, FaFilePdf } from 'react-icons/fa';
// import axios from 'axios'; // REMOVED
import debounce from 'lodash.debounce';
import Select from 'react-select';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import './BunkerManagementPage.css';
// *** ADDED: Import centralized API functions and constant ***
import { 
    fetchBunkeringRecords, 
    fetchActiveVesselsForBunkering, 
    deactivateBunkerRecord,
    getBunkerAttachmentUrl // New helper for file URLs
} from '../api';


const BunkerManagementPage = () => {
    const [bunkers, setBunkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [activeVessels, setActiveVessels] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const navigate = useNavigate();

    const fetchBunkersData = useCallback(async (vesselId) => {
        setLoading(true);
        setError('');
        try {
            // *** UPDATED: Use centralized API function fetchBunkeringRecords ***
            // This function handles fetching records AND their attachments, matching the original component logic
            const recordsWithAttachments = await fetchBunkeringRecords(vesselId);
            setBunkers(recordsWithAttachments);
        } catch (err) {
            console.error("Error fetching bunkering records:", err);
            setError(err.message || 'Error fetching bunkering records.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Original component used debounce on this fetcher, we keep it.
    const fetchActiveVesselsData = useCallback(debounce(async () => {
        try {
            // *** UPDATED: Use centralized API function fetchActiveVesselsForBunkering ***
            const data = await fetchActiveVesselsForBunkering();
            setActiveVessels(data.map(vessel => ({
                value: vessel.ShipID,
                label: `${vessel.ShipName} (${vessel.IMO_Number})`,
            })));
        } catch (err) {
            console.error("Error fetching active vessels:", err);
            setError(err.message || 'Error fetching active vessels.');
        }
    }, 300), []);

    useEffect(() => {
        fetchActiveVesselsData();
        fetchBunkersData(null); // Fetch all bunkers initially
    }, [fetchActiveVesselsData, fetchBunkersData]);

    const handleVesselChange = (selectedOption) => {
        setSelectedVessel(selectedOption);
        fetchBunkersData(selectedOption ? selectedOption.value : null);
    };

    const handleDeleteClick = (recordId) => {
        setRecordToDelete(recordId);
        setShowDeleteModal(true);
    };

    const handleDeactivate = async () => {
        if (recordToDelete) {
            try {
                // *** UPDATED: Use centralized API function deactivateBunkerRecord ***
                await deactivateBunkerRecord(recordToDelete);
                // Optimistically update state OR refetch list
                setBunkers(bunkers.map(b => b.BunkerRecordID === recordToDelete ? { ...b, IsActive: 0 } : b));
            } catch (err) {
                console.error("Error deactivating bunker record:", err);
                setError(err.message || 'Failed to deactivate record.');
            } finally {
                setShowDeleteModal(false);
                setRecordToDelete(null);
            }
        }
    };

    if (loading) {
        return <div className="loading-state">Loading bunkering records...</div>;
    }

    if (error) {
        return <div className="error-state">{error}</div>;
    }

    const formatFuelType = (bunker) => {
        if (bunker.BunkerCategory === 'FUEL' && bunker.FuelTypeDescription) {
            return bunker.FuelTypeDescription;
        }
        if (bunker.BunkerCategory === 'LUBE_OIL' && bunker.LubeOilTypeDescription) {
            return bunker.LubeOilTypeDescription;
        }
        return 'N/A';
    };

    return (
        <div className="bunker-management-container">
            <header className="bunker-management-header">
                <h1>Bunker Records</h1>
                {/*} <div className="action-buttons">
                    <Link to="/app/memp/bunkering-management/add" className="add-button">
                        <FaPlus /> Add New Record
                    </Link>
                </div> */}
            </header>

            <div className="filter-controls">
                <div className="filter-group">
                    <label htmlFor="vessel-filter"><FaShip /> Filter by Vessel:</label>
                    <Select
                        id="vessel-filter"
                        options={activeVessels}
                        value={selectedVessel}
                        onChange={handleVesselChange}
                        placeholder="Select a Vessel..."
                        isClearable
                        classNamePrefix="react-select"
                    />
                </div>
            </div>

            <main className="bunker-table-container">
                <table className="bunker-table">
                    <thead>
                        <tr>
                            {/* <th>ID</th> */}
                            <th>Vessel</th>
                            <th>Bunker Number</th>
                            <th>Operation Type</th>
                            <th>Date</th>
                            <th>Port</th>
                            <th>Bunker Type</th>
                            <th>Bunker Quantity (MT)</th>
                            <th>Status</th>
                            <th>BDN Document</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bunkers.length > 0 ? (
                            bunkers.map((bunker) => (
                                <tr key={bunker.BunkerRecordID}>
                                    {/* <td>{bunker.BunkerRecordID}</td> */}
                                    <td>{bunker.ShipName}</td>
                                    <td>{bunker.BDN_Number || 'N/A'}</td>
                                    <td>{bunker.OperationType || 'N/A'}</td>
                                    <td>{bunker.BunkerDate.slice(0, 16).replace('T', ' ')}</td>
                                    <td>{bunker.BunkerPortName}</td>
                                    <td>{formatFuelType(bunker)}</td>
                                    <td>{bunker.Bunkered_Quantity}</td>
                                    <td>
                                        <span className={`status-badge ${bunker.IsActive ? 'active' : 'inactive'}`}>
                                            {bunker.IsActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="document-cell">
                                        {bunker.attachments && bunker.attachments.length > 0 && (
                                            // *** UPDATED: Use centralized function for attachment URL ***
                                            <a href={getBunkerAttachmentUrl(bunker.attachments[0].Filename)} target="_blank" rel="noopener noreferrer" className="icon-button">
                                                <FaFilePdf title="View BDN Document" />
                                            </a>
                                        )}
                                    </td>
                                    <td className="action-cell">
                                        <div className="action-buttons-group">
                                            <Link to={`/app/memp/bunkering-management/details/${bunker.BunkerRecordID}`} className="icon-button view-icon">
                                                <FaEye />
                                            </Link>
                                            {/*} <Link to={`/app/memp/bunkering-management/edit/${bunker.BunkerRecordID}`} className="icon-button edit-icon">
                                                <FaEdit />
                                            </Link>
                                            <button onClick={() => handleDeleteClick(bunker.BunkerRecordID)} className="icon-button delete-icon" disabled={!bunker.IsActive}>
                                                <FaTrashAlt />
                                            </button> */}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="10" className="no-records-found">No bunkering records found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </main>

            <DeleteConfirmationModal
                show={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeactivate}
                title="Deactivate Bunker Record"
                body="Are you sure you want to deactivate this bunker record? This action cannot be undone."
            />
        </div>
    );
};

export default BunkerManagementPage;