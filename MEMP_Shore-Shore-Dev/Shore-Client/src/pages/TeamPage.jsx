import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// 🟢 FIX: Use apiClient instead of raw axios for correct Base URL handling
import { apiClient } from '../api'; 
import './TeamPage.css';
import AddMemberModal from '../components/AddMemberModal.jsx';
import DeactivateMemberModal from '../components/DeactivateMemberModal.jsx';
import ReactivateMemberModal from '../components/ReactivateMemberModal.jsx'; 
import { FaPlus, FaUserSlash, FaUserCheck } from 'react-icons/fa';

const TeamPage = ({ menuConfig }) => {
    const [teamData, setTeamData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [memberToDeactivate, setMemberToDeactivate] = useState(null);

    const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
    const [memberToReactivate, setMemberToReactivate] = useState(null);

    const [showInactive, setShowInactive] = useState(false);
    const navigate = useNavigate();

    // 🟢 FIX: Back Link to Admin Console
    const backLinkPath = '/app/memp/admin';
    const backLinkText = '&larr; Back to Admin Console';

    const fetchTeamData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 🟢 FIX: Use apiClient
            const response = await apiClient.get('/team'); 
            if (Array.isArray(response.data)) {
                setTeamData(response.data);
            } else {
                throw new Error(`Data format error.`);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Could not fetch team data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeamData();
    }, [fetchTeamData]);

    const handleAddMember = async (memberData) => {
        try {
            await apiClient.post('/team', memberData);
            fetchTeamData();
        } catch (apiError) {
            console.error('Error adding member:', apiError);
            throw apiError; 
        }
    };

    const openDeactivateModal = (member) => {
        setMemberToDeactivate(member);
        setIsDeactivateModalOpen(true);
    };

    const handleConfirmDeactivate = async (memberId) => {
        await apiClient.put(`/team/${memberId}/deactivate`);
        fetchTeamData();
        setIsDeactivateModalOpen(false);
        setMemberToDeactivate(null);
    };
    
    const openReactivateModal = (member) => {
        setMemberToReactivate(member);
        setIsReactivateModalOpen(true);
    };

    const handleConfirmReactivate = async (memberId) => {
        await apiClient.put(`/team/${memberId}/reactivate`);
        fetchTeamData();
        setIsReactivateModalOpen(false);
        setMemberToReactivate(null);
    };

    const handleMemberCardClick = (member, event) => {
        if (event.target.closest('.deactivate-button-wrapper') || !member.IsActive) {
            return;
        }
        // 🟢 FIX: Navigate to the correct nested route
        navigate(`/app/memp/admin/team/member/${member.Team_Id}/tasks`);
    };

    const membersToDisplay = useMemo(() => {
        return showInactive ? teamData : teamData.filter(m => m.IsActive);
    }, [teamData, showInactive]);

    const renderContent = () => {
        if (loading) return <div className="loading-state"><div className="spinner"></div>Loading team data...</div>;
        if (error) return <div className="error-state">{error}</div>;

        const addCard = (
            <div key="add-new-member" className="team-member add-member-card" onClick={() => setIsAddModalOpen(true)}>
                <div className="add-member-icon-container"><FaPlus size={50} /></div>
                <h2>Add New Member</h2>
            </div>
        );

        if (membersToDisplay.length === 0) {
            return (
                <>
                    <p style={{ flexBasis: '100%', textAlign: 'center' }}>No {showInactive ? '' : 'active'} team members found.</p>
                    {addCard}
                </>
            );
        }

        return [...membersToDisplay.map((member) => (
            <div key={member.Team_Id} className={`team-member ${!member.IsActive ? 'inactive-member' : ''}`} onClick={(e) => handleMemberCardClick(member, e)}>
                {!member.IsActive && <div className="inactive-overlay">INACTIVE</div>}
                <img src={member.ImageFilename ? `/api/team/member_images/${member.ImageFilename}` : '/api/team/member_images/default-member.png'} alt={member.Member_Name} className="team-member-image" onError={(e) => { e.target.src = "/api/team/member_images/default-member.png"; }} />
                <h2>{member.Member_Name}</h2>
                <p>{member.Role}</p>
                <div className="deactivate-button-wrapper">
                    {member.IsActive ? (
                        <button className="deactivate-button" onClick={(e) => { e.stopPropagation(); openDeactivateModal(member); }}>
                             <FaUserSlash style={{ marginRight: '5px' }}/> Deactivate
                        </button>
                    ) : (
                        <button className="reactivate-button" onClick={(e) => { e.stopPropagation(); openReactivateModal(member); }}>
                             <FaUserCheck style={{ marginRight: '5px' }}/> Reactivate
                        </button>
                    )}
                </div>
            </div>
        )), addCard];
    };

    return (
        <div className="team-page-background">
            <div className="team-page-container">
                <Link to={backLinkPath} className="back-link" dangerouslySetInnerHTML={{ __html: backLinkText }} />
                <div className="team-section">
                    <div className="team-page-header">
                        <h1>User Management</h1>
                        <div className="team-page-controls">
                            <label className="view-toggle-switch">
                                <input type="checkbox" checked={showInactive} onChange={() => setShowInactive(!showInactive)} disabled={loading || !!error} />
                                <span className="slider"></span>
                            </label>
                            <span className="toggle-label">
                                {showInactive ? "Showing Inactive" : "Hiding Inactive"}
                            </span>
                        </div>
                    </div>
                    <div className="team-container">
                        {renderContent()}
                    </div>
                </div>
                
                <AddMemberModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAddMember={handleAddMember} />
                
                {memberToDeactivate && (
                    <DeactivateMemberModal isOpen={isDeactivateModalOpen} onClose={() => { setIsDeactivateModalOpen(false); setMemberToDeactivate(null); }} member={memberToDeactivate} onConfirm={handleConfirmDeactivate} />
                )}

                {memberToReactivate && (
                    <ReactivateMemberModal isOpen={isReactivateModalOpen} onClose={() => { setIsReactivateModalOpen(false); setMemberToReactivate(null); }} member={memberToReactivate} onConfirm={handleConfirmReactivate} />
                )}
            </div>
        </div>
    );
};

export default TeamPage;