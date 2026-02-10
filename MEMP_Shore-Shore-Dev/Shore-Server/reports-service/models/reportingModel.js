// File: Application/viswa-digital-backend/reports-service/models/reportingModel.js
import sql from 'mssql';
import { executeQuery, getPool } from '../utils/db.js';
import moment from 'moment-timezone'; // Add this import

// --- Global Helper function for Local Date Creation (FIX to suppress moment-timezone warnings) ---
function createLocalDateWithOffset(localDateTime, timeZoneAtPort) {
    if (!localDateTime || !timeZoneAtPort) return localDateTime ? new Date(localDateTime) : null;
    
    const cleanedLocalDateTime = localDateTime.split('.')[0].replace('T', ' '); 
    
    // CRITICAL FIX: Use Date.UTC() to construct the Date object to prevent internal timezone shift for DATETIME2.
    const parts = cleanedLocalDateTime.match(/(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):?(\d{2})?/);

    if (parts) {
        return new Date(Date.UTC(
            parseInt(parts[1]),      // Year
            parseInt(parts[2]) - 1,  // Month (0-11)
            parseInt(parts[3]),      // Day
            parseInt(parts[4]),      // Hour
            parseInt(parts[5]),      // Minute
            parseInt(parts[6] || 0)  // Second
        ));
    }
    
    // Fallback
    return localDateTime ? new Date(localDateTime) : null;
}
// --- END Helper Function ---


// --- Lookup Model Functions (Standard) ---

export const getReportTypesFromDB = async () => {
    const query = "SELECT ReportTypeKey, ReportTypeName, SequenceOrder, SequentialReport FROM MEMP_ReportTypes WHERE IsActive = 1 ORDER BY SequenceOrder, ReportTypeName;";
    return (await executeQuery(query, [], "GetReportTypes")).recordset;
};

export const getDisposalMethodsFromDB = async () => {
    const query = "SELECT DisposalMethodKey, Description FROM MEMP_DisposalMethods WHERE IsActive = 1 ORDER BY Description;";
    return (await executeQuery(query, [], "GetDisposalMethods")).recordset;
};

export const getOilyResidueTypesFromDB = async () => {
    const query = "SELECT OilyResidueTypeKey, OilyResidueTypeDescription, UnitOfMeasure FROM MEMP_OilyResidueTypes WHERE IsActive = 1 ORDER BY OilyResidueTypeDescription;";
    return (await executeQuery(query, [], "GetOilyResidueTypes")).recordset;
};

export const getWaterTypesFromDB = async () => {
    const query = "SELECT WaterTypeKey, WaterTypeDescription, UnitOfMeasure FROM MEMP_WaterTypes WHERE IsActive = 1 ORDER BY WaterTypeDescription;";
    return (await executeQuery(query, [], "GetWaterTypes")).recordset;
};

export const getLubeOilTypesFromDB = async () => {
  const query = "SELECT LubeOilTypeKey, LubeOilTypeDescription, UnitOfMeasure FROM MEMP_LubeOilTypes WHERE IsActive = 1 ORDER BY LubeOilTypeDescription;";
    return (await executeQuery(query, [], "GetLubeOilTypes")).recordset;
};

export const getFuelOilTypesFromDB = async () => {
  const query = "SELECT FuelTypeKey, FuelTypeDescription   FROM MEMP_FuelTypes WHERE IsActive = 1 ORDER BY FuelTypeDescription;";
    return (await executeQuery(query, [], "GetLubeOilTypes")).recordset;
};

export const getVesselActivitiesFromDB = async () => {
    const query = "SELECT Vessel_Activity_Id, Vessel_Activity FROM MEMP_Vessel_Activity WHERE IsActive = 1 ORDER BY Vessel_Activity;";
    return (await executeQuery(query, [], "GetVesselActivities")).recordset;
};

export const getWindDirectionsFromDB = async () => {
    const query = "SELECT WindDirectionID, DirectionName FROM MEMP_WindDirections WHERE IsActive = 1 ORDER BY WindDirectionID;";
    return (await executeQuery(query, [], "GetWindDirections")).recordset;
};

export const getSeaStatesFromDB = async () => {
    const query = "SELECT SeaStateID, StateDescription FROM MEMP_SeaStates WHERE IsActive = 1 ORDER BY SeaStateID;";
    return (await executeQuery(query, [], "GetSeaStates")).recordset;
};

export const getSwellDirectionsFromDB = async () => {
    const query = "SELECT SwellDirectionID, DirectionName FROM MEMP_SwellDirections WHERE IsActive = 1 ORDER BY SwellDirectionID;";
    return (await executeQuery(query, [], "GetSwellDirections")).recordset;
};

export const getCargoActivitiesFromDB = async () => {
    const query = "SELECT Cargo_Activity_Id, Cargo_Activity FROM MEMP_Cargo_Activity WHERE IsActive = 1 ORDER BY Cargo_Activity;";
    return (await executeQuery(query, [], "GetCargoActivities")).recordset;
};

// --- NEW LOOKUP: Fetch list of Fleets for the map filter dropdown ---
export const getFleetsFromDB = async () => {
    const query = "SELECT FleetID, FleetName FROM MEMP_Fleets WHERE IsActive = 1 ORDER BY FleetName;";
    return (await executeQuery(query, [], "GetFleets")).recordset;
};


// --- MODIFIED Fuel ROB Lookup Functions (to return ROB value for hover) ---

export const fetchFuelTypesWithPositiveRobByShip = async (shipId) => {
    const parsedShipId = parseInt(shipId);
    if (isNaN(parsedShipId) || parsedShipId <= 0) {
        console.warn(`Invalid ShipID received for fuel ROB types fetch: ${shipId}`);
        return [];
    }

    const query = `
        ;WITH LatestFuelROB AS (
            SELECT 
                mr.ShipID, 
                mr.FuelTypeKey,
                ft.FuelTypeDescription,
                mr.Final_Quantity,
                -- Use ROW_NUMBER to find the latest ROB entry per fuel type and ship
                ROW_NUMBER() OVER (PARTITION BY mr.ShipID, mr.FuelTypeKey ORDER BY mr.EntryDate DESC, mr.Report_Consumption_ID DESC) as rn
            FROM MEMP_DailyROB mr
            JOIN MEMP_FuelTypes ft ON mr.FuelTypeKey = ft.FuelTypeKey AND ft.IsActive = 1
            WHERE mr.ShipID = @ShipID
        )
        SELECT 
            FuelTypeKey,
            FuelTypeDescription,
            Final_Quantity -- ADDED: ROB value for hover/frontend cache
        FROM LatestFuelROB
        WHERE rn = 1 AND Final_Quantity > 0;
    `;
    const inputs = [{ name: 'ShipID', type: sql.Int, value: parsedShipId }];
    return (await executeQuery(query, inputs, "FetchFuelTypesWithPositiveRobByShip")).recordset;
};

export const fetchBdnNumbersWithPositiveRobByShipAndFuelType = async (shipId, fuelTypeKey) => {
    const parsedShipId = parseInt(shipId);
    if (isNaN(parsedShipId) || parsedShipId <= 0 || !fuelTypeKey) {
        console.warn(`Invalid ShipID or FuelTypeKey received for fuel BDN fetch: ${shipId}, ${fuelTypeKey}`);
        return [];
    }
    const query = `
        ;WITH LatestBDNROB AS (
            SELECT 
                br.BDN_Number,
                br.Final_Quantity, -- ADDED: ROB value for hover/frontend cache
                ROW_NUMBER() OVER (PARTITION BY br.ShipID, br.BDN_Number, br.ItemTypeKey ORDER BY br.ROB_Entry_ID DESC) as rn
            FROM Bunker_ROB br
            WHERE br.ShipID = @ShipID AND br.ItemTypeKey = @FuelTypeKey AND br.ItemCategory = 'FUEL'
        )
        SELECT 
            BDN_Number,
            Final_Quantity -- RETURN Final_Quantity
        FROM LatestBDNROB
        WHERE rn = 1 AND Final_Quantity > 0;
    `;
    const inputs = [
        { name: 'ShipID', type: sql.Int, value: parsedShipId },
        { name: 'FuelTypeKey', type: sql.VarChar(50), value: fuelTypeKey }
    ];
    // This will now return [{BDN_Number: 'X', Final_Quantity: Y}, ...]
    return (await executeQuery(query, inputs, "FetchBdnNumbersWithPositiveRobByShipAndFuelType")).recordset;
};

// --- NEW LUBE OIL ROB Lookup Function ---

export const fetchLubeOilTypesWithPositiveRobByShip = async (shipId) => {
    const parsedShipId = parseInt(shipId);
    if (isNaN(parsedShipId) || parsedShipId <= 0) {
        console.warn(`Invalid ShipID received for LO types fetch: ${shipId}`);
        return [];
    }

    const query = `
        ;WITH LatestLOROB AS (
            SELECT 
                mr.ShipID, 
                mr.LubeOilTypeKey,
                lot.LubeOilTypeDescription,
                mr.Final_Quantity,
                ROW_NUMBER() OVER (PARTITION BY mr.ShipID, mr.LubeOilTypeKey ORDER BY mr.EntryDate DESC, mr.Report_Consumption_ID DESC) as rn
            FROM MEMP_ReportLOROB mr
            JOIN MEMP_LubeOilTypes lot ON mr.LubeOilTypeKey = lot.LubeOilTypeKey AND lot.IsActive = 1
        )
        SELECT 
            LubeOilTypeKey,
            LubeOilTypeDescription,
            Final_Quantity -- ADDED: ROB value for hover/frontend cache
        FROM LatestLOROB
        WHERE rn = 1 AND Final_Quantity > 0;
    `;
    const inputs = [{ name: 'ShipID', type: sql.Int, value: parsedShipId }];
    return (await executeQuery(query, inputs, "FetchLubeOilTypesWithPositiveRobByShip")).recordset;
};

// --- NEW LO BDN Lookup Function ---

export const fetchBdnNumbersWithPositiveRobByShipAndLubeOilType = async (shipId, loTypeKey) => {
    const parsedShipId = parseInt(shipId);
    if (isNaN(parsedShipId) || parsedShipId <= 0 || !loTypeKey) {
        // CRITICAL FIX: Robust validation of parsed ID and required LO Type Key
        console.warn(`Invalid ShipID or LOTypeKey received for LO BDN fetch: ${shipId}, ${loTypeKey}`);
        return [];
    }
    const query = `
        ;WITH LatestBDNROB AS (
            SELECT 
                br.BDN_Number,
                br.Final_Quantity, -- ADDED: ROB value for hover/frontend cache
                ROW_NUMBER() OVER (PARTITION BY br.ShipID, br.BDN_Number, br.ItemTypeKey ORDER BY br.ROB_Entry_ID DESC) as rn
            FROM Bunker_ROB br
            WHERE br.ShipID = @ShipID AND br.ItemTypeKey = @LOTypeKey AND br.ItemCategory = 'LUBE_OIL'
        )
        SELECT 
            BDN_Number,
            Final_Quantity -- RETURN Final_Quantity
        FROM LatestBDNROB
        WHERE rn = 1 AND Final_Quantity > 0;
    `;
    const inputs = [
        { name: 'ShipID', type: sql.Int, value: parsedShipId },
        { name: 'LOTypeKey', type: sql.VarChar(50), value: loTypeKey }
    ];
    // This will now return [{BDN_Number: 'X', Final_Quantity: Y}, ...]
    return (await executeQuery(query, inputs, "FetchBdnNumbersWithPositiveRobByShipAndLubeOilType")).recordset;
};

/**
 * Calculates and returns a Date object for the DB based on local datetime and offset.
 */
function calculateUtcDateTimeForDB(localDateTime, timeZoneAtPort) {
    if (!localDateTime || !timeZoneAtPort) return null;

    try {
        const offsetMatch = timeZoneAtPort.match(/\(UTC([+-]\d{2}:\d{2})\)/);
        const offset = offsetMatch ? offsetMatch[1] : null;

        if (!offset) {
            const rawOffsetMatch = timeZoneAtPort.match(/UTC([+-]\d{2}:\d{2})/);
            if (rawOffsetMatch) {
                const cleanedLocalDateTime = localDateTime.split('.')[0].replace('T', ' '); 
                let localMoment = moment(cleanedLocalDateTime);
                if (localMoment.isValid()) {
                    localMoment = localMoment.utcOffset(rawOffsetMatch[1], true);
                    return localMoment.toDate();
                }
            }
            return null;
        }
        
        const cleanedLocalDateTime = localDateTime.split('.')[0].replace('T', ' '); 
        let localMoment = moment(cleanedLocalDateTime, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"], true);

        if (!localMoment.isValid()) {
             localMoment = moment(cleanedLocalDateTime);
        }

        if (localMoment.isValid()) {
            localMoment = localMoment.utcOffset(offset, true);
            return localMoment.toDate(); 
        }
    } catch (e) {
        console.error("Error calculating UTC for DB:", e);
    }
    return null;
}


// --- NEW MODEL FUNCTION: Fetch Voyage Parents (Dropdown 1 Options) ---
/**
 * Fetches active Voyages (Parents) for the selected Ship, with optional chronological filtering.
 * Uses only MEMP_Voyages.
 */
export const fetchVoyagesParentsChronologically = async (shipId, referenceDatetime = null) => {
    const parsedShipId = parseInt(shipId);
    if (isNaN(parsedShipId) || parsedShipId <= 0) {
        return [];
    }

    let referenceDateClause = '';
    const inputs = [{ name: 'ShipID', type: sql.Int, value: parsedShipId }];

    if (referenceDatetime) {
        // Apply the chronological filter based on the earliest allowed creation date
        referenceDateClause = `AND v.CreatedDate >= @ReferenceDatetime`;
        inputs.push({ name: 'ReferenceDatetime', type: sql.DateTime2, value: new Date(referenceDatetime) });
    }

    const query = `
        SELECT 
            v.VoyageID AS ID, 
            v.VoyageNumber AS VoyageIdentifier, 
            v.DeparturePortCode, 
            v.ArrivalPortCode,
            v.CreatedDate AS CreatedDate,
            'VOYAGE' AS Type
        FROM MEMP_Voyages v
        WHERE v.ShipID = @ShipID AND v.IsActive = 1 AND v.VoyageStatus <> 'Completed'
        ${referenceDateClause}
        ORDER BY v.CreatedDate DESC;
    `;
    
    return (await executeQuery(query, inputs, "fetchVoyagesParentsChronologically")).recordset;
};

// --- NEW MODEL FUNCTION: Fetch Voyage Legs (Dropdown 2 Options, Dependent on Parent) ---
/**
 * Fetches Voyage Legs for a specific Voyage ID, chronologically filtered to only show legs 
 * after (or including) the one currently linked to the preceding report (if provided).
 * Uses only MEMP_VoyageLegs.
 */
export const fetchVoyageLegsByVoyageId = async (voyageId, referenceDatetime = null, minVoyageLegId = null) => {
    const parsedVoyageId = parseInt(voyageId);
    if (isNaN(parsedVoyageId) || parsedVoyageId <= 0) {
        return [];
    }

    let referenceDateClause = '';
    let minVoyageLegClause = '';
    const inputs = [{ name: 'VoyageID', type: sql.BigInt, value: parsedVoyageId }];

    if (referenceDatetime) {
        // Apply the chronological filter based on the earliest allowed DateAdded
        referenceDateClause = `AND vl.DateAdded >= @ReferenceDatetime`;
        inputs.push({ name: 'ReferenceDatetime', type: sql.DateTime2, value: new Date(referenceDatetime) });
    }

    if (minVoyageLegId) {
        // CRITICAL FIX: Only allow Voyage Legs that are greater than or equal to the Leg ID of the preceding report.
        minVoyageLegClause = `AND vl.VoyageLegID >= @MinVoyageLegId`;
        inputs.push({ name: 'MinVoyageLegId', type: sql.BigInt, value: parseInt(minVoyageLegId) });
    }

    const query = `
        SELECT 
            vl.VoyageLegID AS ID, 
            vl.LegNumber,                    
            vl.VoyageNumber AS VoyageNumberString, 
            vl.LegName AS VoyageIdentifier,      
            vl.DeparturePortCode, 
            vl.ArrivalPortCode,
            vl.DateAdded AS CreatedDate, 
            'LEG' AS Type
        FROM MEMP_VoyageLegs vl
        WHERE vl.VoyageID = @VoyageID AND vl.IsActive = 1
        ${referenceDateClause}
        ${minVoyageLegClause}
        ORDER BY vl.DateAdded ASC;
    `;
    
    return (await executeQuery(query, inputs, "fetchVoyageLegsByVoyageId")).recordset;
};


// --- NEW MODEL FUNCTION: Update Report Voyage Details (Atomic Sync) ---
/**
 * Updates the VoyageID (Parent), VoyageLegID, LegNumber, VoyageNumber (Identifier string), FromPort, and ToPort columns in MEMP_VesselDailyReports.
 */
export const updateReportVoyageDetails = async (reportId, parentVoyageId, legId, legNumber, voyageIdentifier, fromPortCode, toPortCode) => {
    
    // FIX: Explicitly convert LegNumber to string for NVarChar parameter
    let legNumberValue = legNumber;
    if (legNumberValue !== null && legNumberValue !== undefined) {
        legNumberValue = String(legNumberValue);
    }
    
    // This query now safely uses the new columns (VoyageLegID and LegNumber).
    const query = `
        UPDATE MEMP_VesselDailyReports
        SET
            VoyageID = @ParentVoyageId,
            VoyageLegID = @LegId,              
            LegNumber = @LegNumber,            
            VoyageNumber = @VoyageIdentifier,  
            FromPort = @FromPortCode,
            ToPort = @ToPortCode,
            LastModifiedDateTimeUTC = GETUTCDATE()
        WHERE
            ReportID = @ReportID AND IsActive = 1;
    `;
    
    const inputs = [
        { name: 'ReportID', type: sql.BigInt, value: parseInt(reportId) },
        { name: 'ParentVoyageId', type: sql.BigInt, value: parentVoyageId },
        { name: 'LegId', type: sql.BigInt, value: legId || null },
        { name: 'LegNumber', type: sql.NVarChar(200), value: legNumberValue || null }, // Use the processed value
        { name: 'VoyageIdentifier', type: sql.NVarChar(200), value: voyageIdentifier },
        { name: 'FromPortCode', type: sql.NVarChar(100), value: fromPortCode },
        { name: 'ToPortCode', type: sql.NVarChar(100), value: toPortCode }
    ];

    const result = await executeQuery(query, inputs, "UpdateReportVoyageDetails");
    return result.rowsAffected[0] > 0;
};


// --- Report CRUD Functions (updated) ---

export const createInitialReportInDB = async (masterData, actingUser) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    let reportId;

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        const utcDate = calculateUtcDateTimeForDB(masterData.ReportDateTimeLocal, masterData.TimeZoneAtPort);
        let localDate = createLocalDateWithOffset(masterData.ReportDateTimeLocal, masterData.TimeZoneAtPort);
        
        // FIX: Explicitly convert LegNumber to string for NVarChar parameter (New Logic)
        let legNumberValue = masterData.LegNumber;
        if (legNumberValue !== null && legNumberValue !== undefined) {
            legNumberValue = String(legNumberValue);
        }

        // 🔥 FINAL INSERT QUERY: Includes ALL five new columns now that they are confirmed to exist.
        const masterQuery = `INSERT INTO MEMP_VesselDailyReports (
                            ShipID, VoyageID, ReportTypeKey, ReportDateTimeUTC, ReportDateTimeLocal, TimeZoneAtPort,
                            CurrentPortCode, SubmittedBy, SubmittedDateTimeUTC, LastModifiedBy, LastModifiedDateTimeUTC, IsActive, ReportStatus,
                            VoyageNumber, FromPort, ToPort, VoyageLegID, LegNumber
                            ) OUTPUT Inserted.ReportID
                            VALUES (
                            @ShipID, @VoyageID, @ReportTypeKey, @ReportDateTimeUTC, @ReportDateTimeLocal, @TimeZoneAtPort,
                            @CurrentPortCode, @SubmittedBy, GETUTCDATE(), @LastModifiedBy, GETUTCDATE(), 1, 'Draft',
                            @VoyageNumber, @FromPort, @ToPort, @VoyageLegID, @LegNumber
                            );`;

        request.input('ShipID', sql.Int, masterData.ShipID);
        request.input('VoyageID', sql.BigInt, masterData.VoyageID);
        request.input('ReportTypeKey', sql.VarChar(50), masterData.ReportTypeKey);
        request.input('ReportDateTimeUTC', sql.DateTime2, utcDate); 
        request.input('ReportDateTimeLocal', sql.DateTime2, localDate);
        request.input('TimeZoneAtPort', sql.NVarChar(100), masterData.TimeZoneAtPort);
        request.input('CurrentPortCode', sql.VarChar(50), masterData.CurrentPortCode || null);
        request.input('SubmittedBy', sql.NVarChar(200), actingUser);
        request.input('LastModifiedBy', sql.NVarChar(200), actingUser);
        
        // NEW COLUMNS 
        request.input('VoyageNumber', sql.NVarChar(200), masterData.VoyageNumber || null);
        request.input('FromPort', sql.NVarChar(100), masterData.FromPort || null);
        request.input('ToPort', sql.NVarChar(100), masterData.ToPort || null);
        request.input('VoyageLegID', sql.BigInt, masterData.VoyageLegID || null);
        request.input('LegNumber', sql.NVarChar(200), legNumberValue || null); // Use the processed value

        const masterResult = await request.query(masterQuery);
        reportId = masterResult.recordset[0].ReportID;

        if (!reportId) throw new Error("Failed to create initial report record.");

        await transaction.commit();
        return reportId;
    } catch (err) {
        await transaction.rollback();
        console.error("[ReportingModel] Error in createInitialReportInDB (transaction rolled back):", err);
        throw err;
    }
};

export const updateFullReportInDB = async (reportId, fullReportData, actingUser, newReportStatus) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // Fetch current report status before update
        let currentReportDBStatus = null;
        const currentReport = await request.input('currentReportId', sql.BigInt, parseInt(reportId)).query(`SELECT ReportStatus FROM MEMP_VesselDailyReports WHERE ReportID = @currentReportId;`);
        if (currentReport.recordset.length > 0) {
            currentReportDBStatus = currentReport.recordset[0].ReportStatus;
        }

        // FIX 1: Merge all report data into masterData for positional/weather/cargo updates.
        const masterData = {
            ...(fullReportData.master || {}),
            ...(fullReportData.positional || {}),
            ...(fullReportData.weather || {}),
            ...(fullReportData.cargo || {})
        };
        
        // --- 1. PREPARE THE MASTER UPDATE (BUT DO NOT UPDATE STATUS TO 'Submitted' YET) ---
        let masterStatusForDataUpdate = newReportStatus;

        // CRITICAL FIX: If the target status is 'Submitted', we MUST temporarily set the status to 'Draft' 
        // during the child table delete/insert to avoid the FK conflict.
        if (newReportStatus === 'Submitted' && currentReportDBStatus !== 'Submitted') {
             masterStatusForDataUpdate = 'Draft';
        }


        let updateFields = [];
        const updateInputs = {};

        const addField = (dbField, jsField, sqlType, defaultValue = null) => {
            if (masterData.hasOwnProperty(jsField)) {
                let value = masterData[jsField];
                
                // 🔥 FIX for TypeError: typeName?.includes is not a function AND data persistence.
                // Safely determine the type name, ensuring a string fallback.
                // We check the constructor name for parameterized types (e.g., Decimal(18,3)) and use the function name for simple types (e.g., sql.Int).
                const typeName = (sqlType && typeof sqlType === 'object' && sqlType.constructor && sqlType.constructor.name) || (typeof sqlType === 'function' ? sqlType.name : '');
                
                // Check if the type is a known numeric string (for parameterized types) OR a direct function reference (for built-in types).
                const isNumericSqlType = ['Decimal', 'Int', 'Float', 'BigInt', 'Numeric'].some(n => typeName.includes(n)) || [sql.Int, sql.Float, sql.BigInt].includes(sqlType);

                if (isNumericSqlType) {
                    if (value === '' || value === null || isNaN(value)) {
                        value = defaultValue; // Will be null
                    }
                }
                updateFields.push(`${dbField} = @${jsField}`);
                updateInputs[jsField] = { type: sqlType, value: value };
            }
        };

        // Populate update fields for data (not status)
        addField('ShipID', 'ShipID', sql.Int);
        addField('VoyageID', 'VoyageID', sql.BigInt);
        addField('ReportTypeKey', 'ReportTypeKey', sql.VarChar(50));
        addField('ReportDateTimeUTC', 'ReportDateTimeUTC', sql.DateTime2);
        addField('ReportDateTimeLocal', 'ReportDateTimeLocal', sql.DateTime2);
        addField('TimeZoneAtPort', 'TimeZoneAtPort', sql.NVarChar(100));
        addField('Latitude', 'Latitude', sql.Decimal(10,6));
        addField('Longitude', 'Longitude', sql.Decimal(10,6));
        addField('VesselActivity', 'VesselActivity', sql.NVarChar(255)); 
        addField('CourseDEG', 'CourseDEG', sql.Decimal(6,2));
        addField('SpeedKnots', 'SpeedKnots', sql.Decimal(6,2));
        addField('DistanceSinceLastReportNM', 'DistanceSinceLastReportNM', sql.Decimal(10,3));
        addField('EngineDistanceNM', 'EngineDistanceNM', sql.Decimal(10,3));
        addField('DistanceToGoNM', 'DistanceToGoNM', sql.Decimal(10,3));
        addField('SlipPercent', 'SlipPercent', sql.Decimal(5,2));
        addField('SteamingHoursPeriod', 'SteamingHoursPeriod', sql.Decimal(8,2));
        addField('TimeAtAnchorageHRS', 'TimeAtAnchorageHRS', sql.Decimal(8,2));
        addField('TimeAtDriftingHRS', 'TimeAtDriftingHRS', sql.Decimal(8,2));
        // --- DRAFT FIELDS ---
        addField('FwdDraft', 'FwdDraft', sql.Decimal(5,2)); 
        addField('AftDraft', 'AftDraft', sql.Decimal(5,2));
        addField('Trim', 'Trim', sql.Decimal(5,2));
        addField('MidDraft', 'MidDraft', sql.Decimal(5,2));
        // --- END DRAFT FIELDS ---
        addField('WindForce', 'WindForce', sql.Decimal(5,2));
        addField('WindDirection', 'WindDirection', sql.NVarChar(50));
        addField('SeaState', 'SeaState', sql.NVarChar(50));
        addField('SwellDirection', 'SwellDirection', sql.NVarChar(50));
        addField('SwellHeightM', 'SwellHeightM', sql.Decimal(6,2));
        addField('AirTemperatureC', 'AirTemperatureC', sql.Decimal(5,2));
        addField('SeaTemperatureC', 'SeaTemperatureC', sql.Decimal(5,2));
        addField('BarometricPressureHPa', 'BarometricPressureHPa', sql.Decimal(7,2));
        addField('CargoActivity', 'CargoActivity', sql.NVarChar(100));
        addField('ReportedCargoType', 'ReportedCargoType', sql.NVarChar(100));
        addField('ReportedCargoQuantityMT', 'ReportedCargoQuantityMT', sql.Decimal(18,3)); 
        addField('ContainersTEU', 'ContainersTEU', sql.Int);
        addField('DisplacementMT', 'DisplacementMT', sql.Decimal(18,3));
        addField('Remarks', 'Remarks', sql.Text);
        addField('ReportDataJSON', 'ReportDataJSON', sql.NVarChar(sql.MAX));
        addField('CurrentPortCode', 'CurrentPortCode', sql.VarChar(50));
        addField('ReportDuration', 'CalculatedDurationHrs', sql.Decimal(5,2)); 

        // Always update LastModifiedBy and LastModifiedDateTimeUTC
        updateFields.push(`LastModifiedBy = @LastModifiedBy`);
        updateInputs['LastModifiedBy'] = { type: sql.NVarChar(200), value: actingUser };
        updateFields.push(`LastModifiedDateTimeUTC = GETUTCDATE()`);

        // Force Status to 'Draft' if the target status is 'Submitted' to avoid FK conflict
        updateFields.push(`ReportStatus = @ReportStatusForDataUpdate`);
        updateInputs['ReportStatusForDataUpdate'] = { type: sql.NVarChar(50), value: masterStatusForDataUpdate };


        // --- 2. EXECUTE MASTER DATA UPDATE (Temporary Status Flip) ---
        if (updateFields.length > 0) {
            let masterUpdateQuery = `UPDATE MEMP_VesselDailyReports SET ${updateFields.join(', ')} WHERE ReportID = @ReportID AND IsActive = 1;`;
            request.input('ReportID', sql.BigInt, parseInt(reportId));

            for (const key in updateInputs) {
                let value = updateInputs[key].value;
                if (key === 'ReportDateTimeUTC') {
                    // Re-calculate the UTC date object here for DB consistency
                    value = calculateUtcDateTimeForDB(masterData.ReportDateTimeLocal, masterData.TimeZoneAtPort);
                } else if (key === 'ReportDateTimeLocal') {
                    // FIX: Use the new helper to create localDate 
                    value = createLocalDateWithOffset(masterData.ReportDateTimeLocal, masterData.TimeZoneAtPort);
                } else if (key === 'ReportDataJSON') {
                    value = value ? JSON.stringify(value) : null;
                }
                request.input(key, updateInputs[key].type, value);
            }
            await request.query(masterUpdateQuery);
        }

        // FIX: Calculate the local date object to use as @EntryDate for child tables.
        let localDateForChildTables = createLocalDateWithOffset(masterData.ReportDateTimeLocal, masterData.TimeZoneAtPort);

        // --- 3. DELETE and RE-INSERT CHILD RECORDS (This now runs with status = 'Draft') ---
        const childTablesToProcess = [
            'MEMP_DailyFuelConsumption',
            'MEMP_ReportLOConsumption',
            'MEMP_ReportMachineryData'
        ];

        for (const table of childTablesToProcess) {
            const deleteChildQuery = `DELETE FROM ${table} WHERE ReportID = @ReportID;`;
            const deleteRequest = new sql.Request(transaction);
            deleteRequest.input('ReportID', sql.BigInt, parseInt(reportId));
            await deleteRequest.query(deleteChildQuery);
        }

        // Re-insert fuel consumption
        if (fullReportData.fuelConsumptions && fullReportData.fuelConsumptions.length > 0) {
            for (const fc of fullReportData.fuelConsumptions) {
                const fcRequest = new sql.Request(transaction);
                fcRequest.input('ReportID', sql.BigInt, parseInt(reportId));
                fcRequest.input('FuelTypeKey', sql.VarChar(50), fc.FuelTypeKey);
                fcRequest.input('MachineryName', sql.NVarChar(255), fc.MachineryName || null); 
                fcRequest.input('MachineryTypeKey', sql.VarChar(50), fc.MachineryTypeKey || null); 
                fcRequest.input('ConsumedByDescription', sql.NVarChar(255), fc.ConsumedByDescription || null);
                fcRequest.input('ShipID', sql.Int, masterData.ShipID); 
                fcRequest.input('ConsumedMT', sql.Decimal(10,3), fc.ConsumedMT);
                fcRequest.input('BDN_Number', sql.NVarChar(255), fc.BDN_Number || null); 
                // FIX: ADD THE MISSING ENTRY DATE INPUT
                fcRequest.input('EntryDate', sql.DateTime2, localDateForChildTables); 

                await fcRequest.query(`
                    INSERT INTO MEMP_DailyFuelConsumption (ReportID, FuelTypeKey, MachineryName, MachineryTypeKey, ConsumedByDescription, ShipID, ConsumedMT, IsActive, EntryDate, BDN_Number)
                    VALUES (@ReportID, @FuelTypeKey, @MachineryName, @MachineryTypeKey, @ConsumedByDescription, @ShipID, @ConsumedMT, 1, @EntryDate, @BDN_Number);
                `);
            }
        }
        
        // Re-insert lube oil consumption
        if (fullReportData.loConsumptionLogs && fullReportData.loConsumptionLogs.length > 0) {
            for (const loCon of fullReportData.loConsumptionLogs) {
                const loConRequest = new sql.Request(transaction);
                loConRequest.input('ReportID', sql.BigInt, parseInt(reportId));
                loConRequest.input('LOTypeKey', sql.VarChar(50), loCon.LOTypeKey);
                loConRequest.input('ConsumedQty', sql.Decimal(10,2), loCon.ConsumedQty);
                // FIX: ADD THE MISSING @ShipID INPUT
                loConRequest.input('ShipID', sql.Int, masterData.ShipID);
                loConRequest.input('MachineryTypeKey', sql.VarChar(50), loCon.MachineryTypeKey || null); 
                loConRequest.input('SpecificMachineryName', sql.NVarChar(255), loCon.SpecificMachineryName || null); 
                loConRequest.input('BDN_Number', sql.NVarChar(255), loCon.BDN_Number || null); 
                // FIX: ADD THE MISSING ENTRY DATE INPUT
                loConRequest.input('EntryDate', sql.DateTime2, localDateForChildTables); 

                await loConRequest.query(`
                    INSERT INTO MEMP_ReportLOConsumption (ReportID, LOTypeKey, ConsumedQty, MachineryTypeKey, SpecificMachineryName, ShipID, IsActive, EntryDate, BDN_Number)
                    VALUES (@ReportID, @LOTypeKey, @ConsumedQty, @MachineryTypeKey, @SpecificMachineryName, @ShipID, 1, @EntryDate, @BDN_Number);
                `);
            }
        }
        
        // Re-insert machinery data
        if (fullReportData.machineryData && fullReportData.machineryData.length > 0) {
            for (const machData of fullReportData.machineryData) {
                const machDataRequest = new sql.Request(transaction);
                machDataRequest.input('ReportID', sql.BigInt, parseInt(reportId));
                machDataRequest.input('ShipID', sql.Int, masterData.ShipID); 
                machDataRequest.input('MachineryTypeKey', sql.VarChar(50), machData.MachineryTypeKey);
                machDataRequest.input('MachineryName', sql.NVarChar(255), machData.MachineryName);
                machDataRequest.input('ShipMachineryRecordID', sql.BigInt, machData.ShipMachineryRecordID || null);
                machDataRequest.input('Power', sql.Decimal(10,2), machData.Power || 0);
                machDataRequest.input('RPM', sql.Decimal(10,2), machData.RPM || 0);
                machDataRequest.input('Running_Hrs', sql.Decimal(10,2), machData.Running_Hrs || 0);
                // <<-- NEW FIELDS INPUT
                machDataRequest.input('Total_Power', sql.Decimal(10,3), machData.Total_Power || null); 
                machDataRequest.input('ConsumedByDescription', sql.NVarChar(255), machData.ConsumedByDescription || null); // <<-- ADDED
                machDataRequest.input('Remarks', sql.Text, machData.Remarks || null);
                await machDataRequest.query(`
                    INSERT INTO MEMP_ReportMachineryData (ReportID, ShipID, ShipMachineryRecordID, MachineryTypeKey, MachineryName, Power, RPM, Running_Hrs, Total_Power, ConsumedByDescription, Remarks, IsActive)
                    VALUES (@ReportID, @ShipID, @ShipMachineryRecordID, @MachineryTypeKey, @MachineryName, @Power, @RPM, @Running_Hrs, @Total_Power, @ConsumedByDescription, @Remarks, 1);
                `);
            }
        }

        // --- 4. FINAL STATUS FLIP (Only if committing to 'Submitted') ---
        if (newReportStatus === 'Submitted') {
            const finalStatusQuery = `
                UPDATE MEMP_VesselDailyReports
                SET ReportStatus = 'Submitted', 
                    SubmittedBy = @SubmittedBy, 
                    SubmittedDateTimeUTC = GETUTCDATE()
                WHERE ReportID = @ReportID;
            `;
            const finalStatusRequest = new sql.Request(transaction);
            finalStatusRequest.input('ReportID', sql.BigInt, parseInt(reportId));
            finalStatusRequest.input('SubmittedBy', sql.NVarChar(200), actingUser);
            await finalStatusRequest.query(finalStatusQuery);

            // Execute the ROB logic now that the master report is finalized
            const callROBLogic = await submitReportInDB(reportId, actingUser, fullReportData, transaction);
            if (!callROBLogic) {
                 // Throw an error to rollback if ROB logic failed
                 throw new Error("ROB processing failed during final submission.");
            }
        }

        await transaction.commit();
        return getFullReportByIdFromDB(reportId);
    } catch (err) {
        if (transaction.state === sql.Transaction.BEGUN) {
            await transaction.rollback();
        }
        console.error("[ReportingModel] Error in updateFullReportInDB (transaction rolled back):", err);
        throw err;
    }
};

/**
 * Executes the ROB persistence logic. Called internally by updateFullReportInDB 
 * only when the final status is 'Submitted'.
 */
export const submitReportInDB = async (reportId, actingUser, fullReportData, transaction) => {
    let internalTransaction = false;
    if (!transaction) {
        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        // If called externally, status flip must happen here before ROB logic
        await new sql.Request(transaction).input('ReportID', sql.BigInt, parseInt(reportId)).input('SubmittedBy', sql.NVarChar(200), actingUser).query(`UPDATE MEMP_VesselDailyReports SET ReportStatus = 'Submitted', SubmittedBy = @SubmittedBy, SubmittedDateTimeUTC = GETUTCDATE() WHERE ReportID = @ReportID AND IsActive = 1;`);
    }

    try {
        const masterReportData = await new sql.Request(transaction)
            .input('ReportID', sql.BigInt, parseInt(reportId))
            .query(`SELECT ShipID, ReportDateTimeLocal FROM MEMP_VesselDailyReports WHERE ReportID = @ReportID`);

        if (!masterReportData.recordset[0]) {
             if (internalTransaction) await transaction.rollback();
             throw new Error("Report master record not found for consumption update.");
        }
        
        const { ShipID, ReportDateTimeLocal } = masterReportData.recordset[0];
        const entryDate = ReportDateTimeLocal;

        // 2. BDN-BASED ROB (Bunker_ROB) - Fuel Consumption
        const bunkerRobQuery = `
            ;WITH ReportConsumption AS (
                SELECT 
                    f.ReportID,
    1.                f.ShipID,
    2.                f.BDN_Number,
    3.                f.FuelTypeKey AS ItemTypeKey,
    4.                SUM(f.ConsumedMT) AS TotalConsumed,
    5.                MIN(f.EntryDate) AS EntryDate
                FROM MEMP_DailyFuelConsumption f
                WHERE f.ReportID = @ReportID AND f.ConsumedMT > 0 AND f.BDN_Number IS NOT NULL
                GROUP BY f.ReportID, f.ShipID, f.BDN_Number, f.FuelTypeKey
            ),
            LastBDNROB AS (
                SELECT 
                    ROB_Entry_ID, ShipID, BDN_Number, ItemTypeKey, Final_Quantity,
                    ROW_NUMBER() OVER (PARTITION BY ShipID, BDN_Number, ItemTypeKey ORDER BY ROB_Entry_ID DESC) as rn
                FROM Bunker_ROB
            )
            INSERT INTO Bunker_ROB
            (
                ShipID, EntryDate, BDN_Number, ItemTypeKey, Bunkered_Quantity, Consumed_Quantity, 
                Initial_Quantity, Final_Quantity, ItemCategory, CreatedDate, ModifiedDate, ReportID
            )
            SELECT 
                rc.ShipID,
                @EntryDate,
                rc.BDN_Number,
                rc.ItemTypeKey,
                0.000,
                rc.TotalConsumed,
                ISNULL(prev.Final_Quantity, 0) AS Initial_Quantity,
                ISNULL(prev.Final_Quantity, 0) - rc.TotalConsumed AS Final_Quantity,
                'FUEL',
                GETUTCDATE(),
                GETUTCDATE(),
                rc.ReportID
            FROM ReportConsumption rc
            LEFT JOIN LastBDNROB prev 
                ON rc.ShipID = prev.ShipID 
                AND rc.BDN_Number = prev.BDN_Number 
                AND rc.ItemTypeKey = prev.ItemTypeKey 
                AND prev.rn = 1; 
        `;
        await new sql.Request(transaction)
            .input('ReportID', sql.BigInt, parseInt(reportId))
            .input('ShipID', sql.Int, ShipID)
            .input('EntryDate', sql.DateTime2, entryDate)
            .query(bunkerRobQuery);

        // 3. BDN-BASED ROB (Bunker_ROB) - Lube Oil Consumption (NEWLY ADDED LOGIC)
        const bunkerRobQueryLO = `
            ;WITH ReportConsumptionLO AS (
                SELECT 
                    f.ReportID,
                    f.ShipID,
                    f.BDN_Number,
                    f.LOTypeKey AS ItemTypeKey,
                    SUM(f.ConsumedQty) AS TotalConsumed,
                    MIN(f.EntryDate) AS EntryDate
                FROM MEMP_ReportLOConsumption f
                WHERE f.ReportID = @ReportID AND f.ConsumedQty > 0 AND f.BDN_Number IS NOT NULL
                GROUP BY f.ReportID, f.ShipID, f.BDN_Number, f.LOTypeKey
            ),
            LastBDNROB_LO AS (
                SELECT 
                    ROB_Entry_ID, ShipID, BDN_Number, ItemTypeKey, Final_Quantity,
                    ROW_NUMBER() OVER (PARTITION BY ShipID, BDN_Number, ItemTypeKey ORDER BY ROB_Entry_ID DESC) as rn
                FROM Bunker_ROB
                WHERE ItemCategory = 'LUBE_OIL' -- Ensure we only look at LO BDN entries
            )
            INSERT INTO Bunker_ROB
            (
                ShipID, EntryDate, BDN_Number, ItemTypeKey, Bunkered_Quantity, Consumed_Quantity, 
                Initial_Quantity, Final_Quantity, ItemCategory, CreatedDate, ModifiedDate, ReportID
            )
            SELECT 
                rc.ShipID,
                @EntryDate,
                rc.BDN_Number,
                rc.ItemTypeKey,
                0.000,
                rc.TotalConsumed,
                ISNULL(prev.Final_Quantity, 0) AS Initial_Quantity,
                ISNULL(prev.Final_Quantity, 0) - rc.TotalConsumed AS Final_Quantity,
                'LUBE_OIL', -- CRITICAL: Use 'LUBE_OIL' category
                GETUTCDATE(),
                GETUTCDATE(),
                rc.ReportID
            FROM ReportConsumptionLO rc
            LEFT JOIN LastBDNROB_LO prev 
                ON rc.ShipID = prev.ShipID 
                AND rc.BDN_Number = prev.BDN_Number 
                AND rc.ItemTypeKey = prev.ItemTypeKey 
                AND prev.rn = 1; 
        `;
        await new sql.Request(transaction)
            .input('ReportID', sql.BigInt, parseInt(reportId))
            .input('ShipID', sql.Int, ShipID)
            .input('EntryDate', sql.DateTime2, entryDate)
            .query(bunkerRobQueryLO);

        // 4. AGGREGATE FUEL ROB (MEMP_DailyROB - By Fuel Type)
        const fuelRobQuery = `
            ;WITH ReportConsumptionFuel AS (
                SELECT 
                    f.ReportID,
                    f.ShipID,
                    f.BDN_Number,
                    f.FuelTypeKey AS ItemTypeKey,
                    SUM(f.ConsumedMT) AS TotalConsumed,
                    MIN(f.EntryDate) AS EntryDate,
                    vdr.ReportTypeKey as entry_mode
                FROM MEMP_DailyFuelConsumption f, MEMP_VesselDailyReports vdr
                WHERE f.ReportID = @ReportID
                and f.ShipID = vdr.ShipID
                and f.ReportID = vdr.ReportID
                GROUP BY f.ReportID, f.ShipID, f.BDN_Number, f.FuelTypeKey, vdr.ReportTypeKey
            ),
            PrevROB_Fuel AS (
                SELECT mr.ShipID, mr.FuelTypeKey, MAX(mr.ReportID) AS LastReportID
                FROM MEMP_DailyROB mr
                GROUP BY mr.ShipID, mr.FuelTypeKey
            )
            INSERT INTO MEMP_DailyROB
            (
                ShipID,
                EntryDate,
                FuelTypeKey,
                Bunkered_Quantity,
                Consumed_Quantity,
                Initial_Quantity,
                Final_Quantity,
                CreatedDate,
                ModifiedDate,
                entry_mode,
                Report_Consumption_ID
            )
            SELECT 
                rc.ShipID,
                @EntryDate,
                rc.ItemTypeKey,
                0.000,
                rc.TotalConsumed,
                ISNULL(prev.Final_Quantity, 0),
                ISNULL(prev.Final_Quantity, 0) - rc.TotalConsumed,
                GETDATE(),
                GETDATE(),
                rc.entry_mode,
                rc.ReportID
            FROM ReportConsumptionFuel rc
            LEFT JOIN PrevROB_Fuel p 
                   ON rc.ShipID = p.ShipID AND rc.ItemTypeKey = p.FuelTypeKey
            LEFT JOIN MEMP_DailyROB prev 
                   ON prev.ReportID = p.LastReportID AND prev.ShipID = rc.ShipID AND prev.FuelTypeKey = rc.ItemTypeKey; 
        `;
        await new sql.Request(transaction)
            .input('ReportID', sql.BigInt, parseInt(reportId))
            .input('ShipID', sql.Int, ShipID)
            .input('EntryDate', sql.DateTime2, entryDate)
            .query(fuelRobQuery);

        // 5. AGGREGATE LUBE OIL ROB (MEMP_ReportLOROB - By LO Type)
        const loRobQuery = `
               ;WITH ReportConsumptionLO AS (
                SELECT 
                    f.ReportID,
                    f.ShipID,
                    f.LOTypeKey AS LubeOilTypeKey, 
                    SUM(f.ConsumedQty) AS TotalConsumed,
                    MIN(f.EntryDate) AS EntryDate,
                    vdr.ReportTypeKey as entry_mode
                FROM MEMP_ReportLOConsumption f, MEMP_VesselDailyReports vdr
                WHERE f.ReportID = @ReportID and  f.ConsumedQty > 0
                and f.ShipID = vdr.ShipID
                and f.ReportID = vdr.ReportID
                GROUP BY f.ReportID, f.ShipID, f.BDN_Number, f.LOTypeKey, vdr.ReportTypeKey
                ),
                LastLOROB AS (
                    SELECT 
                    Report_Consumption_ID, ShipID, LubeOilTypeKey, Final_Quantity,
                    ROW_NUMBER() OVER (PARTITION BY ShipID, LubeOilTypeKey ORDER BY Report_Consumption_ID DESC) as rn
                FROM MEMP_ReportLOROB
                )
                INSERT INTO MEMP_ReportLOROB
                (
                    ShipID, EntryDate, LubeOilTypeKey, Bunkered_Quantity, Consumed_Quantity, 
                    Initial_Quantity, Final_Quantity, CreatedDate, ModifiedDate, entry_mode, Report_Consumption_ID
                )
                SELECT 
                    rc.ShipID,
                    @EntryDate,
                    rc.LubeOilTypeKey,
                    0.000, 
                    rc.TotalConsumed,
                    ISNULL(prev.Final_Quantity, 0) AS Initial_Quantity,
                    ISNULL(prev.Final_Quantity, 0) - rc.TotalConsumed AS Final_Quantity,
                    GETUTCDATE(),
                    GETUTCDATE(),
                    rc.entry_mode,
                    rc.ReportID 
                FROM ReportConsumptionLO rc
                LEFT JOIN LastLOROB prev 
                    ON rc.ShipID = prev.ShipID AND rc.LubeOilTypeKey = prev.LubeOilTypeKey AND prev.rn = 1;  
        `;
        await new sql.Request(transaction)
            .input('ReportID', sql.BigInt, parseInt(reportId))
            .input('ShipID', sql.Int, ShipID)
            .input('EntryDate', sql.DateTime2, entryDate)
            .query(loRobQuery);

        if (internalTransaction) {
            await transaction.commit();
        }
        return true;
    } catch (err) {
        if (internalTransaction && transaction && transaction.state === sql.Transaction.BEGUN) {
            await transaction.rollback();
        }
        // Log the final error, but let the calling function handle the 500 response.
        console.error("[ReportingModel] Fatal error during submitReportInDB:", err);
        throw err;
    }
};

export const getReportsForShipFromDB = async (shipId, filters, page, limit) => {
// ... (rest of the file remains unchanged)
    const offset = (page - 1) * limit;
    // 🔥 FIX: Selecting all 5 new columns directly
    let dataQuery = `
        SELECT
            r.ReportID, r.ShipID, r.VoyageID, r.ReportTypeKey, r.ReportDateTimeUTC, r.ReportDateTimeLocal,
            r.VesselActivity, r.Latitude, r.Longitude, r.SubmittedBy, r.SubmittedDateTimeUTC, r.ReportStatus,
            r.CurrentPortCode,
            r.VoyageNumber, 
            r.FromPort AS DeparturePortCode, 
            r.ToPort AS ArrivalPortCode,
            r.VoyageLegID,              
            r.LegNumber                 
        FROM MEMP_VesselDailyReports r
        WHERE r.ShipID = @ShipID AND r.IsActive = 1
    `;
    let countQuery = `
        SELECT COUNT(*) as TotalCount
        FROM MEMP_VesselDailyReports r  
        WHERE r.ShipID = @ShipID AND r.IsActive = 1 
    `;
    const inputs = [{name: 'ShipID', type: sql.Int, value: parseInt(shipId)}];

    if(filters.reportType) {
        dataQuery += ` AND r.ReportTypeKey = @ReportTypeKey`; 
        countQuery += ` AND r.ReportTypeKey = @ReportTypeKey`; 
        inputs.push({name: 'ReportTypeKey', type: sql.VarChar(50), value: filters.reportType});
    }

    if (filters.fromDate) {
        dataQuery += ` AND r.ReportDateTimeUTC >= @FromDate`; 
        countQuery += ` AND r.ReportDateTimeUTC >= @FromDate`; 
        inputs.push({ name: 'FromDate', type: sql.DateTime2, value: new Date(filters.fromDate) });
    }

    if (filters.toDate) {
        dataQuery += ` AND r.ReportDateTimeUTC <= @ToDate`; 
        countQuery += ` AND r.ReportDateTimeUTC <= @ToDate`; 
        inputs.push({ name: 'ToDate', type: sql.DateTime2, value: new Date(filters.toDate) });
    }
    
    if (filters.reportStatus) {
        dataQuery += ` AND r.ReportStatus = @ReportStatus`; 
        countQuery += ` AND r.ReportStatus = @ReportStatus`; 
        inputs.push({ name: 'ReportStatus', type: sql.NVarChar(50), value: filters.reportStatus });
    }

    if (filters.voyageId && parseInt(filters.voyageId) > 0) {
        // NOTE: VoyageID holds the Voyage or Leg ID
        dataQuery += ` AND r.VoyageID = @VoyageID`; 
        countQuery += ` AND r.VoyageID = @VoyageID`; 
        inputs.push({ name: 'VoyageID', type: sql.BigInt, value: parseInt(filters.voyageId) });
    }

    dataQuery += `
        ORDER BY ReportID DESC
        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY;
    `;
    inputs.push({name: 'Offset', type: sql.Int, value: offset});
    inputs.push({name: 'Limit', type: sql.Int, value: limit});

    const countInputs = inputs.filter(i => i.name !== 'Offset' && i.name !== 'Limit');

    const dataResult = await executeQuery(dataQuery, inputs, "GetReportsForShip");
    const countResult = await executeQuery(countQuery, countInputs, "GetReportsCountForShip");

    return {
        totalCount: countResult.recordset[0] ? countResult.recordset[0].TotalCount : 0,
        reports: dataResult.recordset
    };
};

export const getFullReportByIdFromDB = async (reportId) => {
    // FIX: Select all 5 columns directly now that they are confirmed to exist
    const masterQuery = `
        SELECT 
            r.*, 
            r.ReportStatus, r.FwdDraft, r.AftDraft, r.Trim, r.MidDraft, 
            r.VoyageNumber, 
            r.FromPort AS DeparturePortCode, 
            r.ToPort AS ArrivalPortCode,
            r.VoyageLegID,              
            r.LegNumber                 
        FROM MEMP_VesselDailyReports r
        WHERE r.ReportID = @ReportID AND r.IsActive = 1;
    `;
    const masterInputs = [{ name: 'ReportID', type: sql.BigInt, value: parseInt(reportId) }];

    const masterResult = await executeQuery(masterQuery, masterInputs, "GetReportMasterById");
    const masterReport = masterResult.recordset[0];
    if (!masterReport) return null;

    // Corrected Fuel Consumptions query to match user's live schema
    masterReport.fuelConsumptions = (await executeQuery(`
        SELECT
            fc.ConsumptionID, -- Primary key as per live schema
            fc.ReportID,
            fc.FuelTypeKey,
            ft.FuelTypeDescription,
            fc.MachineryName, -- Direct column as per live schema
            fc.MachineryTypeKey, -- Direct column as per live schema
            fc.ConsumedByDescription,
            fc.ShipID, -- Direct column as per live schema
            fc.ConsumedMT,
            fc.IsActive,
            fc.BDN_Number, -- Added BDN_Number
            fc.EntryDate -- Fetch the EntryDate
        FROM MEMP_DailyFuelConsumption fc
        JOIN MEMP_FuelTypes ft ON fc.FuelTypeKey = ft.FuelTypeKey
        WHERE fc.ReportID = @ReportID AND fc.IsActive = 1
        ORDER BY fc.ConsumptionID;
    `, masterInputs, "GetReportFuelCons")).recordset;
    
    // Corrected Lube Oil Consumptions query to match confirmed user's live schema
    masterReport.loConsumptionLogs = (await executeQuery(`
        SELECT
            loc.LOConsumptionID, -- Primary key as per live schema
            loc.ReportID,
            loc.ShipID, -- Direct column as per live schema
            loc.LOTypeKey, -- Direct column as per live schema
            lot.LubeOilTypeDescription, -- Derived from join
            loc.MachineryTypeKey, -- Direct column as per live schema
            loc.SpecificMachineryName, -- Direct column as per live schema
            loc.ConsumedQty,
            loc.IsActive,
            loc.BDN_Number, -- Added BDN_Number
            loc.EntryDate -- Fetch the EntryDate
        FROM MEMP_ReportLOConsumption loc
        JOIN MEMP_LubeOilTypes lot ON loc.LOTypeKey = lot.LubeOilTypeKey
        WHERE loc.ReportID = @ReportID AND loc.IsActive = 1
        ORDER BY loc.LOConsumptionID;
    `, masterInputs, "GetReportLOConsumptions")).recordset;

    // FIX: Retrieve the new ConsumedByDescription column
    masterReport.machineryData = (await executeQuery(`
        SELECT ReportID, ShipID, ShipMachineryRecordID, MachineryTypeKey, MachineryName, Power, RPM, Running_Hrs, Total_Power, ConsumedByDescription, Remarks, IsActive
        FROM MEMP_ReportMachineryData
        WHERE ReportID = @ReportID AND IsActive = 1;
    `, masterInputs, "GetReportMachineryData")).recordset;

    if (masterReport.ReportDataJSON) {
        try {
            masterReport.ReportDataJSON = JSON.parse(masterReport.ReportDataJSON);
        } catch (e) {
            console.error("Error parsing ReportDataJSON:", e);
            masterReport.ReportDataJSON = null;
        }
    }
    delete masterReport.DocumentPaths;

    return masterReport;
};

export const softDeleteReportInDB = async (reportId) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();

        await new sql.Request(transaction)
            .input('ReportID', sql.BigInt, parseInt(reportId))
            .query('UPDATE MEMP_VesselDailyReports SET IsActive = 0 WHERE ReportID = @ReportID;');

        const childTables = [
            'MEMP_DailyFuelConsumption',
            'MEMP_ReportLOConsumption',
            'MEMP_ReportMachineryData'
        ];
        
        for (const table of childTables) {
            const softDeleteChildQuery = `UPDATE ${table} SET IsActive = 0 WHERE ReportID = @ReportID;`;
            const childRequest = new sql.Request(transaction);
            childRequest.input('ReportID', sql.BigInt, parseInt(reportId));
            await childRequest.query(softDeleteChildQuery);
        }

        await transaction.commit();
        return true;
    }
    catch (err) {
        await transaction.rollback();
        console.error("[ReportingModel] Error in softDeleteReportInDB (transaction rolled back):", err);
        throw err;
    }
};

export const getLastReportForShip = async (shipId) => {
    const query = `
        SELECT TOP 1
            ReportID, ShipID, VoyageID, ReportTypeKey, ReportDateTimeUTC, ReportDateTimeLocal, TimeZoneAtPort, CargoActivity, ReportedCargoType, ReportedCargoQuantityMT, ContainersTEU, DisplacementMT, CurrentPortCode, FwdDraft, AftDraft, Trim, MidDraft, VoyageLegID, FromPort, ToPort
        FROM MEMP_VesselDailyReports
        WHERE ShipID = @ShipID AND IsActive = 1
        ORDER BY ReportDateTimeUTC DESC;
    `;
    const inputs = [{ name: 'ShipID', type: sql.Int, value: parseInt(shipId) }];
    const result = await executeQuery(query, inputs, "GetLastReportForShip");
    // Rename FromPort/ToPort to DeparturePortCode/ArrivalPortCode for consistency with VoyageLegs schema
    const report = result.recordset[0];
    if (report) {
        report.DeparturePortCode = report.FromPort;
        report.ArrivalPortCode = report.ToPort;
        delete report.FromPort;
        delete report.ToPort;
    }
    return report;
};

// NEW: Function to get the report immediately preceding a given report
export const getPrecedingReportFromDB = async (reportId) => {
    const pool = await getPool();
    const request = new sql.Request(pool);

    // Get the current report's ReportDateTimeUTC and ShipID
    const currentReportQuery = `SELECT ReportDateTimeUTC, ShipID FROM MEMP_VesselDailyReports WHERE ReportID = @ReportID AND IsActive = 1;`;
    request.input('ReportID', sql.BigInt, parseInt(reportId));
    const currentReportResult = await request.query(currentReportQuery);
    const currentReport = currentReportResult.recordset[0];

    if (!currentReport) {
        return null; // Current report not found
    }

    // Find the latest report before the current one for the same ship
    const precedingReportQuery = `
        SELECT TOP 1
            ReportID, ShipID, VoyageID, ReportTypeKey, ReportDateTimeUTC, ReportDateTimeLocal, TimeZoneAtPort, CargoActivity, ReportedCargoType, ReportedCargoQuantityMT, ContainersTEU, DisplacementMT, CurrentPortCode, ReportStatus, FwdDraft, AftDraft, Trim, MidDraft, VoyageLegID, FromPort, ToPort
        FROM MEMP_VesselDailyReports
        WHERE ShipID = @ShipID AND IsActive = 1 AND ReportDateTimeUTC < @ReportDateTimeUTC
        ORDER BY ReportDateTimeUTC DESC;
    `;
    const precedingRequest = new sql.Request(pool);
    precedingRequest.input('ShipID', sql.Int, currentReport.ShipID);
    precedingRequest.input('ReportDateTimeUTC', sql.DateTime2, currentReport.ReportDateTimeUTC);
    const precedingResult = await precedingRequest.query(precedingReportQuery);
    
    // Rename FromPort/ToPort to DeparturePortCode/ArrivalPortCode for consistency with VoyageLegs schema
    const report = precedingResult.recordset[0];
    if (report) {
        report.DeparturePortCode = report.FromPort;
        report.ArrivalPortCode = report.ToPort;
        delete report.FromPort;
        delete report.ToPort;
    }
    return report;
};


// 🚢 MODIFIED: Fetch the latest location and status for all active vessels (with optional fleet filter)
// 1. FOR MAP: Get Latest Locations
export const getLatestVesselLocations = async (fleetName) => {
    try {
        const pool = await getPool();
        let query = `
            SELECT 
                s.ShipID, s.ShipName, s.IMO_Number, f.FleetName,
                r.ReportDateTimeLocal, r.Latitude, r.Longitude, 
                r.ReportTypeKey AS VesselStatus
            FROM MEMP_Ships s
            INNER JOIN MEMP_Fleets f ON s.FleetID = f.FleetID
            OUTER APPLY (
                SELECT TOP 1 Latitude, Longitude, ReportDateTimeLocal, ReportTypeKey
                FROM MEMP_VesselDailyReports vdr
                WHERE vdr.ShipID = s.ShipID AND vdr.IsActive = 1
                and vdr.Latitude IS NOT NULL AND vdr.Longitude IS NOT NULL
                and vdr.Latitude <> 0 AND vdr.Longitude <> 0
                ORDER BY vdr.ReportDateTimeLocal DESC
            ) r
            WHERE s.IsActive = 1
        `;

        const request = pool.request();
        if (fleetName && fleetName !== 'All Fleets') {
            query += ` AND f.FleetName = @fleetName`;
            request.input('fleetName', sql.NVarChar, fleetName);
        }

        const result = await request.query(query);
        return result.recordset;
    } catch (err) {
        console.error("Error in getLatestVesselLocations:", err);
        throw err;
    }
};



// 2. FOR TABLE: Get Top 1 Report per Vessel
export const getLatestVesselReports = async (fleetName) => {
    try {
        const pool = await getPool();
        
        let query = `
            WITH LatestReports AS (
                SELECT 
                    b.ShipName AS Ship,
                    c.FleetName,
                    a.ReportTypeKey AS [Report Type],
                    a.ReportDateTimeLocal AS ReportDate,
                    a.VoyageNumber,
                    d.PortName AS FromPort,
                    e.PortName AS ToPort,
                    CASE 
                        WHEN a.ReportedCargoQuantityMT > 0 OR a.ContainersTEU > 0 
                        THEN 'Laden' 
                        ELSE 'Ballast' 
                    END AS [Cargo Status],
                    ROW_NUMBER() OVER (
                        PARTITION BY b.ShipName 
                        ORDER BY a.ReportDateTimeLocal DESC
                    ) AS rn
                FROM MEMP_VesselDailyReports a
                INNER JOIN MEMP_Ships b ON a.ShipID = b.ShipID
                INNER JOIN MEMP_Fleets c ON b.FleetID = c.FleetID
                LEFT JOIN MEMP_SeaPorts d ON a.FromPort = d.PortCode
                LEFT JOIN MEMP_SeaPorts e ON a.ToPort = e.PortCode
                WHERE 1=1
        `;

        const request = pool.request();

        // Dynamic Filtering
        if (fleetName && fleetName !== 'All Fleets') {
            query += ` AND c.FleetName = @fleetName`;
            request.input('fleetName', sql.NVarChar, fleetName);
        }

        query += `
            )
            SELECT 
                Ship, 
                [Report Type] AS ReportType,
                CONVERT(VARCHAR(16), ReportDate, 120) AS ReportDate,
                VoyageNumber,
                FromPort,
                ToPort,
                [Cargo Status] AS CargoStatus
            FROM LatestReports
            WHERE rn = 1
            ORDER BY Ship;
        `;

        const result = await request.query(query);
        return result.recordset;

    } catch (err) {
        console.error("Error in getLatestVesselReports:", err);
        throw err;
    }
};

// --- 🟢 NEW: VESSEL STATUS DASHBOARD MODELS ---

// Component 1: Latest Voyage Aggregated Stats
// 🟢 FIX: Return VoyageStart and VoyageEnd so the frontend can auto-set the date filters
export const getVoyageList = async (shipId) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('ShipID', sql.Int, shipId)
            .query(`
                SELECT 
                    VoyageNumber,
                    MIN(ReportDateTimeLocal) as VoyageStart,
                    MAX(ReportDateTimeLocal) as VoyageEnd
                FROM MEMP_VesselDailyReports 
                WHERE ShipID = @ShipID 
                  AND VoyageNumber IS NOT NULL 
                  AND IsActive = 1
                GROUP BY VoyageNumber
                ORDER BY MIN(ReportDateTimeUTC) DESC
            `);
        return result.recordset;
    } catch (err) {
        console.error("Error in getVoyageList:", err);
        throw err;
    }
};
// 🟢 UPDATED: Get Voyage Stats (Now accepts specific Voyage Number and fetches Ports)
export const getLatestVoyageStatsFromDB = async (shipId, voyageNum) => {
    try {
        const pool = await getPool();
        const query = `
            DECLARE @TargetVoyage varchar(200) = @VoyageNumInput;

            -- 1. If no specific voyage requested, find the latest active one
            IF @TargetVoyage IS NULL OR @TargetVoyage = ''
            BEGIN
                SELECT TOP 1 @TargetVoyage = VoyageNumber 
                FROM MEMP_VesselDailyReports 
                WHERE ShipID = @ShipID AND IsActive = 1 AND VoyageNumber IS NOT NULL
                ORDER BY ReportDateTimeUTC DESC;
            END

            -- 2. General Aggregates
            SELECT 
                VoyageNumber,
                SUM(DistanceSinceLastReportNM) AS DistanceTravelled,
                AVG(NULLIF(SpeedKnots, 0)) AS AvgSpeed,
                SUM(ISNULL(ReportDuration, 0)) AS TotalDuration,
                SUM(CASE WHEN ReportTypeKey IN ('NOON_AT_SEA','END_SEA_PASSAGE','ARRIVAL') THEN ISNULL(ReportDuration, 0) ELSE 0 END) AS SailingDuration,
                SUM(CASE WHEN ReportTypeKey IN ('ANCHOR_AWEIGH','NOON_AT_ANCHOR') THEN ISNULL(ReportDuration, 0) ELSE 0 END) AS AnchorDuration,
                SUM(CASE WHEN ReportTypeKey IN ('DEPARTURE','NOON_AT_PORT') THEN ISNULL(ReportDuration, 0) ELSE 0 END) AS PortDuration
            FROM MEMP_VesselDailyReports
            WHERE ShipID = @ShipID AND VoyageNumber = @TargetVoyage AND IsActive = 1
            GROUP BY VoyageNumber;

            -- 3. Fuel Consumed by Type
            SELECT 
                a.FuelTypeKey, 
                SUM(a.ConsumedMT) AS FuelConsumed
            FROM MEMP_DailyFuelConsumption a
            JOIN MEMP_VesselDailyReports b ON a.ReportID = b.ReportID
            WHERE a.ShipID = @ShipID AND b.VoyageNumber = @TargetVoyage AND a.IsActive = 1 AND b.IsActive = 1
            GROUP BY a.FuelTypeKey
            ORDER BY a.FuelTypeKey;

            -- 4. Fuel Consumed by Bunker (BDN)
            SELECT 
                a.BDN_Number AS BunkerNumber, 
                SUM(a.ConsumedMT) AS BunkerConsumed
            FROM MEMP_DailyFuelConsumption a
            JOIN MEMP_VesselDailyReports b ON a.ReportID = b.ReportID
            WHERE a.ShipID = @ShipID AND b.VoyageNumber = @TargetVoyage AND a.IsActive = 1 AND b.IsActive = 1
            GROUP BY a.BDN_Number
            ORDER BY a.BDN_Number;
            
            -- 5. Total Fuel
             SELECT 
                SUM(a.ConsumedMT) AS TotalFuelConsumed
            FROM MEMP_DailyFuelConsumption a
            JOIN MEMP_VesselDailyReports b ON a.ReportID = b.ReportID
            WHERE a.ShipID = @ShipID AND b.VoyageNumber = @TargetVoyage AND a.IsActive = 1 AND b.IsActive = 1;

            -- 6. 🟢 NEW: Get From Port and To Port (Based on latest report in that voyage)
            SELECT TOP 1
                d.VoyageNumber,
                f.PortName as FromPort,
                t.PortName as ToPort
            FROM MEMP_VesselDailyReports d
            LEFT JOIN MEMP_SeaPorts f on d.FromPort = f.PortCode
            LEFT JOIN MEMP_SeaPorts t on d.ToPort = T.PortCode
            WHERE d.ShipID = @ShipID AND d.VoyageNumber = @TargetVoyage
            ORDER BY d.ReportDateTimeLocal DESC; 
        `;

        const request = pool.request();
        request.input('ShipID', sql.Int, parseInt(shipId));
        request.input('VoyageNumInput', sql.VarChar, voyageNum || null); // Pass null if undefined
        
        const result = await request.query(query);
        
        const baseStats = result.recordsets[0][0] || {};
        const fuelByType = result.recordsets[1] || [];
        const fuelByBunker = result.recordsets[2] || [];
        const totalFuel = result.recordsets[3][0]?.TotalFuelConsumed || 0;
        const portInfo = result.recordsets[4][0] || {}; // Get Port Data

        return {
            ...baseStats,
            FromPort: portInfo.FromPort || 'N/A', // Add Port Data to response
            ToPort: portInfo.ToPort || 'N/A',     // Add Port Data to response
            TotalFuelConsumed: totalFuel,
            FuelByType: fuelByType,
            FuelByBunker: fuelByBunker
        };

    } catch (err) {
        console.error("Error in getLatestVoyageStatsFromDB:", err);
        throw err;
    }
};

// Component 2: Latest Report Snapshot
export const getLatestReportSnapshotFromDB = async (shipId) => {
    try {
        const query = `
            SELECT TOP 1 
                ReportDateTimeLocal,
                ReportTypeKey,
                VoyageNumber,
                TimeZoneAtPort,
                Latitude,
                Longitude,
                VesselActivity,
                SpeedKnots,
                DistanceSinceLastReportNM,
                EngineDistanceNM,
                SteamingHoursPeriod,
                TimeAtAnchorageHRS,
                TimeAtDriftingHRS,
                SeaState,
                MidDraft,
                Trim,
                ReportedCargoQuantityMT
            FROM MEMP_VesselDailyReports 
            WHERE ShipID = @ShipID 
              AND ReportStatus = 'Submitted'
              AND IsActive = 1
            ORDER BY ReportDateTimeUTC DESC;
        `;
        
        const inputs = [{ name: 'ShipID', type: sql.Int, value: parseInt(shipId) }];
        const result = await executeQuery(query, inputs, "GetLatestReportSnapshot");
        return result.recordset[0] || null;

    } catch (err) {
        console.error("Error in getLatestReportSnapshotFromDB:", err);
        throw err;
    }
};

// --- 🟢 UPDATED: VESSEL EMISSIONS ANALYTICS (With Full Trend & Fuel Breakdown) ---
// ... existing imports

export const getVesselEmissionsAnalyticsFromDB = async (shipId, fromDate, toDate, voyageNum) => {
    try {
        const pool = await getPool();
        
        const safeFromDate = fromDate || '1970-01-01';
        const safeToDate = toDate ? (toDate.includes('T') ? toDate : `${toDate} 23:59:59`) : '2099-12-31 23:59:59';

        const query = `
            -- 1. FETCH SHIP PARTICULARS FOR CII
            DECLARE @Capacity decimal(18,2) = 0;
            DECLARE @DWT decimal(18,2);
            DECLARE @GT decimal(18,2);
            
            SELECT @DWT = CapacityDWT, @GT = CapacityGT 
            FROM MEMP_Ships WHERE ShipID = @ShipID;

            SET @Capacity = COALESCE(@DWT, @GT, 0);

            -- 2. SETUP FILTERING
            DECLARE @TargetVoyage varchar(200) = @VoyageNum;

            -- 3. AGGREGATE METRICS (Card Totals)
            ;WITH ReportData AS (
                SELECT r.ReportID, r.DistanceSinceLastReportNM, r.SteamingHoursPeriod
                FROM MEMP_VesselDailyReports r
                WHERE r.ShipID = @ShipID AND r.IsActive = 1
                  AND r.ReportDateTimeUTC BETWEEN @FromDate AND @ToDate
                  AND (@TargetVoyage IS NULL OR r.VoyageNumber = @TargetVoyage)
            ),
            FuelData AS (
                SELECT 
                    f.ReportID, f.ConsumedMT, f.FuelTypeKey,
                    ISNULL(ft.CO2ConversionFactor, 3.206) as CO2_Factor,
                    ISNULL(ft.CH4ConversionFactor, 0.00005) as CH4_Factor,
                    ISNULL(ft.N2OConversionFactor, 0.00018) as N2O_Factor,
                    -- SOx Logic: BDN % > Master Table % > 0.5% default
                    (ISNULL(NULLIF(b.SulphurContentPercent, 0), ISNULL(sm.DefaultSulphurPercent, 0.5)) / 100.0) as Sulphur_Weight_Factor,
                    -- PM Logic: 0.001 for Distillates, 0.007 for Residuals
                    CASE WHEN f.FuelTypeKey LIKE '%MGO%' OR f.FuelTypeKey LIKE '%LFO%' THEN 0.001 ELSE 0.007 END as PM_Factor
                FROM MEMP_DailyFuelConsumption f
                LEFT JOIN MEMP_FuelTypes ft ON f.FuelTypeKey = ft.FuelTypeKey
                LEFT JOIN MEMP_BunkeringData b ON f.BDN_Number = b.BDN_Number
                LEFT JOIN Fuel_Sulphur_Master sm ON f.FuelTypeKey = sm.FuelTypeKey -- NEW JOIN for fallback
                WHERE f.ShipID = @ShipID AND f.IsActive = 1
            )
            SELECT 
                SUM(rd.DistanceSinceLastReportNM) as TotalDistance,
                SUM(rd.SteamingHoursPeriod) as TotalSteamingHrs,
                (SELECT SUM(ConsumedMT) FROM FuelData fd WHERE fd.ReportID IN (SELECT ReportID FROM ReportData)) as TotalFuel,
                (SELECT SUM(ConsumedMT * CO2_Factor) FROM FuelData fd WHERE fd.ReportID IN (SELECT ReportID FROM ReportData)) as TotalCO2,
                (SELECT SUM(ConsumedMT * CH4_Factor) FROM FuelData fd WHERE fd.ReportID IN (SELECT ReportID FROM ReportData)) as TotalCH4,
                (SELECT SUM(ConsumedMT * N2O_Factor) FROM FuelData fd WHERE fd.ReportID IN (SELECT ReportID FROM ReportData)) as TotalN2O,
                (SELECT SUM((ConsumedMT * CO2_Factor) + (ConsumedMT * CH4_Factor * 28) + (ConsumedMT * N2O_Factor * 265)) FROM FuelData fd WHERE fd.ReportID IN (SELECT ReportID FROM ReportData)) as TotalGHG,
                (SELECT SUM(ConsumedMT * Sulphur_Weight_Factor * 2.0) FROM FuelData fd WHERE fd.ReportID IN (SELECT ReportID FROM ReportData)) as TotalSOx,
                (SELECT SUM(ConsumedMT * 0.07) FROM FuelData fd WHERE fd.ReportID IN (SELECT ReportID FROM ReportData)) as TotalNOx,
                (SELECT SUM(ConsumedMT * PM_Factor) FROM FuelData fd WHERE fd.ReportID IN (SELECT ReportID FROM ReportData)) as TotalPM,
                CASE WHEN SUM(rd.DistanceSinceLastReportNM) > 0 AND @Capacity > 0 
                     THEN ((SELECT SUM(ConsumedMT * CO2_Factor) FROM FuelData fd WHERE fd.ReportID IN (SELECT ReportID FROM ReportData)) * 1000000) / (SUM(rd.DistanceSinceLastReportNM) * @Capacity)
                     ELSE 0 END as AttainedCII
            FROM ReportData rd;

            -- 4. EMISSIONS BREAKDOWN BY FUEL TYPE
            SELECT 
                f.FuelTypeKey,
                SUM(f.ConsumedMT) as Fuel_MT,
                SUM(f.ConsumedMT * ISNULL(ft.CO2ConversionFactor, 3.206)) as CO2_MT,
                SUM(f.ConsumedMT * ISNULL(ft.CH4ConversionFactor, 0.00005)) as CH4_MT,
                SUM(f.ConsumedMT * ISNULL(ft.N2OConversionFactor, 0.00018)) as N2O_MT,
                SUM((f.ConsumedMT * ISNULL(ft.CO2ConversionFactor, 3.206)) + (f.ConsumedMT * ISNULL(ft.CH4ConversionFactor, 0.00005) * 28) + (f.ConsumedMT * ISNULL(ft.N2OConversionFactor, 0.00018) * 265)) as GHG_MT,
                SUM(f.ConsumedMT * (ISNULL(NULLIF(b.SulphurContentPercent, 0), ISNULL(sm.DefaultSulphurPercent, 0.5)) / 100.0) * 2.0) as SOx_MT,
                SUM(f.ConsumedMT * 0.07) as NOx_MT,
                SUM(f.ConsumedMT * CASE WHEN f.FuelTypeKey LIKE '%MGO%' OR f.FuelTypeKey LIKE '%LFO%' THEN 0.001 ELSE 0.007 END) as PM_MT
            FROM MEMP_DailyFuelConsumption f
            JOIN MEMP_VesselDailyReports r ON f.ReportID = r.ReportID
            LEFT JOIN MEMP_FuelTypes ft ON f.FuelTypeKey = ft.FuelTypeKey
            LEFT JOIN MEMP_BunkeringData b ON f.BDN_Number = b.BDN_Number
            LEFT JOIN Fuel_Sulphur_Master sm ON f.FuelTypeKey = sm.FuelTypeKey
            WHERE r.ShipID = @ShipID AND r.IsActive = 1
              AND r.ReportDateTimeUTC BETWEEN @FromDate AND @ToDate
              AND (@TargetVoyage IS NULL OR r.VoyageNumber = @TargetVoyage)
            GROUP BY f.FuelTypeKey;

            -- 5. DAILY TREND (Trends use the same improved logic)
            SELECT 
                CAST(r.ReportDateTimeLocal as DATE) as ReportDate,
                SUM(f.ConsumedMT * ISNULL(ft.CO2ConversionFactor, 3.206)) as Daily_CO2,
                SUM(f.ConsumedMT * (ISNULL(NULLIF(b.SulphurContentPercent, 0), ISNULL(sm.DefaultSulphurPercent, 0.5)) / 100.0) * 2.0) as Daily_SOx,
                SUM(f.ConsumedMT * CASE WHEN f.FuelTypeKey LIKE '%MGO%' OR f.FuelTypeKey LIKE '%LFO%' THEN 0.001 ELSE 0.007 END) as Daily_PM,
                SUM(
                    (f.ConsumedMT * ISNULL(ft.CO2ConversionFactor, 3.206)) +
                    (f.ConsumedMT * ISNULL(ft.CH4ConversionFactor, 0.00005) * 28) + 
                    (f.ConsumedMT * ISNULL(ft.N2OConversionFactor, 0.00018) * 265)
                ) as Daily_TotalGHG
            FROM MEMP_VesselDailyReports r
            JOIN MEMP_DailyFuelConsumption f ON r.ReportID = f.ReportID
            LEFT JOIN MEMP_FuelTypes ft ON f.FuelTypeKey = ft.FuelTypeKey
            LEFT JOIN MEMP_BunkeringData b ON f.BDN_Number = b.BDN_Number
            LEFT JOIN Fuel_Sulphur_Master sm ON f.FuelTypeKey = sm.FuelTypeKey
            WHERE r.ShipID = @ShipID AND r.IsActive = 1
              AND r.ReportDateTimeUTC BETWEEN @FromDate AND @ToDate
              AND (@TargetVoyage IS NULL OR r.VoyageNumber = @TargetVoyage)
            GROUP BY CAST(r.ReportDateTimeLocal as DATE)
            ORDER BY ReportDate;

            -- 6. DAILY FUEL CONSUMPTION BREAKDOWN
            SELECT 
                CAST(r.ReportDateTimeLocal as DATE) as ReportDate,
                f.FuelTypeKey,
                SUM(f.ConsumedMT) as Consumed
            FROM MEMP_VesselDailyReports r
            JOIN MEMP_DailyFuelConsumption f ON r.ReportID = f.ReportID
            WHERE r.ShipID = @ShipID AND r.IsActive = 1
              AND r.ReportDateTimeUTC BETWEEN @FromDate AND @ToDate
              AND (@TargetVoyage IS NULL OR r.VoyageNumber = @TargetVoyage)
            GROUP BY CAST(r.ReportDateTimeLocal as DATE), f.FuelTypeKey
            ORDER BY ReportDate;
        `;

        const inputs = [
            { name: 'ShipID', type: sql.Int, value: parseInt(shipId) },
            { name: 'FromDate', type: sql.DateTime2, value: safeFromDate },
            { name: 'ToDate', type: sql.DateTime2, value: safeToDate },
            { name: 'VoyageNum', type: sql.VarChar(200), value: voyageNum || null }
        ];

        const result = await executeQuery(query, inputs, "GetVesselEmissionsAnalytics");
        
        return {
            metrics: result.recordsets[0][0] || {},
            fuelBreakdown: result.recordsets[1] || [],
            trendData: result.recordsets[2] || [],
            fuelTrend: result.recordsets[3] || []
        };

    } catch (err) {
        console.error("SQL Error in getVesselEmissionsAnalytics:", err);
        throw err;
    }
};