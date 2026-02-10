// Shore-Client/src/pages/MachineryPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import './MachineryPage.css';
import AddEditMachineryModal from '../components/MEMP/AddEditMachineryModal';
import { FaPlus, FaTrashAlt, FaEdit, FaEye, FaList, FaThLarge, FaCogs } from 'react-icons/fa'; // Added Icons
import { 
    fetchVessels, 
    fetchMachineryTypes, 
    fetchFuelTypes, 
    fetchAssignedMachinery,
    assignMachineryToVessel,
    deleteMachineryRecord
} from '../api';

const MachineryPage = () => {
    const navigate = useNavigate(); 
    const [ships, setShips] = useState([]);
    const [machineryTypes, setMachineryTypes] = useState([]);
    const [fuelTypes, setFuelTypes] = useState([]);
    const [assignedMachinery, setAssignedMachinery] = useState([]);
    const [selectedShip, setSelectedShip] = useState('');
    
    // --- NEW: View Mode State ---
    const [viewMode, setViewMode] = useState('card'); // Default to 'card' or 'table'
    
    const [selectedMachineryType, setSelectedMachineryType] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMachinery, setEditingMachinery] = useState(null);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [shipsData, typesData, fuelsData] = await Promise.all([
                fetchVessels(),
                fetchMachineryTypes(),
                fetchFuelTypes()
            ]);
            setShips(shipsData || []);
            setMachineryTypes(typesData || []);
            setFuelTypes(fuelsData || []);
        } catch (err) {
            setError(err.message || 'Failed to load initial data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const fetchMachineryForShip = useCallback(async (shipId) => {
        if (!shipId) {
            setAssignedMachinery([]);
            return;
        }
        setLoading(true);
        try {
            const data = await fetchAssignedMachinery(shipId);
            setAssignedMachinery(data || []);
        } catch (err) {
            setError(err.message || 'Failed to load assigned machinery.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMachineryForShip(selectedShip);
    }, [selectedShip, fetchMachineryForShip]);

    const handleAddMachinery = async (e) => {
        e.preventDefault();
        if (!selectedShip || !selectedMachineryType || quantity < 1) {
            alert('Please select a vessel, a machinery type, and enter a valid quantity.');
            return;
        }
        try {
            const payload = {
                machineryTypeKey: selectedMachineryType,
                quantity: quantity,
                username: localStorage.getItem('username') || 'SYSTEM'
            };
            await assignMachineryToVessel(selectedShip, payload);
            alert('Machinery assigned successfully!');
            fetchMachineryForShip(selectedShip); 
            setSelectedMachineryType('');
            setQuantity(1);
        } catch (err) {
            setError(err.message || 'Failed to assign machinery.');
        }
    };

    const handleDeleteMachinery = async (machineryRecordId) => {
        if (!window.confirm('Are you sure you want to delete this machinery record?')) return;
        try {
            const username = localStorage.getItem('username') || 'SYSTEM';
            await deleteMachineryRecord(machineryRecordId, username);
            alert('Machinery record deleted.');
            fetchMachineryForShip(selectedShip);
        } catch (err) {
            setError(err.message || 'Failed to delete machinery.');
        }
    };

    const handleViewMachinery = (machineryRecordId) => {
        navigate(`/app/memp/machinery-details/${machineryRecordId}`);
    };

    const handleOpenEditModal = (machinery) => {
        setEditingMachinery(machinery);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingMachinery(null);
    };

    const handleEditSaveSuccess = () => {
        handleCloseEditModal();
        fetchMachineryForShip(selectedShip);
    };

    return (
        <div className="machinery-page-container">
            <div className="page-header"><h1>Ship Machinery Management</h1></div>
            
            {error && <p className="form-error-message page-level-error">{error}</p>}
            
            <div className="vessel-selection-section">
                <label htmlFor="select-vessel">Select Vessel:</label>
                <select id="select-vessel" value={selectedShip} onChange={e => setSelectedShip(e.target.value)}>
                    <option value="">-- Select a Vessel --</option>
                    {ships.map(ship => <option key={ship.ShipID} value={ship.ShipID}>{ship.ShipName} (IMO: {ship.IMO_Number})</option>)}
                </select>
            </div>

            {selectedShip && (
                <>
                    <section className="add-machinery-section">
                        <h2>Assign New Machinery</h2>
                        <form onSubmit={handleAddMachinery} className="add-machinery-form">
                            <div className="form-group">
                                <label>Machinery Type</label>
                                <select value={selectedMachineryType} onChange={e => setSelectedMachineryType(e.target.value)} required>
                                    <option value="">-- Select Type --</option>
                                    {machineryTypes.map(type => (
                                        <option key={type.MachineryTypeKey} value={type.MachineryTypeKey}>{type.Description}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Quantity</label>
                                <input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value, 10))} required />
                            </div>
                            <button type="submit" className="action-btn add-btn"><FaPlus /> Assign to Vessel</button>
                        </form>
                    </section>

                    <section className="assigned-machinery-section">
                        {/* --- Header with Toggle --- */}
                        <div className="section-header-row">
                            <h2>Assigned Machinery</h2>
                            <div className="view-toggle-container">
                                <button 
                                    className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`} 
                                    onClick={() => setViewMode('table')}
                                    title="Table View"
                                >
                                    <FaList />
                                </button>
                                <button 
                                    className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`} 
                                    onClick={() => setViewMode('card')}
                                    title="Card View"
                                >
                                    <FaThLarge />
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="loading-state">Loading machinery...</div>
                        ) : assignedMachinery.length === 0 ? (
                            <div className="empty-state">No machinery assigned to this vessel.</div>
                        ) : viewMode === 'table' ? (
                            // --- TABLE VIEW ---
                            <div className="table-responsive">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Power (KW)</th>
                                            <th>Manufacturer</th>
                                            <th>Model</th>
                                            <th>Primary Fuel</th>
                                            <th>Actions</th> 
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assignedMachinery.map(m => (
                                            <tr key={m.MachineryRecordID}>
                                                <td>{m.CustomMachineryName}</td>
                                                <td>{m.MachineryTypeDescription}</td>
                                                <td>{m.PowerKW || 'N/A'}</td>
                                                <td>{m.Manufacturer || 'N/A'}</td>
                                                <td>{m.Model || 'N/A'}</td>
                                                <td>{m.PrimaryFuel || 'N/A'}</td>
                                                <td className="actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button className="action-btn-icon view-btn" onClick={() => handleViewMachinery(m.MachineryRecordID)}><FaEye /></button>
                                                    <button className="action-btn-icon edit-btn" onClick={() => handleOpenEditModal(m)}><FaEdit /></button>
                                                    <button className="action-btn-icon delete-btn" onClick={() => handleDeleteMachinery(m.MachineryRecordID)}><FaTrashAlt /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            // --- CARD VIEW (New) ---
                            <div className="machinery-grid">
                                {assignedMachinery.map(m => (
                                    <div key={m.MachineryRecordID} className="machinery-card">
                                        <div className="machinery-card-header">
                                            <div className="machinery-icon"><FaCogs /></div>
                                            <div className="machinery-title">
                                                <h3>{m.CustomMachineryName}</h3>
                                                <span className="machinery-type">{m.MachineryTypeDescription}</span>
                                            </div>
                                        </div>
                                        <div className="machinery-card-body">
                                            <div className="card-detail-item">
                                                <span className="label">Power:</span>
                                                <span className="value">{m.PowerKW ? `${m.PowerKW} kW` : 'N/A'}</span>
                                            </div>
                                            <div className="card-detail-item">
                                                <span className="label">Make:</span>
                                                <span className="value">{m.Manufacturer || 'N/A'}</span>
                                            </div>
                                            <div className="card-detail-item">
                                                <span className="label">Model:</span>
                                                <span className="value">{m.Model || 'N/A'}</span>
                                            </div>
                                            <div className="card-detail-item">
                                                <span className="label">Fuel:</span>
                                                <span className="value">{m.PrimaryFuel || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div className="machinery-card-footer">
                                            <button className="card-action-btn view" onClick={() => handleViewMachinery(m.MachineryRecordID)}>
                                                <FaEye /> View
                                            </button>
                                            <button className="card-action-btn edit" onClick={() => handleOpenEditModal(m)}>
                                                <FaEdit /> Edit
                                            </button>
                                            <button className="card-action-btn delete" onClick={() => handleDeleteMachinery(m.MachineryRecordID)}>
                                                <FaTrashAlt />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            {isEditModalOpen && (
                <AddEditMachineryModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    onSaveSuccess={handleEditSaveSuccess}
                    machinery={editingMachinery}
                    fuelTypes={fuelTypes}
                />
            )}
        </div>
    );
};

export default MachineryPage;