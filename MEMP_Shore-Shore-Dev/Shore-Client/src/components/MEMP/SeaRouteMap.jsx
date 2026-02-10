// client/src/components/MEMP/SeaRouteMap.jsx
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';

// FIX: Explicitly import Mapbox CSS here to ensure it loads before map initialization.
import 'mapbox-gl/dist/mapbox-gl.css'; 

mapboxgl.accessToken = 'pk.eyJ1IjoiYW5pbC1yYXZhZGEiLCJhIjoiY21jaDR6Z256MG5rNjJtcXVxNGtiOXZ1dyJ9.UwFM6qkUscKH5P8tWuzR5Q'; // Your Mapbox Access Token

/**
 * Creates a colored SVG icon for Mapbox markers.
 * @param {string} color - The hexadecimal color code for the icon.
 * @returns {HTMLElement} The HTML element for the custom marker.
 */
const createCustomMarkerElement = (color) => {
    const el = document.createElement('div');
    el.className = 'custom-map-marker';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '2px solid #fff';
    el.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
    return el;
};

/**
 * Map component for plotting multi-segment, multi-colored sea routes.
 * @param {Array} segments - Array of {from: {lat, lng}, to: {lat, lng}, color, name} objects.
 * @param {Array} markers - Array of {position: [lat, lng], name, type: 'start'|'end'|'intermediate'} objects.
 * @param {Array} mapCenter - [Lat, Lng] for initial map center.
 * @param {number} zoomLevel - Initial zoom level for the map.
 */
const SeaRouteMap = ({ segments = [], markers = [], mapCenter = [0, 0], zoomLevel = 3 }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null); 
    const markerInstances = useRef([]); // To hold and clean up Mapbox marker instances
    const activePopup = useRef(null); // Ref to hold the dynamically created hover popup

    useEffect(() => {
        // --- 1. Initialization (Run once) ---
        if (!mapContainer.current) return;

        // Clean up any existing map instance before creating a new one
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        // Mapbox center requires [Lng, Lat]. We assume mapCenter prop is [Lat, Lng].
        const initialCenter = mapCenter.length === 2 && !isNaN(mapCenter[0]) && !isNaN(mapCenter[1])
            ? [mapCenter[1], mapCenter[0]] // Convert [Lat, Lng] to [Lng, Lat]
            : [0, 0];
        
        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/outdoors-v11', 
            center: initialCenter, 
            zoom: zoomLevel, // Use the passed zoom level
            projection: 'globe' 
        });

        mapRef.current = map; 

        // ADD: Enhance controls for 3D Globe
        map.setMaxPitch(85); // Allows a strong tilt (pitch) for a better 3D globe effect
        map.setMinZoom(1);  // Ensures user can zoom out to see the entire globe

        // Add standard navigation control for easy zoom/rotation
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');


        // Cleanup function: remove map when component unmounts
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [mapCenter, zoomLevel]); // Re-run if center or zoom changes
    
    // --- 2. Data Rendering (Runs on prop change) ---
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Function to handle all map layer/source operations after map load
        const mapLoadedHandler = () => {
            // Remove previous layers
            map.getStyle().layers.forEach(layer => {
                if (layer.id.startsWith('route-segment-')) {
                    map.removeLayer(layer.id);
                }
            });

            // FIX: Use Object.keys() to iterate over the sources object
            Object.keys(map.getStyle().sources).forEach(sourceId => {
                if (sourceId.startsWith('route-segment-')) {
                    map.removeSource(sourceId);
                }
            });
            
            // Remove previous markers
            markerInstances.current.forEach(marker => marker.remove());
            markerInstances.current = [];
            
            const routeLayers = [];
            let segmentIndex = 0;

            // 3. Draw Segments (Routes)
            segments.forEach(segment => {
                // Perform strict numerical conversion and validation
                const startLat = Number(segment.from.lat);
                const startLng = Number(segment.from.lng);
                const endLat = Number(segment.to.lat);
                const endLng = Number(segment.to.lng);

                // If the coordinates are not valid numbers, skip the segment.
                if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
                    return; 
                }
                
                // Mapbox and GeoJSON use [Lng, Lat]
                const startPoint = [startLng, startLat]; 
                const endPoint = [endLng, endLat];
                
                // Use the Great Circle calculation
                const arc = turf.greatCircle(turf.point(startPoint), turf.point(endPoint));
                const coordinates = arc.geometry.coordinates;
                
                const segmentId = `route-segment-${segmentIndex}`;

                if (coordinates.length > 1) {
                    
                    // Add source and layer
                    map.addSource(segmentId, {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            properties: {
                                // IMPORTANT: Embed hover text into the GeoJSON properties
                                hoverName: segment.name 
                            },
                            geometry: {
                                type: 'LineString',
                                coordinates: coordinates
                            }
                        },
                    });

                    map.addLayer({
                        id: segmentId,
                        type: 'line',
                        source: segmentId,
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        paint: {
                            'line-color': segment.color || '#007cbf',
                            'line-width': 4,
                            'line-opacity': 0.8
                        },
                    });
                    
                    // Keep track of the route layer IDs for hover query
                    routeLayers.push(segmentId);
                }
                segmentIndex++;
            });

            // 4. Draw Markers (Add Hover Logic)
            markers.forEach((markerData) => {
                const [lat, lng] = markerData.position;
                const markerLat = Number(lat);
                const markerLng = Number(lng);

                if (isNaN(markerLat) || isNaN(markerLng)) {
                    return; 
                }
                
                const color = markerData.type === 'start' ? '#28a745' : (markerData.type === 'end' ? '#dc3545' : '#007bff');
                
                const el = createCustomMarkerElement(color);
                
                // ADD: Hover Popup setup
                const hoverPopup = new mapboxgl.Popup({ 
                    closeButton: false, 
                    closeOnClick: false, 
                    offset: 10 
                }).setHTML(`<strong>${markerData.name}</strong>`);

                el.addEventListener('mouseenter', () => {
                    hoverPopup
                        // Use the marker's Lng/Lat position
                        .setLngLat([markerLng, markerLat]) 
                        .addTo(map);
                });

                el.addEventListener('mouseleave', () => {
                    hoverPopup.remove();
                });

                const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                    // Mapbox marker setLngLat expects [Lng, Lat]
                    .setLngLat([markerLng, markerLat])
                    .addTo(map);

                markerInstances.current.push(marker);

                // Only show click popup for start/end markers, otherwise use hover
                if (markerData.type === 'start' || markerData.type === 'end') {
                    marker.setPopup(new mapboxgl.Popup().setHTML(`<strong>${markerData.name}</strong><br/>Type: ${markerData.type}`));
                    marker.togglePopup();
                }
            });
            
            // 5. IMPLEMENT HOVER LOGIC (for Segments - Unchanged)
            map.on('mousemove', (e) => {
                const features = map.queryRenderedFeatures(e.point, { layers: routeLayers });
                
                if (features.length > 0) {
                    map.getCanvas().style.cursor = 'pointer';
                    const hoverName = features[0].properties.hoverName;

                    if (hoverName) {
                        if (activePopup.current && activePopup.current.getLngLat().lng === e.lngLat.lng) {
                           activePopup.current.setLngLat(e.lngLat);
                        } else {
                            if (activePopup.current) {
                                activePopup.current.remove();
                            }
                            const newPopup = new mapboxgl.Popup({
                                closeButton: false,
                                closeOnClick: false,
                                offset: 15 
                            })
                            .setLngLat(e.lngLat)
                            .setHTML(`<strong>${hoverName}</strong>`)
                            .addTo(map);
                            activePopup.current = newPopup;
                        }
                    }
                } else {
                    map.getCanvas().style.cursor = '';
                    if (activePopup.current) {
                        activePopup.current.remove();
                        activePopup.current = null;
                    }
                }
            });

            // 6. Clean up cursor and popup when leaving the map area
            map.on('mouseleave', () => {
                map.getCanvas().style.cursor = '';
                if (activePopup.current) {
                    activePopup.current.remove();
                    activePopup.current = null;
                }
            });

            // 7. Fit Map Bounds
            // FIX: Revert the overly complicated logic for single marker.
            // If we have more than one point (markers or segments), use fitBounds.
            // If we have only one point (bunker port), we rely on initial 'center' and 'zoom' set in the first useEffect.
            const totalPoints = markers.length + segments.length;
            const shouldFitBounds = totalPoints > 1;
            
            if (shouldFitBounds) {
                const bounds = new mapboxgl.LngLatBounds();
                
                // Include markers in bounds calculation
                markers.forEach(marker => {
                    const [lat, lng] = marker.position;
                    const markerLat = Number(lat);
                    const markerLng = Number(lng);
                    
                    if (!isNaN(markerLat) && !isNaN(markerLng)) {
                        bounds.extend([markerLng, markerLat]);
                    }
                });
                
                // Include segment end points in bounds calculation
                segments.forEach(segment => {
                    bounds.extend([Number(segment.from.lng), Number(segment.from.lat)]);
                    bounds.extend([Number(segment.to.lng), Number(segment.to.lat)]);
                });
                
                if (!bounds.isEmpty()) {
                    map.fitBounds(bounds, {
                        padding: { top: 50, bottom: 50, left: 50, right: 50 },
                        duration: 1000
                    });
                }
            } else if (totalPoints === 1) {
                 // Explicitly fly to the center/zoom if there's only one point.
                 // This ensures the initial view is applied even if map re-renders later.
                 // Use the Lng/Lat format required by flyTo/center.
                 const centerLngLat = mapCenter.length === 2 ? [mapCenter[1], mapCenter[0]] : [0, 0];
                 
                 map.flyTo({
                     center: centerLngLat, 
                     zoom: zoomLevel,
                     duration: 500 // Smooth transition
                 });
            }
        };

        // Ensure map is loaded before manipulating layers/sources
        if (map.loaded()) {
            mapLoadedHandler();
        } else {
            map.once('load', mapLoadedHandler);
        }
        
    }, [segments, markers, zoomLevel, mapCenter]); // Added mapCenter to dependency array

    return <div ref={mapContainer} style={{ width: '100%', height: '500px' }} className="sea-route-map-container" />;
};

export default SeaRouteMap;