// GeminiAI/Client/src/pages/TeamPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios'; // Make sure axios is imported
import './TeamPage.css';
import AddMemberModal from '../components/AddMemberModal.jsx';
import DeactivateMemberModal from '../components/DeactivateMemberModal.jsx';
import { FaPlus, FaUserSlash } from 'react-icons/fa';

// Helper functions (can be moved to a utils file)
const findItemByRoute = (items, route) => {
  if (!items) return null;
  for (const item of items) {
    if (item.route === route) return item;
    if (item.subItems) {
      const foundInSub = findItemByRoute(item.subItems, route);
      if (foundInSub) return foundInSub;
    }
  }
  return null;
};

const findParentOfGivenId = (items, childIdToFindParentFor, currentGrandparentRoute = "/app/dashboard", currentGrandparentName = "Main Menu") => {
  if (!items) return { route: currentGrandparentRoute, name: currentGrandparentName };
  for (const potentialParent of items) {
    if (potentialParent.subItems && potentialParent.subItems.some(subItem => subItem.id === childIdToFindParentFor)) {
      return { route: potentialParent.route || "/app/dashboard", name: potentialParent.name };
    }
    if (potentialParent.subItems) {
      const foundDeeper = findParentOfGivenId(potentialParent.subItems, childIdToFindParentFor, potentialParent.route || currentGrandparentRoute, potentialParent.name);
      // Check if foundDeeper is actually a parent of childIdToFindParentFor, not just some deeper parent in another branch
      let isChildUnderCurrentPotentialParent = false;
      const checkChild = (itemsToCheck) => {
         if (!itemsToCheck) return false;
         for(const it of itemsToCheck) {
             if(it.id === childIdToFindParentFor) return true;
             if(it.subItems && checkChild(it.subItems)) return true;
         }
         return false;
      }
      if (checkChild(potentialParent.subItems) && foundDeeper.route !== (currentGrandparentRoute) ) { // Check if found deeper is relevant
         return foundDeeper;
      }
    }
  }
  return { route: currentGrandparentRoute, name: currentGrandparentName };
};


const TeamPage = ({ menuConfig }) => {
  const [teamData, setTeamData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [memberToDeactivate, setMemberToDeactivate] = useState(null);
  const navigate = useNavigate();

  const { backLinkPath, backLinkText } = useMemo(() => {
    const currentAllMenuItems = menuConfig || [];
    let path = "/app/dashboard";
    let text = "&larr; Back to Main Menu";
    const teamPgMenuItem = findItemByRoute(currentAllMenuItems, '/app/team');
    if (teamPgMenuItem && teamPgMenuItem.id) {
      const pInfo = findParentOfGivenId(currentAllMenuItems, teamPgMenuItem.id);
      if (pInfo && pInfo.route && pInfo.name !== "Main Menu") { // Check if a valid parent was found
        path = pInfo.route;
        text = `&larr; Back to ${pInfo.name || 'Previous Menu'}`;
      }
    }
    return { backLinkPath: path, backLinkText: text };
  }, [menuConfig]);


// ...
const fetchTeamData = useCallback(async () => {
  setLoading(true);
  setError(null);
  const apiUrl = '/api/team/team'; // Define it clearly
  
  // VERY IMPORTANT DEBUG LINE:
  console.log(`DEBUG: TeamPage.jsx is attempting to fetch: ${apiUrl}`); 
  
  try {
    const response = await axios.get(apiUrl); // Use the defined apiUrl
    
    console.log('TeamPage.jsx: Successfully fetched team data:', response.data);
    setTeamData(response.data || []);
    setError(null); 
  } catch (err) {
    const status = err.response?.status;
    const serverMessage = err.response?.data?.error || err.response?.data?.message || err.message;
    const fullErrorMessage = `Error fetching team data from ${apiUrl}: ${serverMessage} (Status: ${status || 'unknown'})`;
    
    console.error(`DEBUG: TeamPage.jsx - ${fullErrorMessage}`, err.response || err);
    setError(fullErrorMessage);
    setTeamData([]);
  } finally {
    setLoading(false);
  }
}, []);
// ...
  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleAddMember = async (memberData) => { // memberData is now JSON
    try {
      // URL is proxied by Vite to API Gateway (http://localhost:7000/api/team/team)
      // API Gateway proxies to team-service (http://localhost:3002/api/team/team)
      const response = await axios.post('/api/team/team', memberData, {
          headers: { 'Content-Type': 'application/json' } // Sending JSON
      });
      fetchTeamData(); // Refresh team data
      // setIsAddModalOpen(false); // Modal will call its onClose prop
    } catch (apiError) {
      console.error('Error adding member:', apiError.response?.data || apiError.message);
      throw apiError; // Re-throw for AddMemberModal to display its own error
    }
  };

  const openDeactivateModal = (member) => {
    setMemberToDeactivate(member);
    setIsDeactivateModalOpen(true);
  };

  const handleConfirmDeactivate = async (memberId, password) => {
    const actingUsername = localStorage.getItem('username'); // Get current logged-in user
    // For simplicity now, we are not re-validating admin password here.
    // The backend team-service deactivation endpoint could be protected by an admin-only token.
    try {
      await axios.put(`/api/team/team/${memberId}/deactivate`, {
        // actingUsername: actingUsername, // Optional: send for logging if backend uses it
        // password: password // Only if backend specifically requires current user's pw for this action
      });
      fetchTeamData();
      setIsDeactivateModalOpen(false);
      setMemberToDeactivate(null);
    } catch (apiError) {
      console.error('Error deactivating member:', apiError.response?.data || apiError.message);
      throw apiError; // For DeactivateMemberModal to display
    }
  };

  const handleMemberCardClick = (member, event) => {
    if (event.target.closest('.deactivate-button-wrapper')) {
      return;
    }
    navigate(`/app/member/${member.Team_Id}/tasks`);
  };

  const prepareCardElements = () => {
    if (loading) return <div className="loading-state"><div className="spinner"></div><p>Loading team data...</p></div>;
    if (error) return <div className="error-state"><p>Unable to load team data: {error}</p></div>;
    if (!Array.isArray(teamData)) return <div className="error-state"><p>Data format error.</p></div>;

    const memberCards = teamData.map((member) => (
      <div key={member.Team_Id} className="team-member" onClick={(e) => handleMemberCardClick(member, e)}>
        {/* image_url is now like /member_images/filename.jpg */}
        <img 
          src={member.image_url || '/member_images/default-member.png'} 
          alt={member.Member_Name} 
          className="team-member-image" 
          onError={(e) => { e.target.onerror = null; e.target.src = "/member_images/default-member.png"; }} 
        />
        <h2>{member.Member_Name}</h2>
        <p>Position: {member.Role}</p>
        <div className="deactivate-button-wrapper">
          <button className="deactivate-button" onClick={(e) => { e.stopPropagation(); openDeactivateModal(member); }} title={`Deactivate ${member.Member_Name}`}>
            <FaUserSlash style={{ marginRight: '5px' }} /> Deactivate
          </button>
        </div>
      </div>
    ));

    const addCard = (
      <div key="add-new-member" className="team-member add-member-card" onClick={() => setIsAddModalOpen(true)}>
        <div className="add-member-icon-container"><FaPlus size={50} /></div>
        <h2>Add New Member</h2>
      </div>
    );

    if (teamData.length === 0 && !loading && !error) {
      return <><p style={{textAlign: 'center', width: '100%', marginTop: '20px', color: 'white'}}>No team members found. Add one!</p>{addCard}</>;
    }
    return [...memberCards, addCard];
  };

  return (
    <div className="team-page-container">
      <div className="team-page-header-controls" style={{ padding: '10px 0', marginBottom: '15px', textAlign:'left' }}>
        <Link to={backLinkPath} className="global-back-link" dangerouslySetInnerHTML={{ __html: backLinkText }} style={{ marginTop: '0', marginBottom: '0' }} />
      </div>
      <div className="team-section">
        <h1>Our Digital Team</h1>
        <div className="team-container">
          {prepareCardElements()}
        </div>
      </div>
      <AddMemberModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAddMember={handleAddMember} 
      />
      {memberToDeactivate && (
        <DeactivateMemberModal 
          isOpen={isDeactivateModalOpen} 
          onClose={() => { setIsDeactivateModalOpen(false); setMemberToDeactivate(null); }} 
          member={memberToDeactivate} 
          onConfirm={handleConfirmDeactivate} 
        />
      )}
    </div>
  );
};

export default TeamPage;