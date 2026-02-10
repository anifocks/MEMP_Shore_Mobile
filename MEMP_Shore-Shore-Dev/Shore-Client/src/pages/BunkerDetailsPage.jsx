// AI Help/Client/src/pages/BunkerDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
// import axios from 'axios'; // REMOVED
import { FaGasPump, FaShip, FaInfoCircle, FaMapMarkerAlt, FaFlask, FaOilCan, FaWeightHanging, FaCalendarAlt, FaEdit, FaTint, FaPaperclip } from 'react-icons/fa';
import { DetailItem, DetailCard } from '../components/CommonDetails/DetailComponents';
import SeaRouteMap from '../components/MEMP/SeaRouteMap';
import { format } from 'date-fns';
import './BunkerDetailsPage.css';
// *** ADDED: Import centralized API functions and constant ***
import { 
    fetchBunkeringRecordDetails, 
    fetchBunkerAttachments, 
    fetchPortDetailsByCode,
    getBunkerAttachmentUrl
} from '../api';

const BUNKER_PORT_ZOOM_LEVEL = 3; 

const BunkerDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [bunker, setBunker] = useState(null);
    const [bunkerPortCoords, setBunkerPortCoords] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attachments, setAttachments] = useState([]);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError('');
            setBunkerPortCoords(null);
            try {
                // Fetch Bunker Details and Attachments in parallel
                // *** UPDATED: Use centralized API functions ***
                const [bunkerData, attachmentsData] = await Promise.all([
                    fetchBunkeringRecordDetails(id),
                    fetchBunkerAttachments(id)
                ]);
                
                setBunker(bunkerData);
                setAttachments(attachmentsData);
                
                const portCode = bunkerData.BunkerPortCode ? bunkerData.BunkerPortCode.trim() : '';

                // If port code exists, fetch coordinates
                if (portCode) {
                    try {
                        // *** UPDATED: Use centralized API function fetchPortDetailsByCode ***
                        const portResponse = await fetchPortDetailsByCode(portCode);
                        
                        const lat = parseFloat(portResponse.Latitude);
                        const lng = parseFloat(portResponse.Longitude);

                        if (!isNaN(lat) && !isNaN(lng)) {
                            setBunkerPortCoords({
                                latitude: lat,
                                longitude: lng,
                                portName: portResponse.PortName
                            });
                        }
                    } catch (portErr) {
                        console.error(`Error fetching bunker port details for code ${portCode}:`, portErr.message);
                        setBunkerPortCoords(null);
                    }
                }

            } catch (err) {
                setError(err.message || 'Failed to fetch bunkering record details or attachments.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const isValuePresent = (value) => value !== null && value !== undefined && value !== '' && value !== 'N/A' && value !== 'NULL';

    if (loading) return <div className="loading-state">Loading bunkering record details...</div>;
    if (error) return <div className="error-state">{error}</div>;
    if (!bunker) return <div className="loading-state">No bunkering record data found.</div>;

    const isFuelBunkering = bunker.BunkerCategory === 'FUEL';
    const typeLabel = isFuelBunkering ? 'Fuel Type' : 'Lube Oil Type';
    const typeDescription = isFuelBunkering ? bunker.FuelTypeDescription : bunker.LubeOilTypeDescription;
    const qualityDetailsTitle = isFuelBunkering ? 'Fuel Quality Details' : 'Lube Oil Quality Details';

    const bunkerMarkers = bunkerPortCoords ? [{
        position: [bunkerPortCoords.latitude, bunkerPortCoords.longitude], 
        name: bunkerPortCoords.portName || bunker.BunkerPortName || bunker.BunkerPortCode,
        type: 'intermediate'
    }] : [];
    
    const mapCenter = bunkerPortCoords ? [bunkerPortCoords.latitude, bunkerPortCoords.longitude] : [0, 0];


    return (
        <div className="bunker-details-container">
            <div className="details-header">
                <h1>Bunker Record: {bunker.BDN_Number || 'N/A'} - {bunker.ShipName}</h1>
                <div className="details-header-actions">
                    <Link to="/app/memp/bunkering-management" className="back-link">&larr; Back to Bunker List</Link>
                </div>
            </div>

            <div className="details-layout">
                <div className="left-column">
                    <DetailCard title="Bunker Overview" icon={<FaGasPump />}>
                        
                        {bunker.BunkerDate && (
                            <DetailItem label="Bunker Date" value={bunker.BunkerDate.slice(0, 16).replace('T', ' ')} />
                        )}
                        
                        {bunker.BDN_Number && (
                            <DetailItem label="BDN Number" value={bunker.BDN_Number} />
                        )}
                        
                        {bunker.OperationType && (
                            <DetailItem label="Operation Type" value={bunker.OperationType} />
                        )}

                        {isValuePresent(typeDescription) && (
                            <DetailItem label={typeLabel} value={typeDescription} />
                        )}

                        {bunker.BunkerCategory && (
                            <DetailItem label="Bunker Category" value={bunker.BunkerCategory} />
                        )}
                        
                        {isValuePresent(bunker.Bunkered_Quantity) && (
                             <DetailItem label="Bunkered Quantity" value={bunker.Bunkered_Quantity} unit="MT" />
                        )}
                        
                        <DetailItem label="Is Active" value={bunker.IsActive ? 'Yes' : 'No'} />
                    </DetailCard>

                    
                    <DetailCard title="Bunker Port" icon={<FaMapMarkerAlt />}>
                        {bunker.BunkerPortName && (
                            <DetailItem label="Port Name" value={bunker.BunkerPortName} />
                        )}
                        {bunker.BunkerPortCode && (
                            <DetailItem label="Port Code" value={bunker.BunkerPortCode} />
                        )}
                    </DetailCard>

                    <section className="bunker-map-section">
                        <h2>Bunker Port Location</h2>
                        {bunkerPortCoords ? (
                            <SeaRouteMap
                                segments={[]} 
                                markers={bunkerMarkers} 
                                mapCenter={mapCenter} 
                                zoomLevel={BUNKER_PORT_ZOOM_LEVEL} 
                            />
                        ) : (
                            <div className="loading-state">
                                {'Bunker port coordinates not available to display map.'}
                            </div>
                        )}
                    </section>


                </div>

                <div className="right-column">
                    <DetailCard title={qualityDetailsTitle} icon={<FaFlask />}>
                        {isValuePresent(bunker.DensityAt15C) && (
                            <DetailItem label="Density at 15°C" value={bunker.DensityAt15C} unit="kg/m³" />
                        )}
                        {isFuelBunkering && isValuePresent(bunker.SulphurContentPercent) && (
                            <DetailItem label="Sulphur Content" value={bunker.SulphurContentPercent} unit="%" />
                        )}
                        {isValuePresent(bunker.FlashPointC) && (
                            <DetailItem label="Flash Point" value={bunker.FlashPointC} unit="°C" />
                        )}
                        {isValuePresent(bunker.ViscosityAt50C_cSt) && (
                            <DetailItem label="Viscosity at 50°C" value={bunker.ViscosityAt50C_cSt} unit="cSt" />
                        )}
                        {isValuePresent(bunker.WaterContentPercent) && (
                            <DetailItem label="Water Content" value={bunker.WaterContentPercent} unit="%" />
                        )}
                        {isFuelBunkering && isValuePresent(bunker.LCV) && (
                            <DetailItem label="LCV" value={bunker.LCV} unit="MJ/kg" />
                        )}
                        {isValuePresent(bunker.TemperatureC) && (
                            <DetailItem label="Temperature" value={bunker.TemperatureC} unit="°C" />
                        )}
                        {isValuePresent(bunker.PressureBar) && (
                            <DetailItem label="Pressure" value={bunker.PressureBar} unit="bar" />
                        )}
                    </DetailCard>

                    
                    <DetailCard title="Quantity & Volume" icon={<FaWeightHanging />}>
                        {isValuePresent(bunker.Initial_Quantity_MT) && (
                            <DetailItem label="Initial Quantity" value={bunker.Initial_Quantity_MT} unit="MT" />
                        )}
                        {isValuePresent(bunker.Final_Quantity_MT) && (
                            <DetailItem label="Bunkered Quantity" value={bunker.Final_Quantity_MT} unit="MT" />
                        )}
                        {isValuePresent(bunker.Initial_Volume_M3) && (
                            <DetailItem label="Initial Volume" value={bunker.Initial_Volume_M3} unit="m³" />
                        )}
                        {isValuePresent(bunker.Bunkered_Volume_M3) && (
                            <DetailItem label="Bunkered Volume" value={bunker.Bunkered_Volume_M3} unit="m³" />
                        )}
                    </DetailCard>

                    <DetailCard title="Associated Vessel & Voyage" icon={<FaShip />}>
                        {bunker.ShipName && (
                            <DetailItem label="Vessel Name" value={bunker.ShipName} />
                        )}
                        {bunker.IMO_Number && (
                            <DetailItem label="IMO Number" value={bunker.IMO_Number} />
                        )}
                        {bunker.VoyageNumber && (
                            <DetailItem label="Voyage Number" value={bunker.VoyageNumber} />
                        )}
                        {isValuePresent(bunker.LegName) && (
                            <DetailItem label="Voyage Leg" value={bunker.LegName} />
                        )}
                    </DetailCard>


                    {attachments.length > 0 && (
                        <DetailCard title="BDN Documents" icon={<FaPaperclip />}>
                            <ul className="attachments-list">
                                {attachments.map((file, index) => (
                                    <li key={index}>
                                        <a href={getBunkerAttachmentUrl(file.Filename)} target="_blank" rel="noopener noreferrer" className="attachment-link">
                                            {file.OriginalName}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </DetailCard>
                    )}

                    <DetailCard title="Supplier & Compliance" icon={<FaOilCan />}>
                        {isValuePresent(bunker.SupplierName) && (
                            <DetailItem label="Supplier Name" value={bunker.SupplierName} />
                        )}
                        {isValuePresent(bunker.BargeName) && (
                            <DetailItem label="Barge Name" value={bunker.BargeName} />
                        )}
                        {isValuePresent(bunker.MARPOLSampleSealNumber) && (
                            <DetailItem label="MARPOL Sample Seal No." value={bunker.MARPOLSampleSealNumber} />
                        )}
                    </DetailCard>


                    <DetailCard title="Audit Information" icon={<FaCalendarAlt />}>
                        {isValuePresent(bunker.Remarks) && (
                            <DetailItem label="Remarks" value={bunker.Remarks} />
                        )}
                        {bunker.CreatedDate && (
                            <DetailItem label="Created Date" value={bunker.CreatedDate.slice(0, 16).replace('T', ' ')} />
                        )}
                        {isValuePresent(bunker.CreatedBy) && (
                            <DetailItem label="Created By" value={bunker.CreatedBy} />
                        )}
                        {bunker.ModifiedDate && (
                            <DetailItem label="Modified Date" value={bunker.ModifiedDate.slice(0, 16).replace('T', ' ')} />
                        )}
                        {isValuePresent(bunker.ModifiedBy) && (
                            <DetailItem label="Modified By" value={bunker.ModifiedBy} />
                        )}
                    </DetailCard>
                </div>
            </div>
        </div>
    );
};

export default BunkerDetailsPage;