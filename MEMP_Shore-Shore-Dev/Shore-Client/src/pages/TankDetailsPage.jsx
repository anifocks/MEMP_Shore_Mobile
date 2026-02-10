import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaTachometerAlt, FaShip, FaInfoCircle, FaRulerCombined, FaWeightHanging, FaThermometerHalf, FaCompress, FaCalendarAlt, FaEdit, FaTint } from 'react-icons/fa'; // Added FaTint for Current Content
import { DetailItem, DetailCard } from '../components/CommonDetails/DetailComponents';
import './TankDetailsPage.css';

const API_BASE_URL = 'http://localhost:7000/api';
//const API_BASE_URL = 'https://veemsonboardupgrade.theviswagroup.com/api';


const TankDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tank, setTank] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await axios.get(`${API_BASE_URL}/tanks/details/${id}`);
                setTank(response.data);
            } catch (err) {
                setError('Failed to fetch tank details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleEditClick = () => {
        navigate(`/app/memp/tank-management/edit/${tank.VesselTankID}`);
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return date.toLocaleString();
    };

    // Calculate Capacity in Metric Tons
    const calculateCapacityMT = (capacityM3, standardContentDensityKGM3) => {
        if (capacityM3 === null || capacityM3 === undefined || standardContentDensityKGM3 === null || standardContentDensityKGM3 === undefined) {
            return 'N/A';
        }
        // Use default of 1000 kg/m3 if standardContentDensityKGM3 is 0 or null
        const densityMTperM3 = (parseFloat(standardContentDensityKGM3) || 1000) / 1000.0;
        return (parseFloat(capacityM3) * densityMTperM3).toFixed(3);
    };


    if (loading) return <div className="loading-state">Loading tank details...</div>;
    if (error) return <div className="error-state">{error}</div>;
    if (!tank) return <div className="loading-state">No tank data found.</div>;

    return (
        <div className="tank-details-container">
            <div className="details-header">
                <h1>{tank.Tank_Name} - {tank.TankDesignation}</h1>
                <div className="details-header-actions">
                    <Link to="/app/memp/tank-management" className="back-link">&larr; Back to Tank List</Link>
                    <button className="btn-edit" onClick={handleEditClick} style={{ marginLeft: '15px' }}>
                        <FaEdit /> Edit Tank
                    </button>
                </div>
            </div>

            <div className="details-layout">
                <div className="left-column">
                    <DetailCard title="Tank Overview" icon={<FaTachometerAlt />}>
                        <DetailItem label="Tank Name" value={tank.Tank_Name} />
                        {/* Tank Type field removed as requested */}
                        <DetailItem label="Designation" value={tank.TankDesignation || 'N/A'} />
                        <DetailItem label="Capacity (m³)" value={tank.CapacityM3} unit="m³" />
                        <DetailItem label="Capacity (MT)" value={calculateCapacityMT(tank.CapacityM3, tank.StandardContentDensityKGM3)} unit="MT" /> {/* ADDED */}
                        <DetailItem label="Is Active" value={tank.IsActive ? 'Yes' : 'No'} />
                    </DetailCard>

                    <DetailCard title="Current Content & Properties" icon={<FaTint />}> {/* New card/icon */}
                        <DetailItem label="Content Category" value={tank.ContentCategory || 'N/A'} />
                        <DetailItem label="Specific Content" value={tank.ContentTypeKey || 'N/A'} />
                        <DetailItem label="Current Quantity" value={tank.CurrentQuantityMT} unit="MT" /> {/* ADDED */}
                        <DetailItem label="Current Volume" value={tank.CurrentVolumeM3} unit="m³" />   {/* ADDED */}
                        <DetailItem label="Current Density" value={tank.CurrentDensityKGM3} unit="kg/m³" /> {/* ADDED */}
                        <DetailItem label="Current Temperature" value={tank.CurrentTemperatureC} unit="°C" /> {/* ADDED */}
                        <DetailItem label="Current Pressure" value={tank.CurrentPressureBar} unit="bar" />    {/* ADDED */}
                    </DetailCard>

                    <DetailCard title="Associated Vessel" icon={<FaShip />}>
                        <DetailItem label="Vessel Name" value={tank.ShipName} />
                        <DetailItem label="IMO Number" value={tank.IMO_Number} />
                        <DetailItem label="Vessel Type" value={tank.VesselTypeDescription || 'N/A'} />
                    </DetailCard>
                </div>

                <div className="right-column">
                    <DetailCard title="Physical Dimensions" icon={<FaRulerCombined />}>
                        <DetailItem label="Location" value={tank.Location || 'N/A'} />
                        <DetailItem label="Length" value={tank.LengthMeters} unit="m" />
                        <DetailItem label="Breadth" value={tank.BreadthMeters} unit="m" />
                        <DetailItem label="Depth" value={tank.DepthMeters} unit="m" />
                        <DetailItem label="Ullage (Input)" value={tank.Ullage} unit="m" /> {/* Label change for clarity */}
                    </DetailCard>

                    <DetailCard title="Last Manual Content Details" icon={<FaInfoCircle />}> {/* Label changed */}
                        <DetailItem label="Density (Manual)" value={tank.DensityKGM3} unit="kg/m³" /> {/* Label changed */}
                        <DetailItem label="Temperature (Manual)" value={tank.TemperatureC} unit="°C" /> {/* Label changed */}
                        <DetailItem label="Pressure (Manual)" value={tank.PressureBar} unit="bar" /> {/* Label changed */}
                        <DetailItem label="Volume (Manual)" value={tank.VolumeM3} unit="m³" /> {/* Label changed */}
                        <DetailItem label="Weight (Manual)" value={tank.WeightMT} unit="MT" /> {/* Label changed */}
                        {tank.LCV && <DetailItem label="LCV" value={tank.LCV} />}
                    </DetailCard>

                    <DetailCard title="Audit Information" icon={<FaCalendarAlt />}>
                        <DetailItem label="Created Date" value={formatDateTime(tank.CreatedDate)} />
                        <DetailItem label="Created By" value={tank.CreatedBy || 'N/A'} />
                        <DetailItem label="Modified Date" value={formatDateTime(tank.ModifiedDate)} />
                        <DetailItem label="Modified By" value={tank.ModifiedBy || 'N/A'} />
                    </DetailCard>
                </div>
            </div>
        </div>
    );
};

export default TankDetailsPage;