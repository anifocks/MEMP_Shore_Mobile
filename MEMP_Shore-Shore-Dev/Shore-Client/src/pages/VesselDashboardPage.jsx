// client/src/pages/VesselDashboardPage.jsx
import React from 'react';
import RotatingBackground from '../components/RotatingBackground';
import './VesselDashboardPage.css';

const VesselDashboardPage = () => {
    return (
        <RotatingBackground pageKey="MEMP-OVERVIEW">
            <div className="vessel-dashboard-page">
                <div className="dashboard-content-container">
                    <header className="dashboard-header">
                        <h1>Vessel Dashboard</h1>
                        <p className="dashboard-subtitle">Real-time vessel performance and status monitoring</p>
                    </header>

                    {/* Placeholder Content - You can replace this with your widgets later */}
                    <div className="dashboard-grid">
                        <div className="dashboard-card">
                            <h3>Vessel Overview</h3>
                            <div className="card-placeholder-content">
                                Select a vessel to view details...
                            </div>
                        </div>
                        <div className="dashboard-card">
                            <h3>Fuel Consumption</h3>
                            <div className="card-placeholder-content">
                                No data available
                            </div>
                        </div>
                        <div className="dashboard-card full-width">
                            <h3>Upcoming Voyages</h3>
                            <div className="card-placeholder-content">
                                No active voyages
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </RotatingBackground>
    );
};

export default VesselDashboardPage;