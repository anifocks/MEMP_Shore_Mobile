import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUsers, softDeleteUser, getUserProfileImageUrl } from '../api';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaEnvelope } from 'react-icons/fa';
import './UserManagementPage.css';

const DEFAULT_MEMBER_IMAGE_PATH = '/member_images/default-member.png';

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

const UserManagementPage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { loadUsers(); }, []);

    useEffect(() => {
        if (!searchTerm) { setFilteredUsers(users); } 
        else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = users.filter(user => 
                (user.firstName && user.firstName.toLowerCase().includes(lowerTerm)) ||
                (user.lastName && user.lastName.toLowerCase().includes(lowerTerm)) ||
                (user.username && user.username.toLowerCase().includes(lowerTerm))
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await fetchUsers();
            setUsers(data);
            setFilteredUsers(data);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const handleDelete = async (userId, e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await softDeleteUser(userId);
                setUsers(prev => prev.filter(u => u.userId !== userId));
            } catch (err) { alert(`Failed: ${err.message}`); }
        }
    };

    // 🟢 FIX: Update Routes
    const handleEdit = (userId, e) => {
        e.stopPropagation();
        navigate(`/app/memp/admin/users/${userId}/edit`);
    };

    const handleCardClick = (userId) => {
        navigate(`/app/memp/admin/users/${userId}`);
    };

    const handleCreate = () => {
        navigate('/app/memp/admin/users/add');
    };

    if (loading) return <div className="loading-screen">Loading Profiles...</div>;

    return (
        <div className="user-cards-page">
            <div className="content-container">
                <div className="cards-header">
                    <div className="header-text">
                        <h1 className="page-title">User Directory</h1>
                        <p className="page-subtitle">Manage fleet personnel and administrators</p>
                    </div>
                    <div className="header-controls">
                        <button className="add-user-btn" onClick={handleCreate}>
                            <FaPlus /> New User
                        </button>
                    </div>
                </div>

                <div className="search-wrapper">
                    <FaSearch className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="cards-grid">
                    {filteredUsers.map(user => {
                        const imageUrl = user.imageUrl ? getUserProfileImageUrl(user.imageUrl) : DEFAULT_MEMBER_IMAGE_PATH;
                        const fullName = user.firstName ? `${user.firstName} ${user.lastName}` : user.username;
                        const fleetCount = user.fleet ? user.fleet.split(',').length : 0;
                        const vesselCount = user.vessels ? user.vessels.split(',').length : 0;
                        const cardStyle = getCardCover(user.userId);

                        return (
                            <div key={user.userId} className="profile-card-item" onClick={() => handleCardClick(user.userId)}>
                                <div className="card-cover" style={cardStyle}>
                                    <div className="cover-overlay"></div>
                                </div>
                                <div className="card-avatar-wrapper">
                                    <img 
                                        src={imageUrl} 
                                        alt="avatar" 
                                        className="card-avatar-img"
                                        onError={(e) => e.target.src = DEFAULT_MEMBER_IMAGE_PATH}
                                    />
                                </div>
                                <div className="card-content">
                                    <h3 className="card-name">{fullName}</h3>
                                    <span className="card-role">{user.userRights || 'Vessel User'}</span>
                                    <div className="card-actions">
                                        <button className="icon-btn edit" onClick={(e) => handleEdit(user.userId, e)} title="Edit"><FaEdit /></button>
                                        <button className="icon-btn email" title={user.email}><FaEnvelope /></button>
                                        <button className="icon-btn delete" onClick={(e) => handleDelete(user.userId, e)} title="Delete"><FaTrash /></button>
                                    </div>
                                </div>
                                <div className="card-stats">
                                    <div className="stat-box"><span className="stat-label">Fleets</span><span className="stat-value">{fleetCount}</span></div>
                                    <div className="stat-box"><span className="stat-label">Vessels</span><span className="stat-value">{vesselCount}</span></div>
                                    <div className="stat-box">
                                        <span className="stat-label">Status</span>
                                        <span className={`stat-value status-${user.isActive ? 'active' : 'inactive'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {filteredUsers.length === 0 && <div className="empty-state">No users found.</div>}
            </div>
        </div>
    );
};

export default UserManagementPage;