// Shore-Client/src/layouts/MainLayout.jsx
import React from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { FaHome, FaSignOutAlt } from 'react-icons/fa';
import GlobalLayout from '../components/GlobalLayout';
import ThemeControls from '../components/ThemeControls';
// 1. IMPORT NEW COMPONENT
import HeaderUserProfile from '../components/HeaderUserProfile'; 
import './MainLayout.css';

const MainLayout = () => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <GlobalLayout>
        <div className="main-layout" style={{ background: 'transparent' }}>
            <div className="global-nav">
                {/* Note: MainLayout nav is transparent/floating. 
                   We need a background for visibility if text is white. 
                   We can wrap the controls in a glass container.
                */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    background: 'rgba(0, 0, 0, 0.6)', // Semi-transparent dark background
                    padding: '8px 15px', 
                    borderRadius: '50px',
                    gap: '10px'
                }}>
                    
                    {/* 2. ADD USER PROFILE HERE */}
                    <HeaderUserProfile />

                    <Link to="/app/dashboard" className="home-button" title="Dashboard" style={{width:'35px', height:'35px', fontSize:'1.2rem', boxShadow:'none', background:'transparent'}}> <FaHome /> </Link> 
                    
                    <ThemeControls />

                    <button onClick={handleSignOut} className="logout-button" title="Logout" style={{width:'35px', height:'35px', fontSize:'1.2rem', boxShadow:'none', background:'transparent'}}>
                        <FaSignOutAlt />
                    </button>
                </div>
            </div>
            <main className="page-content">
                <Outlet />
            </main>
        </div>
    </GlobalLayout>
  );
};

export default MainLayout;