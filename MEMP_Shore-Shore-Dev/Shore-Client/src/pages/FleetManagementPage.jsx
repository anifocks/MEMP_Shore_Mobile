import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFleets, softDeleteFleet, getFleetLogoUrl } from '../api';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaShip } from 'react-icons/fa';
import './FleetManagementPage.css';

const DEFAULT_FLEET_LOGO_PATH = '/menu-backgrounds/Fleet.jpg';

// Static Gradients for Fleet Cards
const CARD_COVERS = [
    'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
    'linear-gradient(135deg, #FDC830 0%, #F37335 100%)',
    'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
];

const getCardCover = (id) => {
    const index = (typeof id === 'number' ? id : 0) % CARD_COVERS.length;
    return { background: CARD_COVERS[index] };
};

const FleetManagementPage = () => {
    const navigate = useNavigate();

    const [fleets, setFleets] = useState([]);
    const [filteredFleets, setFilteredFleets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadFleets();
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredFleets(fleets);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = fleets.filter(f => 
                (f.fleetName && f.fleetName.toLowerCase().includes(lowerTerm)) ||
                (f.description && f.description.toLowerCase().includes(lowerTerm))
            );
            setFilteredFleets(filtered);
        }
    }, [searchTerm, fleets]);

    const loadFleets = async () => {
        try {
            setLoading(true);
            const data = await fetchFleets();
            setFleets(data);
            setFilteredFleets(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (fleetId, fleetName, e) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to deactivate fleet: ${fleetName}?`)) {
            try {
                await softDeleteFleet(fleetId);
                loadFleets();
            } catch (err) {
                alert(`Failed: ${err.message}`);
            }
        }
    };

    const handleEdit = (fleetId, e) => {
        e.stopPropagation();
        // 🟢 FIX: Route within MEMP Admin
        navigate(`/app/memp/admin/fleets/${fleetId}/edit`);
    };

    const handleCardClick = (fleetId) => {
        // 🟢 FIX: Route within MEMP Admin
        navigate(`/app/memp/admin/fleets/${fleetId}/edit`);
    };

    const handleCreate = () => {
        // 🟢 FIX: Route within MEMP Admin
        navigate('/app/memp/admin/fleets/add');
    };

    if (loading) return <div className="loading-screen">Loading Fleets...</div>;

    return (
        <div className="fleet-cards-page">
            <div className="content-container">
                <div className="cards-header">
                    <div className="header-text">
                        <h1 className="page-title">Fleet Directory</h1>
                        <p className="page-subtitle">Manage shipping fleets and vessel assignments</p>
                    </div>
                    
                    <div className="header-controls">
                        <button className="add-fleet-btn" onClick={handleCreate}>
                            <FaPlus /> New Fleet
                        </button>
                    </div>
                </div>

                <div className="search-wrapper">
                    <FaSearch className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Search fleets..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="cards-grid">
                    {filteredFleets.map(fleet => {
                        const logoUrl = fleet.logoFilename ? getFleetLogoUrl(fleet.logoFilename) : DEFAULT_FLEET_LOGO_PATH;
                        const cardStyle = getCardCover(fleet.fleetId);
                        
                        return (
                            <div key={fleet.fleetId} className="profile-card-item" onClick={() => handleCardClick(fleet.fleetId)}>
                                <div className="card-cover" style={cardStyle}>
                                    <div className="cover-overlay"></div>
                                </div>
                                <div className="card-avatar-wrapper">
                                    <img 
                                        src={logoUrl} 
                                        alt="logo" 
                                        className="card-avatar-img"
                                        onError={(e) => e.target.src = DEFAULT_FLEET_LOGO_PATH}
                                    />
                                </div>
                                <div className="card-content">
                                    <h3 className="card-name">{fleet.fleetName}</h3>
                                    <span className="card-role">{fleet.isActive ? 'Active Fleet' : 'Inactive Fleet'}</span>
                                    
                                    <div className="card-actions">
                                        <button className="icon-btn edit" onClick={(e) => handleEdit(fleet.fleetId, e)} title="Edit">
                                            <FaEdit />
                                        </button>
                                        <button className="icon-btn delete" onClick={(e) => handleDelete(fleet.fleetId, fleet.fleetName, e)} title="Deactivate">
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                                <div className="card-stats">
                                    <div className="stat-box">
                                        <span className="stat-label">ID</span>
                                        <span className="stat-value">#{fleet.fleetId}</span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="stat-label">Status</span>
                                        <span className={`stat-value status-${fleet.isActive ? 'active' : 'inactive'}`}>
                                            {fleet.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="stat-label">Type</span>
                                        <span className="stat-value"><FaShip /></span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredFleets.length === 0 && (
                    <div className="empty-state">No fleets found.</div>
                )}
            </div>
        </div>
    );
};

export default FleetManagementPage;