// File: Client/src/utils/reportHelpers.js
import moment from 'moment-timezone';

export const API_GATEWAY_URL = 'http://localhost:7000';
export const VOYAGE_SELECTION_KEY = 'reportSelectedVoyageLeg';
export const PARENT_VOYAGE_SELECTION_KEY = 'reportSelectedParentVoyage';
export const ELECTRIC_MACHINERY_KEYS = ['ELECTRICAL_CONSUMPTION', 'SHAFT_GENERATOR', 'SHORE_POWER'];

export const initialReportState = {
    master: {
        ReportID: null,
        ShipID: null,
        VoyageID: null, 
        ReportTypeKey: '',
        ReportDateTimeUTC: '',
        ReportDateTimeLocal: '',
        TimeZoneAtPort: '',
        CurrentPortCode: '',
        Remarks: '',
        ReportDataJSON: {},
        ReportStatus: 'Draft',
    },
    positional: {
        Latitude: '',
        LatitudeDirection: 'N',
        Longitude: '',
        LongitudeDirection: 'E',
        VesselActivity: '', 
        CourseDEG: '',
        SpeedKnots: '',
        DistanceSinceLastReportNM: '',
        EngineDistanceNM: '', 
        DistanceToGoNM: '', 
        SlipPercent: '', 
        SteamingHoursPeriod: '',
        TimeAtAnchorageHRS: '',
        TimeAtDriftingHRS: '',
        FwdDraft: '', 
        AftDraft: '', 
        Trim: '', 
        MidDraft: '', 
    },
    weather: {
        WindForce: '',
        WindDirection: '', 
        SeaState: '',  
        SwellDirection: '', 
        SwellHeightM: '',
        AirTemperatureC: '',
        SeaTemperatureC: '',
        BarometricPressureHPa: '',
    },
    cargo: {
        CargoActivity: '', 
        ReportedCargoType: '',
        ReportedCargoQuantityMT: '',
        ContainersTEU: '',
        DisplacementMT: '',
    },
    fuelConsumptions: [],
    loConsumptionLogs: [],
    machineryData: [],
};

export const isNumeric = (value) => value !== '' && !isNaN(parseFloat(value));
export const isNonNegative = (value) => isNumeric(value) && parseFloat(value) >= 0;
export const isDraftNumeric = (value) => isNumeric(value) && isNonNegative(value);

export const getCleanValue = (value) => {
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

export const extractUtcOffset = (timezoneString) => {
    const match = timezoneString ? String(timezoneString).match(/\(UTC([+-]\d{2}:\d{2})\)/) : null;
    return match ? match[1] : null;
};

// ALTERED: Purely for background math; does not affect display
export const calculateUtcDateTime = (localDateTime, timeZoneAtPort) => {
    if (!localDateTime || !timeZoneAtPort) return null;
    try {
        const offset = extractUtcOffset(timeZoneAtPort);
        const cleanedLocalDateTime = localDateTime.split('.')[0].replace('T', ' '); 
        let localMoment = moment(cleanedLocalDateTime, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"], true);
        if (!localMoment.isValid()) {
            localMoment = moment(cleanedLocalDateTime);
        }
        if (localMoment.isValid() && offset) {
            // Logic preserved: This UTC is only for calculations (duration/validation)
            localMoment = localMoment.utcOffset(offset, true);
            return localMoment.utc().format('YYYY-MM-DDTHH:mm'); 
        }
    } catch (e) {
        console.error("Error calculating UTC:", e);
    }
    return null;
};

export const validateTab = (currentReport, tabId, bdnRobValues, loRobValues, precedingReport) => {
    const errors = {};
    const addError = (field, message) => {
        errors[field] = errors[field] || [];
        if (!errors[field].includes(message)) {
            errors[field].push(message);
        }
    };
    const formatValidationErrors = (errors) => {
        const formatted = {};
        for (const key in errors) {
            if (Array.isArray(errors[key])) {
                formatted[key] = errors[key].join('; ');
            } else {
                formatted[key] = errors[key];
            }
        }
        return formatted;
    };

    switch (tabId) {
        case 'reportOverview':
            if (!currentReport.master.ShipID) addError('master.ShipID', 'Vessel is required.');
            if (!currentReport.master.VoyageID) addError('master.VoyageID', 'Voyage selection is required.');
            if (!currentReport.master.ReportTypeKey) addError('master.ReportTypeKey', 'Report Type is required.');
            if (!currentReport.master.ReportDateTimeUTC) addError('master.ReportDateTimeUTC', 'Report Date/Time (UTC) is required.');
            if (!currentReport.master.ReportDateTimeLocal) addError('master.ReportDateTimeLocal', 'Report Date/Time (Local) is required.');
            if (!currentReport.master.TimeZoneAtPort) addError('master.TimeZoneAtPort', 'Time Zone is required.'); 
            if (currentReport.master.ReportDateTimeLocal && currentReport.master.TimeZoneAtPort) {
                const offset = extractUtcOffset(currentReport.master.TimeZoneAtPort);
                const cleanedLocalDateTime = currentReport.master.ReportDateTimeLocal.split('.')[0];
                let localMoment = moment(cleanedLocalDateTime);
                if (!localMoment.isValid()) {
                    addError('master.ReportDateTimeLocal', 'Invalid Report Date/Time format.');
                } else if (!offset) {
                    addError('master.TimeZoneAtPort', 'Time Zone offset is invalid.');
                }
            }
            break;
        case 'positionalActivity':
            const positional = currentReport.positional;
            if (positional.FwdDraft !== '' && !isNonNegative(positional.FwdDraft)) addError('positional.FwdDraft', 'Draft Fwd (M) must be non-negative.');
            if (positional.AftDraft !== '' && !isNonNegative(positional.AftDraft)) addError('positional.AftDraft', 'Draft Aft (M) must be non-negative.');
            if (positional.Trim !== '' && !isNumeric(positional.Trim)) addError('positional.Trim', 'Trim (M) calculation failed.');
            if (positional.MidDraft !== '' && !isNumeric(positional.MidDraft)) addError('positional.MidDraft', 'Mid Draft (M) calculation failed.');
            if (positional.Latitude !== '') {
                const lat = parseFloat(positional.Latitude);
                if (isNaN(lat) || lat < 0.59 || lat > 90.59) {
                    addError('positional.Latitude', 'Latitude must be a number between 0.59 and 90.59.');
                }
            }
            if (positional.Longitude !== '') {
                const lon = parseFloat(positional.Longitude);
                if (isNaN(lon) || lon < 0.59 || lon > 180.59) {
                    addError('positional.Longitude', 'Longitude must be a number between 0.59 and 180.59.');
                }
            }
            if (positional.SpeedKnots !== '') {
                const speed = parseFloat(positional.SpeedKnots);
                if (!isNonNegative(speed) || speed >= 20) {
                    addError('positional.SpeedKnots', 'Speed (Knots) must be non-negative and less than 20.');
                }
            } else if (positional.SpeedKnots !== '' && !isNonNegative(positional.SpeedKnots)) addError('positional.SpeedKnots', 'Speed (Knots) must be non-negative.');
            if (positional.CourseDEG !== '' && (!isNumeric(positional.CourseDEG) || parseFloat(positional.CourseDEG) < 0 || parseFloat(positional.CourseDEG) > 360)) addError('positional.CourseDEG', 'Course (DEG) must be between 0 and 360.');
            if (positional.DistanceSinceLastReportNM !== '' && !isNonNegative(positional.DistanceSinceLastReportNM)) addError('positional.DistanceSinceLastReportNM', 'Distance Since Last Report (NM) must be non-negative.');
            if (currentReport.positional.EngineDistanceNM !== '' && !isNonNegative(currentReport.positional.EngineDistanceNM)) addError('positional.EngineDistanceNM', 'Engine Distance (NM) must be non-negative.');
            if (positional.DistanceToGoNM !== '' && !isNonNegative(positional.DistanceToGoNM)) addError('positional.DistanceToGoNM', 'Distance To Go (NM) must be non-negative.');
            if (currentReport.positional.SlipPercent !== '' && !isNumeric(currentReport.positional.SlipPercent)) addError('positional.SlipPercent', 'Slip Percent must be a number.');
            const timeFields = ['SteamingHoursPeriod', 'TimeAtAnchorageHRS', 'TimeAtDriftingHRS'];
            timeFields.forEach(field => {
                if (positional[field] !== '') {
                    const time = parseFloat(positional[field]);
                    if (!isNonNegative(time) || time >= 26) {
                         addError(`positional.${field}`, `${field.replace(/([A-Z])/g, ' $1').trim()} must be non-negative and less than 26.`);
                    }
                }
            });
            break;
        case 'weatherEnvironmental':
            const weather = currentReport.weather;
            if (weather.WindForce !== '') {
                const wf = parseFloat(weather.WindForce);
                if (!isNonNegative(wf) || wf > 71) {
                    addError('weather.WindForce', 'Wind Force must be non-negative and less than or equal to 71.');
                }
            } else if (weather.WindForce !== '' && !isNonNegative(weather.WindForce)) addError('weather.WindForce', 'Wind Force must be non-negative.');
            if (weather.SwellHeightM !== '') {
                const sh = parseFloat(weather.SwellHeightM);
                if (!isNonNegative(sh) || sh > 15) {
                    addError('weather.SwellHeightM', 'Swell Height (M) must be non-negative and less than or equal to 15.');
                }
            } else if (weather.SwellHeightM !== '' && !isNonNegative(weather.SwellHeightM)) addError('weather.SwellHeightM', 'Swell Height (M) must be non-negative.');
            if (weather.AirTemperatureC !== '') {
                const at = parseFloat(weather.AirTemperatureC);
                if (!isNumeric(at) || at > 60) {
                    addError('weather.AirTemperatureC', 'Air Temperature (C) must be a number and less than or equal to 60.');
                }
            } else if (weather.AirTemperatureC !== '' && !isNumeric(weather.AirTemperatureC)) addError('weather.AirTemperatureC', 'Air Temperature (C) must be a number.');
            if (weather.SeaTemperatureC !== '') {
                const st = parseFloat(weather.SeaTemperatureC);
                if (!isNumeric(st) || st > 40) {
                    addError('weather.SeaTemperatureC', 'Sea Temperature (C) must be a number and less than or equal to 40.');
                }
            } else if (weather.SeaTemperatureC !== '' && !isNumeric(weather.SeaTemperatureC)) addError('weather.SeaTemperatureC', 'Sea Temperature (C) must be a number.');
            if (weather.BarometricPressureHPa !== '') {
                const bp = parseFloat(weather.BarometricPressureHPa);
                if (!isNonNegative(bp) || bp > 5) { 
                    addError('weather.BarometricPressureHPa', 'Barometric Pressure (HPa) must be non-negative and less than or equal to 5.');
                }
            } else if (weather.BarometricPressureHPa !== '' && !isNonNegative(weather.BarometricPressureHPa)) addError('weather.BarometricPressureHPa', 'Barometric Pressure (HPa) must be non-negative.');
            break;
        case 'cargoStability':
            const cargo = currentReport.cargo;
            if (cargo.ReportedCargoQuantityMT !== '' && !isNonNegative(cargo.ReportedCargoQuantityMT)) addError('cargo.ReportedCargoQuantityMT', 'Reported Cargo Quantity (MT) must be non-negative.');
            if (cargo.ContainersTEU !== '' && !isNonNegative(cargo.ContainersTEU)) addError('cargo.ContainersTEU', 'Containers (TEU) must be non-negative.');
            if (cargo.DisplacementMT !== '' && !isNonNegative(cargo.DisplacementMT)) addError('cargo.DisplacementMT', 'Displacement (MT) must be non-negative.');
            break;
        case 'machineryData':
            currentReport.machineryData
                .filter(md => !ELECTRIC_MACHINERY_KEYS.includes(md.MachineryTypeKey)) 
                .forEach((md, index) => {
                    const isEngine = (md.MachineryName || '').toUpperCase().startsWith('ME');
                    if (!md.ShipMachineryRecordID) addError(`machineryData[${index}].ShipMachineryRecordID`, `Machinery selection is required for machinery data entry ${index + 1}.`);
                    if (!isNonNegative(md.Running_Hrs)) addError(`machineryData[${index}].Running_Hrs`, `Running Hours is mandatory and must be non-negative for entry ${index + 1}.`);
                    if (isEngine) {
                        if (!isNonNegative(md.Power)) addError(`machineryData[${index}].Power`, `Power is mandatory and must be non-negative for engine type machinery.`);
                        if (!isNonNegative(md.RPM)) addError(`machineryData[${index}].RPM`, `RPM is mandatory and must be non-negative for engine type machinery.`);
                    }
                });
            break;
        case 'elecConsumption':
            currentReport.machineryData
                .filter(md => ELECTRIC_MACHINERY_KEYS.includes(md.MachineryTypeKey)) 
                .forEach((md, index) => {
                    const originalIndex = currentReport.machineryData.findIndex(item => item.ShipMachineryRecordID === md.ShipMachineryRecordID);
                    const powerValid = isNonNegative(md.Power);
                    const hoursValid = isNonNegative(md.Running_Hrs);
                    const totalPowerValid = isNonNegative(md.Total_Power);
                    const hasPowerAndHours = powerValid && hoursValid;
                    const hasOnlyTotalPower = totalPowerValid && (!md.Power && !md.Running_Hrs);
                    if (!md.ShipMachineryRecordID) addError(`machineryData[${originalIndex}].ShipMachineryRecordID`, `Machinery selection is required for electrical entry ${index + 1}.`);
                    if (!hasPowerAndHours && !hasOnlyTotalPower) {
                        addError(`machineryData[${originalIndex}].Total_Power`, `For electrical consumption (${md.MachineryName}): Enter either (Power and Running Hours) OR (Total Power).`);
                    } else if (hasPowerAndHours) {
                        const calculated = (parseFloat(md.Power) * parseFloat(md.Running_Hrs)).toFixed(3);
                        if (md.Total_Power && Math.abs(parseFloat(md.Total_Power) - parseFloat(calculated)) > 0.01) {
                            addError(`machineryData[${originalIndex}].Total_Power`, `Total Power must be equal to (Power * Running Hours) if both are provided. Expected: ${calculated} KWH.`);
                        }
                    } else if (hasOnlyTotalPower && (md.Power || md.Running_Hrs)) {
                         addError(`machineryData[${originalIndex}].Total_Power`, `If Total Power is provided, Power (KW) and Running Hours must be left blank.`);
                    }
                });
            break;
        case 'fuelManagement':
            const fuelConsumptionByBdn = currentReport.fuelConsumptions.reduce((acc, fc, index) => {
                if (!fc.ShipMachineryRecordID) addError(`fuelConsumptions[${index}].ShipMachineryRecordID`, `Machinery is required for fuel consumption entry ${index + 1}.`);
                if (!fc.BDN_Number) addError(`fuelConsumptions[${index}].BDN_Number`, `BDN Number is required for fuel consumption entry ${index + 1}.`);
                if (!fc.FuelTypeKey) addError(`fuelConsumptions[${index}].FuelTypeKey`, `Fuel Type is required for fuel consumption entry ${index + 1}.`);
                if (!isNonNegative(fc.ConsumedMT)) {
                     addError(`fuelConsumptions[${index}].ConsumedMT`, `Consumed (MT) must be non-negative for entry ${index + 1}.`);
                     return acc;
                }
                if (!fc.BDN_Number) return acc;
                const key = `${fc.FuelTypeKey}|${fc.BDN_Number}`;
                acc[key] = (acc[key] || 0) + parseFloat(fc.ConsumedMT);
                return acc;
            }, {});
            Object.entries(fuelConsumptionByBdn).forEach(([key, totalConsumed]) => {
                const [, bdnNumber] = key.split('|');
                const trimmedBdn = String(bdnNumber).trim().toUpperCase();
                const bdnRob = bdnRobValues[trimmedBdn];
                if (bdnRob !== undefined && totalConsumed > bdnRob) {
                    currentReport.fuelConsumptions.forEach((fc, index) => {
                        if (fc.BDN_Number && String(fc.BDN_Number).trim().toUpperCase() === trimmedBdn) {
                            addError(`fuelConsumptions[${index}].ConsumedMT`, 
                                `Total consumption (${totalConsumed.toFixed(3)} MT) for BDN ${trimmedBdn} exceeds the current ROB (${bdnRob.toFixed(3)} MT). Please reduce consumption entries.`
                            );
                        }
                    });
                }
            });
            break;
        case 'lubeOilManagement':
            const loConsumptionByType = currentReport.loConsumptionLogs.reduce((acc, loCon, index) => {
                if (!loCon.LOTypeKey) addError(`loConsumptionLogs[${index}].LOTypeKey`, `Lube Oil Type is required for LO consumption entry ${index + 1}.`);
                if (!loCon.BDN_Number) addError(`loConsumptionLogs[${index}].BDN_Number`, `BDN Number is required for LO consumption entry ${index + 1}.`);
                if (!loCon.ShipMachineryRecordID) addError(`loConsumptionLogs[${index}].ShipMachineryRecordID`, `Machinery is required for LO consumption entry ${index + 1}.`);
                if (!isNonNegative(loCon.ConsumedQty)) {
                    addError(`loConsumptionLogs[${index}].ConsumedQty`, `Consumed (Liters) must be non-negative for LO consumption entry ${index + 1}.`);
                    return acc;
                }
                if (!loCon.LOTypeKey) return acc;
                const key = loCon.LOTypeKey;
                acc[key] = (acc[key] || 0) + parseFloat(loCon.ConsumedQty);
                return acc;
            }, {});
            Object.entries(loConsumptionByType).forEach(([loTypeKey, totalConsumed]) => {
                const loRob = loRobValues[loTypeKey];
                if (loRob !== undefined && totalConsumed > loRob) {
                    currentReport.loConsumptionLogs.forEach((loCon, index) => {
                        if (loCon.LOTypeKey === loTypeKey) {
                            addError(`loConsumptionLogs[${index}].ConsumedQty`, 
                                `Total consumption (${totalConsumed.toFixed(3)} Ltrs) for LO Type ${loTypeKey} exceeds the current ROB (${loRob.toFixed(3)} Ltrs). Please reduce consumption entries.`
                            );
                        }
                    });
                }
            });
            break;
        case 'remarks':
            break;
        default:
            break;
    }
    const isInitialCreate = currentReport.master.ReportID === null;
    if (!isInitialCreate && (tabId === 'machineryData' || tabId === 'fuelManagement')) {
         const nonElecMachineryWithUsage = currentReport.machineryData.filter(md => 
            !ELECTRIC_MACHINERY_KEYS.includes(md.MachineryTypeKey) && (isNonNegative(md.Power) || isNonNegative(md.Running_Hrs))
        );
        const fuelConsumedMachineryIds = new Set(currentReport.fuelConsumptions.map(fc => fc.ShipMachineryRecordID).filter(Boolean).map(String));
        nonElecMachineryWithUsage.forEach((md) => {
            const id = String(md.ShipMachineryRecordID);
            if (md.MachineryTypeKey === 'LUBE_OIL_TANK' || md.MachineryTypeKey === 'LUBE_OIL') return;
            if (!fuelConsumedMachineryIds.has(id)) {
                const originalIndex = currentReport.machineryData.findIndex(item => item.ShipMachineryRecordID === md.ShipMachineryRecordID);
                addError(`machineryData[${originalIndex}].FuelConsumptionMandatory`, 
                    `Machinery (${md.MachineryName}) has recorded usage but no corresponding entry in the Fuel Management tab. Fuel consumption is mandatory for submission.`
                );
            }
        });
    }
    if (!isInitialCreate && (tabId === 'machineryData' || tabId === 'elecConsumption' || tabId === 'fuelManagement' || tabId === 'lubeOilManagement' || tabId === 'reportOverview' || tabId === 'positionalActivity')) {
        const isShorePowerUsed = currentReport.machineryData.some(md => 
            md.MachineryTypeKey === 'SHORE_POWER' && (isNonNegative(md.Power) || isNonNegative(md.Running_Hrs) || isNonNegative(md.Total_Power))
        );
        const isAnyAuxEngineUsed = currentReport.machineryData.some(md => 
            (md.MachineryName || '').toUpperCase().startsWith('AE') && (isNonNegative(md.Running_Hrs))
        );
        if (!isShorePowerUsed && !isAnyAuxEngineUsed) {
            addError('machineryData.AE_Mandatory', 
                'At least one Auxiliary Engine (AE) must be logged in the Machinery Data tab if Shore Power is not used.'
            );
        }
    }
    if (!isInitialCreate && (tabId === 'reportOverview' || tabId === 'machineryData' || tabId === 'positionalActivity')) {
        const isCurrentNoon = currentReport.master.ReportTypeKey === 'NOON_REPORT';
        const isPrecedingNoon = precedingReport?.ReportTypeKey === 'NOON_REPORT'; 
        if (isCurrentNoon || isPrecedingNoon) {
            const isMainEngineUsed = currentReport.machineryData.some(md => 
                (md.MachineryName || '').toUpperCase().startsWith('ME')
            );
            if (!isMainEngineUsed) {
                addError('machineryData.ME_Noon_Mandatory', 
                    `A Main Engine (ME) entry is mandatory because the current report or preceding report was 'NOON_REPORT'.`
                );
            }
        }
    }
    const finalErrors = formatValidationErrors(errors);
    return Object.keys(finalErrors).length > 0 ? finalErrors : {};
};

export const validateReportTimeAndStatus = (currentReport, precedingReport, submitStatus = 'Draft', calculatedDurationHours = '') => {
    const errors = {};
    const isValidPrecedingReport = precedingReport && precedingReport.ReportID;
    if (!isValidPrecedingReport) return errors;
    if (currentReport.master.ReportDateTimeLocal && currentReport.master.TimeZoneAtPort && precedingReport.ReportDateTimeLocal && precedingReport.TimeZoneAtPort) {
        const currentOffset = extractUtcOffset(currentReport.master.TimeZoneAtPort);
        const precedingOffset = extractUtcOffset(precedingReport.TimeZoneAtPort);
        let currentReportLocalMoment = moment(currentReport.master.ReportDateTimeLocal);
        if (currentOffset) currentReportLocalMoment = currentReportLocalMoment.utcOffset(currentOffset, true);
        else currentReportLocalMoment = currentReportLocalMoment.utcOffset(0, true);
        let precedingReportLocalMoment = moment(precedingReport.ReportDateTimeLocal);
        if (precedingOffset) precedingReportLocalMoment = precedingReportLocalMoment.utcOffset(precedingOffset, true);
        else precedingReportLocalMoment = precedingReportLocalMoment.utcOffset(0, true);
        if (currentReportLocalMoment.isValid() && precedingReportLocalMoment.isValid()) {
            const diffMinutes = currentReportLocalMoment.diff(precedingReportLocalMoment, 'minutes', true);
            if (diffMinutes < 0) {
                errors.ReportDateTimeLocal = 'Report Date/Time cannot be earlier than the preceding report (' + precedingReportLocalMoment.format('YYYY-MM-DD HH:mm') + ').';
            }
            if (diffMinutes > (26 * 60)) {
                errors.ReportDateTimeLocal = (errors.ReportDateTimeLocal ? errors.ReportDateTimeLocal + "; " : "") + "The maximum gap between reports should be 26 hours.";
            }
        }
    }
    if (submitStatus === 'Submitted') { 
        if (precedingReport.ReportStatus !== 'Submitted') {
            errors.PrecedingReportStatus = `Cannot submit. The preceding report (ID: ${precedingReport.ReportID}, Status: ${precedingReport.ReportStatus}) must be in 'Submitted' status first.`;
        }
        const parsedCalculatedDuration = parseFloat(calculatedDurationHours);
        if (calculatedDurationHours !== '' && !isNaN(parsedCalculatedDuration) && parsedCalculatedDuration > 26) {
            errors.CalculatedDurationHrs = "Calculated Duration of Report cannot be greater than 26 hours. Please adjust your report date/time.";
        }
    }
    return errors;
};