import React, { useState, useEffect, useRef } from 'react';
// REMOVED: import RotatingBackground from '../components/RotatingBackground';
import { fetchVessels, fetchLatestVoyageStats, fetchLatestReportSnapshot, fetchVoyageList } from '../api';
import { FaShip, FaRoute, FaClock, FaGasPump, FaCompass, FaGlobeAmericas, FaMapMarkedAlt } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Globe from 'react-globe.gl'; 
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './VesselStatusPage.css';

// --- Fix for default Leaflet marker icon in React ---
import icon from 'leaflet/dist/images/marker-icon.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// 🟢 FIX: Define FaOilCan icon component explicitly at the top level
const FaOilCan = () => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
        <path d="M480 32l-32 32-32-32-32 32-32-32-32 32-32-32-32 32V32c0-17.67-14.33-32-32-32H32C14.33 0 0 14.33 0 32v448c0 17.67 14.33 32 32 32h192c17.67 0 32-14.33 32-32V352h32l32 32 32-32 32 32 32-32 32 32 32-32 32 32c17.67 0 32-14.33 32-32V64c0-17.67-14.33-32-32-32zm-256 0h96v96h-96V32z"></path>
    </svg>
);

// Globe Component Helper
const VesselGlobe = ({ lat, lng, vesselName }) => {
    const globeEl = useRef();

    useEffect(() => {
        // Auto-rotate and focus on vessel on mount
        if (globeEl.current) {
            globeEl.current.pointOfView({ lat: lat, lng: lng, altitude: 1.5 }, 1000);
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.3;
        }
    }, [lat, lng]);

    // Data for the vessel point
    const vesselData = [{
        lat: lat,
        lng: lng,
        name: vesselName,
        size: 1.5,
        color: 'red'
    }];

    return (
        <Globe
            ref={globeEl}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            pointsData={vesselData}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={0.02}
            pointRadius={0.8}
            pointColor="color"
            width={500} 
            height={400}
        />
    );
};

const VesselStatusPage = () => {
    const [ships, setShips] = useState([]);
    const [selectedShipId, setSelectedShipId] = useState('');
    
    // Data States
    const [voyageStats, setVoyageStats] = useState(null);
    const [latestReport, setLatestReport] = useState(null);
    const [loading, setLoading] = useState(false);

    // Voyage Selection States
    const [voyageList, setVoyageList] = useState([]);
    const [selectedVoyage, setSelectedVoyage] = useState('');

    const [isGlobeView, setIsGlobeView] = useState(false);

    // 1. Load Ship List
    useEffect(() => {
        fetchVessels().then(data => {
            setShips(data);
            if (data.length > 0) setSelectedShipId(data[0].ShipID);
        }).catch(console.error);
    }, []);

    // 2. Fetch Initial Data (Report + Voyage List) when Ship Changes
    useEffect(() => {
        if (!selectedShipId) return;

        const loadInitialData = async () => {
            setLoading(true);
            try {
                // Fetch Report and Voyage List first
                const [lReport, vList] = await Promise.all([
                    fetchLatestReportSnapshot(selectedShipId),
                    fetchVoyageList(selectedShipId) // Ensure this API function exists in api.js
                ]);

                setLatestReport(lReport);
                // Handle case where vList might be undefined if API fails (404)
                const safeVoyageList = Array.isArray(vList) ? vList : [];
                setVoyageList(safeVoyageList);

                // Determine Default Voyage from Latest Report
                if (lReport && lReport.VoyageNumber) {
                    setSelectedVoyage(lReport.VoyageNumber); 
                } else if (safeVoyageList.length > 0) {
                    setSelectedVoyage(safeVoyageList[0].VoyageNumber);
                }
            } catch (error) {
                console.error("Error loading initial vessel data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [selectedShipId]);

    // 3. Fetch Voyage Stats whenever selected Voyage changes
    useEffect(() => {
        if (!selectedShipId || !selectedVoyage) return;

        const loadVoyageStats = async () => {
            try {
                const vStats = await fetchLatestVoyageStats(selectedShipId, selectedVoyage);
                setVoyageStats(vStats);
            } catch (error) {
                console.error("Error loading voyage stats:", error);
            }
        };

        loadVoyageStats();
    }, [selectedShipId, selectedVoyage]);

    const fmt = (val, dec = 1) => val ? Number(val).toFixed(dec) : '0';

    return (
        <div className="vessel-status-page">
            <div className="status-header-bar">
                <h1>Latest Vessel Status</h1>
                <div className="ship-selector-wrapper">
                    <label>Select Vessel:</label>
                    <select 
                        value={selectedShipId} 
                        onChange={(e) => setSelectedShipId(e.target.value)}
                        className="status-dropdown"
                    >
                        {ships.map(s => (
                            <option key={s.ShipID} value={s.ShipID}>{s.ShipName}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">Loading Vessel Data...</div>
            ) : (
                <div className="status-vertical-stack">
                    
                    {/* --- COMPONENT 1: VOYAGE ANALYSIS --- */}
                    <div className="status-card voyage-card">
                        <div className="card-header">
                            <h3><FaRoute /> Voyage Analysis</h3>
                            <div className="header-right-controls">
                                <div className="voyage-selector">
                                    <label>Voyage:</label>
                                    <select 
                                        value={selectedVoyage} 
                                        onChange={(e) => setSelectedVoyage(e.target.value)}
                                        className="voyage-dropdown"
                                    >
                                        {voyageList.map(v => (
                                            <option key={v.VoyageNumber} value={v.VoyageNumber}>
                                                {v.VoyageNumber}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {voyageStats ? (
                            <div className="voyage-content">
                                {/* Port Info Row */}
                                <div className="voyage-port-row">
                                    <div className="port-box">
                                        <span className="port-label">From Port</span>
                                        <span className="port-name">{voyageStats.FromPort || '-'}</span>
                                    </div>
                                    <div className="port-arrow">➔</div>
                                    <div className="port-box">
                                        <span className="port-label">To Port</span>
                                        <span className="port-name">{voyageStats.ToPort || '-'}</span>
                                    </div>
                                </div>

                                <div className="voyage-kpi-row">
                                    <div className="v-kpi">
                                        <span className="lbl">Distance</span>
                                        <span className="val">{fmt(voyageStats.DistanceTravelled)} <small>NM</small></span>
                                    </div>
                                    <div className="v-kpi">
                                        <span className="lbl">Avg Speed</span>
                                        <span className="val">{fmt(voyageStats.AvgSpeed)} <small>kts</small></span>
                                    </div>
                                    <div className="v-kpi">
                                        <span className="lbl">Total Fuel</span>
                                        <span className="val">{fmt(voyageStats.TotalFuelConsumed)} <small>MT</small></span>
                                    </div>
                                </div>

                                <div className="voyage-section">
                                    <h4><FaClock /> Duration Breakdown (Hours)</h4>
                                    <div className="duration-grid">
                                        <div className="dur-item">
                                            <label>Sailing</label>
                                            <div className="bar-container">
                                                <div className="bar fill-sailing" style={{width: '100%'}}></div>
                                                <span>{fmt(voyageStats.SailingDuration)} h</span>
                                            </div>
                                        </div>
                                        <div className="dur-item">
                                            <label>Anchor</label>
                                            <div className="bar-container">
                                                <div className="bar fill-anchor" style={{width: `${(voyageStats.AnchorDuration/voyageStats.TotalDuration)*100}%`}}></div>
                                                <span>{fmt(voyageStats.AnchorDuration)} h</span>
                                            </div>
                                        </div>
                                        <div className="dur-item">
                                            <label>Port</label>
                                            <div className="bar-container">
                                                <div className="bar fill-port" style={{width: `${(voyageStats.PortDuration/voyageStats.TotalDuration)*100}%`}}></div>
                                                <span>{fmt(voyageStats.PortDuration)} h</span>
                                            </div>
                                        </div>
                                        <div className="dur-total">
                                            <label>Total Duration</label>
                                            <strong>{fmt(voyageStats.TotalDuration)} Hours</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="fuel-tables-row">
                                    <div className="fuel-table-wrapper">
                                        <h4><FaGasPump /> Fuel by Type</h4>
                                        <table className="mini-table">
                                            <thead><tr><th>Type</th><th align="right">MT</th></tr></thead>
                                            <tbody>
                                                {voyageStats.FuelByType && voyageStats.FuelByType.map((f, i) => (
                                                    <tr key={i}><td>{f.FuelTypeKey}</td><td align="right">{fmt(f.FuelConsumed)}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="fuel-table-wrapper">
                                        <h4><FaOilCan /> Fuel by Bunker</h4>
                                        <table className="mini-table">
                                            <thead><tr><th>BDN No</th><th align="right">MT</th></tr></thead>
                                            <tbody>
                                                {voyageStats.FuelByBunker && voyageStats.FuelByBunker.map((b, i) => (
                                                    <tr key={i}><td>{b.BunkerNumber}</td><td align="right">{fmt(b.BunkerConsumed)}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="no-data">Select a vessel to calculate voyage statistics.</div>
                        )}
                    </div>

                    {/* --- COMPONENT 2: LATEST REPORT SNAPSHOT --- */}
                    <div className="status-card report-card">
                        <div className="card-header">
                            <h3><FaShip /> Latest Report Snapshot</h3>
                            <div className="header-right-controls">
                                <div className="view-toggle-container">
                                    <button 
                                        className={`toggle-btn ${!isGlobeView ? 'active' : ''}`} 
                                        onClick={() => setIsGlobeView(false)}
                                        title="2D Map View"
                                    >
                                        <FaMapMarkedAlt /> Map
                                    </button>
                                    <button 
                                        className={`toggle-btn ${isGlobeView ? 'active' : ''}`} 
                                        onClick={() => setIsGlobeView(true)}
                                        title="3D Globe View"
                                    >
                                        <FaGlobeAmericas /> Globe
                                    </button>
                                </div>
                                {latestReport && <span className="report-date">{new Date(latestReport.ReportDateTimeLocal).toLocaleString()}</span>}
                            </div>
                        </div>
                        
                        {latestReport ? (
                            <div className="report-body-split">
                                <div className="report-details-panel">
                                    <div className="report-grid">
                                        <div className="report-row full">
                                            <label>Report Type</label>
                                            <span>{latestReport.ReportTypeKey}</span>
                                        </div>
                                        <div className="report-row">
                                            <label>Activity</label>
                                            <span>{latestReport.VesselActivity || '-'}</span>
                                        </div>
                                        <div className="report-row">
                                            <label>Voyage No</label>
                                            <span>{latestReport.VoyageNumber}</span>
                                        </div>
                                        <div className="divider"><span>Position & Movement</span></div>
                                        <div className="report-row"><label>Latitude</label><span>{latestReport.Latitude}</span></div>
                                        <div className="report-row"><label>Longitude</label><span>{latestReport.Longitude}</span></div>
                                        <div className="report-row"><label>Speed</label><span>{fmt(latestReport.SpeedKnots)} kn</span></div>
                                        <div className="report-row"><label>Dist.</label><span>{fmt(latestReport.DistanceSinceLastReportNM)} NM</span></div>
                                        <div className="divider"><span>Condition & Weather</span></div>
                                        <div className="report-row"><label>Draft</label><span>{fmt(latestReport.MidDraft, 2)} m</span></div>
                                        <div className="report-row"><label>Trim</label><span>{fmt(latestReport.Trim, 2)} m</span></div>
                                        <div className="report-row"><label>Sea State</label><span>{latestReport.SeaState || '-'}</span></div>
                                        <div className="report-row"><label>Cargo</label><span>{fmt(latestReport.ReportedCargoQuantityMT)} MT</span></div>
                                    </div>
                                </div>

                                <div className="report-map-panel">
                                    <div className="map-inner-wrapper">
                                        {latestReport.Latitude && latestReport.Longitude ? (
                                            <>
                                                {isGlobeView ? (
                                                    <div className="globe-container">
                                                        <VesselGlobe 
                                                            lat={parseFloat(latestReport.Latitude)} 
                                                            lng={parseFloat(latestReport.Longitude)} 
                                                            vesselName={latestReport.ReportTypeKey}
                                                        />
                                                    </div>
                                                ) : (
                                                    <MapContainer 
                                                        key={selectedShipId} 
                                                        center={[latestReport.Latitude, latestReport.Longitude]} 
                                                        zoom={5} 
                                                        style={{ height: '100%', width: '100%' }}
                                                        attributionControl={false}
                                                    >
                                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                        <Marker position={[latestReport.Latitude, latestReport.Longitude]}>
                                                            <Popup>
                                                                <strong>Position</strong><br/>
                                                                Lat: {latestReport.Latitude}<br/>
                                                                Lng: {latestReport.Longitude}
                                                            </Popup>
                                                        </Marker>
                                                    </MapContainer>
                                                )}
                                            </>
                                        ) : (
                                            <div className="no-data map-placeholder">Coordinates Unavailable</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="no-data">No submitted reports found.</div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default VesselStatusPage;