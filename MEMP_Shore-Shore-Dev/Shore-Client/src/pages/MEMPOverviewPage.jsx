// Shore-Client/src/pages/MEMPOverviewPage.jsx
import React, { useState, useEffect } from 'react';
import './MEMPOverviewPage.css';
import RotatingBackground from '../components/RotatingBackground'; 
import FleetRecentLocationMap from '../components/MEMP/FleetRecentLocationMap'; 
import { fetchFleetsForMapFilter, fetchLatestVesselReports } from '../api'; 

const MEMPOverviewPage = () => {
    // Dropdown State
    const [fleets, setFleets] = useState([]);
    const [selectedFleet, setSelectedFleet] = useState('All Fleets'); 
    const [loadingFleets, setLoadingFleets] = useState(true);

    // Table Data State
    const [reportData, setReportData] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);

    // 1. Fetch Fleets
    useEffect(() => { 
        const loadFleets = async () => {
            try {
                const fleetData = await fetchFleetsForMapFilter(); 
                
                const options = fleetData.map(f => ({ 
                    value: f.FleetName, // Was f.fleetName
                    label: f.FleetName  // Was f.fleetName
                }));
                setFleets([{ value: 'All Fleets', label: 'All Fleets' }, ...options]);
            } catch (e) {
                console.error("Failed to fetch fleets:", e);
            } finally {
                setLoadingFleets(false);
            }
        };
        loadFleets();
    }, []); 

    // 2. Fetch Latest Reports
    useEffect(() => {
        const loadReports = async () => {
            setLoadingReports(true);
            try {
                const data = await fetchLatestVesselReports(selectedFleet);
                setReportData(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Error loading report data:", e);
                setReportData([]);
            } finally {
                setLoadingReports(false);
            }
        };
        loadReports();
    }, [selectedFleet]);

    return (
        <RotatingBackground pageKey="MEMP-OVERVIEW">
            <div className="memp-overview-page">
                <div className="memp-overview-content">
                    <h1 className="memp-overview-title">Fleet Dashboard</h1>
                    
                    {/* Filter Ribbon */}
                    <div className="memp-filter-ribbon">
                        <div className="filter-controls-container" style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                            <div className="filter-group">
                                <label htmlFor="fleetSelect">Fleet:</label>
                                <div style={{ minWidth: '250px' }}>
                                    <select
                                        id="fleetSelect"
                                        className="fleet-select-control"
                                        value={selectedFleet}
                                        onChange={(e) => setSelectedFleet(e.target.value)}
                                        disabled={loadingFleets}
                                    >
                                        {fleets.map((fleet) => (
                                            <option key={fleet.value} value={fleet.value}>
                                                {fleet.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div> 
                    
                    {/* Map Section */}
                    <div className="fleet-map-section-container">
                        <div className="section-header">
                            <h2>Fleet Vessel Recent Locations</h2>
                        </div>
                        <div className="fleet-recent-location-map-wrapper">
                            <FleetRecentLocationMap selectedFleetName={selectedFleet} />
                        </div>
                    </div>

                    {/* Latest Reports Table */}
                    <div className="latest-reports-container">
                        <div className="section-header">
                            <h2>Latest Vessel Reports - {selectedFleet}</h2>
                        </div>
                        
                        <div className="table-responsive">
                            <table className="memp-data-table">
                                <thead>
                                    <tr>
                                        <th>Ship Name</th>
                                        <th>Report Type</th>
                                        <th>Report Date</th>
                                        <th>Voyage No</th>
                                        <th>From Port</th>
                                        <th>To Port</th>
                                        <th>Cargo Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingReports ? (
                                        <tr><td colSpan="7" className="text-center">Loading Data...</td></tr>
                                    ) : reportData.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center">No reports found.</td></tr>
                                    ) : (
                                        reportData.map((row, index) => (
                                            <tr key={index}>
                                                <td className="fw-bold">{row.Ship || row.ShipName}</td>
                                                <td>{row.ReportType || row.ReportTypeName}</td>
                                                <td>
                                                    {row.ReportDate 
                                                        ? new Date(row.ReportDate).toLocaleDateString() + ' ' + new Date(row.ReportDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                                        : (row.ReportDateTimeLocal ? new Date(row.ReportDateTimeLocal).toLocaleDateString() : '-')
                                                    }
                                                </td>
                                                <td>{row.VoyageNumber}</td>
                                                <td>{row.FromPort || '-'}</td>
                                                <td>{row.ToPort || '-'}</td>
                                                <td>
                                                    <span className={`status-badge ${row.CargoStatus ? row.CargoStatus.toLowerCase() : ''}`}>
                                                        {row.CargoStatus || 'N/A'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </RotatingBackground>
    );
};

export default MEMPOverviewPage;