// File: Client/src/hooks/useVesselReportLogic.js
import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment-timezone';
import { fetchBdnNumbersByLubeOilType, fetchVoyageParents, fetchVoyageLegsByParent, apiClient } from '../api'; 
import { 
    initialReportState, API_GATEWAY_URL, VOYAGE_SELECTION_KEY, PARENT_VOYAGE_SELECTION_KEY, 
    ELECTRIC_MACHINERY_KEYS, isNumeric, isNonNegative, isDraftNumeric, 
    getCleanValue, validateTab, validateReportTimeAndStatus, extractUtcOffset
} from '../utils/reportHelpers';

// ALTERED: Simply cleans and return the local date string for display
const formatDateTimeConsistent = (dateString, timezoneString, includeTime = true) => {
    if (!dateString) return ''; 
    let cleanedString = String(dateString).split('.')[0].replace('T', ' '); 
    if (!includeTime) {
        cleanedString = cleanedString.split(' ')[0];
    }
    // Logic preserved: Returns raw database string
    return cleanedString; 
};

const useVesselReportLogic = (shipId, reportId) => {
    const navigate = useNavigate();
    const [report, setReport] = useState(initialReportState);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState(null); 
    const [validationErrors, setValidationErrors] = useState({}); 
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState('reportOverview');
    const [editHeaderEnabled, setEditHeaderEnabled] = useState(false); 
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); 
    const isSavingRef = useRef(false);

    const [voyageParents, setVoyageParents] = useState([]);
    const [voyageLegs, setVoyageLegs] = useState([]); 
    const [selectedParentVoyageId, setSelectedParentVoyageId] = useState('');
    const [selectedVoyageLegId, setSelectedVoyageLegId] = useState('');
    const [currentSelectedVoyageLegDetails, setCurrentSelectedVoyageLegDetails] = useState(null);

    const [loadingVoyages, setLoadingVoyages] = useState(false);
    const [loadingMappedMachinery, setLoadingMappedMachinery] = useState(false);
    const [bdnNumbersByFuelType, setBdnNumbersByFuelType] = useState({}); 
    const [loBdnData, setLoBdnData] = useState({});
    const [fuelRobValues, setFuelRobValues] = useState({});
    const [loRobValues, setLoRobValues] = useState({});
    const [bdnRobValues, setBdnRobValues] = useState({});
    const [shipPitch, setShipPitch] = useState(null);
    const [reportTypes, setReportTypes] = useState([]);
    const [machineryTypesList, setMachineryTypesList] = useState([]);
    const [mappedVesselMachinery, setMappedVesselMachinery] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [seaPorts, setSeaPorts] = useState([]);
    const [precedingReport, setPrecedingReport] = useState(null);
    const [availableReportTypes, setAvailableReportTypes] = useState([]);
    const [vesselActivities, setVesselActivities] = useState([]);
    const [windDirections, setWindDirections] = useState([]);
    const [seaStates, setSeaStates] = useState([]);
    const [swellDirections, setSwellDirections] = useState([]);
    const [cargoActivities, setCargoActivities] = useState([]);
    const [fuelTypesWithRob, setFuelTypesWithRob] = useState([]);
    const [lubeOilTypesWithRob, setLubeOilTypesWithRob] = useState([]); 

    const formattedWindDirections = useMemo(() => (windDirections || []).map(d => ({ value: d.DirectionName, label: d.DirectionName })), [windDirections]);
    const formattedSeaStates = useMemo(() => (seaStates || []).map(s => ({ value: s.StateDescription, label: s.StateDescription })), [seaStates]);
    const formattedSwellDirections = useMemo(() => (swellDirections || []).map(d => ({ value: d.DirectionName, label: d.DirectionName })), [swellDirections]);
    const formattedCargoActivities = useMemo(() => (cargoActivities || []).map(a => ({ value: a.Cargo_Activity, label: a.Cargo_Activity })), [cargoActivities]);
    const formattedVesselActivities = useMemo(() => (vesselActivities || []).filter(activity => activity && activity.Vessel_Activity_Id && activity.Vessel_Activity).map(activity => ({ value: activity.Vessel_Activity, label: activity.Vessel_Activity })), [vesselActivities]);
    
    const formattedTimezones = useMemo(() => {
        const zones = moment.tz.names();
        const groupedOffsets = {}; 
        zones.forEach(zone => {
            try {
                const offset = moment.tz(zone).format('Z');
                const utcOffsetKey = `(UTC${offset})`;
                if (!groupedOffsets[utcOffsetKey]) { groupedOffsets[utcOffsetKey] = []; }
                groupedOffsets[utcOffsetKey].push(zone); 
            } catch (e) {}
        });
        const sortedOffsets = Object.keys(groupedOffsets).sort((a, b) => {
            const getNumericOffset = (key) => parseFloat(key.substring(4, 10).replace(':', '.'));
            return getNumericOffset(a) - getNumericOffset(b);
        });
        return sortedOffsets.map(offsetKey => ({
            value: offsetKey, 
            label: offsetKey.match(/\(UTC([+-]\d{2}:\d{2})\)/)?.[1] || offsetKey
        }));
    }, []);
    
    const portMap = useMemo(() => (seaPorts || []).reduce((acc, p) => {
        acc[p.PortCode] = p.PortName;
        return acc;
    }, {}), [seaPorts]);

    const fromPortName = useMemo(() => {
        const code = currentSelectedVoyageLegDetails?.DeparturePortCode || report.DeparturePortCode;
        return portMap[code] || code || 'N/A';
    }, [currentSelectedVoyageLegDetails, portMap, report.DeparturePortCode]);

    const toPortName = useMemo(() => {
        const code = currentSelectedVoyageLegDetails?.ArrivalPortCode || report.ArrivalPortCode;
        return portMap[code] || code || 'N/A';
    }, [currentSelectedVoyageLegDetails, portMap, report.ArrivalPortCode]);

    const parentVoyageOptions = useMemo(() => {
        return (voyageParents || [])
            .map(item => ({
                value: item.ID, 
                label: item.VoyageIdentifier,
                tooltip: `From: ${portMap[item.DeparturePortCode] || item.DeparturePortCode} To: ${portMap[item.ArrivalPortCode] || item.ArrivalPortCode}`,
                CreatedDate: item.CreatedDate,
            }))
            .sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate)); 
    }, [voyageParents, portMap]);

    const voyageLegOptions = useMemo(() => {
        return (voyageLegs || [])
            .map(item => ({
                value: item.ID,
                label: `${item.VoyageIdentifier} (Leg ${item.LegNumber})`,
                DeparturePortCode: item.DeparturePortCode,
                ArrivalPortCode: item.ArrivalPortCode,
                tooltip: `From: ${portMap[item.DeparturePortCode] || item.DeparturePortCode} To: ${portMap[item.ArrivalPortCode] || item.ArrivalPortCode}`,
                VoyageIdentifier: item.VoyageIdentifier,
                LegNumber: item.LegNumber,
                ParentVoyageID: item.VoyageID,
                Type: item.Type 
            }))
            .sort((a, b) => (a.LegNumber || 0) - (b.LegNumber || 0)); 
    }, [voyageLegs, portMap]);

    const calculatedEngineDistance = useMemo(() => {
        const P = parseFloat(shipPitch);
        if (isNaN(P) || P <= 0) return '';
        const mainEngineData = (report.machineryData || []).find(md => (md.MachineryName || '').toUpperCase().startsWith('ME'));
        if (!mainEngineData) return '';
        const R = parseFloat(mainEngineData.RPM);
        const H = parseFloat(mainEngineData.Running_Hrs);
        if (isNaN(R) || isNaN(H) || R <= 0 || H <= 0) return '';
        const T = H * 60; 
        const engineDistanceNM = (P * R * T) / 1852;
        return engineDistanceNM > 0 ? engineDistanceNM.toFixed(3) : '0.000';
    }, [report.machineryData, shipPitch]);

    const calculatedSlipPercent = useMemo(() => {
        const engineDistance = parseFloat(calculatedEngineDistance);
        const distanceSinceLast = parseFloat(report.positional.DistanceSinceLastReportNM);
        if (!isNumeric(engineDistance) || !isNumeric(distanceSinceLast) || engineDistance === 0) {
            return '';
        }
        const slip = ((engineDistance - distanceSinceLast) * 100) / engineDistance;
        return slip.toFixed(2);
    }, [calculatedEngineDistance, report.positional.DistanceSinceLastReportNM]);

    const calculatedTrim = useMemo(() => {
        const aftDraft = parseFloat(report.positional.AftDraft);
        const fwdDraft = parseFloat(report.positional.FwdDraft);
        if (!isDraftNumeric(aftDraft) || !isDraftNumeric(fwdDraft)) {
            return '';
        }
        return (aftDraft - fwdDraft).toFixed(2);
    }, [report.positional.AftDraft, report.positional.FwdDraft]);

    const calculatedMidDraft = useMemo(() => {
        const aftDraft = parseFloat(report.positional.AftDraft);
        const fwdDraft = parseFloat(report.positional.FwdDraft);
        if (!isDraftNumeric(aftDraft) || !isDraftNumeric(fwdDraft)) {
            return '';
        }
        return ((aftDraft + fwdDraft) / 2).toFixed(2);
    }, [report.positional.AftDraft, report.positional.FwdDraft]);

    // ALTERED: Uses TimeZoneAtPort for background duration math only
    const calculatedDurationHours = useMemo(() => {
        const currentLocalTime = report.master.ReportDateTimeLocal;
        const timeZone = report.master.TimeZoneAtPort;
        if (!precedingReport || !precedingReport.ReportDateTimeUTC || !currentLocalTime || !timeZone) { 
            return '';
        }
        try {
            const offset = extractUtcOffset(timeZone);
            if (!offset) {
                console.warn("Invalid time zone format for duration calculation.");
                return '';
            }
            const format = "YYYY-MM-DDTHH:mm"; 
            const currentLocalMoment = moment(currentLocalTime, format, true);
            if (!currentLocalMoment.isValid()) {
                return '';
            }
            // Logic preserved: Background calculation using UTC conversion
            const currentUTC = currentLocalMoment.utcOffset(offset, true).utc(); 
            const precedingUTC = moment.utc(precedingReport.ReportDateTimeUTC);
            if (currentUTC.isValid() && precedingUTC.isValid()) {
                const diffHours = currentUTC.diff(precedingUTC, 'hours', true);
                return Math.max(0, diffHours).toFixed(2);
            }
        } catch (e) {
            console.error("Error calculating accurate UTC duration hours:", e);
        }
        return '';
    }, [report.master.ReportDateTimeLocal, report.master.TimeZoneAtPort, precedingReport]);

    const machineryUsedInReport = useMemo(() => {
        return new Set((report.machineryData || []).map(md => String(md.ShipMachineryRecordID)));
    }, [report.machineryData]);

    const filteredMachineryOptions = useMemo(() => {
        return (mappedVesselMachinery || [])
            .filter(mach => {
                const isUsed = mach.MachineryTypeKey && machineryUsedInReport.has(String(mach.MachineryRecordID));
                const isElectrical = mach.MachineryTypeKey && ELECTRIC_MACHINERY_KEYS.includes(mach.MachineryTypeKey);
                return isUsed && !isElectrical;
            })
            .map(mach => ({
                value: mach.MachineryRecordID,
                label: mach.CustomMachineryName || mach.MachineryTypeDescription,
                data: mach,
                MachineryTypeKey: mach.MachineryTypeKey 
            }));
    }, [mappedVesselMachinery, machineryUsedInReport]);

    const fetchBdnNumbersForFuelType = async (shipId, fuelTypeKey) => {
        if (!shipId || !fuelTypeKey) return [];
        if (bdnNumbersByFuelType[fuelTypeKey] && bdnNumbersByFuelType[fuelTypeKey].length > 0) {
            return bdnNumbersByFuelType[fuelTypeKey];
        }
        try {
            const bdnRes = await axios.get(`${API_GATEWAY_URL}/api/reporting/ship/${shipId}/bdn-numbers-with-rob/${fuelTypeKey}`);
            const fetchedBdnData = bdnRes.data || [];
            setBdnRobValues(prev => {
                const newRobValues = { ...prev };
                fetchedBdnData.forEach(item => {
                    const trimmedBdn = item.BDN_Number ? String(item.BDN_Number).trim().toUpperCase() : '';
                    if (trimmedBdn) { newRobValues[trimmedBdn] = item.Final_Quantity; }
                });
                return newRobValues;
            });
            const newBdnNumbers = fetchedBdnData.map(item => item.BDN_Number);
            setBdnNumbersByFuelType(prev => ({ ...prev, [fuelTypeKey]: newBdnNumbers }));
            return newBdnNumbers;
        } catch (e) {
            console.error(`Failed to fetch BDN numbers for Fuel Type: ${fuelTypeKey}`, e);
            return [];
        }
    };
    
    const fetchBdnNumbersForLO = async (shipId, loTypeKey) => {
        if (!shipId || !loTypeKey) return; 
        if (loBdnData[loTypeKey]) { return; }
        try {
            const data = await fetchBdnNumbersByLubeOilType(shipId, loTypeKey);
            setBdnRobValues(prev => {
                const newRobValues = { ...prev };
                (data || []).forEach(item => {
                    const trimmedUpperBdn = item.BDN_Number ? String(item.BDN_Number).trim().toUpperCase() : ''; 
                    if (trimmedUpperBdn) { newRobValues[trimmedUpperBdn] = item.Final_Quantity; }
                });
                return newRobValues;
            });
            setLoBdnData(prev => ({
                ...prev,
                [loTypeKey]: (data || [])
                    .map(item => item.BDN_Number ? String(item.BDN_Number).trim().toUpperCase() : null)
                    .filter(Boolean)
            }));
        } catch (error) {
            console.error(`Error fetching BDN for LO Type ${loTypeKey}:`, error);
            setLoBdnData(prev => ({ ...prev, [loTypeKey]: [] }));
        }
    };

    const fetchVoyageLegsData = async (parentVoyageId) => {
        if (!parentVoyageId) {
            setVoyageLegs([]);
            return [];
        }
        setLoadingVoyages(true);
        try {
            const minVoyageLegId = precedingReport?.VoyageLegID;
            const legs = await fetchVoyageLegsByParent(parentVoyageId, null, minVoyageLegId); 
            setVoyageLegs(legs || []);
            return legs || [];
        } catch (err) {
            console.error(`Error fetching legs for voyage ${parentVoyageId}:`, err);
            setApiError(`Failed to fetch Voyage Legs: ${err.message}.`);
            setVoyageLegs([]);
            return [];
        } finally {
            setLoadingVoyages(false);
        }
    };

    useEffect(() => {
        const fetchShipPitch = async (id) => {
            if (!id) return null; 
            try {
                const detailsRes = await axios.get(`${API_GATEWAY_URL}/api/ships/details/${id}`);
                return detailsRes.data?.Pitch || null;
            } catch (e) {
                console.error(`Failed to fetch ship details for Pitch for Ship ID: ${id}`, e);
                return null;
            }
        };
        const fetchLookupsAndReport = async () => {
            setLoading(true);
            setApiError(null); 
            setValidationErrors({}); 
            let currentShipId = shipId; 
            let fetchedReport = null;
            try {
                const corePromises = [
                    axios.get(`${API_GATEWAY_URL}/api/reporting/report-types`),
                    axios.get(`${API_GATEWAY_URL}/api/ships`),
                    axios.get(`${API_GATEWAY_URL}/api/ports`),
                    axios.get(`${API_GATEWAY_URL}/api/reporting/vessel-activities`),
                    axios.get(`${API_GATEWAY_URL}/api/reporting/wind-directions`),
                    axios.get(`${API_GATEWAY_URL}/api/reporting/sea-states`),
                    axios.get(`${API_GATEWAY_URL}/api/reporting/swell-directions`),
                    axios.get(`${API_GATEWAY_URL}/api/reporting/cargo-activities`),
                    axios.get(`${API_GATEWAY_URL}/api/machinery/types`), 
                ];
                if (reportId) { 
                    corePromises.push(axios.get(`${API_GATEWAY_URL}/api/reporting/reports/${reportId}`));
                }
                const coreResults = await Promise.all(corePromises.map(p => p.catch(e => ({ error: e }))));
                const [
                    reportTypesRes, shipsRes, seaPortsRes, vesselActivitiesRes,
                    windDirectionsRes, seaStatesRes, swellDirectionsRes,
                    cargoActivitiesRes, allMachineryTypesRes, 
                    fetchedReportRes
                ] = reportId ? [...coreResults] : [...coreResults, { data: null }]; 
                if (fetchedReportRes?.error) throw fetchedReportRes.error;
                fetchedReport = fetchedReportRes?.data;
                setReportTypes(reportTypesRes.data);
                setVessels(shipsRes.data);
                setSeaPorts(seaPortsRes.data);
                setVesselActivities(vesselActivitiesRes.data);
                setWindDirections(windDirectionsRes.data);
                setSeaStates(seaStatesRes.data);
                setSwellDirections(swellDirectionsRes.data);
                setCargoActivities(cargoActivitiesRes.data);
                setMachineryTypesList(allMachineryTypesRes.data);
                if (fetchedReport) { 
                    currentShipId = fetchedReport.ShipID;
                    setIsEditMode(true);
                    setEditHeaderEnabled(false); 
                }
                if (currentShipId) {
                    setReport(prev => ({
                        ...prev,
                        master: { ...prev.master, ShipID: parseInt(currentShipId) }
                    }));
                }
                if (currentShipId) {
                    let sequentialPromises = [];
                    sequentialPromises.push(fetchShipPitch(currentShipId));
                    const precedingRoute = reportId 
                        ? `${API_GATEWAY_URL}/api/reporting/reports/preceding/${reportId}` 
                        : `${API_GATEWAY_URL}/api/reporting/ship/${currentShipId}/reports/latest`;
                    const precedingReportPromise = axios.get(precedingRoute).then(res => res.data).catch(err => {
                         if (err.response?.status === 404) return null;
                         return Promise.reject(err);
                    });
                    sequentialPromises.push(precedingReportPromise);
                    setLoadingMappedMachinery(true);
                    const voyageParentsPromise = fetchVoyageParents(currentShipId).then(data => data).catch(err => ({ error: err }));
                    sequentialPromises.push(voyageParentsPromise);
                    const robFuelTypesPromise = axios.get(`${API_GATEWAY_URL}/api/reporting/ship/${currentShipId}/fuel-types-with-rob`)
                        .then(res => {
                            const data = res.data || [];
                            setFuelTypesWithRob(data);
                            const robMap = {};
                            data.forEach(item => { robMap[item.FuelTypeKey] = item.Final_Quantity; });
                            setFuelRobValues(robMap);
                            return res.data;
                        });
                    sequentialPromises.push(robFuelTypesPromise);
                    const robLoTypesPromise = axios.get(`${API_GATEWAY_URL}/api/reporting/ship/${currentShipId}/lube-oil-types-with-rob`)
                        .then(res => {
                            const data = res.data || [];
                            setLubeOilTypesWithRob(data);
                            const robMap = {};
                            data.forEach(item => { robMap[item.LubeOilTypeKey] = item.Final_Quantity; });
                            setLoRobValues(robMap);
                            return res.data;
                        });
                    sequentialPromises.push(robLoTypesPromise);
                    const mappedMachineryPromise = axios.get(`${API_GATEWAY_URL}/api/machinery/ship/${currentShipId}`)
                        .then(res => { setLoadingMappedMachinery(false); return res.data; })
                        .catch(err => { setLoadingMappedMachinery(false); return Promise.reject(err); });
                    sequentialPromises.push(mappedMachineryPromise);
                    const [
                        pitchValue, 
                        precedingReportRes, 
                        voyageParentsData, 
                        robFuelTypesRes, 
                        robLoTypesRes, 
                        mappedMachineryRes
                    ] = await Promise.all(sequentialPromises.map(p => p.catch(e => ({ error: e }))));
                    if (pitchValue?.error) throw pitchValue.error;
                    if (precedingReportRes?.error) throw precedingReportRes.error;
                    if (robFuelTypesRes?.error) throw robFuelTypesRes.error;
                    if (robLoTypesRes?.error) throw robLoTypesRes.error;
                    if (mappedMachineryRes?.error) throw mappedMachineryRes.error;
                    setShipPitch(pitchValue);
                    setPrecedingReport(precedingReportRes); 
                    const initialVoyageParents = Array.isArray(voyageParentsData) ? voyageParentsData : [];
                    setVoyageParents(initialVoyageParents);
                    let initialParentId = null;
                    let initialLegId = null; 
                    let initialLegs = []; 
                    const dbVoyageId = fetchedReport?.VoyageID || precedingReportRes?.VoyageID;
                    if (dbVoyageId) {
                        initialParentId = dbVoyageId;
                        if (fetchedReport) {
                            initialLegId = fetchedReport.VoyageLegID || null;
                        } 
                        if (initialParentId) {
                            const minVoyageLegId = precedingReportRes?.VoyageLegID;
                            const legsResponse = await fetchVoyageLegsByParent(initialParentId, null, minVoyageLegId).catch(e => {
                                console.error("Failed to fetch initial legs:", e);
                                return [];
                            });
                            initialLegs = legsResponse;
                            setVoyageLegs(initialLegs);
                        }
                    }
                    setSelectedParentVoyageId(initialParentId || '');
                    const defaultLegId = (initialLegId || initialParentId || '');
                    const finalInitialLegId = (!isEditMode && initialParentId) ? '' : defaultLegId;
                    setSelectedVoyageLegId(finalInitialLegId);
                    const finalSelectedItem = (initialLegId && (initialLegs || []).find(l => l.ID === initialLegId)) 
                        || (initialVoyageParents || []).find(p => p.ID === initialParentId);
                    if (finalSelectedItem) {
                        setCurrentSelectedVoyageLegDetails(finalSelectedItem);
                        setReport(prev => ({
                            ...prev,
                            DeparturePortCode: finalSelectedItem.DeparturePortCode || '',
                            ArrivalPortCode: finalSelectedItem.ArrivalPortCode || '',
                        }));
                    }
                    const fetchedMappedMachinery = (mappedMachineryRes || []).sort((a, b) => { 
                        const nameA = a.CustomMachineryName || '';
                        const nameB = b.CustomMachineryName || '';
                        const re = /(\D*)(\d+)/;
                        const matchA = nameA.match(re);
                        const matchB = nameB.match(re);
                        if (matchA && matchB) {
                            const [, textA, numA] = matchA;
                            const [, textB, numB] = matchB;
                            if (textA !== textB) {
                                return textA.localeCompare(textB);
                            }
                            return parseInt(numA, 10) - parseInt(numB, 10);
                        }
                        return nameA.localeCompare(b.CustomMachineryName || b.MachineryTypeDescription); 
                    });
                    setMappedVesselMachinery(fetchedMappedMachinery); 
                    const mapFuelAndLOMachineryToRecordId = (items, currentMappedMachinery) => {
                        return (items || []).map(item => {
                            let foundMachinery = null;
                            if (item.MachineryName && item.MachineryTypeKey) {
                                foundMachinery = currentMappedMachinery.find(
                                    m => m.CustomMachineryName === item.MachineryName && m.MachineryTypeKey === item.MachineryTypeKey
                                );
                            } else if (item.SpecificMachineryName && item.MachineryTypeKey) {
                                foundMachinery = currentMappedMachinery.find(
                                    m => m.CustomMachineryName === item.SpecificMachineryName && m.MachineryTypeKey === item.MachineryTypeKey
                                );
                            }
                            return {
                                ...item,
                                ShipMachineryRecordID: foundMachinery ? foundMachinery.MachineryRecordID : null
                            };
                        });
                    };
                    if (fetchedReport) {
                        const getLatLonValueAndDirection = (value, defaultDirection) => {
                            if (typeof value === 'number') {
                                return { value: Math.abs(value), direction: value >= 0 ? defaultDirection : (defaultDirection === 'N' ? 'S' : 'W') };
                            }
                            if (typeof value === 'string' && (value.endsWith('N') || value.endsWith('S') || value.endsWith('E') || value.endsWith('W'))) {
                                return { value: parseFloat(value.slice(0, -1)) || '', direction: value.slice(-1) };
                            }
                            return { value: value || '', direction: defaultDirection };
                        };
                        const { value: latValue, direction: latDirection } = getLatLonValueAndDirection(fetchedReport.Latitude, 'N');
                        const { value: lonValue, direction: lonDirection } = getLatLonValueAndDirection(fetchedReport.Longitude, 'E');
                        setReport(prevReport => ({
                            ...prevReport,
                            master: {
                                ReportID: fetchedReport.ReportID,
                                ShipID: fetchedReport.ShipID,
                                VoyageID: fetchedReport.VoyageID || null,
                                ReportTypeKey: fetchedReport.ReportTypeKey,
                                ReportDateTimeLocal: fetchedReport.ReportDateTimeLocal ? formatDateTimeConsistent(fetchedReport.ReportDateTimeLocal) : '', 
                                ReportDateTimeUTC: fetchedReport.ReportDateTimeLocal ? formatDateTimeConsistent(fetchedReport.ReportDateTimeLocal) : '', 
                                TimeZoneAtPort: fetchedReport.TimeZoneAtPort || '',
                                CurrentPortCode: fetchedReport.CurrentPortCode || '',
                                Remarks: fetchedReport.Remarks || '',
                                ReportDataJSON: fetchedReport.ReportDataJSON || {},
                                ReportStatus: fetchedReport.ReportStatus || 'Draft',
                            },
                            DeparturePortCode: fetchedReport.DeparturePortCode,
                            ArrivalPortCode: fetchedReport.ArrivalPortCode,
                            positional: {
                                Latitude: latValue,
                                LatitudeDirection: latDirection,
                                Longitude: lonValue,
                                LongitudeDirection: lonDirection,
                                VesselActivity: fetchedReport.VesselActivity || '',
                                CourseDEG: fetchedReport.CourseDEG || '',
                                SpeedKnots: fetchedReport.SpeedKnots || '',
                                DistanceSinceLastReportNM: fetchedReport.DistanceSinceLastReportNM || '',
                                EngineDistanceNM: fetchedReport.EngineDistanceNM || '',
                                DistanceToGoNM: fetchedReport.DistanceToGoNM || '',
                                SlipPercent: fetchedReport.SlipPercent || '',
                                SteamingHoursPeriod: fetchedReport.SteamingHoursPeriod || '',
                                TimeAtAnchorageHRS: fetchedReport.TimeAtAnchorageHRS || '',
                                TimeAtDriftingHRS: fetchedReport.TimeAtDriftingHRS || '',
                                FwdDraft: fetchedReport.FwdDraft || '', 
                                AftDraft: fetchedReport.AftDraft || '', 
                                Trim: fetchedReport.Trim || '', 
                                MidDraft: fetchedReport.MidDraft || '', 
                            },
                            weather: {
                                WindForce: fetchedReport.WindForce || '',
                                WindDirection: fetchedReport.WindDirection || '',
                                SeaState: fetchedReport.SeaState || '',
                                SwellDirection: fetchedReport.SwellDirection || '',
                                SwellHeightM: fetchedReport.SwellHeightM || '',
                                AirTemperatureC: fetchedReport.AirTemperatureC || '',
                                SeaTemperatureC: fetchedReport.SeaTemperatureC || '',
                                BarometricPressureHPa: fetchedReport.BarometricPressureHPa || '',
                            },
                            cargo: {
                                CargoActivity: fetchedReport.CargoActivity || '',
                                ReportedCargoType: fetchedReport.ReportedCargoType || '',
                                ReportedCargoQuantityMT: fetchedReport.ReportedCargoQuantityMT || '',
                                ContainersTEU: fetchedReport.ContainersTEU || '',
                                DisplacementMT: fetchedReport.DisplacementMT || '',
                            },
                            fuelConsumptions: mapFuelAndLOMachineryToRecordId(fetchedReport.fuelConsumptions, fetchedMappedMachinery),
                            loConsumptionLogs: mapFuelAndLOMachineryToRecordId(fetchedReport.loConsumptionLogs, fetchedMappedMachinery),
                            machineryData: fetchedReport.machineryData.map(md => ({
                                ...md,
                                MachineryName: md.MachineryName,
                                ShipMachineryRecordID: md.ShipMachineryRecordID
                            })) || [],
                        }));
                        const existingFuelTypes = new Set(fetchedReport.fuelConsumptions.map(fc => fc.FuelTypeKey).filter(Boolean));
                        const bdnFetchPromises = Array.from(existingFuelTypes).map(ftKey => 
                            fetchBdnNumbersForFuelType(currentShipId, ftKey)
                        );
                        const existingLOTypes = new Set(fetchedReport.loConsumptionLogs.map(lo => lo.LOTypeKey).filter(Boolean));
                        const loBdnFetchPromises = Array.from(existingLOTypes).map(loKey => 
                            fetchBdnNumbersForLO(currentShipId, loKey)
                        );
                        Promise.all([...bdnFetchPromises, ...loBdnFetchPromises]);
                    }
                } else if (!fetchedReport && !currentShipId) {
                    setApiError("No ship or report ID provided to load or create a report. Please ensure a valid route or selection.");
                }
            } catch (err) {
                console.error("Error fetching initial data:", err);
                setApiError(`Failed to load data: ${err.response?.data?.message || err.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchLookupsAndReport();
    }, [reportId, shipId]);

    useEffect(() => {
        if (selectedParentVoyageId && String(selectedParentVoyageId) !== '0') {
            const minVoyageLegId = precedingReport?.VoyageLegID;
            fetchVoyageLegsData(selectedParentVoyageId, null, minVoyageLegId);
        } else {
            setVoyageLegs([]);
        }
    }, [selectedParentVoyageId, precedingReport]); 

    useEffect(() => {
        if (loading || voyageParents.length === 0) return; 
        const parentId = selectedParentVoyageId;
        const legId = selectedVoyageLegId;
        const finalSelectedItem = voyageLegs.find(l => String(l.ID) === String(legId)) 
            || voyageParents.find(p => String(p.ID) === String(legId))
            || voyageParents.find(p => String(p.ID) === String(parentId));
        setCurrentSelectedVoyageLegDetails(finalSelectedItem || null);
        if (finalSelectedItem) {
            setReport(prev => ({
                ...prev,
                DeparturePortCode: finalSelectedItem.DeparturePortCode || '',
                ArrivalPortCode: finalSelectedItem.ArrivalPortCode || '',
            }));
        } else {
            setReport(prev => ({
                ...prev,
                DeparturePortCode: '',
                ArrivalPortCode: '',
            }));
        }
    }, [loading, voyageParents, voyageLegs, selectedParentVoyageId, selectedVoyageLegId]); 

    useEffect(() => {
        const finalParentId = selectedParentVoyageId; 
        setReport(prev => ({
            ...prev,
            master: {
                ...prev.master,
                VoyageID: finalParentId ? parseInt(finalParentId) : null,
            }
        }));
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            if (newErrors['master.VoyageID']) delete newErrors['master.VoyageID'];
            return newErrors;
        });
    }, [selectedParentVoyageId]);

    useEffect(() => {
        setReport(prev => {
            const aftDraft = parseFloat(prev.positional.AftDraft);
            const fwdDraft = parseFloat(prev.positional.FwdDraft);
            const isAnyDraftNumeric = isDraftNumeric(aftDraft) && isDraftNumeric(fwdDraft);
            const calculatedTrim = isAnyDraftNumeric ? (aftDraft - fwdDraft).toFixed(2) : '';
            const calculatedMidDraft = isAnyDraftNumeric ? ((aftDraft + fwdDraft) / 2).toFixed(2) : '';
            const distanceChanged = prev.positional.EngineDistanceNM !== calculatedEngineDistance;
            const slipChanged = prev.positional.SlipPercent !== calculatedSlipPercent;
            const trimChanged = prev.positional.Trim !== calculatedTrim;
            const midDraftChanged = prev.positional.MidDraft !== calculatedMidDraft;
            if (distanceChanged || slipChanged || trimChanged || midDraftChanged) {
                setHasUnsavedChanges(true); 
                return {
                    ...prev,
                    positional: {
                        ...prev.positional,
                        EngineDistanceNM: calculatedEngineDistance,
                        SlipPercent: calculatedSlipPercent,
                        Trim: calculatedTrim, 
                        MidDraft: calculatedMidDraft,
                    }
                };
            }
            return prev;
        });
    }, [calculatedEngineDistance, calculatedSlipPercent, report.positional.AftDraft, report.positional.FwdDraft]); 

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (hasUnsavedChanges && !isSavingRef.current) {
                event.preventDefault();
                event.returnValue = ''; 
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    // ALTERED: Skip UTC conversion and use Local time as primary UTC value
    useEffect(() => {
        if (report.master.ReportDateTimeLocal) {
            // Logic preserved: Bypasses timezone correction and sets local time as UTC
            setReport(prev => ({
                ...prev,
                master: {
                    ...prev.master,
                    ReportDateTimeUTC: prev.master.ReportDateTimeLocal 
                }
            }));
        }
    }, [report.master.ReportDateTimeLocal, report.master.TimeZoneAtPort]);

    useEffect(() => {
        let defaultReportDateTimeLocal = moment().format('YYYY-MM-DDTHH:mm');
        let defaultTimeZone = moment.tz.guess();
        let defaultVoyageId = null;
        let defaultCurrentPortCode = '';
        let defaultCargoActivity = '';
        let defaultReportedCargoType = '';
        let defaultVesselActivity = '';
        if (!loading && reportTypes.length > 0) {
            let filteredReportTypes = [...reportTypes]; 
            const isValidPrecedingReport = precedingReport && precedingReport.ReportID; 
            if (!isEditMode && isValidPrecedingReport) { 
                const precedingReportTypeObj = reportTypes.find(type => type.ReportTypeKey === precedingReport.ReportTypeKey); 
                let allowedNextTypeKeys = [];
                if (precedingReportTypeObj?.ReportTypeName === 'Emergency Report') { 
                    allowedNextTypeKeys = reportTypes.map(type => type.ReportTypeKey);
                } else if (precedingReportTypeObj?.SequentialReport) { 
                    const allowedNextNames = precedingReportTypeObj.SequentialReport.split(',').map(s => s.trim()); 
                    allowedNextTypeKeys = reportTypes.filter(type => allowedNextNames.includes(type.ReportTypeKey)).map(type => type.ReportTypeKey);
                } else {
                    allowedNextTypeKeys = reportTypes.map(type => type.ReportTypeKey);
                }
                if (allowedNextTypeKeys.length > 0 && !report.master.ReportTypeKey) {
                    setReport(prev => ({
                        ...prev,
                        master: { ...prev.master, ReportTypeKey: allowedNextTypeKeys[0] }
                    }));
                }
                filteredReportTypes = reportTypes.filter(type => allowedNextTypeKeys.includes(type.ReportTypeKey));
                defaultTimeZone = precedingReport.TimeZoneAtPort || defaultTimeZone; 
                defaultVoyageId = precedingReport.VoyageID || defaultVoyageId; 
                defaultCurrentPortCode = precedingReport.CurrentPortCode || defaultCurrentPortCode; 
                defaultVesselActivity = precedingReport.VesselActivity || defaultVesselActivity; 
                defaultCargoActivity = precedingReport.CargoActivity || defaultCargoActivity; 
                defaultReportedCargoType = precedingReport.ReportedCargoType || defaultReportedCargoType; 
                if (precedingReport.ReportDateTimeLocal) { 
                    try {
                        let lastMoment = moment(precedingReport.ReportDateTimeLocal.split('.')[0], "YYYY-MM-DDTHH:mm");
                        if (lastMoment.isValid()) {
                            defaultReportDateTimeLocal = isEditMode 
                                ? formatDateTimeConsistent(precedingReport.ReportDateTimeLocal) 
                                : lastMoment.add(24, 'hours').format('YYYY-MM-DDTHH:mm'); // Logic preserved: sets next noon for convenience
                        }
                    } catch (e) {
                        console.error("Error setting default date/time from last report:", e);
                    }
                }
            } 
            setAvailableReportTypes(filteredReportTypes);
            if (!isEditMode) {
                setReport(prev => ({
                    ...prev,
                    master: {
                        ...prev.master,
                        TimeZoneAtPort: prev.master.TimeZoneAtPort || defaultTimeZone,
                        VoyageID: prev.master.VoyageID || defaultVoyageId,
                        CurrentPortCode: prev.master.CurrentPortCode || defaultCurrentPortCode,
                        ReportDateTimeLocal: prev.master.ReportDateTimeLocal || defaultReportDateTimeLocal,
                        ReportDateTimeUTC: prev.master.ReportDateTimeLocal || defaultReportDateTimeLocal, 
                    },
                    DeparturePortCode: prev.DeparturePortCode || '', 
                    ArrivalPortCode: prev.ArrivalPortCode || '',
                    positional: {
                        ...prev.positional,
                        VesselActivity: prev.positional.VesselActivity || defaultVesselActivity,
                        FwdDraft: prev.positional.FwdDraft || (isValidPrecedingReport ? precedingReport.FwdDraft : ''), 
                        AftDraft: prev.positional.AftDraft || (isValidPrecedingReport ? precedingReport.AftDraft : ''),
                        Trim: prev.positional.Trim || (isValidPrecedingReport ? precedingReport.Trim : ''), 
                        MidDraft: prev.positional.MidDraft || (isValidPrecedingReport ? precedingReport.MidDraft : ''),
                    },
                    cargo: {
                        ...prev.cargo,
                        CargoActivity: prev.cargo.CargoActivity || defaultCargoActivity,
                        ReportedCargoType: prev.cargo.ReportedCargoType || defaultReportedCargoType,
                        ReportedCargoQuantityMT: prev.cargo.ReportedCargoQuantityMT || (isValidPrecedingReport ? precedingReport.ReportedCargoQuantityMT : ''),
                        ContainersTEU: prev.cargo.ContainersTEU || (isValidPrecedingReport ? precedingReport.ContainersTEU : ''),
                        DisplacementMT: prev.cargo.DisplacementMT || (isValidPrecedingReport ? precedingReport.DisplacementMT : ''),
                    }
                }));
            }
        }
    }, [loading, reportTypes, precedingReport, isEditMode]);

    const handleParentVoyageSelection = (e) => {
        setHasUnsavedChanges(true);
        const selectedIdString = e.target.value;
        const selectedId = selectedIdString === '' ? null : parseInt(selectedIdString);
        setSelectedParentVoyageId(selectedIdString); 
        setSelectedVoyageLegId(''); 
        const selectedDetails = voyageParents.find(item => String(item.ID) === String(selectedId));
        if (selectedDetails) {
            localStorage.setItem(PARENT_VOYAGE_SELECTION_KEY, selectedId);
            setCurrentSelectedVoyageLegDetails(selectedDetails);
            localStorage.removeItem(VOYAGE_SELECTION_KEY); 
            setReport(prev => ({
                ...prev,
                DeparturePortCode: selectedDetails.DeparturePortCode || '',
                ArrivalPortCode: selectedDetails.ArrivalPortCode || '',
            }));
        } else {
            localStorage.removeItem(PARENT_VOYAGE_SELECTION_KEY);
            localStorage.removeItem(VOYAGE_SELECTION_KEY);
            setCurrentSelectedVoyageLegDetails(null);
            setSelectedVoyageLegId('');
            setReport(prev => ({
                ...prev,
                DeparturePortCode: '',
                ArrivalPortCode: '',
            }));
        }
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            if (newErrors['master.VoyageID']) delete newErrors['master.VoyageID'];
            return newErrors;
        });
    };
    
    const handleVoyageLegSelection = async (e) => {
        setHasUnsavedChanges(true);
        const selectedLegIdString = e.target.value;
        const selectedLegId = selectedLegIdString === '' ? null : parseInt(selectedLegIdString);
        setSelectedVoyageLegId(selectedLegIdString);
        let finalDetails = null;
        const selectedLegDetails = voyageLegs.find(item => String(item.ID) === String(selectedLegId));
        if (selectedLegDetails) {
            localStorage.setItem(VOYAGE_SELECTION_KEY, selectedLegId);
            finalDetails = selectedLegDetails;
        } else if (selectedLegIdString === selectedParentVoyageId) {
             const parentDetails = voyageParents.find(p => String(p.ID) === String(selectedParentVoyageId));
             finalDetails = parentDetails;
             localStorage.setItem(VOYAGE_SELECTION_KEY, selectedParentVoyageId);
        } else {
            localStorage.removeItem(VOYAGE_SELECTION_KEY);
        }
        setCurrentSelectedVoyageLegDetails(finalDetails || null);
        if (finalDetails) {
            setReport(prev => ({
                ...prev,
                DeparturePortCode: finalDetails.DeparturePortCode || '',
                ArrivalPortCode: finalDetails.ArrivalPortCode || '',
            }));
            const finalSelectedID = selectedLegId || parseInt(selectedParentVoyageId);
            if (finalSelectedID && report.master.ReportID) {
                try {
                    const payload = {
                        parentVoyageId: selectedParentVoyageId ? parseInt(selectedParentVoyageId) : null,
                        legId: finalDetails.Type === 'LEG' ? finalSelectedID : null,
                        legNumber: finalDetails.Type === 'LEG' ? finalDetails.LegNumber : null,
                        voyageIdentifier: finalDetails.VoyageIdentifier,
                        fromPortCode: finalDetails.DeparturePortCode,
                        toPortCode: finalDetails.ArrivalPortCode,
                    };
                    await axios.put(`${API_GATEWAY_URL}/api/reporting/reports/${report.master.ReportID}/voyage-details`, payload);
                } catch (err) {
                    console.error("Error updating voyage details in backend:", err.response ? err.response.data : err.message);
                    setApiError(`Failed to sync Voyage/Port details: ${err.response?.data?.message || err.message}`);
                }
            }
        } else {
            const parentDetails = voyageParents.find(p => String(p.ID) === String(selectedParentVoyageId));
            setReport(prev => ({
                ...prev,
                DeparturePortCode: parentDetails?.DeparturePortCode || '',
                ArrivalPortCode: parentDetails?.ArrivalPortCode || '',
            }));
        }
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            if (newErrors['master.VoyageID']) delete newErrors['master.VoyageID'];
            return newErrors;
        });
    };

    const handleMasterChange = (e, section = 'master') => {
        setHasUnsavedChanges(true);
        const { name, value, type, checked } = e.target;
        if (name === 'ParentVoyageID') {
            handleParentVoyageSelection(e);
            return; 
        }
        if (name === 'VoyageLegID') {
            handleVoyageLegSelection(e);
            return; 
        }
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            const errorKey = section === 'master' ? name : `${section}.${name}`;
            if (newErrors[errorKey]) { delete newErrors[errorKey]; }
            if (section === 'cargo' && newErrors.cargoMandatory) { delete newErrors.cargoMandatory; }
            if (name === 'ReportTypeKey') { if (newErrors.machineryData?.ME_Noon_Mandatory) delete newErrors.machineryData.ME_Noon_Mandatory; }
            if ((name === 'ReportDateTimeLocal' || name === 'TimeZoneAtPort') && newErrors.machineryData?.AE_Mandatory) { delete newErrors.machineryData.AE_Mandatory; }
            return newErrors;
        });
        let parsedValue = value;
        const floatFields = ['SpeedKnots', 'CourseDEG', 'DistanceSinceLastReportNM', 'EngineDistanceNM', 'DistanceToGoNM', 'SlipPercent', 'SteamingHoursPeriod', 'TimeAtAnchorageHRS', 'TimeAtDriftingHRS', 'WindForce', 'SwellHeightM', 'AirTemperatureC', 'SeaTemperatureC', 'BarometricPressureHPa', 'ReportedCargoQuantityMT', 'DisplacementMT', 'FwdDraft', 'AftDraft', 'Trim', 'MidDraft'];
        if (name === 'Latitude' || name === 'Longitude') {
            parsedValue = value; 
        } else if (floatFields.includes(name)) {
            parsedValue = value === '' ? '' : parseFloat(value);
            if (isNaN(parsedValue)) { parsedValue = value; }
        } else {
            const intFields = ['ContainersTEU'];
            if (intFields.includes(name)) {
                parsedValue = value === '' ? '' : parseInt(value);
                if (isNaN(parsedValue)) { parsedValue = value; }
            }
        }
        setReport(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [name]: type === 'checkbox' ? checked : parsedValue
            }
        }));
    };

    const handleChildChange = (index, field, value, type) => {
        setHasUnsavedChanges(true);
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            if (field === 'ConsumedMT' || field === 'ConsumedQty' || field === 'Total_Power') { 
                for (const key in newErrors) {
                    if (key.startsWith('fuelConsumptions') || key.startsWith('loConsumptionLogs') || key.startsWith('machineryData')) {
                        delete newErrors[key];
                    }
                }
            }
            const errorKey = `${type}[${index}].${field}`;
            if (newErrors[errorKey]) { delete newErrors[errorKey]; }
            if (field === 'Power' || field === 'Running_Hrs' || field === 'Total_Power' || type === 'fuelConsumptions') {
                if (newErrors.machineryData?.AE_Mandatory) delete newErrors.machineryData.AE_Mandatory;
                if (newErrors.machineryData?.ME_Noon_Mandatory) delete newErrors.machineryData.ME_Noon_Mandatory;
            }
            return newErrors;
        });
        setReport(prev => {
            const newArray = [...prev[type]];
            let parsedValue = value;
            let trimmedUpperValue = typeof value === 'string' ? value.trim().toUpperCase() : value;
            const numberFieldsChild = ['ConsumedMT', 'ConsumedQty', 'Power', 'RPM', 'Running_Hrs', 'Total_Power']; 
            if (numberFieldsChild.includes(field)) {
                parsedValue = value === '' ? '' : parseFloat(value);
                if (isNaN(parsedValue)) { parsedValue = value; }
            }
            if (type === 'fuelConsumptions') {
                if (field === 'ShipMachineryRecordID') {
                    const selectedMachineryRecordID = value === null || value === '' ? null : parseInt(value, 10);
                    const selectedMachinery = mappedVesselMachinery.find((m) => parseInt(m.MachineryRecordID) === selectedMachineryRecordID);
                    newArray[index] = {
                        ...newArray[index],
                        [field]: selectedMachineryRecordID,
                        MachineryName: selectedMachinery ? selectedMachinery.CustomMachineryName : null, 
                        MachineryTypeKey: selectedMachinery ? selectedMachinery.MachineryTypeKey : null,
                        ConsumedByDescription: selectedMachinery ? newArray[index].ConsumedByDescription : null 
                    };
                } else if (field === 'FuelTypeKey') {
                    newArray[index] = { ...newArray[index], [field]: value, BDN_Number: '', }; 
                    if (value && prev.master.ShipID) { fetchBdnNumbersForFuelType(prev.master.ShipID, value); }
                } else if (field === 'BDN_Number') {
                    newArray[index] = { ...newArray[index], [field]: trimmedUpperValue };
                } else if (field === 'ConsumedByDescription') {
                    newArray[index] = { ...newArray[index], [field]: value };
                } else { 
                    newArray[index] = { ...newArray[index], [field]: parsedValue };
                }
            } 
            else if (type === 'loConsumptionLogs') {
                 if (field === 'ShipMachineryRecordID') {
                    const selectedMachineryRecordID = value === null || value === '' ? null : parseInt(value, 10);
                    const selectedMachinery = mappedVesselMachinery.find((m) => parseInt(m.MachineryRecordID) === selectedMachineryRecordID);
                    newArray[index] = {
                        ...newArray[index],
                        [field]: selectedMachineryRecordID,
                        SpecificMachineryName: selectedMachinery ? selectedMachinery.CustomMachineryName : null, 
                        MachineryTypeKey: selectedMachinery ? selectedMachinery.MachineryTypeKey : null 
                    };
                } else if (field === 'LOTypeKey') {
                    newArray[index] = { ...newArray[index], [field]: value, BDN_Number: '', }; 
                    if (value && prev.master.ShipID) { fetchBdnNumbersForLO(prev.master.ShipID, value); }
                } else if (field === 'BDN_Number') {
                    newArray[index] = { ...newArray[index], [field]: trimmedUpperValue };
                } else { 
                    newArray[index] = { ...newArray[index], [field]: parsedValue };
                }
            }
            else if (type === 'machineryData') {
                 newArray[index] = { ...newArray[index], [field]: parsedValue };
            }
            return { ...prev, [type]: newArray };
        });
    };

    const addChildRow = (type, defaultValues = {}) => {
        setHasUnsavedChanges(true); 
        setReport(prev => ({ ...prev, [type]: [...prev[type], defaultValues] }));
    };

    const removeChildRow = (index, type) => {
        setHasUnsavedChanges(true); 
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            Object.keys(newErrors).forEach(key => {
                if (key.startsWith(`${type}[${index}].`)) { delete newErrors[key]; }
                if (key.startsWith('fuelConsumptions') || key.startsWith('loConsumptionLogs') || key.startsWith('machineryData')) { delete newErrors[key]; }
            });
            return newErrors;
        });
        setReport(prev => {
            const newArray = [...prev[type]];
            newArray.splice(index, 1);
            return { ...prev, [type]: newArray };
        });
    };

    const handleMachinerySelection = (e) => {
        setHasUnsavedChanges(true); 
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            Object.keys(newErrors).forEach(key => {
                if (key.startsWith('machineryData') || key === 'machinerySelection') { delete newErrors[key]; }
            });
            return newErrors;
        });
        const selectedMachineryRecordID = parseInt(e.target.value);
        const selectedMachinery = mappedVesselMachinery.find((m) => parseInt(m.MachineryRecordID) === selectedMachineryRecordID);
        if (selectedMachinery) {
            if (!selectedMachinery.MachineryTypeKey || selectedMachinery.MachineryTypeKey === '') {
                setValidationErrors(prev => ({ ...prev, 'machinerySelection': "Selected machinery does not have a valid MachineryTypeKey. Cannot add." }));
                e.target.value = ''; 
                return;
            }
            const isAlreadyAdded = report.machineryData.some((md) => parseInt(md.ShipMachineryRecordID) === selectedMachineryRecordID);
            if (!isAlreadyAdded) {
                addChildRow('machineryData', {
                    ShipMachineryRecordID: selectedMachinery.MachineryRecordID,
                    MachineryTypeKey: selectedMachinery.MachineryTypeKey,
                    MachineryName: selectedMachinery.CustomMachineryName || selectedMachinery.MachineryTypeDescription,
                    Power: '', RPM: '', Running_Hrs: '', Remarks: '', IsActive: 1, Total_Power: '', ConsumedByDescription: '', 
                });
                e.target.value = '';
            } else {
                setValidationErrors(prev => ({ ...prev, 'machinerySelection': `${selectedMachinery.CustomMachineryName || selectedMachinery.MachineryTypeDescription} is already added.` }));
                e.target.value = '';
            }
        }
    };

    const handleCreateReport = async (e) => {
        e.preventDefault();
        setLoading(true);
        setApiError(null);
        setValidationErrors({}); 
        isSavingRef.current = true; 
        let reportWithUtc = report; 
        const selectedDetails = currentSelectedVoyageLegDetails;
        const errors = validateTab(reportWithUtc, 'reportOverview', bdnRobValues, loRobValues, precedingReport);
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setLoading(false);
            isSavingRef.current = false; 
            return;
        }
        if (precedingReport?.VoyageLegID) {
            const precedingLegId = parseInt(precedingReport.VoyageLegID);
            const selectedLegId = parseInt(selectedVoyageLegId);
            if (!selectedDetails || isNaN(selectedLegId)) {
                setValidationErrors({ 'master.VoyageID': 'A Voyage Leg must be selected, continuing from the preceding report.' });
                setLoading(false);
                isSavingRef.current = false;
                return;
            }
            if (selectedLegId < precedingLegId) {
                setValidationErrors({ 'master.VoyageLegID': 'The selected Voyage Leg is chronologically earlier than the preceding report\'s leg. Please select the current or a subsequent leg.' });
                setLoading(false);
                isSavingRef.current = false;
                return;
            }
        } else if (!reportWithUtc.master.VoyageID || !selectedDetails) {
            setValidationErrors({ 'master.VoyageID': 'A Voyage or Voyage Leg must be selected before creating the report.' });
            setLoading(false);
            isSavingRef.current = false;
            return;
        }
        const restrictionErrors = validateReportTimeAndStatus(reportWithUtc, precedingReport, 'Draft', calculatedDurationHours);
        if (Object.keys(restrictionErrors).length > 0) {
            setValidationErrors(restrictionErrors);
            setLoading(false);
            isSavingRef.current = false;
            return;
        }
        const parentVoyage = voyageParents.find(p => String(p.ID) === String(selectedParentVoyageId));
        const finalLegId = selectedDetails.Type === 'LEG' ? selectedDetails.ID : null;
        const finalLegNumber = selectedDetails.Type === 'LEG' ? selectedDetails.LegNumber : null;
        const masterDataToSend = {
            ShipID: reportWithUtc.master.ShipID,
            VoyageID: parentVoyage.ID,
            ReportTypeKey: reportWithUtc.master.ReportTypeKey,
            ReportDateTimeUTC: reportWithUtc.master.ReportDateTimeLocal, 
            ReportDateTimeLocal: reportWithUtc.master.ReportDateTimeLocal,
            TimeZoneAtPort: reportWithUtc.master.TimeZoneAtPort,
            CurrentPortCode: reportWithUtc.master.CurrentPortCode,
            ReportStatus: 'Draft' 
        };
        const payload = {
            master: masterDataToSend,
            voyageDetails: {
                parentVoyageId: parentVoyage.ID,
                legId: finalLegId,
                legNumber: finalLegNumber,
                voyageIdentifier: selectedDetails.VoyageIdentifier,
                fromPortCode: selectedDetails.DeparturePortCode,
                toPortCode: selectedDetails.ArrivalPortCode,
            }
        };
        try {
            await axios.post(`${API_GATEWAY_URL}/api/reporting/ship/${shipId}/reports/initial`, payload, { headers: { 'Content-Type': 'application/json' } });
            if (finalLegId) { localStorage.setItem(VOYAGE_SELECTION_KEY, finalLegId); }
            localStorage.setItem(PARENT_VOYAGE_SELECTION_KEY, selectedParentVoyageId);
            alert('Report created as Draft successfully! You will now be redirected to the list page.');
            setHasUnsavedChanges(false); 
            navigate(`/app/memp/vessel-reports`);
        } catch (err) {
            console.error("Error creating initial report:", err.response ? err.response.data : err.message);
            if (err.response && err.response.status === 400 && err.response.data.errors) {
                setValidationErrors(err.response.data.errors);
            } else {
                setApiError(`Failed to create report: ${err.response?.data?.message || err.message}`);
            }
        } finally {
            setLoading(false);
            isSavingRef.current = false; 
        }
    };

    const handleSaveOrSubmit = async (e, submitStatus = 'Draft') => {
        e.preventDefault();
        setLoading(true);
        setApiError(null); 
        setValidationErrors({}); 
        isSavingRef.current = true; 
        let reportWithUtc = { ...report, master: { ...report.master, ReportDateTimeUTC: report.master.ReportDateTimeLocal || '' } };
        let allErrors = {}; 
        const tabsToValidate = submitStatus === 'Draft' 
            ? [activeTab] 
            : ['reportOverview', 'positionalActivity', 'weatherEnvironmental', 'machineryData', 'elecConsumption', 'fuelManagement', 'lubeOilManagement', 'cargoStability', 'remarks']; 
        const restrictionErrors = validateReportTimeAndStatus(reportWithUtc, precedingReport, submitStatus, calculatedDurationHours);
        tabsToValidate.forEach(tabId => {
            const tabValidationResult = validateTab(reportWithUtc, tabId, bdnRobValues, loRobValues, precedingReport);
            Object.assign(allErrors, tabValidationResult);
        });
        let errorsToBlockSaving = {};
        for (const key in allErrors) {
            if (submitStatus === 'Draft' && (key.includes('.FuelConsumptionMandatory') || key === 'machineryData.AE_Mandatory' || key === 'machineryData.ME_Noon_Mandatory')) {
                continue;
            }
            errorsToBlockSaving[key] = allErrors[key];
        }
        Object.assign(errorsToBlockSaving, restrictionErrors);
        if (precedingReport?.VoyageLegID) {
            const precedingLegId = parseInt(precedingReport.VoyageLegID);
            const selectedLegId = parseInt(selectedVoyageLegId);
            if (isNaN(selectedLegId) || selectedLegId < precedingLegId) {
                errorsToBlockSaving['master.VoyageLegID'] = 'The selected Voyage Leg is chronologically earlier than the preceding report\'s leg. Please select the current or a subsequent leg.';
            }
        }
        if (Object.keys(errorsToBlockSaving).length > 0) {
            setValidationErrors(errorsToBlockSaving);
            setLoading(false);
            isSavingRef.current = false; 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
            return;
        }
        if (submitStatus === 'Submitted') {
             const isDepartureOrAnchorAweigh = reportWithUtc.master.ReportTypeKey === 'Departure' || reportWithUtc.master.ReportTypeKey === 'AnchorAweigh' || reportWithUtc.master.ReportTypeKey === 'Anchor Dropping';
            if (isDepartureOrAnchorAweigh) {
                if (!reportWithUtc.cargo.CargoActivity || !reportWithUtc.cargo.ReportedCargoType || reportWithUtc.cargo.ReportedCargoQuantityMT === '' || reportWithUtc.cargo.ContainersTEU === '' || reportWithUtc.cargo.DisplacementMT === '') {
                    errorsToBlockSaving.cargoMandatory = "Cargo Activity, Reported Cargo Type, Quantity, Containers, and Displacement are mandatory for Departure and Anchor Aweigh reports.";
                }
            }
        }
        if (Object.keys(errorsToBlockSaving).length > 0) {
            setValidationErrors(errorsToBlockSaving);
            setLoading(false);
            isSavingRef.current = false; 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
            return;
        }
        const dataToSend = {
            master: {
                ...reportWithUtc.master,
                ReportDateTimeUTC: reportWithUtc.master.ReportDateTimeLocal || null,
                Latitude: reportWithUtc.positional.Latitude !== '' && !isNaN(parseFloat(reportWithUtc.positional.Latitude)) ? (reportWithUtc.positional.LatitudeDirection === 'S' ? -1 : 1) * parseFloat(reportWithUtc.positional.Latitude) : null,
                Longitude: reportWithUtc.positional.Longitude !== '' && !isNaN(parseFloat(reportWithUtc.positional.Longitude)) ? (reportWithUtc.positional.LongitudeDirection === 'W' ? -1 : 1) * parseFloat(reportWithUtc.positional.Longitude) : null,
                VesselActivity: reportWithUtc.positional.VesselActivity || null,
                CourseDEG: reportWithUtc.positional.CourseDEG || null,
                SpeedKnots: reportWithUtc.positional.SpeedKnots || null,
                DistanceSinceLastReportNM: reportWithUtc.positional.DistanceSinceLastReportNM || null,
                EngineDistanceNM: reportWithUtc.positional.EngineDistanceNM || null,
                DistanceToGoNM: reportWithUtc.positional.DistanceToGoNM || null,
                SlipPercent: reportWithUtc.positional.SlipPercent || null,
                SteamingHoursPeriod: reportWithUtc.positional.SteamingHoursPeriod || null,
                TimeAtAnchorageHRS: reportWithUtc.positional.TimeAtAnchorageHRS || null,
                TimeAtDriftingHRS: reportWithUtc.positional.TimeAtDriftingHRS || null,
                FwdDraft: reportWithUtc.positional.FwdDraft || null, 
                AftDraft: reportWithUtc.positional.AftDraft || null, 
                Trim: reportWithUtc.positional.Trim || null, 
                MidDraft: reportWithUtc.positional.MidDraft || null, 
                WindForce: reportWithUtc.weather.WindForce || null,
                WindDirection: reportWithUtc.weather.WindDirection || null,
                SeaState: reportWithUtc.weather.SeaState || null,
                SwellDirection: reportWithUtc.weather.SwellDirection || null,
                SwellHeightM: reportWithUtc.weather.SwellHeightM || null,
                AirTemperatureC: reportWithUtc.weather.AirTemperatureC || null,
                SeaTemperatureC: reportWithUtc.weather.SeaTemperatureC || null,
                BarometricPressureHPa: reportWithUtc.weather.BarometricPressureHPa || null,
                CargoActivity: reportWithUtc.cargo.CargoActivity || null,
                ReportedCargoType: reportWithUtc.cargo.ReportedCargoType || null,
                ContainersTEU: reportWithUtc.cargo.ContainersTEU || null,
                DisplacementMT: reportWithUtc.cargo.DisplacementMT || null,
                CalculatedDurationHrs: parseFloat(calculatedDurationHours) || null,
                ReportStatus: submitStatus,
            },
            fuelConsumptions: reportWithUtc.fuelConsumptions,
            loConsumptionLogs: reportWithUtc.loConsumptionLogs,
            machineryData: reportWithUtc.machineryData,
            actingUser: 'Frontend_User'
        };
        try {
            if (!reportWithUtc.master.ReportID) {
                alert("Cannot save or submit an uncreated report. Please use 'Create Report' first.");
                throw new Error("Report not created.");
            } else {
                await axios.put(`${API_GATEWAY_URL}/api/reporting/reports/${reportWithUtc.master.ReportID}`, dataToSend, { headers: { 'Content-Type': 'application/json' } });
                alert(`Report ${submitStatus.toLowerCase()} successfully!`);
                setHasUnsavedChanges(false); 
                if (submitStatus === 'Submitted') { navigate(`/app/memp/vessel-reports`); } else { setReport(prev => ({ ...prev, master: { ...prev.master, ReportStatus: submitStatus } })); }
            }
        } catch (err) {
            console.error("Error saving/submitting report:", err.response ? err.response.data : err);
            if (err.response && err.response.status === 400 && err.response.data.errors) {
                setValidationErrors(err.response.data.errors);
                window.scrollTo({ top: 0, behavior: 'smooth' }); 
            } else {
                setApiError(`Failed to ${submitStatus.toLowerCase()} report: ${err.response?.data?.message || err.message}`);
            }
        } finally {
            setLoading(false);
            isSavingRef.current = false; 
        }
    };

    const handleTabClick = (tabId) => {
        const reportForValidation = { ...report, master: { ...report.master, ReportDateTimeUTC: report.master.ReportDateTimeLocal || '' } };
        const errors = validateTab(reportForValidation, activeTab, bdnRobValues, loRobValues, precedingReport);
        if (errors && Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        } else {
            setValidationErrors({}); 
        }
        setActiveTab(tabId);
    };

    return {
        report, setReport, loading, apiError, validationErrors, isEditMode, activeTab, editHeaderEnabled, hasUnsavedChanges, isSavingRef,
        vessels, availableReportTypes, formattedTimezones, parentVoyageOptions, voyageLegOptions,
        filteredMachineryOptions, fuelTypesWithRob, lubeOilTypesWithRob, bdnNumbersByFuelType, loBdnData,
        formattedVesselActivities, formattedWindDirections, formattedSeaStates, formattedSwellDirections, formattedCargoActivities,
        machineryTypesList, loadingMappedMachinery, mappedVesselMachinery, 
        selectedParentVoyageId, selectedVoyageLegId, fromPortName, toPortName,
        calculatedDurationHours, shipPitch, precedingReport,
        handleMasterChange, handleChildChange, addChildRow, removeChildRow, handleMachinerySelection,
        handleSaveOrSubmit, handleCreateReport, handleTabClick, setEditHeaderEnabled, getCleanValue,
        fuelRobValues, loRobValues, bdnRobValues
    };
};

export default useVesselReportLogic;