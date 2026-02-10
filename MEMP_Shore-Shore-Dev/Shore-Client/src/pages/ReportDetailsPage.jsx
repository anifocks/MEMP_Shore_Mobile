// File: Application/Client/src/pages/ReportDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment-timezone';
import { FaFileAlt, FaMapMarkerAlt, FaThermometerHalf, FaWind, FaShip, FaCogs, FaOilCan, FaGasPump, FaWater, FaInfoCircle } from 'react-icons/fa';
import { DetailItem, DetailCard } from '../components/CommonDetails/DetailComponents';
import './ReportDetailsPage.css'; 
import { apiClient } from '../api';

const isDisplayable = (value) => value !== null && value !== undefined && value !== '' && String(value).toUpperCase() !== 'N/A';

const getCleanValue = (value) => {
    if (!value) return value; 
    const str = String(value);
    if (str.includes(',')) {
        return str.split(',')[0].trim();
    }
    const len = str.length;
    if (len > 0 && len % 2 === 0) {
        const half = len / 2;
        const firstHalf = str.substring(0, half);
        const secondHalf = str.substring(half);
        if (firstHalf === secondHalf) {
            return firstHalf;
        }
    }
    return str;
};

const ReportDetailsPage = () => {
    const { reportId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [vesselName, setVesselName] = useState('N/A'); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [seaPorts, setSeaPorts] = useState([]); 

    // ALTERED: Simplified to return the database string exactly as is (No Timezone Shift)
    const formatDisplayDate = (dateString, timezone) => {
        if (!dateString) return 'N/A';
        // Logic preserved: Simply clean the T/milliseconds and return the raw string
        let cleaned = String(dateString).split('.')[0].replace('T', ' ');
        return cleaned;
    };
    
    const isMachineryNumericDisplayable = (value) => {
        const cleaned = getCleanValue(value);
        if (!isDisplayable(cleaned)) return false;
        if (Number(cleaned) === 0) return false;
        return true;
    };

    useEffect(() => {
        const fetchReportDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                if (!reportId) {
                    setError("No report ID provided.");
                    setLoading(false);
                    return;
                }
                const response = await apiClient.get(`/reporting/reports/${reportId}`);
                setReport(response.data);

                if (response.data?.ShipID) {
                    try {
                        const vesselRes = await apiClient.get(`/ships/${response.data.ShipID}`);
                        setVesselName(vesselRes.data?.ShipName || 'N/A');
                    } catch (vesselErr) {
                        console.error("Error fetching vessel details:", vesselErr);
                        setVesselName('N/A');
                    }
                }

                try {
                    const portsRes = await apiClient.get('/ports');
                    setSeaPorts(portsRes.data);
                } catch (portsErr) {
                    console.error("Error fetching sea ports:", portsErr);
                }
            } catch (err) {
                console.error("Error fetching report details:", err);
                setError("Failed to load report details. Please check the report ID.");
            } finally {
                setLoading(false);
            }
        };

        fetchReportDetails();
    }, [reportId]);

    if (loading) return <div className="loading">Loading report details...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!report) return <div className="not-found">Report not found.</div>;

    const getPortName = (portCode) => {
        if (!portCode) return 'N/A';
        return seaPorts.find(p => p.PortCode === portCode)?.PortName || portCode;
    };

    return (
        <div className="report-details-page-container">
            <div className="details-header">
                <h1>Vessel Report Details</h1>
                <h3>Report ID: {report.ReportID} (Status: {getCleanValue(report.ReportStatus)})</h3>
                <button onClick={() => navigate(-1)} className="back-button">Back to Reports List</button>
            </div>

            <div className="details-layout">
                <DetailCard title="Primary Information" icon={<FaFileAlt />}>
                    <DetailItem label="Report ID" value={report.ReportID} />
                    <DetailItem label="Report Status" value={getCleanValue(report.ReportStatus)} /> 
                    {isDisplayable(vesselName) && <DetailItem label="Vessel Name" value={vesselName} />}
                    {isDisplayable(report.ReportTypeKey) && <DetailItem label="Report Type" value={report.ReportTypeKey} />}
                    
                    {/* Display check for the non-shifted date string */}
                    {isDisplayable(formatDisplayDate(report.ReportDateTimeLocal)) && 
                        <DetailItem label="Report Date/Time (Local)" value={formatDisplayDate(report.ReportDateTimeLocal)} />}
                    
                    {isDisplayable(report.TimeZoneAtPort) && <DetailItem label="Time Zone" value={report.TimeZoneAtPort} />}
                    {isDisplayable(getCleanValue(report.VoyageNumber)) && <DetailItem label="Voyage Number" value={getCleanValue(report.VoyageNumber)} />}
                    {isDisplayable(getPortName(report.DeparturePortCode)) && <DetailItem label="Departure Port" value={getPortName(report.DeparturePortCode)} />}
                    {isDisplayable(getPortName(report.ArrivalPortCode)) && <DetailItem label="Arrival Port" value={getPortName(report.ArrivalPortCode)} />}
                    {isDisplayable(getPortName(report.CurrentPortCode)) && <DetailItem label="Current Port" value={getPortName(report.CurrentPortCode)} />}
                </DetailCard>

                <DetailCard title="Positional & Activity" icon={<FaShip />}>
                    {isDisplayable(report.Latitude) && <DetailItem label="Latitude" value={report.Latitude} />}
                    {isDisplayable(report.Longitude) && <DetailItem label="Longitude" value={report.Longitude} />}
                    {isDisplayable(report.VesselActivity) && <DetailItem label="Vessel Activity" value={report.VesselActivity} />}
                    {isDisplayable(report.CourseDEG) && <DetailItem label="Course (DEG)" value={report.CourseDEG} />}
                    {isDisplayable(report.SpeedKnots) && <DetailItem label="Speed (Knots)" value={report.SpeedKnots} />}
                    {isDisplayable(report.DistanceSinceLastReportNM) && <DetailItem label="Distance Since Last Report (NM)" value={report.DistanceSinceLastReportNM} />}
                    {isDisplayable(report.SteamingHoursPeriod) && <DetailItem label="Steaming Hours Period" value={report.SteamingHoursPeriod} />}
                    {isDisplayable(report.TimeAtAnchorageHRS) && <DetailItem label="Time At Anchorage (HRS)" value={report.TimeAtAnchorageHRS} />}
                    {isDisplayable(report.TimeAtDriftingHRS) && <DetailItem label="Time At Drifting (HRS)" value={report.TimeAtDriftingHRS} />}
                    {isDisplayable(getCleanValue(report.FwdDraft)) && <DetailItem label="Draft Fwd (M)" value={getCleanValue(report.FwdDraft)} />}
                    {isDisplayable(getCleanValue(report.AftDraft)) && <DetailItem label="Draft Aft (M)" value={getCleanValue(report.AftDraft)} />}
                    {isDisplayable(getCleanValue(report.Trim)) && <DetailItem label="Trim (M)" value={getCleanValue(report.Trim)} />}
                    {isDisplayable(getCleanValue(report.MidDraft)) && <DetailItem label="Mid Draft (M)" value={getCleanValue(report.MidDraft)} />}
                </DetailCard>
                
                <DetailCard title="Weather & Environmental" icon={<FaWind />}>
                    {isDisplayable(report.WindForce) && <DetailItem label="Wind Force" value={report.WindForce} />}
                    {isDisplayable(report.WindDirection) && <DetailItem label="Wind Direction" value={report.WindDirection} />}
                    {isDisplayable(report.SeaState) && <DetailItem label="Sea State" value={report.SeaState} />}
                    {isDisplayable(report.SwellDirection) && <DetailItem label="Swell Direction" value={report.SwellDirection} />}
                    {isDisplayable(report.SwellHeightM) && <DetailItem label="Swell Height (M)" value={report.SwellHeightM} />}
                    {isDisplayable(report.AirTemperatureC) && <DetailItem label="Air Temperature (°C)" value={report.AirTemperatureC} />}
                    {isDisplayable(report.SeaTemperatureC) && <DetailItem label="Sea Temperature (°C)" value={report.SeaTemperatureC} />}
                    {isDisplayable(report.BarometricPressureHPa) && <DetailItem label="Barometric Pressure (HPa)" value={report.BarometricPressureHPa} />}
                </DetailCard>

                <DetailCard title="Machinery Data" icon={<FaCogs />}>
                    {report.machineryData && report.machineryData.length > 0 ? (
                        report.machineryData.map((mach, index) => {
                            const cleanName = getCleanValue(mach.MachineryName);
                            const cleanPower = getCleanValue(mach.Power);
                            const cleanRPM = getCleanValue(mach.RPM);
                            const cleanRunningHrs = getCleanValue(mach.Running_Hrs);
                            const cleanTotalPower = getCleanValue(mach.Total_Power);
                            const cleanRemarks = getCleanValue(mach.Remarks);
                            const cleanPurpose = getCleanValue(mach.ConsumedByDescription);

                            if (!isDisplayable(cleanName) && !isMachineryNumericDisplayable(mach.Power) && !isMachineryNumericDisplayable(mach.RPM) && !isMachineryNumericDisplayable(mach.Running_Hrs) && !isDisplayable(cleanTotalPower) && !isDisplayable(cleanRemarks) && !isDisplayable(cleanPurpose)) {
                                return null;
                            }

                            return (
                                <div key={mach.MachineryDataID || index} className="list-item">
                                    {isDisplayable(cleanName) && <span className="item-name">{cleanName}</span>}
                                    <div className="item-details-list">
                                        {isMachineryNumericDisplayable(mach.Power) && <DetailItem label="Power" value={cleanPower} unit="kW" />}
                                        {isMachineryNumericDisplayable(mach.RPM) && <DetailItem label="RPM" value={cleanRPM} />}
                                        {isMachineryNumericDisplayable(mach.Running_Hrs) && <DetailItem label="Running Hrs" value={cleanRunningHrs} />}
                                        {isDisplayable(cleanTotalPower) && <DetailItem label="Total Power" value={cleanTotalPower} unit="KWH" />}
                                        {isDisplayable(cleanRemarks) && <DetailItem label="Remarks" value={cleanRemarks} />}
                                        {isDisplayable(cleanPurpose) && <DetailItem label="Purpose" value={cleanPurpose} />}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="no-data">No machinery data recorded.</p>
                    )}
                </DetailCard>

                <DetailCard title="Fuel Consumptions" icon={<FaGasPump />}>
                    {report.fuelConsumptions && report.fuelConsumptions.length > 0 ? (
                        report.fuelConsumptions.map((fuel, index) => {
                            const cleanFuelType = getCleanValue(fuel.FuelTypeDescription || fuel.FuelTypeKey);
                            const cleanMachName = getCleanValue(fuel.MachineryName);
                            const cleanBDN = getCleanValue(fuel.BDN_Number);
                            const cleanConsumed = getCleanValue(fuel.ConsumedMT);
                            const cleanPurpose = getCleanValue(fuel.ConsumedByDescription);

                            if (!isDisplayable(cleanFuelType) && !isDisplayable(cleanMachName) && !isDisplayable(cleanBDN) && !isDisplayable(cleanConsumed) && !isDisplayable(cleanPurpose)) {
                                return null;
                            }

                            return (
                                <div key={fuel.ConsumptionID || index} className="list-item">
                                    {isDisplayable(cleanFuelType) && <span className="item-name">{cleanFuelType}</span>}
                                    <div className="item-details-list">
                                        {isDisplayable(cleanMachName) && <DetailItem label="Machinery" value={cleanMachName} />}
                                        {isDisplayable(cleanBDN) && <DetailItem label="From BDN" value={cleanBDN} />} 
                                        {isDisplayable(cleanConsumed) && <DetailItem label="Consumed" value={cleanConsumed} unit="MT" />}
                                        {isDisplayable(cleanPurpose) && <DetailItem label="Purpose" value={cleanPurpose} />}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="no-data">No fuel consumption data recorded.</p>
                    )}
                </DetailCard>

                <DetailCard title="Lube Oil Consumptions" icon={<FaOilCan />}>
                    {report.loConsumptionLogs && report.loConsumptionLogs.length > 0 ? (
                        report.loConsumptionLogs.map((lo, index) => {
                            const cleanLOType = getCleanValue(lo.LubeOilTypeDescription || lo.LOTypeKey);
                            const cleanMachName = getCleanValue(lo.SpecificMachineryName);
                            const cleanBDN = getCleanValue(lo.BDN_Number);
                            const cleanConsumed = getCleanValue(lo.ConsumedQty);

                            if (!isDisplayable(cleanLOType) && !isDisplayable(cleanMachName) && !isDisplayable(cleanBDN) && !isDisplayable(cleanConsumed)) {
                                return null;
                            }

                            return (
                                <div key={lo.LOConsumptionID || index} className="list-item">
                                    {isDisplayable(cleanLOType) && <span className="item-name">{cleanLOType}</span>}
                                    <div className="item-details-list">
                                        {isDisplayable(cleanMachName) && <DetailItem label="Machinery" value={cleanMachName} />}
                                        {isDisplayable(cleanBDN) && <DetailItem label="From BDN" value={cleanBDN} />} 
                                        {isDisplayable(cleanConsumed) && <DetailItem label="Consumed" value={cleanConsumed} unit="Liters" />}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="no-data">No lube oil consumption data recorded.</p>
                    )}
                </DetailCard>

                <DetailCard title="Oily Residue Logs" icon={<FaOilCan />}>
                    {report.oilyResidueLogs && report.oilyResidueLogs.length > 0 ? (
                        report.oilyResidueLogs.map((orl, index) => {
                            const cleanResidueType = getCleanValue(orl.ResidueTypeKey);
                            const cleanQuantity = getCleanValue(orl.QuantityMT);
                            const cleanDisposal = getCleanValue(orl.DisposalMethodKey);

                            if (!isDisplayable(cleanResidueType) && !isDisplayable(cleanQuantity) && !isDisplayable(cleanDisposal)) {
                                return null;
                            }

                            return (
                                <div key={orl.OilyResidueLogID || index} className="list-item">
                                    {isDisplayable(cleanResidueType) && <span className="item-name">{cleanResidueType}</span>}
                                    <div className="item-details-list">
                                        {isDisplayable(cleanQuantity) && <DetailItem label="Quantity" value={cleanQuantity} unit="MT" />}
                                        {isDisplayable(cleanDisposal) && <DetailItem label="Disposal" value={cleanDisposal} />}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="no-data">No oily residue data recorded.</p>
                    )}
                </DetailCard>

                 <DetailCard title="Water Logs" icon={<FaWater />}>
                    {report.waterLogs && report.waterLogs.length > 0 ? (
                        report.waterLogs.map((wl, index) => {
                            const cleanWaterType = getCleanValue(wl.WaterTypeKey);
                            const cleanQuantity = getCleanValue(wl.QuantityMT);
                            const cleanOperation = getCleanValue(wl.OperationType);

                            if (!isDisplayable(cleanWaterType) && !isDisplayable(cleanQuantity) && !isDisplayable(cleanOperation)) {
                                return null;
                            }

                            return (
                                <div key={wl.WaterLogID || index} className="list-item">
                                    {isDisplayable(cleanWaterType) && <span className="item-name">{cleanWaterType}</span>}
                                    <div className="item-details-list">
                                        {isDisplayable(cleanQuantity) && <DetailItem label="Quantity" value={cleanQuantity} unit="MT" />}
                                        {isDisplayable(cleanOperation) && <DetailItem label="Operation" value={cleanOperation} />}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="no-data">No water consumption data recorded.</p>
                    )}
                </DetailCard>

                <DetailCard title="Cargo & Stability" icon={<FaShip />}>
                    {isDisplayable(report.CargoActivity) && <DetailItem label="Cargo Activity" value={report.CargoActivity} />}
                    {isDisplayable(report.ReportedCargoType) && <DetailItem label="Cargo Type" value={report.ReportedCargoType} />}
                    {isDisplayable(report.ReportedCargoQuantityMT) && <DetailItem label="Cargo Quantity (MT)" value={report.ReportedCargoQuantityMT} />}
                    {isDisplayable(report.ContainersTEU) && <DetailItem label="Containers (TEU)" value={report.ContainersTEU} />}
                    {isDisplayable(report.DisplacementMT) && <DetailItem label="Displacement (MT)" value={report.DisplacementMT} />}
                    {isDisplayable(getCleanValue(report.ChartererSpeed)) && <DetailItem label="ChartererSpeed" value={getCleanValue(report.ChartererSpeed)} unit="Knots"/>}
                    {isDisplayable(getCleanValue(report.ChartererConsumption)) && <DetailItem label="ChartererConsumption" value={getCleanValue(report.ChartererConsumption)} unit="MT"/>}
                </DetailCard>

                <DetailCard title="Audit Information" icon={<FaInfoCircle />}>
                    {isDisplayable(report.SubmittedBy) && <DetailItem label="Submitted By" value={report.SubmittedBy} />}
                    {isDisplayable(formatDisplayDate(report.SubmittedDateTimeUTC)) && <DetailItem label="Submitted Date" value={formatDisplayDate(report.SubmittedDateTimeUTC)} />}
                    {isDisplayable(report.LastModifiedBy) && <DetailItem label="Last Modified By" value={report.LastModifiedBy} />}
                    {isDisplayable(formatDisplayDate(report.LastModifiedDateTimeUTC)) && <DetailItem label="Last Modified Date" value={formatDisplayDate(report.LastModifiedDateTimeUTC)} />}
                </DetailCard>

                <div className="detail-card full-width">
                    <h4>Remarks</h4>
                    {isDisplayable(report.Remarks) ? <p className="remarks-text">{report.Remarks}</p> : <p className="no-data">N/A</p>}
                </div>
            </div>
        </div>
    );
};

export default ReportDetailsPage;