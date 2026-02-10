// Document upload/Voyage Service/Client/VoyageDetailsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
// import axios from 'axios'; // REMOVED
import { useParams, Link } from 'react-router-dom';
import { FaRoute, FaInfoCircle, FaCalendarAlt, FaMapMarkerAlt, FaShip } from 'react-icons/fa'; 
import { RiDownloadLine } from 'react-icons/ri'; 
import { DetailItem, DetailCard } from '../components/CommonDetails/DetailComponents';
import SeaRouteMap from '../components/MEMP/SeaRouteMap';
import './VoyageDetailsPage.css'; 
// *** ADDED: Import centralized API functions and constant ***
import { fetchVoyageDetails, fetchVoyageAttachments, getVoyageAttachmentUrl } from '../api';

// REMOVED: Hardcoded API_BASE_URL and getAttachmentUrl helper
// const API_BASE_URL = 'http://localhost:7000/api';

// Constants for segment colors
const COLOR_VOYAGE = '#007bff';
const COLOR_LEG = '#28a745';    

const VoyageDetailsPage = () => {
    const { voyageId } = useParams();
    const [voyageDetails, setVoyageDetails] = useState(null);
    const [voyageLegs, setVoyageLegs] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchVoyageAndPortDetails = async () => {
            setLoading(true);
            setError('');
            setVoyageLegs([]);
            setAttachments([]);

            if (!voyageId) {
                setError('No Voyage ID provided in the URL.');
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch Voyage Details (now includes main port coordinates and all legs)
                // *** UPDATED: Use centralized API function fetchVoyageDetails ***
                const details = await fetchVoyageDetails(voyageId);
                setVoyageDetails(details);
                
                setVoyageLegs(details.voyageLegs || []); 

                // 2. Fetch Voyage Attachments
                try {
                    // *** UPDATED: Use centralized API function fetchVoyageAttachments ***
                    const attachmentsData = await fetchVoyageAttachments(voyageId);
                    setAttachments(attachmentsData);
                } catch (attachErr) {
                    console.error("Error fetching voyage attachments:", attachErr);
                }

            } catch (err) {
                console.error("Error fetching voyage details or port data:", err);
                setError(err.message || 'Failed to load voyage details or port data.');
            } finally {
                setLoading(false);
            }
        };

        fetchVoyageAndPortDetails();
    }, [voyageId]);

    // *** MODIFIED: formatDateTime simplified to only show local time in a readable format. ***
    const formatDateTime = (localDateTimeString) => {
        if (!localDateTimeString) return 'N/A';
        const date = new Date(localDateTimeString);
        return date.toLocaleString();
    };

    // Map segments and markers logic remains the same (omitted for brevity)
    const mapSegments = useMemo(() => {
        if (!voyageDetails || !voyageDetails.DepartureLatitude || !voyageDetails.ArrivalLatitude) {
            return [];
        }
        
        const { 
            DeparturePortCode, ArrivalPortCode, ArrivalLatitude, ArrivalLongitude, 
            DepartureLatitude, DepartureLongitude, Departure_Port_Name, Arrival_Port_Name, voyageLegs 
        } = voyageDetails;

        const segments = [];
        let currentPort = {
            code: DeparturePortCode,
            name: Departure_Port_Name, 
            lat: DepartureLatitude,
            lng: DepartureLongitude
        };

        const hasLegs = voyageLegs && voyageLegs.length > 0;

        if (hasLegs) {
            voyageLegs.forEach((leg, index) => {
                const nextPort = {
                    code: leg.ArrivalPortCode,
                    name: leg.Arrival_Port_Name, 
                    lat: leg.ArrivalLatitude,
                    lng: leg.ArrivalLongitude
                };

                if (currentPort.lat && currentPort.lng && nextPort.lat && nextPort.lng && 
                    (parseFloat(currentPort.lat) !== parseFloat(nextPort.lat) || parseFloat(currentPort.lng) !== parseFloat(nextPort.lng))) {
                    segments.push({
                        from: { lat: parseFloat(currentPort.lat), lng: parseFloat(currentPort.lng) },
                        to: { lat: parseFloat(nextPort.lat), lng: parseFloat(nextPort.lng) },
                        color: COLOR_LEG, 
                        name: `Leg ${leg.LegNumber} (${currentPort.name} to ${nextPort.name})`
                    });
                }
                currentPort = {
                    code: leg.ArrivalPortCode,
                    name: leg.Arrival_Port_Name,
                    lat: leg.ArrivalLatitude,
                    lng: leg.ArrivalLongitude
                };
            });

            const lastSegmentName = currentPort.name;

            if (currentPort.code !== ArrivalPortCode && ArrivalLatitude && ArrivalLongitude) {
                segments.push({
                    from: { lat: parseFloat(currentPort.lat), lng: parseFloat(currentPort.lng) },
                    to: { lat: parseFloat(ArrivalLatitude), lng: parseFloat(ArrivalLongitude) },
                    color: COLOR_VOYAGE, 
                    name: `Final Route (${lastSegmentName} to ${Arrival_Port_Name})`
                });
            }
            
        } else {
            if (DepartureLatitude && DepartureLongitude && ArrivalLatitude && ArrivalLongitude) {
                segments.push({
                    from: { lat: parseFloat(DepartureLatitude), lng: parseFloat(DepartureLongitude) },
                    to: { lat: parseFloat(ArrivalLatitude), lng: parseFloat(ArrivalLongitude) },
                    color: COLOR_VOYAGE, 
                    name: `Voyage Route (${Departure_Port_Name} to ${Arrival_Port_Name})`
                });
            }
        }

        return segments;

    }, [voyageDetails]);

    const mapMarkers = useMemo(() => {
        if (!voyageDetails) return [];
        const { DeparturePortCode, ArrivalPortCode, DepartureLatitude, DepartureLongitude, ArrivalLatitude, ArrivalLongitude } = voyageDetails;

        const allPorts = [];
        
        (voyageDetails.voyageLegs || []).forEach(leg => {
            if (leg.DepartureLatitude && leg.DepartureLongitude) {
                allPorts.push({
                    name: leg.Departure_Port_Name || leg.DeparturePortCode,
                    position: [parseFloat(leg.DepartureLatitude), parseFloat(leg.DepartureLongitude)],
                    type: 'intermediate'
                });
            }
            if (leg.ArrivalLatitude && leg.ArrivalLongitude) {
                allPorts.push({
                    name: leg.Arrival_Port_Name || leg.ArrivalPortCode,
                    position: [parseFloat(leg.ArrivalLatitude), parseFloat(leg.ArrivalLongitude)],
                    type: 'intermediate'
                });
            }
        });

        const uniqueMarkers = new Map();

        if (DepartureLatitude && DepartureLongitude) {
            uniqueMarkers.set(DeparturePortCode, {
                position: [parseFloat(DepartureLatitude), parseFloat(DepartureLongitude)],
                name: voyageDetails.Departure_Port_Name,
                type: 'start'
            });
        }

        allPorts.forEach(port => {
             if (!uniqueMarkers.has(port.name) && port.name !== ArrivalPortCode) {
                 uniqueMarkers.set(port.name, port); 
            }
        });
        
        if (ArrivalLatitude && ArrivalLongitude) {
             uniqueMarkers.set(ArrivalPortCode, {
                position: [parseFloat(ArrivalLatitude), parseFloat(ArrivalLongitude)],
                name: voyageDetails.Arrival_Port_Name,
                type: 'end'
            });
        }
        
        return Array.from(uniqueMarkers.values()).filter(m => m.position[0] && m.position[1]);

    }, [voyageDetails]);


    if (loading) {
        return <div className="loading-state">Loading voyage details...</div>;
    }

    if (error) {
        return <div className="error-state">Error: {error}</div>;
    }

    if (!voyageDetails) {
        return <div className="loading-state">No details found for this voyage ID.</div>;
    }
    
    const {
        VoyageNumber, VoyageStatus, IsActive, VesselName, IMO_Number, Departure_Port_Name,
        Arrival_Port_Name, DistancePlannedNM, DistanceSailedNM, CargoDescription, CargoWeightMT,
        ETD_UTC, ATD_UTC, ETA_UTC, ATA_UTC, CreatedDate, CreatedBy, ModifiedDate, ModifiedBy, RouteNotes
    } = voyageDetails || {};


    return (
        <div className="vessel-details-container">
            <div className="details-header">
                <h1>Voyage: {VoyageNumber || 'N/A'}</h1>
                <Link to="/app/memp/voyages" className="back-link">&larr; Back to Voyage List</Link>
            </div>

            <div className="details-layout">
                <div className="left-column">
                    <DetailCard title="Voyage Overview" icon={<FaRoute />}>
                        <DetailItem label="Voyage Number" value={VoyageNumber} />
                        <DetailItem label="Status" value={VoyageStatus} />
                        <DetailItem label="Is Active" value={IsActive ? 'Yes' : 'No'} />
                        <DetailItem label="Vessel Name" value={VesselName} />
                        <DetailItem label="Vessel IMO" value={IMO_Number} />
                    </DetailCard>

  
           {/* Integrate the Sea Route Map below the details layout */}
            <section className="voyage-map-section">
                <h2>Voyage Sea Route Map</h2>
                {mapSegments.length > 0 && mapMarkers.length > 0 ? (
                    <SeaRouteMap
                        segments={mapSegments}
                        markers={mapMarkers}
                    />
                ) : (
                    <div className="loading-state">
                        {loading ? 'Loading map data...' : 'Map data (coordinates) not fully available to display route.'}
                    </div>
                )}
            </section>   

                      {/* NEW SECTION: Attachments */}
                    <DetailCard title="Attachments" icon={<RiDownloadLine />}>
                        {attachments.length === 0 ? (
                            <p className="detail-no-data">No documents attached to this voyage.</p>
                        ) : (
                            <ul className="attachment-list">
                                {attachments.map(att => (
                                    <li key={att.Attachment_Id} className="attachment-item">
                                        <span>{att.OriginalName}</span>
                                        <a 
                                            // *** UPDATED: Use the imported getVoyageAttachmentUrl ***
                                            href={getVoyageAttachmentUrl(att.FilePath)} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="btn-download"
                                            title={`Download ${att.OriginalName}`}
                                        >
                                            <RiDownloadLine />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </DetailCard>                                            

                </div>

                <div className="right-column">
                    <DetailCard title="Route Details" icon={<FaMapMarkerAlt />}>
                        <DetailItem label="Departure Port" value={Departure_Port_Name || 'N/A'} />
                        <DetailItem label="Arrival Port" value={Arrival_Port_Name || 'N/A'} />
                        <DetailItem label="Planned Distance (NM)" value={DistancePlannedNM} unit="NM" />
                        <DetailItem label="Sailed Distance (NM)" value={DistanceSailedNM} unit="NM" />
                        <DetailItem label="Route Notes" value={RouteNotes || 'N/A'} />
                    </DetailCard>

                    <DetailCard title="Schedule" icon={<FaCalendarAlt />}>
                        <DetailItem label="ETD" value={formatDateTime(ETD_UTC)} />
                        <DetailItem label="ATD" value={formatDateTime(ATD_UTC)} />
                        <DetailItem label="ETA" value={formatDateTime(ETA_UTC)} />
                        <DetailItem label="ATA" value={formatDateTime(ATA_UTC)} />
                    </DetailCard>

                    <DetailCard title="Cargo Information" icon={<FaInfoCircle />}>
                        <DetailItem label="Cargo Description" value={CargoDescription || 'N/A'} />
                        <DetailItem label="Cargo Weight (MT)" value={CargoWeightMT} unit="MT" />
                    </DetailCard>         

                    <DetailCard title="Audit Information" icon={<FaInfoCircle />}>
                        <DetailItem label="Created Date" value={formatDateTime(CreatedDate)} />
                        <DetailItem label="Created By" value={CreatedBy || 'N/A'} />
                        <DetailItem label="Modified Date" value={formatDateTime(ModifiedDate)} />
                        <DetailItem label="Modified By" value={ModifiedBy || 'N/A'} />
                    </DetailCard>
                </div>
            </div>

 

            {/* NEW: Voyage Legs Table Section */}
            <section className="voyage-legs-section">
                <h2>Voyage Legs</h2>
                <div className="table-responsive">
                    <table className="details-table voyage-legs-table">
                        <thead>
                            <tr>
                                <th>Leg No.</th>
                                <th>Leg Name</th>
                                <th>Departure Port</th>
                                <th>Arrival Port</th>
                                <th>ETD</th>
                                <th>ETA</th>
                                <th>Cargo Description</th>
                                <th>Cargo Weight (MT)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {voyageLegs.length > 0 ? voyageLegs.map((leg) => (
                                <tr key={leg.VoyageLegID}>
                                    <td>{leg.LegNumber}</td>
                                    <td>{leg.LegName}</td>
                                    <td>{leg.Departure_Port_Name || leg.DeparturePortCode}</td>
                                    <td>{leg.Arrival_Port_Name || leg.ArrivalPortCode || 'N/A'}</td>
                                    <td>{formatDateTime(leg.ETD_UTC)}</td>
                                    <td>{formatDateTime(leg.ETA_UTC)}</td>
                                    <td>{leg.CargoDescription || 'N/A'}</td>
                                    <td>{leg.CargoWeightMT || 'N/A'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center' }}>No active legs found for this voyage.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default VoyageDetailsPage;