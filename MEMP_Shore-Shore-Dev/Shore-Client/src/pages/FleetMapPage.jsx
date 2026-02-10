// client/src/pages/FleetMapPage.jsx
import React, { useState, useEffect } from 'react';
import SeaRouteMap from '../components/MEMP/SeaRouteMap';
import './FleetMapPage.css';

// --- Simulation of Data Fetching based on the User's SQL Query ---
// Mock data structure: ShipID, IMO_Number, ShipName, Latitude, Longitude
const fetchLatestVesselReports = async () => {
    return [
        { ShipID: 1, IMO_Number: '13456879', ShipName: 'TestVessel (No Position)', Latitude: null, Longitude: null },
        { ShipID: 2, IMO_Number: '123456798', ShipName: 'New Vessel', Latitude: 12.500000, Longitude: 90.500000 },
        { ShipID: 3, IMO_Number: '987654321', ShipName: 'M/V Global Leader', Latitude: 34.052235, Longitude: -118.243683 },
        { ShipID: 4, IMO_Number: '112233445', ShipName: 'Sea Explorer', Latitude: -33.868820, Longitude: 151.209290 },
    ];
};

const FleetMapPage = () => {
    const [vesselRawData, setVesselRawData] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            const data = await fetchLatestVesselReports();
            setVesselRawData(data);
        };
        loadData();
    }, []);

    // Filter out vessels with invalid coordinates
    const validVessels = vesselRawData
        .filter(v => 
            v.Latitude !== null && v.Longitude !== null && 
            !isNaN(Number(v.Latitude)) && !isNaN(Number(v.Longitude))
        );
        
    const vesselMarkers = validVessels.map(v => ({
            position: [Number(v.Latitude), Number(v.Longitude)],
            name: `Vessel: ${v.ShipName} (IMO: ${v.IMO_Number})`,
            type: 'intermediate' // Blue marker with FaShip icon
        }));

    // Calculate initial map center and zoom
    let mapCenter = [0, 0];
    let zoomLevel = 3; 

    if (vesselMarkers.length > 0) {
        mapCenter = [vesselMarkers[0].position[0], vesselMarkers[0].position[1]];
        zoomLevel = vesselMarkers.length > 1 ? 3 : 5; 
    }

    return (
        <div className="fleet-map-page-container">
            <h1 className="fleet-map-title">Global Fleet Positioning Map</h1>
            <p className="fleet-map-intro">Real-time location of all vessels based on the latest report data.</p>
            
            <div className="fleet-map-wrapper">
                <SeaRouteMap 
                    segments={[]}
                    markers={vesselMarkers}
                    mapCenter={mapCenter}
                    zoomLevel={zoomLevel}
                />
            </div>

            <div className="fleet-map-info">
                <p>
                    Showing **{validVessels.length}** active vessel position(s). Data source: **MEMP\_VesselDailyReports** and **MEMP\_Ships**.
                </p>
                {vesselRawData.length - validVessels.length > 0 && (
                    <p className="no-vessels-message">
                        Note: {vesselRawData.length - validVessels.length} vessel(s) excluded due to missing or invalid positional data.
                    </p>
                )}
            </div>
        </div>
    );
};

export default FleetMapPage;