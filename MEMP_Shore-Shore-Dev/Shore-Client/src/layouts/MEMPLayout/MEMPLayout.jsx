// Shore-Client/src/layouts/MEMPLayout/MEMPLayout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import MEMPSidebar from './MEMPSidebar';
import { mempSidebarConfig } from '../../mempSidebarConfig'; 
import GlobalLayout from '../../components/GlobalLayout';
import ThemeControls from '../../components/ThemeControls';
// 1. IMPORT NEW COMPONENT
import HeaderUserProfile from '../../components/HeaderUserProfile'; 

import './MEMPLayout.css';
import './MEMPSidebar.css'; 
import '../../pages/ReportDetailsPage.css'; 
import '../../pages/BunkerDetailsPage.css'; 
import '../../pages/VesselDetailsPage.css'; 
import { FaHome, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';

const MEMPLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <GlobalLayout>
        <div className="memp-app-layout-container" style={{ background: 'transparent' }}>
            <MEMPSidebar
                menuItems={mempSidebarConfig}
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={toggleSidebar}
            />
            <div className={`memp-app-content-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <header className="memp-app-header">
                    <div className="header-left">
                        <button onClick={() => navigate(-1)} className="header-action-btn" title="Back">
                            <FaArrowLeft />
                        </button>
                        {/* <Link to="/app/dashboard" className="header-logo-link" title="Viswa Group Home"> */}
                        <Link to="/app/memp" className="header-logo-link" title="Viswa Group Home">
                            <img src="/Teamlogo.png" alt="Viswa Group Logo" className="header-team-logo" />
                        </Link>
                    </div>
                    <div className="header-app-title">
                        Marine Environmental Management
                    </div>
                    <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        
                        {/* 2. ADD USER PROFILE HERE */}
                        <HeaderUserProfile />

                        <ThemeControls />
                        
                        <Link to="/app/memp" className="header-action-btn" title="Main Dashboard"> <FaHome /> </Link>
                        <button onClick={handleLogout} className="header-action-btn" title="Logout">
                            <FaSignOutAlt />
                        </button>
                    </div>
                </header>
                <main className="memp-app-layout-content">
                    <Outlet />
                </main>
            </div>
        </div>
    </GlobalLayout>
  );
};

export default MEMPLayout;