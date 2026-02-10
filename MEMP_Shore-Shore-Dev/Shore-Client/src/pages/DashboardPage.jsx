// Shore-Client/src/pages/DashboardPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import CueCard from '../components/CueCard';
import './DashboardPage.css';

const DashboardPage = ({ menuConfig }) => {
  const navigate = useNavigate();

  const handleCardClick = (item) => {
    // ... (your existing handleCardClick logic) ...
    if (item.type === 'external') {
      window.open(item.route, '_blank', 'noopener,noreferrer');
    } else if (item.subItems && item.subItems.length > 0 && item.route && item.route.startsWith('/app/menu/')) {
      navigate(item.route);
    } else if (item.route) {
      navigate(item.route);
    } else {
      console.warn('Menu item has no route and no sub-items, or route is not for SubMenuPage:', item.name, item);
    }
  };

  // Filter for active items (isActive is true or undefined for backward compatibility)
  const activeTopLevelMenuItems = (menuConfig || []).filter(item => item.isActive !== false);

  return (
    // Removed RotatingBackground wrapper, MainLayout handles it now
    <div className="dashboard-bg-wrapper">
      <div className="dashboard-container">
        <h1 className="dashboard-title">Main Dashboard</h1>
        {(!activeTopLevelMenuItems || activeTopLevelMenuItems.length === 0) ? (
          <p style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px' }}>
            No active menu items configured.
          </p>
        ) : (
          <div className="cue-card-grid">
            {activeTopLevelMenuItems.map((item) => (
              <CueCard
                key={item.id}
                title={item.name}
                backgroundImage={item.backgroundImage}
                onClick={() => handleCardClick(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;