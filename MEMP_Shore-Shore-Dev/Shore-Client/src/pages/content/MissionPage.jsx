// src/pages/content/MissionPage.jsx
import React from 'react';
import './PlaceholderPage.css';
import RotatingBackground from '../../components/RotatingBackground';

const MissionPage = () => {
  return (
    <RotatingBackground className="content-page-background">
      <div 
        className="placeholder-page-container"
        style={{ minHeight: 'calc(100vh - 60px)' }}
      >
        <div className="placeholder-content">
          <h1>Welcome to the Admin Page Page</h1>
          <p>This is the main content loaded by the 'Admin Page' menu item.</p>
        </div>
      </div>
    </RotatingBackground>
  );
};

export default MissionPage;