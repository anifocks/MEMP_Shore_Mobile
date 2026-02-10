// MEMP_Shore_Fleet_imlementataion/MEMP-Shore-Client/src/components/MEMP/FleetRecentLocationMap.jsx

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createRoot } from 'react-dom/client'; 
import { FaShip } from 'react-icons/fa'; 

// Import API functions
import { fetchVesselRecentLocation } from '../../api'; 
import './FleetRecentLocationMap.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYW5pbC1yYXZhZGEiLCJhIjoiY21jaDR6Z256MG5rNjJtcXVxNGtiOXZ1dyJ9.UwFM6qkUscKH5P8tWuzR5Q'; 

const getStatusColor = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('sea') || s.includes('underway') || s.includes('steaming') || s.includes('sailing') || s.includes('navigating') || s.includes('transit')) return '#007bff'; 
    if (s.includes('port') || s.includes('berth') || s.includes('moored') || s.includes('alongside') || s.includes('loading') || s.includes('discharging') || s.includes('cargo') || s.includes('dock') || s.includes('anchor')) return '#28a745'; 
    return '#dc3545'; 
};

// ACCEPT PROP FROM PARENT
const FleetRecentLocationMap = ({ selectedFleetName = 'All Fleets' }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);      
  const markerRoots = useRef([]);  
  
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState(null);
  
  const [lng, setLng] = useState(0); 
  const [lat, setLat] = useState(0); 
  const [zoom, setZoom] = useState(1.5); 

  // Effect: Load Data (Depends on PROP selectedFleetName)
  useEffect(() => {
    setLoading(true);
    setNoDataMessage(null);
    setError(null);

    const loadLocations = async () => {
        try {
            // Use the prop directly
            const data = await fetchVesselRecentLocation(selectedFleetName); 
            setVessels(data);
            setLoading(false);
            
            if (data.length === 0) {
                const message = selectedFleetName === 'All Fleets' 
                    ? 'No vessel location details available for any active, reported vessel.'
                    : `No vessel location details available for the fleet: ${selectedFleetName}.`;
                setNoDataMessage(message);
            }

            let initialLat = 0;
            let initialLng = 0;
            let initialZoom = 1.5;

            const validVessel = data.find(v => !isNaN(parseFloat(v.Latitude)) && !isNaN(parseFloat(v.Longitude)));
            if (validVessel) {
              initialLat = parseFloat(validVessel.Latitude);
              initialLng = parseFloat(validVessel.Longitude);
              initialZoom = 2;
            }
            
            setLat(initialLat);
            setLng(initialLng);
            setZoom(initialZoom);

        } catch (e) {
            console.error("Data Fetch Error:", e);
            setError(`Failed to load vessel data for ${selectedFleetName}. Error: ${e.message}`);
            setLoading(false);
        }
    };
    loadLocations();
    
  }, [selectedFleetName]); 

  // Initialize Map
  useEffect(() => {
    if (mapContainer.current && !map.current) { 
        try {
            map.current = new mapboxgl.Map({
                container: mapContainer.current, 
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [lng, lat],
                zoom: zoom,
                attributionControl: false,
                // 🛑 THIS IS THE FIX: Prevents world from repeating
                renderWorldCopies: false 
            });
            map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        } catch (e) {
            console.error("Mapbox Error:", e);
            setError("Map failed to load. Check Token."); 
        }
    }
  
    return () => {
        if (map.current) {
            map.current.remove();
            map.current = null;
        }
        markers.current.forEach(marker => marker.remove());
        markers.current = [];
        markerRoots.current.forEach(root => root.unmount());
        markerRoots.current = [];
    };
  }, [lng, lat, zoom]); 

  // Plot Markers
  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach(marker => marker.remove());
    markers.current = [];
    markerRoots.current.forEach(root => root.unmount());
    markerRoots.current = [];

    if (vessels.length > 0) {
        if (lng !== 0 || lat !== 0) {
            map.current.flyTo({ center: [lng, lat], zoom: zoom, essential: true }); 
        }
    } else if (map.current) {
         map.current.flyTo({ center: [0, 0], zoom: 1.5, essential: true });
    }

    vessels.forEach(vessel => {
        const vesselLng = parseFloat(vessel.Longitude);
        const vesselLat = parseFloat(vessel.Latitude);

        if (isNaN(vesselLng) || isNaN(vesselLat)) return;
        
        const status = vessel.VesselStatus || 'Unknown';
        const color = getStatusColor(status);

        const el = document.createElement('div');
        el.className = 'vessel-marker-container'; 
        
        const root = createRoot(el);
        root.render(
            <FaShip 
                size={28} 
                style={{ color: color, fill: color, filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))' }} 
            />
        );
        markerRoots.current.push(root);

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([vesselLng, vesselLat])
            .setPopup(new mapboxgl.Popup({ offset: 25 }) 
                .setHTML(`
                    <div style="font-family: sans-serif; padding: 5px;">
                        <h3 style="margin:0 0 5px 0; color:#333;">${vessel.ShipName}</h3>
                        <p style="margin:3px 0;">Fleet: <b>${vessel.FleetName || 'N/A'}</b></p>
                        <p style="margin:3px 0;">Status: <b style="color:${color}">${status}</b></p>
                        <p style="margin:3px 0; font-size:0.85rem; color:#666;">${vesselLat.toFixed(4)}, ${vesselLng.toFixed(4)}</p>
                    </div>
                `)
            )
            .addTo(map.current);
        
        markers.current.push(marker);
    });
    
  }, [vessels, lng, lat, zoom]); 

  if (loading && vessels.length === 0) return <div className="map-loading">Loading...</div>;
  if (error) return <div className="map-error">{error}</div>;

  return (
    <div className="fleet-recent-location-map-container">
      
      {!loading && vessels.length === 0 && noDataMessage && (
        <div className="no-data-message">{noDataMessage}</div>
      )}

      <div ref={mapContainer} className="mapbox-container" style={{ visibility: loading ? 'hidden' : 'visible' }} /> 
      
      <div className="map-legend">
          <h4>Vessel Status</h4>
          <div className="legend-item">
            <FaShip style={{ color: '#007bff', marginRight: '8px' }} /> 
            <span>At Sea / Underway</span>
          </div>
          <div className="legend-item">
            <FaShip style={{ color: '#28a745', marginRight: '8px' }} /> 
            <span>In Port / Operations</span>
          </div>
          <div className="legend-item">
            <FaShip style={{ color: '#dc3545', marginRight: '8px' }} /> 
            <span>Anchor / Drifting</span>
          </div>
      </div>
    </div>
  );
};

export default FleetRecentLocationMap;