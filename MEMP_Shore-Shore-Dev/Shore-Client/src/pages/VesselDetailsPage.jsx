// 4 ROB Implementataion/Client/src/pages/VesselDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
// import axios from 'axios'; // REMOVED: Replaced with API functions
import { FaShip, FaInfoCircle, FaRulerCombined, FaWeightHanging, FaCheckCircle, FaCog } from 'react-icons/fa';
// Import DetailItem and DetailCard from the new common components file
import { DetailItem, DetailCard } from '../components/CommonDetails/DetailComponents';
import './VesselDetailsPage.css';
// *** ADDED: Import centralized API functions and constants ***
import { fetchVesselDetails, VESSEL_IMAGE_BASE_PATH } from '../api';

// REMOVED: Hardcoded API_BASE_URL is replaced by centralized functions and constants from api.js
// const API_BASE_URL = 'http://localhost:7000/api';

const VesselDetailsPage = () => {
    const { shipId } = useParams();
    const [ship, setShip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError('');
            try {
                // *** UPDATED: Use centralized API function fetchVesselDetails ***
                const data = await fetchVesselDetails(shipId);
                setShip(data);
            } catch (err) {
                // The API function throws an Error object with a message property
                setError(err.message || 'Failed to fetch vessel details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [shipId]);

    if (loading) return <div className="loading-state">Loading vessel details...</div>;
    if (error) return <div className="error-state">{error}</div>;
    if (!ship) return <div className="loading-state">No vessel data found.</div>;

    // Use the image name from the database, or a default if none exists
    const imageName = ship.Imagename || 'default.jpg';
    
    // *** UPDATED: Construct the URL using the imported BASE_PATH ***
    const imageUrl = `${VESSEL_IMAGE_BASE_PATH}${imageName}`;
    
    // Fallback for when the specific image can't be found on the server
    const placeholderUrl = `${VESSEL_IMAGE_BASE_PATH}default.jpg`;

    return (
        <div className="vessel-details-container">
            <div className="details-header">
                <h1>{ship.ShipName}</h1>
                <Link to="/app/memp/vessel-info" className="back-link">&larr; Back to Vessel List</Link>
            </div>

            <div className="details-layout">
                <div className="left-column">
                    <div className="image-card">
                        <img
                            src={imageUrl}
                            alt={ship.ShipName}
                            className="vessel-image"
                            // Handle cases where the specific image is not found on the server
                            onError={(e) => { e.target.onerror = null; e.target.src=placeholderUrl; }}
                        />
                        <div className="image-card-info">
                            <p className="info-ship-name">{ship.ShipName}</p>
                            <p className="info-short-name">{ship.Short_Name}</p>
                            <p className="info-imo">IMO: {ship.IMO_Number}</p>
                            <p className="info-type">{ship.VesselTypeDescription}</p>
                            <span className={`status-badge ${ship.IsActive ? 'active' : 'inactive'}`}>
                                {ship.IsActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                    <DetailCard title="Identifiers" icon={<FaInfoCircle />}>
                        <DetailItem label="Flag State" value={ship.FlagState} />
                        <DetailItem label="Port of Registry" value={ship.PortOfRegistry} />
                        <DetailItem label="Call Sign" value={ship.CallSign} />
                        <DetailItem label="MMSI" value={ship.MMSI} />
                    </DetailCard>
                </div>

                <div className="right-column">
                    <DetailCard title="Dimensions" icon={<FaRulerCombined />}>
                        <DetailItem label="Length Overall" value={ship.LengthOverall} unit="m" />
                        <DetailItem label="Breadth" value={ship.Breadth} unit="m" />
                        <DetailItem label="Depth" value={ship.Depth} unit="m" />
                        <DetailItem label="Draft (Fwd)" value={ship.Draft_Fwd} unit="m" />
                        <DetailItem label="Draft (Aft)" value={ship.Draft_Aft} unit="m" />
                        <DetailItem label="Displacement" value={ship.Displacement} unit="t" />
                        <DetailItem label="Pitch" value={ship.Pitch} />
                    </DetailCard>
                    <DetailCard title="Capacities & Tonnage" icon={<FaWeightHanging />}>
                        <DetailItem label="Deadweight (DWT)" value={ship.CapacityDWT} unit="t" />
                        <DetailItem label="Gross Tonnage (GT)" value={ship.CapacityGT} unit="t" />
                        <DetailItem label="Net Tonnage" value={ship.NetTonnage} unit="t" />
                        <DetailItem label="TEU Capacity" value={ship.CapacityTEU} />
                        <DetailItem label="CBM Capacity" value={ship.Capacity_M3} unit="m³" />
                        <DetailItem label="Passengers" value={ship.CapacityPassengers} />
                    </DetailCard>
                    <DetailCard title="Class & Compliance" icon={<FaCheckCircle />}>
                        <DetailItem label="Class Society" value={ship.ClassSociety} />
                        <DetailItem label="EEDI" value={ship.EEDI} />
                        <DetailItem label="EEXI" value={ship.EEXI} />
                        <DetailItem label="Shaft Power Limit" value={ship.Shaft_Power_Limitation ? 'Yes' : 'No'} />
                        <DetailItem label="Ice Class" value={ship.IceClassDescription} />
                        <DetailItem label="Ice Class System" value={ship.IceClassSystem} />
                    </DetailCard>
                    <DetailCard title="CII Parameters" icon={<FaCog />}>
                        <DetailItem label="Regulation Ship Type" value={ship.CIIRegulationShipType} />
                        <DetailItem label="Capacity Metric" value={ship.CII_CapacityMetric} />
                        <DetailItem label="Parameter A" value={ship.CII_ParameterA} />
                        <DetailItem label="Parameter C" value={ship.CII_ParameterC} />
                    </DetailCard>
                </div>
            </div>
        </div>
    );
};

export default VesselDetailsPage;