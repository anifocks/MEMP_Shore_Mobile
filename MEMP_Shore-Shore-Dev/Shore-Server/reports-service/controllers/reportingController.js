// File: Application/viswa-digital-backend/reports-service/controllers/reportingController.js
import * as reportingModel from '../models/reportingModel.js';
import * as machineryModel from '../../machinery-service/models/machineryModel.js';
import * as shipsModel from '../../ships-service/models/shipsModel.js';
import moment from 'moment-timezone'; 
import { getPool } from '../utils/db.js';
import sql from 'mssql';
import ExcelJS from 'exceljs'; 

// --- Validation Utility Function ---
const validateReportData = (report, isUpdate = false, isDraftSave = false, machineryTypes = []) => {
    const errors = {};

    const addError = (field, message) => {
        errors[field] = message;
    };

    const isNumeric = (value) => {
        return value !== undefined && value !== null && value !== '' && !isNaN(parseFloat(value));
    };

    const isNonNegative = (value) => {
        if (value === undefined || value === null || value === '') {
            return true; 
        }
        return isNumeric(value) && parseFloat(value) >= 0;
    };
    const isPositive = (value) => isNumeric(value) && parseFloat(value) > 0;
    const isBetween = (value, min, max) => isNumeric(value) && parseFloat(value) >= min && parseFloat(value) <= max;

    if (!report.master) {
        addError('master', 'Master report data is missing.');
        return errors;
    }

    const masterData = report.master;

    if (!masterData.ShipID) addError('master.ShipID', 'Ship ID is required.');
    if (!masterData.VoyageID && !masterData.VoyageLegID) addError('master.VoyageID', 'Voyage ID (Parent or Leg) is required.');
    if (!masterData.ReportTypeKey) addError('master.ReportTypeKey', 'Report Type is required.');
    if (!masterData.ReportDateTimeUTC) addError('master.ReportDateTimeUTC', 'Report Date/Time (UTC) is required.');
    if (!masterData.ReportDateTimeLocal) addError('master.ReportDateTimeLocal', 'Report Date/Time (Local) is required.');
    if (!masterData.TimeZoneAtPort) addError('master.TimeZoneAtPort', 'Time Zone is required.');

    if (isUpdate && (!masterData.ReportID || !Number.isInteger(parseInt(masterData.ReportID)))) {
        addError('master.ReportID', 'Report ID is required and must be an integer for updates.');
    }

    // ALTERED: Noon Report Validation - Using static string check instead of timezone shifting
    const noonReportTypes = ['Noon', 'Noon at sea', 'Noon at port', 'Noon at anchor', 'Noon at drift', 'NOON_REPORT'];
    if (noonReportTypes.includes(masterData.ReportTypeKey)) {
        if (masterData.ReportDateTimeLocal) {
            // Logic preserved: We check the string directly to ensure it's exactly 12:00:00
            const localMoment = moment(masterData.ReportDateTimeLocal); 
            if (localMoment.hour() !== 12 || localMoment.minute() !== 0) {
                addError('master.ReportDateTimeLocal', 'Noon report times (local) must be exactly 12:00 PM.');
            }
        }
    }

    if (isDraftSave) {
        return Object.keys(errors).length > 0 ? errors : null;
    }

    if (masterData.FwdDraft !== '' && masterData.FwdDraft !== null && !isNonNegative(masterData.FwdDraft)) {
        addError('master.FwdDraft', 'Draft Fwd (M) must be non-negative.');
    }
    if (masterData.AftDraft !== '' && masterData.AftDraft !== null && !isNonNegative(masterData.AftDraft)) {
        addError('master.AftDraft', 'Draft Aft (M) must be non-negative.');
    }
    if (masterData.Trim !== '' && masterData.Trim !== null && !isNumeric(masterData.Trim)) {
        addError('master.Trim', 'Trim (M) must be a number.');
    }
    if (masterData.MidDraft !== '' && masterData.MidDraft !== null && !isNumeric(masterData.MidDraft)) {
        addError('master.MidDraft', 'Mid Draft (M) must be a number.');
    }

    if (report.positional) {
        const p = report.positional;
        if (p.Latitude !== '' && p.Latitude !== null && !isBetween(p.Latitude, -90, 90)) {
            addError('positional.Latitude', 'Latitude must be between -90 and 90.');
        }
        if (p.Longitude !== '' && p.Longitude !== null && !isBetween(p.Longitude, -180, 180)) {
            addError('positional.Longitude', 'Longitude must be between -180 and 180.');
        }
        if (p.SpeedKnots !== '' && p.SpeedKnots !== null && !isNonNegative(p.SpeedKnots)) {
            addError('positional.SpeedKnots', 'Speed (Knots) must be non-negative.');
        }
        if (p.RPM !== '' && p.RPM !== null && !isNonNegative(p.RPM)) {
            addError('positional.RPM', 'RPM must be non-negative.');
        }
        if (p.SlipPercent !== '' && p.SlipPercent !== null && !isNumeric(p.SlipPercent)) {
            addError('positional.SlipPercent', 'Slip (%) must be a number.');
        }
        if (p.ShaftPowerKW !== '' && p.ShaftPowerKW !== null && !isNonNegative(p.ShaftPowerKW)) {
            addError('positional.ShaftPowerKW', 'Shaft Power (KW) must be non-negative.');
        }
        if (p.ME_LoadPercentage !== '' && p.ME_LoadPercentage !== null && (!isBetween(p.ME_LoadPercentage, 0, 100))) {
            addError('positional.ME_LoadPercentage', 'ME Load (%) must be between 0 and 100.');
        }
        if (p.DistanceSinceLastReportNM !== '' && p.DistanceSinceLastReportNM !== null && !isNonNegative(p.DistanceSinceLastReportNM)) {
            addError('positional.DistanceSinceLastReportNM', 'Distance Since Last Report (NM) must be non-negative.');
        }
        if (p.SteamingHoursPeriod !== '' && p.SteamingHoursPeriod !== null && !isNonNegative(p.SteamingHoursPeriod)) {
            addError('positional.SteamingHoursPeriod', 'Steaming Hours (Period) must be non-negative.');
        }
        if (p.TimeAtAnchorageHRS !== '' && p.TimeAtAnchorageHRS !== null && !isNonNegative(p.TimeAtAnchorageHRS)) {
            addError('positional.TimeAtAnchorageHRS', 'Time At Anchorage (HRS) must be non-negative.');
        }
        if (p.TimeAtDriftingHRS !== '' && p.TimeAtDriftingHRS !== null && !isNonNegative(p.TimeAtDriftingHRS)) {
            addError('positional.TimeAtDriftingHRS', 'Time At Drifting (HRS) must be non-negative.');
        }
    }

    if (report.weather) {
        const w = report.weather;
        if (w.WindForce !== '' && w.WindForce !== null && !isNonNegative(w.WindForce)) {
            addError('weather.WindForce', 'Wind Force must be non-negative.');
        }
        if (w.BeaufortScale !== '' && w.BeaufortScale !== null && (!isBetween(w.BeaufortScale, 0, 12))) {
            addError('weather.BeaufortScale', 'Beaufort Scale must be an integer between 0 and 12.');
        }
        if (w.AirTemperatureC !== '' && w.AirTemperatureC !== null && !isNumeric(w.AirTemperatureC)) {
            addError('weather.AirTemperatureC', 'Air Temperature must be a number.');
        }
        if (w.SeaTemperatureC !== '' && w.SeaTemperatureC !== null && !isNumeric(w.SeaTemperatureC)) {
            addError('weather.SeaTemperatureC', 'Sea Temperature must be a number.');
        }
        if (w.BarometricPressureHPa !== '' && w.BarometricPressureHPa !== null && !isNonNegative(w.BarometricPressureHPa)) {
            addError('weather.BarometricPressureHPa', 'Barometric Pressure (HPa) must be non-negative.');
        }
        if (w.SwellHeightMeters !== '' && w.SwellHeightMeters !== null && !isNonNegative(w.SwellHeightMeters)) {
            addError('weather.SwellHeightMeters', 'Swell Height (Meters) must be non-negative.');
        }
    }

    if (report.cargo) {
        const c = report.cargo;
        if (c.CargoQuantityMT !== '' && c.CargoQuantityMT !== null && !isNonNegative(c.CargoQuantityMT)) {
            addError('cargo.CargoQuantityMT', 'Cargo Quantity (MT) must be non-negative.');
        }
        const isDepartureOrAnchorAweigh = masterData.ReportTypeKey === 'Departure' || masterData.ReportTypeKey === 'AnchorAweigh' || masterData.ReportTypeKey === 'Anchor Dropping';
        if (isDepartureOrAnchorAweigh) {
            if (!c.CargoActivity) addError('cargo.CargoActivity', 'Cargo Activity is mandatory for Departure/Anchor Aweigh reports.');
            if (!c.ReportedCargoType) addError('cargo.ReportedCargoType', 'Reported Cargo Type is mandatory for Departure/Anchor Aweigh reports.');
            if (!isPositive(c.ReportedCargoQuantityMT)) addError('cargo.ReportedCargoQuantityMT', 'Reported Cargo Quantity (MT) is mandatory and must be positive for Departure/Anchor Aweigh reports.');
            if (!isNonNegative(c.ContainersTEU)) addError(`cargo.ContainersTEU`, `Containers (TEU) is mandatory and must be non-negative for Departure/Anchor Aweigh reports.`);
            if (!isPositive(c.DisplacementMT)) addError('cargo.DisplacementMT', 'Displacement (MT) is mandatory and must be positive for Departure/Anchor Aweigh reports.');
        }
    }

    if (Array.isArray(report.fuelConsumptions)) {
        report.fuelConsumptions.forEach((fc, index) => {
            if (!fc.FuelTypeKey) addError(`fuelConsumptions[${index}].FuelTypeKey`, `Fuel Type is required for fuel consumption entry ${index + 1}.`);
            if (!fc.MachineryName) addError(`fuelConsumptions[${index}].MachineryName`, `Machinery Name is required for fuel consumption entry ${index + 1}.`);
            if (!fc.MachineryTypeKey) addError(`fuelConsumptions[${index}].MachineryTypeKey`, `Machinery Type Key is required for fuel consumption entry ${index + 1}.`);
            if (Object.prototype.hasOwnProperty.call(fc, 'ConsumedMT') && !isNonNegative(fc.ConsumedMT)) {
                addError(`fuelConsumptions[${index}].ConsumedMT`, `Consumption (MT) must be non-negative for entry ${index + 1}.`);
            }
            if (Object.prototype.hasOwnProperty.call(fc, 'ROB_Quantity') && !isNonNegative(fc.ROB_Quantity)) {
                addError(`fuelConsumptions[${index}].ROB_Quantity`, `ROB Quantity must be non-negative for entry ${index + 1}.`);
            }
            if (Object.prototype.hasOwnProperty.call(fc, 'BunkeredQuantity') && !isNonNegative(fc.BunkeredQuantity)) {
                addError(`fuelConsumptions[${index}].BunkeredQuantity`, `Bunkered Quantity must be non-negative for entry ${index + 1}.`);
            }
            if (fc.BDN_Number && typeof fc.BDN_Number !== 'string') {
                addError(`fuelConsumptions[${index}].BDN_Number`, `BDN Number must be a string for entry ${index + 1}.`);
            }
        });
    }

    if (Array.isArray(report.loConsumptionLogs)) {
        report.loConsumptionLogs.forEach((lo, index) => {
            if (!lo.LOTypeKey) addError(`loConsumptionLogs[${index}].LOTypeKey`, `Lube Oil Type is required for LO consumption entry ${index + 1}.`);
            if (!lo.SpecificMachineryName) addError(`loConsumptionLogs[${index}].SpecificMachineryName`, `Specific Machinery Name is required for LO consumption entry ${index + 1}.`);
            if (!lo.MachineryTypeKey) addError(`loConsumptionLogs[${index}].MachineryTypeKey`, `Machinery Type Key is required for LO consumption entry ${index + 1}.`);
            if (Object.prototype.hasOwnProperty.call(lo, 'ConsumedQty') && !isNonNegative(lo.ConsumedQty)) {
                addError(`loConsumptionLogs[${index}].ConsumedQty`, `Consumed (Ltrs) must be non-negative for LO consumption entry ${index + 1}.`);
            }
            if (Object.prototype.hasOwnProperty.call(lo, 'ROB_Ltrs') && !isNonNegative(lo.ROB_Ltrs)) {
                addError(`loConsumptionLogs[${index}].ROB_Ltrs`, `ROB (Ltrs) must be non-negative for LO consumption entry ${index + 1}.`);
            }
            if (lo.BDN_Number && typeof lo.BDN_Number !== 'string') {
                addError(`loConsumptionLogs[${index}].BDN_Number`, `BDN Number must be a string for entry ${index + 1}.`);
            }
        });
    }

    if (Array.isArray(report.machineryData)) {
        report.machineryData.forEach((md, index) => {
            if (!md.ShipMachineryRecordID) addError(`machineryData[${index}].ShipMachineryRecordID`, `Machinery selection is required for machinery data entry ${index + 1}.`);
            if (!md.MachineryTypeKey) addError(`machineryData[${index}].MachineryTypeKey`, `Machinery Type Key is required for machinery data entry ${index + 1}.`);
            if (!md.MachineryName) addError(`machineryData[${index}].MachineryName`, `Machinery Name is required for machinery data entry ${index + 1}.`);

            const machType = machineryTypes.find(type => type.MachineryTypeKey === md.MachineryTypeKey);
            const isEngine = (md.MachineryName && (md.MachineryName.startsWith('AE') || md.MachineryName.startsWith('ME'))) ||
                             (machType?.Description && (machType.Description.includes('Auxiliary Engine') || machType.Description.includes('Main Engine')));

            if (Object.prototype.hasOwnProperty.call(md, 'Running_Hrs') && (md.Running_Hrs === '' || !isNonNegative(md.Running_Hrs))) {
                addError(`machineryData[${index}].Running_Hrs`, `Running Hours is mandatory and must be non-negative for entry ${index + 1}.`);
            }
            if (isEngine) {
                if (Object.prototype.hasOwnProperty.call(md, 'Power') && (md.Power === '' || !isNonNegative(md.Power))) {
                    addError(`machineryData[${index}].Power`, `Power is mandatory and must be non-negative for engine type machinery (${md.MachineryName || `entry ${index + 1}`}).`);
                }
                if (Object.prototype.hasOwnProperty.call(md, 'RPM') && (md.RPM === '' || !isNonNegative(md.RPM))) {
                    addError(`machineryData[${index}].RPM`, `RPM is mandatory and must be non-negative for engine type machinery (${md.MachineryName || `entry ${index + 1}`}).`);
                }
            }
            if (Object.prototype.hasOwnProperty.call(md, 'TotalHours') && !isNonNegative(md.TotalHours)) {
                addError(`machineryData[${index}].TotalHours`, `Total Hours must be non-negative for entry ${index + 1}.`);
            }
        });
    }

    if (Array.isArray(report.oilyResidueLogs)) {
        report.oilyResidueLogs.forEach((or, index) => {
            if (!or.OilyResidueTypeID) addError(`oilyResidueLogs[${index}].OilyResidueTypeID`, `Oily Residue Type is required for entry ${index + 1}.`);
            if (Object.prototype.hasOwnProperty.call(or, 'ReceivedM3') && !isNonNegative(or.ReceivedM3)) {
                addError(`oilyResidueLogs[${index}].ReceivedM3`, `Received (M3) must be non-negative for entry ${index + 1}.`);
            }
            if (Object.prototype.hasOwnProperty.call(or, 'DisposedM3') && !isNonNegative(or.DisposedM3)) {
                addError(`oilyResidueLogs[${index}].DisposedM3`, `Disposed (M3) must be non-negative for entry ${index + 1}.`);
            }
            if (!or.DisposalMethodID && (Object.prototype.hasOwnProperty.call(or, 'DisposedM3') && parseFloat(or.DisposedM3) > 0)) {
                addError(`oilyResidueLogs[${index}].DisposalMethodID`, `Disposal Method is required if Disposed Quantity > 0 for entry ${index + 1}.`);
            }
            if (Object.prototype.hasOwnProperty.call(or, 'ROB_M3') && !isNonNegative(or.ROB_M3)) {
                addError(`oilyResidueLogs[${index}].ROB_M3`, `ROB (M3) must be non-negative for entry ${index + 1}.`);
            }
        });
    }

    if (Array.isArray(report.waterLogs)) {
        report.waterLogs.forEach((wl, index) => {
            if (!wl.WaterTypeID) addError(`waterLogs[${index}].WaterTypeID`, `Water Type is required for water log entry ${index + 1}.`);
            if (Object.prototype.hasOwnProperty.call(wl, 'ReceivedM3') && !isNonNegative(wl.ReceivedM3)) {
                addError(`waterLogs[${index}].ReceivedM3`, `Received (M3) must be non-negative for water log entry ${index + 1}.`);
            }
            if (Object.prototype.hasOwnProperty.call(wl, 'ConsumedM3') && !isNonNegative(wl.ConsumedM3)) {
                addError(`waterLogs[${index}].ConsumedM3`, `Consumed (M3) must be non-negative for water log entry ${index + 1}.`);
            }
            if (Object.prototype.hasOwnProperty.call(wl, 'ROB_M3') && !isNonNegative(wl.ROB_M3)) {
                addError(`waterLogs[${index}].ROB_M3`, `ROB (M3) must be non-negative for water log entry ${index + 1}.`);
            }
        });
    }

    return Object.keys(errors).length > 0 ? errors : null;
};

// --- Helper: Extract offset from string "(UTC+05:30)" ---
const extractUtcOffset = (timezoneString) => {
    const match = timezoneString ? String(timezoneString).match(/\(UTC([+-]\d{2}:\d{2})\)/) : null;
    return match ? match[1] : null;
};

// --- Lookup Controllers ---
export const getReportTypes = async (req, res, next) => {
    try {
        const types = await reportingModel.getReportTypesFromDB();
        res.json(types);
    } catch (err) { next(err); }
};

export const getDisposalMethods = async (req, res, next) => {
    try {
        const methods = await reportingModel.getDisposalMethodsFromDB();
        res.json(methods);
    } catch (err) { next(err); }
};

export const getOilyResidueTypes = async (req, res, next) => {
    try {
        const types = await reportingModel.getOilyResidueTypesFromDB();
        res.status(200).json(types);
    } catch (err) { next(err); }
};

export const getWaterTypes = async (req, res, next) => {
    try {
        const types = await reportingModel.getWaterTypesFromDB();
        res.status(200).json(types);
    } catch (err) { next(err); }
};

export const getLubeOilTypes = async (req, res, next) => {
    try {
        const types = await reportingModel.getLubeOilTypesFromDB();
        res.json(types);
    } catch (err) { next(err); }
};

export const getVesselActivities = async (req, res, next) => {
    try {
        const activities = await reportingModel.getVesselActivitiesFromDB();
        res.json(activities);
    } catch (err) { next(err); }
};

export const getWindDirections = async (req, res, next) => {
    try {
        const directions = await reportingModel.getWindDirectionsFromDB();
        res.json(directions);
    } catch (err) { next(err); }
};

export const getSeaStates = async (req, res, next) => {
    try {
        const states = await reportingModel.getSeaStatesFromDB();
        res.json(states);
    }
    catch (err) { next(err); }
};

export const getSwellDirections = async (req, res, next) => {
    try {
        const directions = await reportingModel.getSwellDirectionsFromDB();
        res.json(directions);
    } catch (err) { next(err); }
};

export const getCargoActivities = async (req, res, next) => {
    try {
        const activities = await reportingModel.getCargoActivitiesFromDB();
        res.json(activities);
    } catch (err) { next(err); }
};

export const getFleets = async (req, res, next) => {
    try {
        const fleets = await reportingModel.getFleetsFromDB();
        const allFleetsOption = { FleetID: 'ALL', FleetName: 'All Fleets' };
        res.json([allFleetsOption, ...fleets]);
    } catch (err) {
        console.error("[ReportingController] Error in getFleets:", err);
        next(err);
    }
};

export const getFuelTypesByVessel = async (req, res, next) => {
    try {
        const { vesselId } = req.params;
        const fuelTypes = await reportingModel.fetchFuelTypesWithPositiveRobByShip(vesselId);
        res.status(200).json(fuelTypes);
    } catch (err) {
        console.error("[ReportingController] Error in getFuelTypesByVessel:", err);
        res.status(500).json({ error: 'An unexpected error occurred while fetching vessel fuel types.', details: err.message });
    }
};

export const getLubeOilTypesByVessel = async (req, res, next) => {
    try {
        const { vesselId } = req.params;
        const lubeOilTypes = await reportingModel.fetchLubeOilTypesWithPositiveRobByShip(vesselId);
        res.status(200).json(lubeOilTypes);
    } catch (err) {
        console.error("[ReportingController] Error in getLubeOilTypesByVessel:", err);
        res.status(500).json({ error: 'An unexpected error occurred while fetching vessel lube oil types.', details: err.message });
    }
};

export const getMachineryTypes = async (req, res, next) => {
    try {
        const types = await machineryModel.fetchMachineryTypes();
        res.json(types);
    } catch (err) {
        console.error("[ReportingController] Error in getMachineryTypes:", err);
        res.status(500).json({ error: 'An unexpected error occurred while fetching machinery types.', details: err.message });
    }
};

export const getMappedVesselMachinery = async (req, res, next) => {
    try {
        const { shipId } = req.params;
        const mappedMachinery = await machineryModel.fetchMachineryForShip(shipId);
        res.json(mappedMachinery);
    } catch (err) {
        console.error("[ReportingController] Error in getMappedVesselMachinery:", err);
        res.status(500).json({ error: 'An unexpected error occurred while fetching mapped vessel machinery.', details: err.message });
    }
};

export const getFuelTypesWithPositiveRob = async (req, res, next) => {
    try {
        const { shipId } = req.params;
        if (!shipId) {
            return res.status(400).json({ message: 'Ship ID is required.' });
        }
        const fuelTypes = await reportingModel.fetchFuelTypesWithPositiveRobByShip(shipId);
        res.status(200).json(fuelTypes);
    } catch (err) {
        console.error("[ReportingController] Error in getFuelTypesWithPositiveRob:", err);
        next(err);
    }
};

export const getBdnNumbersWithPositiveRob = async (req, res, next) => {
    try {
        const { shipId, fuelTypeKey } = req.params;
        if (!shipId || !fuelTypeKey) {
            return res.status(400).json({ message: 'Ship ID and Fuel Type Key are required.' });
        }
        const bdnNumbers = await reportingModel.fetchBdnNumbersWithPositiveRobByShipAndFuelType(shipId, fuelTypeKey);
        res.status(200).json(bdnNumbers);
    } catch (err) {
        console.error("[ReportingController] Error in getBdnNumbersWithPositiveRob:", err);
        next(err);
    }
};

export const getBdnNumbersWithPositiveRobByLubeOilType = async (req, res, next) => {
    try {
        const { shipId, loTypeKey } = req.params;
        if (!shipId || !loTypeKey) {
            return res.status(400).json({ message: 'Ship ID and Lube Oil Type Key are required.' });
        }
        const bdnNumbers = await reportingModel.fetchBdnNumbersWithPositiveRobByShipAndLubeOilType(shipId, loTypeKey);
        res.status(200).json(bdnNumbers);
    } catch (err) {
        console.error("[ReportingController] Error in getBdnNumbersWithPositiveRobByLubeOilType:", err);
        next(err);
    }
};

export const getLubeOilTypesWithPositiveRob = async (req, res, next) => {
    try {
        const { shipId } = req.params;
        if (!shipId) {
            return res.status(400).json({ message: 'Ship ID is required.' });
        }
        const lubeOilTypes = await reportingModel.fetchLubeOilTypesWithPositiveRobByShip(shipId);
        res.status(200).json(lubeOilTypes);
    } catch (err) {
        console.error("[ReportingController] Error in getLubeOilTypesWithPositiveRob:", err);
        next(err);
    }
};

export const getVoyageParents = async (req, res, next) => {
    try {
        const { shipId } = req.params;
        const { referenceDatetime } = req.query; 

        if (!shipId) {
            return res.status(400).json({ message: 'Ship ID is required.' });
        }
        
        const voyages = await reportingModel.fetchVoyagesParentsChronologically(shipId, referenceDatetime);
        res.status(200).json(voyages);
    } catch (err) {
        console.error("[ReportingController] Error in getVoyageParents:", err);
        res.status(500).json({ error: 'An unexpected error occurred while fetching voyages.', details: err.message });
    }
};

export const getVoyageLegsByParent = async (req, res, next) => {
    try {
        const { voyageId } = req.params;
        const { referenceDatetime } = req.query; 

        if (!voyageId) {
            return res.status(400).json({ message: 'Voyage ID is required.' });
        }
        
        const legs = await reportingModel.fetchVoyageLegsByVoyageId(voyageId, referenceDatetime);
        res.status(200).json(legs);
    } catch (err) {
        console.error("[ReportingController] Error in getVoyageLegsByParent:", err);
        res.status(500).json({ error: 'An unexpected error occurred while fetching voyage legs.', details: err.message });
    }
};

export const updateReportVoyageDetails = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const { parentVoyageId, legId, legNumber, voyageIdentifier, fromPortCode, toPortCode } = req.body;

        if (!reportId || !parentVoyageId || !voyageIdentifier || !fromPortCode || !toPortCode) {
            return res.status(400).json({ message: 'Report ID, Parent Voyage ID, Identifier, From Port, and To Port are all required for the update.' });
        }
        
        const success = await reportingModel.updateReportVoyageDetails(
            reportId, 
            parentVoyageId,
            legId, 
            legNumber, 
            voyageIdentifier, 
            fromPortCode, 
            toPortCode
        );

        if (success) {
            res.status(200).json({ message: 'Voyage details updated successfully.' });
        } else {
            res.status(404).json({ message: 'Report not found or could not be updated.' });
        }

    } catch (err) {
        console.error("[ReportingController] Error in updateReportVoyageDetails:", err);
        res.status(500).json({ 
            error: 'An error occurred while updating voyage details on the report.',
            details: err.message 
        });
    }
};

export const createInitialReport = async (req, res, next) => {
    try {
        const { shipId } = req.params;
        const masterData = req.body.master;
        const voyageDetails = req.body.voyageDetails; 
        const isDraft = (masterData.ReportStatus === 'Draft' || !masterData.ReportStatus);

        const machineryTypes = await machineryModel.fetchMachineryTypes();

        const validationErrors = validateReportData(req.body, false, isDraft, machineryTypes);
        if (validationErrors) {
            return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
        }
        
        const masterDataWithPorts = {
            ...masterData,
            VoyageID: voyageDetails.parentVoyageId, 
            VoyageNumber: voyageDetails.voyageIdentifier || null,
            FromPort: voyageDetails.fromPortCode || null,
            ToPort: voyageDetails.toPortCode || null,
            VoyageLegID: voyageDetails.legId || null,
            LegNumber: voyageDetails.legNumber || null,
        };

        const newReportId = await reportingModel.createInitialReportInDB(masterDataWithPorts, 'Frontend_User');

        res.status(201).json({ message: 'Report created as Draft successfully', reportId: newReportId });
    } catch (err) {
        console.error("[ReportingController] Error in createInitialReport:", err);
        next(err);
    }
};

export const updateFullReport = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        
        const fullReportData = req.body;
        const newReportStatus = fullReportData.master && fullReportData.master.ReportStatus ? fullReportData.master.ReportStatus : 'Draft';

        if (fullReportData.master && fullReportData.master.ReportID && parseInt(fullReportData.master.ReportID) !== parseInt(reportId)) {
            return res.status(400).json({ message: 'Report ID in URL does not match Report ID in body.' });
        }
        if (fullReportData.master) {
            fullReportData.master.ReportID = parseInt(reportId);
        } else {
            fullReportData.master = { ReportID: parseInt(reportId) };
        }

        const currentReportDB = await reportingModel.getFullReportByIdFromDB(parseInt(reportId));
        if (currentReportDB && currentReportDB.ReportStatus === 'Submitted' && newReportStatus === 'Draft') {
            return res.status(400).json({ message: 'Validation failed', errors: { ReportStatus: 'A submitted report cannot be changed back to Draft status.' } });
        }

        const machineryTypes = await machineryModel.fetchMachineryTypes();

        const validationErrors = validateReportData(fullReportData, true, (newReportStatus === 'Draft'), machineryTypes);
        if (validationErrors) {
            return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
        }

        const updatedReport = await reportingModel.updateFullReportInDB(
            reportId,
            fullReportData,
            fullReportData.actingUser,
            newReportStatus
        );
        
        if (!updatedReport) {
            return res.status(404).json({ message: "Report not found or no changes made" });
        }
        
        res.json(updatedReport);
    } catch (err) {
        console.error("[ReportingController] Error in updateFullReport:", err);
        res.status(500).json({ 
            error: 'An error occurred while updating the report',
            details: err.message 
        });
    }
};

export const submitReport = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const actingUser = 'Frontend_User';

        const fullReportData = await reportingModel.getFullReportByIdFromDB(parseInt(reportId));
        if (!fullReportData) {
            return res.status(404).json({ message: "Report not found for submission." });
        }
        
        const reportForValidation = {
            master: { ...fullReportData, ReportStatus: 'Submitted' },
            positional: fullReportData,
            weather: fullReportData,
            cargo: fullReportData,
            fuelConsumptions: fullReportData.fuelConsumptions || [],
            loConsumptionLogs: fullReportData.loConsumptionLogs || [],
            machineryData: fullReportData.machineryData || [],
            oilyResidueLogs: fullReportData.oilyResidueLogs || [],
            waterLogs: fullReportData.waterLogs || [],
        };

        const machineryTypes = await machineryModel.fetchMachineryTypes();

        // ALTERED: ACCURATE DURATION CHECK (Uses offset math without shifting stored strings)
        const precedingReport = await reportingModel.getPrecedingReportFromDB(parseInt(reportId));
        
        if (precedingReport && fullReportData.ReportDateTimeLocal && precedingReport.ReportDateTimeLocal) {
            const currentOffset = extractUtcOffset(fullReportData.TimeZoneAtPort);
            const precedingOffset = extractUtcOffset(precedingReport.TimeZoneAtPort);
            
            // Logic preserved: We calculate real UTC moments in the background for validation math only
            let currentMoment = moment(fullReportData.ReportDateTimeLocal);
            if (currentOffset) currentMoment = currentMoment.utcOffset(currentOffset, true);
            
            let precedingMoment = moment(precedingReport.ReportDateTimeLocal);
            if (precedingOffset) precedingMoment = precedingMoment.utcOffset(precedingOffset, true);

            if (currentMoment.isValid() && precedingMoment.isValid()) {
                const diffMinutes = currentMoment.diff(precedingMoment, 'minutes', true);
                const calculatedDurationHrs = (diffMinutes / 60).toFixed(2);
                
                fullReportData.CalculatedDurationHrs = calculatedDurationHrs;
                reportForValidation.master.CalculatedDurationHrs = calculatedDurationHrs;

                if (diffMinutes < 0) {
                    return res.status(400).json({ message: 'Validation failed', errors: { ReportDateTimeLocal: 'Report date/time cannot be earlier than the preceding report.' } });
                }
                if (diffMinutes > (26 * 60)) {
                    return res.status(400).json({ message: 'Validation failed', errors: { ReportDateTimeLocal: `Time gap (${calculatedDurationHrs} hours) exceeds 26-hour limit.` } });
                }
            }
        } else {
             fullReportData.CalculatedDurationHrs = 0;
             reportForValidation.master.CalculatedDurationHrs = 0;
        }

        if (precedingReport && precedingReport.ReportStatus !== 'Submitted') {
            return res.status(400).json({ message: 'Validation failed', errors: { ReportStatus: `Preceding report must be Submitted first.` } });
        }
        
        const validationErrors = validateReportData(reportForValidation, true, false, machineryTypes);
        if (validationErrors) {
            return res.status(400).json({ message: 'Validation failed for submission', errors: validationErrors });
        }

        const success = await reportingModel.submitReportInDB(reportId, actingUser, fullReportData);
        if (success) {
            res.status(200).json({ message: "Report submitted successfully." });
        } else {
            res.status(404).json({ message: "Report not found." });
        }
    } catch (err) {
        console.error("[ReportingController] Error in submitReport:", err);
        next(err);
    }
};

export const deleteReport = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const success = await reportingModel.softDeleteReportInDB(reportId);
        if (success) {
            res.status(200).json({ message: "Report soft-deleted successfully." });
        } else {
            res.status(404).json({ message: "Report not found for deletion." });
        }
    } catch (err) {
        console.error("[ReportingController] Error in deleteReport:", err);
        next(err);
    }
};

export const getReportsForShip = async (req, res, next) => {
    try {
        const { shipId } = req.params;
        const { page = 1, limit = 10, ...filters } = req.query;
        const result = await reportingModel.getReportsForShipFromDB(parseInt(shipId), filters, parseInt(page), parseInt(limit));
        res.json(result);
    } catch (err) {
        console.error("[ReportingController] Error in getReportsForShip:", err);
        next(err);
    }
};

export const getFullReportById = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const report = await reportingModel.getFullReportByIdFromDB(parseInt(reportId));
        if (!report) {
            return res.status(404).json({ message: "Report not found." });
        }
        res.json(report);
    } catch (err) {
        console.error("[ReportingController] Error in getFullReportById:", err);
        next(err);
    }
};

export const getLastReportForShipController = async (req, res, next) => {
    try {
        const { shipId } = req.params;
        const lastReport = await reportingModel.getLastReportForShip(shipId);
        if (!lastReport) {
            return res.status(404).json({ message: "No reports found." });
        }
        res.json(lastReport);
    } catch (err) {
        console.error("[ReportingController] Error in getLastReportForShipController:", err);
        next(err);
    }
};

export const getPrecedingReport = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const precedingReport = await reportingModel.getPrecedingReportFromDB(parseInt(reportId));
        if (!precedingReport) {
            return res.status(404).json({ message: "No preceding report found." });
        }
        res.json(precedingReport);
    } catch (err) {
        console.error("[ReportingController] Error in getPrecedingReport:", err);
        next(err);
    }
};

// Shore-Server/reports-service/controllers/reportingController.js

export const fetchLatestVesselLocations = async (req, res, next) => {
    try {
        let { fleetName } = req.query; 

        // --- FIX START: Handle "All Fleets" selection ---
        // If the frontend sends "All Fleets", treat it as null so the database fetches everything.
        if (fleetName && fleetName.toLowerCase() === 'all fleets') {
            fleetName = null;
        }
        // --- FIX END ---

        const locations = await reportingModel.getLatestVesselLocations(fleetName);
        res.status(200).json(locations);
    } catch (err) {
        console.error("[ReportingController] Error in fetchLatestVesselLocations:", err);
        res.status(500).json({ 
            error: 'An unexpected error occurred while fetching latest vessel locations.',
            details: err.message 
        });
    }
};

// for memp Overview dashboard
export const fetchLatestVesselReports = async (req, res) => {
    try {
        let { fleetName } = req.query;
        // Normalize 'All Fleets'
        if (fleetName === 'All Fleets' || fleetName === '') {
            fleetName = null;
        }

        const data = await reportingModel.getLatestVesselReports(fleetName);
        res.status(200).json(data);
    } catch (err) {
        console.error("Error fetching latest vessel reports:", err);
        res.status(500).json({ error: 'Failed to fetch latest reports' });
    }
};

// --- 🟢 NEW: VESSEL STATUS DASHBOARD CONTROLLERS ---
// 🟢 NEW: Get Voyage List for Dropdown

export const getShipVoyageList = async (req, res) => {
    try {
        const { shipId } = req.params;
        const list = await reportingModel.getVoyageList(shipId);
        res.json(list);
    } catch (err) {
        console.error("Error fetching voyage list:", err);
        res.status(500).json({ error: "Failed to load voyage list." });
    }
};


// 🟢 UPDATED: Get Voyage Stats (Reads query param ?voyage=XYZ)

export const getLatestVoyageStats = async (req, res, next) => {
    try {
        const { shipId } = req.params;
        const { voyage } = req.query; // Read optional query param

        if (!shipId) return res.status(400).json({ message: "Ship ID is required" });

        const stats = await reportingModel.getLatestVoyageStatsFromDB(shipId, voyage);
        res.json(stats);
    } catch (err) {
        console.error("[ReportingController] Error in getLatestVoyageStats:", err);
        res.status(500).json({ error: "Failed to load voyage stats." });
    }
};

export const getLatestReportSnapshot = async (req, res, next) => {
    try {
        const { shipId } = req.params;
        if (!shipId) return res.status(400).json({ message: "Ship ID is required" });

        const snapshot = await reportingModel.getLatestReportSnapshotFromDB(shipId);
        res.json(snapshot);
    } catch (err) {
        console.error("[ReportingController] Error in getLatestReportSnapshot:", err);
        res.status(500).json({ error: "Failed to load report snapshot." });
    }
};


// --- 🟢 NEW: Vessel Emissions Page Controller ---
// --- 🟢 NEW: Vessel Emissions Analytics Controller ---
export const getVesselEmissionsAnalytics = async (req, res, next) => {
    try {
        const { shipId } = req.params;
        const { fromDate, toDate, voyage } = req.query;

        if (!shipId) return res.status(400).json({ message: "Ship ID is required" });

        const analytics = await reportingModel.getVesselEmissionsAnalyticsFromDB(shipId, fromDate, toDate, voyage);
        res.json(analytics);
    } catch (err) {
        console.error("[ReportingController] Error in getVesselEmissionsAnalytics:", err);
        res.status(500).json({ error: "Failed to load emissions analytics." });
    }
};

const parseIsoDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const isPositiveInt = (value) => {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
};

const getDebugErrorDetails = (err) => {
    const details = {
        message: err?.message,
        code: err?.code,
        number: err?.number,
        state: err?.state,
        class: err?.class,
        procedure: err?.procedure,
        lineNumber: err?.lineNumber,
        serverName: err?.serverName,
    };

    if (err?.originalError?.message) {
        details.originalError = err.originalError.message;
    }

    return details;
};

export const previewVerifaviaReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // Execute the stored procedure (name updated)
        const result = await request.execute('Verifavia_Template'); // Name already updated, no change needed here

        const imoDcsData = result.recordsets[0] || [];
        const mrvData = result.recordsets[1] || [];
        const ciiData = result.recordsets[2] ? result.recordsets[2][0] : null; // It's an array with one row

        res.status(200).json({
            success: true,
            data: {
                imoData: imoDcsData,
                mrvData: mrvData,
                ciiData: ciiData
            }
        });
    } catch (err) {
        console.error('Error generating Verifavia preview:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while generating preview.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};

export const calculateCiiReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // Execute the dedicated CII logic stored procedure
        const result = await request.execute('Verifavia_CII_Logic'); // Name already updated, no change needed here

        const ciiData = result.recordset[0] || null;

        res.status(200).json({
            success: true,
            data: ciiData
        });
    } catch (err) {
        console.error('Error calculating CII report:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while calculating CII report.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};

export const generateVerifaviaReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        // Set input parameters for the stored procedure to prevent SQL injection
        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // 1. Execute the stored procedure (name updated)
        const result = await request.execute('Verifavia_Template'); // Name already updated, no change needed here

        // 2. Get the result sets from the procedure execution
        const imoDcsResult = { recordset: result.recordsets[0] || [] };
        const mrvDataResult = { recordset: result.recordsets[1] || [] };
        const ciiData = result.recordsets[2] ? result.recordsets[2][0] : null;

        // 4. Generate the Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MEMP Shore';
        workbook.created = new Date();

        // --- IMO DATA Sheet ---
        const imoSheet = workbook.addWorksheet('IMO DATA');
        if (imoDcsResult.recordset.length > 0) {
            imoSheet.columns = Object.keys(imoDcsResult.recordset[0]).map(key => ({ header: key, key: key, width: 20 }));
            imoSheet.addRows(imoDcsResult.recordset);
        } else {
            imoSheet.addRow(['No data available for IMO DCS.']);
        }

        // --- MRV DATA Sheet ---
        const mrvSheet = workbook.addWorksheet('MRV DATA');
        if (mrvDataResult.recordset.length > 0) {
            mrvSheet.columns = Object.keys(mrvDataResult.recordset[0]).map(key => ({ header: key, key: key, width: 20 }));
            mrvSheet.addRows(mrvDataResult.recordset);
        } else {
            mrvSheet.addRow(['No data available for MRV.']);
        }

        // --- NEW: CII RATING Sheet (Transposed) ---
        const ciiSheet = workbook.addWorksheet('CII RATING');
        if (ciiData) {
            ciiSheet.columns = [
                { header: 'Metric', key: 'metric', width: 35 },
                { header: 'Value', key: 'value', width: 25 }
            ];
            // Transpose the data by iterating over the keys of the ciiData object
            for (const key in ciiData) {
                if (Object.hasOwnProperty.call(ciiData, key)) {
                    ciiSheet.addRow({ metric: key, value: ciiData[key] });
                }
            }
        } else {
            ciiSheet.addRow({ metric: 'No CII data available for this period.' });
        }

        // 5. Send the file to the client
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Verifavia_Report_${shipId}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error generating Verifavia report:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while generating report.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};

export const previewEuMrvReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // Execute the EU MRV stored procedure
        const result = await request.execute('EU_MRV_Data');

        const dailyReports = result.recordsets[0] || [];
        const voyagesAggregator = result.recordsets[1] || [];
        const annualAggregator = result.recordsets[2] || [];

        res.status(200).json({
            success: true,
            data: {
                dailyReports: dailyReports,
                voyagesAggregator: voyagesAggregator,
                annualAggregator: annualAggregator
            }
        });
    } catch (err) {
        console.error('Error generating EU MRV preview:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while generating EU MRV preview.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};

export const generateEuMrvReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // Execute the EU MRV stored procedure
        const result = await request.execute('EU_MRV_Data');

        const dailyReports = result.recordsets[0] || [];
        const voyagesAggregator = result.recordsets[1] || [];
        const annualAggregator = result.recordsets[2] || [];

        // Generate Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MEMP Shore';
        workbook.created = new Date();

        // --- Daily Reports Sheet ---
        const dailySheet = workbook.addWorksheet('Daily Reports');
        if (dailyReports.length > 0) {
            dailySheet.columns = Object.keys(dailyReports[0]).map(key => ({ header: key, key: key, width: 18 }));
            dailySheet.addRows(dailyReports);
        } else {
            dailySheet.addRow(['No daily reports available for this period.']);
        }

        // --- Voyages Aggregator Sheet ---
        const voyagesSheet = workbook.addWorksheet('Voyages Aggregator');
        if (voyagesAggregator.length > 0) {
            voyagesSheet.columns = Object.keys(voyagesAggregator[0]).map(key => ({ header: key, key: key, width: 20 }));
            voyagesSheet.addRows(voyagesAggregator);
        } else {
            voyagesSheet.addRow(['No voyage data available for this period.']);
        }

        // --- Annual Aggregator Sheet ---
        const annualSheet = workbook.addWorksheet('Annual Aggregator');
        if (annualAggregator.length > 0) {
            annualSheet.columns = Object.keys(annualAggregator[0]).map(key => ({ header: key, key: key, width: 20 }));
            annualSheet.addRows(annualAggregator);
        } else {
            annualSheet.addRow(['No annual data available for this period.']);
        }

        // Send the file to the client
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="EU_MRV_Report_${shipId}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error generating EU MRV report:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while generating EU MRV report.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};

export const previewEuEtsReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // Execute the EU ETS stored procedure
        const result = await request.execute('EUETS_Data');

        console.log('EUETS_Data result.recordsets length:', result.recordsets.length);
        result.recordsets.forEach((rs, index) => {
            console.log(`Recordset ${index} length:`, rs.length);
        });

        const mrvVoyageSummary = result.recordsets[0] || [];
        const euEtsVoyageSummary = result.recordsets[1] || [];
        const euEtsAggregator = result.recordsets[2] || [];

        res.status(200).json({
            success: true,
            data: {
                euEtsMrvVoyageSummary: mrvVoyageSummary,
                euEtsVoyageSummary: euEtsVoyageSummary,
                euEtsAggregator: euEtsAggregator
            }
        });
    } catch (err) {
        console.error('Error generating EU ETS preview:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while generating EU ETS preview.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};

export const generateEuEtsReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // Execute the EU ETS stored procedure
        const result = await request.execute('EUETS_Data');

        const mrvVoyageSummary = result.recordsets[0] || [];
        const euEtsVoyageSummary = result.recordsets[1] || [];
        const euEtsAggregator = result.recordsets[2] || [];

        // Generate Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MEMP Shore';
        workbook.created = new Date();

        // --- MRV Voyage Summary Sheet ---
        const mrvSheet = workbook.addWorksheet('MRV Voyage Summary');
        if (mrvVoyageSummary.length > 0) {
            mrvSheet.columns = Object.keys(mrvVoyageSummary[0]).map(key => ({ header: key, key: key, width: 18 }));
            mrvSheet.addRows(mrvVoyageSummary);
        } else {
            mrvSheet.addRow(['No MRV voyage summary available for this period.']);
        }

        // --- EU ETS Voyage Summary Sheet ---
        const etsVoyageSheet = workbook.addWorksheet('EU ETS Voyage Summary');
        if (euEtsVoyageSummary.length > 0) {
            etsVoyageSheet.columns = Object.keys(euEtsVoyageSummary[0]).map(key => ({ header: key, key: key, width: 20 }));
            etsVoyageSheet.addRows(euEtsVoyageSummary);
        } else {
            etsVoyageSheet.addRow(['No EU ETS voyage summary available for this period.']);
        }

        // --- EU ETS Aggregator Sheet ---
        const etsAggregatorSheet = workbook.addWorksheet('EU ETS Aggregator');
        if (euEtsAggregator.length > 0) {
            etsAggregatorSheet.columns = Object.keys(euEtsAggregator[0]).map(key => ({ header: key, key: key, width: 20 }));
            etsAggregatorSheet.addRows(euEtsAggregator);
        } else {
            etsAggregatorSheet.addRow(['No EU ETS aggregator data available for this period.']);
        }

        // Send the file to the client
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="EU_ETS_Report_${shipId}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error generating EU ETS report:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while generating EU ETS report.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};

export const previewUkMrvReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // Execute the UK MRV stored procedure
        const result = await request.execute('UK_MRV_Data_Summary');

        const ukMrvBasicData = result.recordsets[0] || [];
        const ukMrvVoyageSummary = result.recordsets[1] || [];
        const ukAnnualAggregator = result.recordsets[2] || [];

        res.status(200).json({
            success: true,
            data: {
                ukMrvBasicData: ukMrvBasicData,
                ukMrvVoyageSummary: ukMrvVoyageSummary,
                ukAnnualAggregator: ukAnnualAggregator
            }
        });
    } catch (err) {
        console.error('Error generating UK MRV preview:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while generating UK MRV preview.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};

export const generateUkMrvReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // Execute the UK MRV stored procedure
        const result = await request.execute('UK_MRV_Data_Summary');

        const ukMrvBasicData = result.recordsets[0] || [];
        const ukMrvVoyageSummary = result.recordsets[1] || [];
        const ukAnnualAggregator = result.recordsets[2] || [];

        // Generate Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MEMP Shore';
        workbook.created = new Date();

        // --- UK MRV Basic Data Sheet ---
        const basicSheet = workbook.addWorksheet('UK MRV Basic Data');
        if (ukMrvBasicData.length > 0) {
            basicSheet.columns = Object.keys(ukMrvBasicData[0]).map(key => ({ header: key, key: key, width: 18 }));
            basicSheet.addRows(ukMrvBasicData);
        } else {
            basicSheet.addRow(['No UK MRV basic data available for this period.']);
        }

        // --- UK MRV Voyage Summary Sheet ---
        const voyageSheet = workbook.addWorksheet('UK MRV Voyage Summary');
        if (ukMrvVoyageSummary.length > 0) {
            voyageSheet.columns = Object.keys(ukMrvVoyageSummary[0]).map(key => ({ header: key, key: key, width: 20 }));
            voyageSheet.addRows(ukMrvVoyageSummary);
        } else {
            voyageSheet.addRow(['No UK MRV voyage summary available for this period.']);
        }

        // --- UK Annual Aggregator Sheet ---
        const annualSheet = workbook.addWorksheet('UK Annual Aggregator');
        if (ukAnnualAggregator.length > 0) {
            annualSheet.columns = Object.keys(ukAnnualAggregator[0]).map(key => ({ header: key, key: key, width: 20 }));
            annualSheet.addRows(ukAnnualAggregator);
        } else {
            annualSheet.addRow(['No UK annual aggregator data available for this period.']);
        }

        // Send the file to the client
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="UK_MRV_Report_${shipId}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error generating UK MRV report:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while generating UK MRV report.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};

export const previewUkEtsReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // Execute the UK ETS stored procedure
        const result = await request.execute('UKETS_Data');

        const ukMrvVoyageSummary = result.recordsets[0] || [];
        const ukEtsVoyageSummary = result.recordsets[1] || [];
        const ukEtsAggregator = result.recordsets[2] || [];

        res.status(200).json({
            success: true,
            data: {
                ukMrvVoyageSummary: ukMrvVoyageSummary,
                ukEtsVoyageSummary: ukEtsVoyageSummary,
                ukEtsAggregator: ukEtsAggregator
            }
        });
    } catch (err) {
        console.error('Error generating UK ETS preview:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while generating UK ETS preview.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};

export const generateUkEtsReport = async (req, res) => {
    const { shipId, fromDate, toDate } = req.body;

    if (!shipId || !fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'ShipID, FromDate, and ToDate are required.' });
    }

    if (!isPositiveInt(shipId)) {
        return res.status(400).json({ success: false, error: 'ShipID must be a positive integer.' });
    }

    const parsedFromDate = parseIsoDate(fromDate);
    const parsedToDate = parseIsoDate(toDate);

    if (!parsedFromDate || !parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate and ToDate must be valid ISO dates (YYYY-MM-DD).' });
    }

    if (parsedFromDate > parsedToDate) {
        return res.status(400).json({ success: false, error: 'FromDate must be earlier than or equal to ToDate.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('ShipID', sql.Int, Number(shipId));
        request.input('Fromdate', sql.Date, parsedFromDate);
        request.input('Todate', sql.Date, parsedToDate);

        // Execute the UK ETS stored procedure
        const result = await request.execute('UKETS_Data');

        const ukMrvVoyageSummary = result.recordsets[0] || [];
        const ukEtsVoyageSummary = result.recordsets[1] || [];
        const ukEtsAggregator = result.recordsets[2] || [];

        // Generate Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MEMP Shore';
        workbook.created = new Date();

        // --- UK MRV Voyage Summary Sheet ---
        const mrvSheet = workbook.addWorksheet('UK MRV Voyage Summary');
        if (ukMrvVoyageSummary.length > 0) {
            mrvSheet.columns = Object.keys(ukMrvVoyageSummary[0]).map(key => ({ header: key, key: key, width: 18 }));
            mrvSheet.addRows(ukMrvVoyageSummary);
        } else {
            mrvSheet.addRow(['No UK MRV voyage summary available for this period.']);
        }

        // --- UK ETS Voyage Summary Sheet ---
        const etsVoyageSheet = workbook.addWorksheet('UK ETS Voyage Summary');
        if (ukEtsVoyageSummary.length > 0) {
            etsVoyageSheet.columns = Object.keys(ukEtsVoyageSummary[0]).map(key => ({ header: key, key: key, width: 20 }));
            etsVoyageSheet.addRows(ukEtsVoyageSummary);
        } else {
            etsVoyageSheet.addRow(['No UK ETS voyage summary available for this period.']);
        }

        // --- UK ETS Aggregator Sheet ---
        const etsAggregatorSheet = workbook.addWorksheet('UK ETS Aggregator');
        if (ukEtsAggregator.length > 0) {
            etsAggregatorSheet.columns = Object.keys(ukEtsAggregator[0]).map(key => ({ header: key, key: key, width: 20 }));
            etsAggregatorSheet.addRows(ukEtsAggregator);
        } else {
            etsAggregatorSheet.addRow(['No UK ETS aggregator data available for this period.']);
        }

        // Send the file to the client
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="UK_ETS_Report_${shipId}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error generating UK ETS report:', {
            shipId,
            fromDate,
            toDate,
            error: err
        });

        const errorPayload = { success: false, error: 'Server error while generating UK ETS report.' };
        if (process.env.NODE_ENV !== 'production') {
            errorPayload.details = getDebugErrorDetails(err);
        }
        res.status(500).json(errorPayload);
    }
};
