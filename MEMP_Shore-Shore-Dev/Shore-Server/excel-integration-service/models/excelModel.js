// addeditpage breakup/viswa-digital-backend/excel-integration-service/models/excelModel.js

import { sql, pool } from '../utils/db.js'; // ESM path
// REMOVED: import moment from 'moment'; (no longer needed as JSON insertion is removed)

/**
 * REMOVED: TVP_DEFINITION object (no longer needed as JSON insertion is removed)
 */

/**
 * Executes a raw SQL query, replacing hardcoded ShipID placeholder.
 * ✅ FIX: Use case-insensitive regex to properly replace all ShipID values
 */
async function executeComplexTemplateQuery(queryString, shipId) {
    if (!pool) {
        throw new Error("Database pool is not initialized.");
    }
    
    // ✅ FIX: Case-insensitive regex replacements with proper semicolon handling
    const parameterizedQuery = queryString
        .replace(/DECLARE\s+@ShipID\s+AS\s+INT\s*=\s*2\s*;?/gi, `DECLARE @ShipID AS INT = ${shipId};`)
        .replace(/DECLARE\s+@shipId\s+AS\s+INT\s*=\s*2\s*;?/gi, `DECLARE @shipId AS INT = ${shipId};`)
        .replace(/WHERE\s+shipId\s*=\s*@ShipID/gi, `WHERE ShipID = ${shipId}`)
        .replace(/WHERE\s+shipId\s*=\s*2/gi, `WHERE ShipID = ${shipId}`)
        .replace(/AND\s+[ab]\.ShipID\s*=\s*2/gi, (match) => match.replace('2', shipId))
        .replace(/ShipID\s*=\s*@ShipID/gi, `ShipID = ${shipId}`);

    console.log(`📝 Executing query for ShipID: ${shipId}`);

    const request = pool.request();
    request.timeout = 120000; // 120 seconds timeout for complex queries

    try {
        const result = await request.query(parameterizedQuery);
        console.log(`✅ Query executed successfully - ${result.recordsets.length} recordsets returned`);
        return result.recordsets; 
    } catch (err) {
        console.error('❌ SQL Error in executeComplexTemplateQuery:', err.message);
        console.error('   Ship ID:', shipId);
        console.error('   Error details:', err);
        throw new Error(`SQL Query Failed: ${err.message}. Check database connection and ensure ShipID=${shipId} exists.`);
    }
}

export async function getTemplateData(shipId) {
    
    let lookupResults = [];
    let voyageData = [];
    let portsData = []; // NEW: Variable for Ports
    let lastReportSets = [];

    // SQL Content definitions (Lookup Scripts.sql)
    // ✅ IMPLEMENTATION OF USER'S FULL QUERY LOGIC + NEW PORTS QUERY
    const lookupSqlContent = `DECLARE @ShipID AS INT = 2;

-- 1. ReportType
SELECT ReportTypeKey 
FROM MEMP_ReportTypes WITH (NOLOCK) 
WHERE IsActive = 1;

-- 2. VesselActivity
SELECT Vessel_Activity 
FROM MEMP_Vessel_Activity WITH (NOLOCK) 
WHERE IsActive = 1;

-- 3. Wind/Swell Direction
SELECT DirectionName 
FROM MEMP_WindDirections WITH (NOLOCK) 
WHERE IsActive = 1;

-- 4. SeaState
SELECT StateDescription 
FROM MEMP_SeaStates WITH (NOLOCK) 
WHERE IsActive = 1;

-- 5. CargoActivity
SELECT Cargo_Activity 
FROM MEMP_Cargo_Activity WITH (NOLOCK) 
WHERE IsActive = 1;

-- 6. Ship Machinery
SELECT ShipID, CustomMachineryName, MachineryTypeKey, MachineryRecordID
FROM MEMP_ShipMachinery WITH (NOLOCK)  
WHERE ShipID = @ShipID;

-- 7. Bunker Data (Filtered Latest BDN + Final_Quantity > 0)
SELECT 
    ROB_Entry_ID,
    ItemTypeKey AS ItemTypeKey1, -- Used for Fuel Filtered List
    BDN_Number,
    ItemTypeKey,
    ItemCategory,
    Initial_Quantity,
    Final_Quantity
FROM (
    SELECT 
        ROB_Entry_ID,
        ItemTypeKey AS ItemTypeKey1,
        BDN_Number,
        ItemTypeKey,
        ItemCategory,
        Initial_Quantity,
        Final_Quantity,
        ROW_NUMBER() OVER (
            PARTITION BY BDN_Number, ItemTypeKey
            ORDER BY ROB_Entry_ID DESC
        ) AS rn
    FROM Bunker_ROB WITH (NOLOCK) 
    WHERE ShipID = @ShipID
) T
WHERE T.rn = 1
AND Final_Quantity > 0;

-- 8. Daily ROB (Last Entry per FuelTypeKey with Final_Quantity > 0)
SELECT 
    ReportID AS DailyROB_ReportID, 
    FuelTypeKey, 
    Initial_Quantity AS DR_Initial_Quantity, 
    Final_Quantity AS DR_Final_Quantity -- ✅ Using alias for mapping
FROM (
    SELECT 
        ReportID, FuelTypeKey, Initial_Quantity, Final_Quantity,
        ROW_NUMBER() OVER (PARTITION BY FuelTypeKey ORDER BY ReportID DESC) AS rn
    FROM MEMP_DailyROB WITH (NOLOCK) 
    WHERE ShipID = @ShipID
) t
WHERE rn = 1
AND Final_Quantity > 0;

-- 9. LO ROB (Last Entry per LubeOilTypeKey with Final_Quantity > 0)
SELECT 
    ReportID AS LO_ReportID, 
    LubeOilTypeKey, 
    Initial_Quantity AS LO_Initial_Quantity, 
    Final_Quantity AS LO_Final_Quantity -- ✅ Using alias for mapping
FROM (
    SELECT 
        ReportID, LubeOilTypeKey, Initial_Quantity, Final_Quantity,
        ROW_NUMBER() OVER (PARTITION BY LubeOilTypeKey ORDER BY ReportID DESC) AS rn
    FROM MEMP_ReportLOROB WITH (NOLOCK) 
    WHERE ShipID = @ShipID
) t
WHERE rn = 1
AND Final_Quantity > 0;

-- 10. BDN Final (For Dynamic Dropdowns) - Replicating your BDN logic
;WITH cte_Bunker_for_BDN_Group AS (
    SELECT 
        ItemTypeKey AS ItemTypeKey1,
        BDN_Number
    FROM (
        SELECT 
            ItemTypeKey,
            BDN_Number,
            ROB_Entry_ID,
            Final_Quantity,
            ROW_NUMBER() OVER (
                PARTITION BY BDN_Number, ItemTypeKey
                ORDER BY ROB_Entry_ID DESC
            ) AS rn
        FROM Bunker_ROB WITH (NOLOCK) 
        WHERE ShipID = @ShipID
    ) T
    WHERE T.rn = 1
    AND Final_Quantity > 0
),
cte_BDN_Group AS (
    SELECT 
        ItemTypeKey1 AS Item,
        STRING_AGG(BDN_Number, ',') WITHIN GROUP (ORDER BY BDN_Number) AS BDN
    FROM cte_Bunker_for_BDN_Group
    GROUP BY ItemTypeKey1
),
BdnSplit AS (
    SELECT 
        bg.Item,
        LTRIM(RTRIM(Split.a.value('.', 'NVARCHAR(100)'))) AS BDN,
        ROW_NUMBER() OVER (PARTITION BY bg.Item ORDER BY (SELECT NULL)) AS seq
    FROM cte_BDN_Group bg
    CROSS APPLY (
        SELECT CAST('<x>' + REPLACE(bg.BDN, ',', '</x><x>') + '</x>' AS XML)
    ) A(XmlCol)
    CROSS APPLY XmlCol.nodes('/x') AS Split(a)
)
SELECT
    Item AS BDN_ItemType,
    ISNULL(MAX(CASE WHEN seq = 1 THEN BDN END), '') AS BDN1,
    ISNULL(MAX(CASE WHEN seq = 2 THEN BDN END), '') AS BDN2,
    ISNULL(MAX(CASE WHEN seq = 3 THEN BDN END), '') AS BDN3,
    ISNULL(MAX(CASE WHEN seq = 4 THEN BDN END), '') AS BDN4,
    ISNULL(MAX(CASE WHEN seq = 5 THEN BDN END), '') AS BDN5,
    ISNULL(MAX(CASE WHEN seq = 6 THEN BDN END), '') AS BDN6,
    ISNULL(MAX(CASE WHEN seq = 7 THEN BDN END), '') AS BDN7,
    ISNULL(MAX(CASE WHEN seq = 8 THEN BDN END), '') AS BDN8,
    ISNULL(MAX(CASE WHEN seq = 9 THEN BDN END), '') AS BDN9,
    ISNULL(MAX(CASE WHEN seq = 10 THEN BDN END), '') AS BDN10
FROM BdnSplit
GROUP BY Item;

-- 11. Voyage Data (Separate result set)
SELECT 
    b.LegName AS LegName,
    b.VoyageID, 
    b.ShipID,
    b.DeparturePortCode, 
    b.ArrivalPortCode, 
    b.ETD, 
    b.ATD, 
    b.ETA, 
    b.ATA, 
    b.CargoDescription, 
    b.CargoWeightMT, 
    b.VoyageNumber,
    b.LegNumber,
    b.VoyageLegID
FROM MEMP_VoyageLegs b WITH (NOLOCK) 
WHERE b.IsActive = 1
and b.VoyageLegID >= (select Top 1 VoyageLegID from MEMP_VesselDailyReports WITH (NOLOCK) where isactive = 1 and ShipID = @ShipID order by ReportID desc)
  AND b.ShipID = @ShipID

UNION ALL   
SELECT 
    a.VoyageNumber AS LegName,   
    a.VoyageID, 
    a.ShipID,
    a.DeparturePortCode, 
    a.ArrivalPortCode, 
    a.ETD, 
    a.ATD, 
    a.ETA, 
    a.ATA, 
    a.CargoDescription, 
    a.CargoWeightMT, 
    a.VoyageNumber, 
    NULL as LegNumber, 
    NULL as VoyageLegID 
FROM MEMP_Voyages a WITH (NOLOCK) 
WHERE a.IsActive = 1
  AND a.ShipID = @ShipID
  and a.VoyageID >= (select Top 1 VoyageID from MEMP_VesselDailyReports WITH (NOLOCK) where isactive = 1 and ShipID = @ShipID order by ReportID desc)
  order by VoyageID, LegName;

-- 12. Ports Data (NEW)
SELECT PortID, PortName, Country, CountryCode, PortCode 
FROM MEMP_SeaPorts WITH (NOLOCK)
ORDER BY PortName;`;

    // SQL Content for Last Report Selection Sheetwise.sql (SYNTAX CORRECTED)
const lastReportSqlContent = `DECLARE @shipId AS INT = 2;
--VesselDailyReports Sheet
SELECT TOP 1
    --r.ReportID,   -- Ship-specific ReportID (original row)
    g.MaxReportID AS ReportID,  -- Global max ReportID from table
    r.ShipID, 
    r.VoyageID, 
    r.ReportTypeKey, 
    r.ReportDateTimeUTC, 
    r.ReportDateTimeLocal AS ReportDateTimeLocal, 
    r.TimeZoneAtPort, 
    r.Latitude, 
    r.Longitude, 
    r.VesselActivity, 
    r.CourseDEG, 
    r.SpeedKnots, 
    r.DistanceSinceLastReportNM, 
    r.EngineDistanceNM, 
    r.DistanceToGoNM, 
    r.SlipPercent, 
    r.DistanceTravelledHS_NM, 
    r.SteamingHoursPeriod, 
    r.TimeAtAnchorageHRS, 
    r.TimeAtDriftingHRS, 
    r.WindForce, 
    r.WindDirection, 
    r.SeaState, 
    r.SwellDirection, 
    r.SwellHeightM, 
    r.AirTemperatureC, 
    r.SeaTemperatureC, 
    r.BarometricPressureHPa, 
    r.CargoActivity, 
    r.ReportedCargoType, 
    r.ReportedCargoQuantityMT, 
    r.ContainersTEU, 
    r.DisplacementMT, 
    r.CurrentPortCode, 
    'Submitted' AS ReportStatus, 
    r.ReportDuration, 
    r.FromPort, 
    r.ToPort, 
    r.FwdDraft, 
    r.AftDraft, 
    (r.FwdDraft + r.AftDraft) / 2 AS MidDraft, 
    r.AftDraft - r.FwdDraft AS Trim, 
    r.VoyageNumber, 
    r.VoyageLegID, 
    r.LegNumber,
    r.ChartererSpeed, 
    r.ChartererConsumption, 
    'Null' as SubmittedBy
FROM MEMP_VesselDailyReports r WITH (NOLOCK)
CROSS JOIN (
    SELECT MAX(ReportID) AS MaxReportID
    FROM MEMP_VesselDailyReports WITH (NOLOCK)
) g
WHERE r.ShipID = @ShipID 
  AND r.IsActive = 1
ORDER BY r.ReportID DESC;

--Machinery Data Sheet
SELECT ReportID, ShipID, ShipMachineryRecordID, MachineryTypeKey, MachineryName, Power, RPM, Running_Hrs, Remarks, Total_Power, ConsumedByDescription
FROM MEMP_ReportMachineryData WITH (NOLOCK) 
WHERE ShipID = @ShipID AND ReportID IN (SELECT TOP 1 ReportID FROM MEMP_VesselDailyReports WHERE IsActive = 1 AND ShipID = @ShipID ORDER BY 1 DESC);

--Fuel_Consumption Sheet
SELECT ReportID, ShipID, MachineryName, MachineryTypeKey, ConsumedByDescription, FuelTypeKey, BDN_Number, ConsumedMT, EntryDate
FROM MEMP_DailyFuelConsumption WITH (NOLOCK) 
WHERE ShipID = @ShipID AND ReportID IN (SELECT TOP 1 ReportID FROM MEMP_VesselDailyReports WHERE IsActive = 1 AND ShipID = @ShipID ORDER BY 1 DESC);

--Lube Oil Consumption Sheet
SELECT ReportID, ShipID, SpecificMachineryName, MachineryTypeKey, LOTypeKey, BDN_Number, ConsumedQty, EntryDate
FROM MEMP_ReportLOConsumption WITH (NOLOCK) 
WHERE ShipID = @ShipID AND ReportID IN (SELECT TOP 1 ReportID FROM MEMP_VesselDailyReports WHERE IsActive = 1 AND ShipID = @ShipID ORDER BY 1 DESC);

--Bunker_Rob Sheet
SELECT ShipID, ReportID, EntryDate, BDN_Number, ItemTypeKey, Bunkered_Quantity, Consumed_Quantity, Initial_Quantity, Final_Quantity, ItemCategory
FROM Bunker_ROB WITH (NOLOCK) 
WHERE ShipID = @ShipID AND ReportID IN (SELECT TOP 1 ReportID FROM MEMP_VesselDailyReports WHERE IsActive = 1 AND ShipID = @ShipID ORDER BY 1 DESC);

--Fuel ROB Sheet
SELECT ShipID, Report_Consumption_ID, EntryDate, FuelTypeKey, Bunkered_Quantity, Consumed_Quantity, Initial_Quantity, Final_Quantity, entry_mode
FROM MEMP_DailyROB WITH (NOLOCK) 
WHERE ShipID = @ShipID AND ReportID IN (SELECT TOP 1 ReportID FROM MEMP_VesselDailyReports WHERE IsActive = 1 AND ShipID = @ShipID ORDER BY 1 DESC);

--Lube Oil ROB Sheet
SELECT ShipID, Report_Consumption_ID, EntryDate, LubeOilTypeKey, Bunkered_Quantity, Consumed_Quantity, Initial_Quantity, Final_Quantity, entry_mode
FROM MEMP_ReportLOROB WITH (NOLOCK) 
WHERE ShipID = @ShipID AND ReportID IN (SELECT TOP 1 ReportID FROM MEMP_VesselDailyReports WHERE IsActive = 1 AND ShipID = @ShipID ORDER BY 1 DESC);`;


    try {
        const results = await executeComplexTemplateQuery(lookupSqlContent, shipId);
        
        // FIX: Destructure the 12 separate result sets (Added portsResults)
        const [
            rt, va, wd, ss, ca, ms, br, dr, lo, bg, voyageResults, portsResults
        ] = results;

        // Determine the maximum length for merging lookups
        const maxRows = Math.max(
            rt.length, va.length, wd.length, ss.length, ca.length, 
            ms.length, br.length, dr.length, lo.length, bg.length
        );

        lookupResults = [];
        for (let i = 0; i < maxRows; i++) {
            // Find corresponding BDN Final record by ItemTypeKey1 for BDN lookups
            const currentBunkerRecord = br[i];
            const matchingBDNFinal = bg.find(item => item.BDN_ItemType === currentBunkerRecord?.ItemTypeKey1);

            lookupResults.push({
                // Static Lookups (1-5)
                ReportTypeKey: rt[i]?.ReportTypeKey || '',
                Vessel_Activity: va[i]?.Vessel_Activity || '',
                DirectionName: wd[i]?.DirectionName || '',
                StateDescription: ss[i]?.StateDescription || '',
                Cargo_Activity: ca[i]?.Cargo_Activity || '',

                // Ship Machinery (6)
                ShipID: ms[i]?.ShipID?.toString() || '',
                CustomMachineryName: ms[i]?.CustomMachineryName || '',
                MachineryTypeKey: ms[i]?.MachineryTypeKey || '',
                MachineryRecordID: ms[i]?.MachineryRecordID?.toString() || '',
                
                // Bunker Data (7)
                ROB_Entry_ID: br[i]?.ROB_Entry_ID?.toString() || '',
                ItemTypeKey1: br[i]?.ItemTypeKey1 || '',
                BDN_Number: br[i]?.BDN_Number || '',
                ItemTypeKey: br[i]?.ItemTypeKey || '',
                ItemCategory: br[i]?.ItemCategory || '',
                Initial_Quantity: br[i]?.Initial_Quantity?.toString() || '',
                Final_Quantity: br[i]?.Final_Quantity?.toString() || '',

                // Daily ROB (8)
                DailyROB_ReportID: dr[i]?.DailyROB_ReportID?.toString() || '',
                FuelTypeKey: dr[i]?.FuelTypeKey || '',
                DR_Initial_Quantity: dr[i]?.DR_Initial_Quantity?.toString() || '',
                // ✅ FIX: Using the correct explicit alias DR_Final_Quantity
                DR_Final_Quantity: dr[i]?.DR_Final_Quantity?.toString() || '', 

                // LO ROB (9)
                LO_ReportID: lo[i]?.LO_ReportID?.toString() || '',
                LubeOilTypeKey: lo[i]?.LubeOilTypeKey || '',
                LO_Initial_Quantity: lo[i]?.LO_Initial_Quantity?.toString() || '',
                // ✅ FIX: Using the correct explicit alias LO_Final_Quantity
                LO_Final_Quantity: lo[i]?.LO_Final_Quantity?.toString() || '',
                
                // BDN Final (10) - Merged by ItemTypeKey1
                BDN_ItemType: matchingBDNFinal?.BDN_ItemType || '',
                BDN1: matchingBDNFinal?.BDN1 || '',
                BDN2: matchingBDNFinal?.BDN2 || '',
                BDN3: matchingBDNFinal?.BDN3 || '',
                BDN4: matchingBDNFinal?.BDN4 || '',
                BDN5: matchingBDNFinal?.BDN5 || '',
                BDN6: matchingBDNFinal?.BDN6 || '',
                BDN7: matchingBDNFinal?.BDN7 || '',
                BDN8: matchingBDNFinal?.BDN8 || '',
                BDN9: matchingBDNFinal?.BDN9 || '',
                BDN10: matchingBDNFinal?.BDN10 || ''
            });
        }
        
        // Voyage Data
        voyageData = voyageResults || [];
        
        // NEW: Ports Data
        portsData = portsResults || [];

        // The separate last report queries are already in place
        lastReportSets = await executeComplexTemplateQuery(lastReportSqlContent, shipId);
    } catch (error) {
        throw error;
    }

    // --- Prepare Lookup Data for Mapping (Full Array needed for horizontal structure) ---
    const lookups = {
        fullLookupResults: lookupResults,
    };

    // --- Process Last Report Data (Map 7 result sets) ---
    const lastReportData = {
        DailyReport: lastReportSets[0]?.[0] || {}, 
        MachineryData: lastReportSets[1] || [], 
        FuelConsumption: lastReportSets[2] || [], 
        LOConsumption: lastReportSets[3] || [], 
        BunkerROB: lastReportSets[4] || [], 
        FuelROB: lastReportSets[5] || [], 
        LOROB: lastReportSets[6] || [], 
    };
    
    // UPDATED RETURN: Included portsData
    return { lookups, voyageData, portsData, lastReportData };
}

/**
 * REMOVED: export async function insertVesselReportFromExcel(parsedData) { ... }
 */


/**
 * Executes the EXEC dataimporttodb stored procedure with a dynamic file ID.
 * @param {string} fileId - The unique file ID (e.g., timestamp) generated during parsing.
 * @returns {string} Success message or throws an error.
 */
export async function importCSVToDBProcedure(fileId) {
    if (!pool) {
        throw new Error("Database pool is not initialized.");
    }

    try {
        const request = pool.request();
        
        // Input parameter for the stored procedure
        // FIX: Changed parameter name from 'FileID' to 'serialnumber' to match the stored procedure signature.
        request.input('serialnumber', sql.VarChar(100), fileId); 

        // Execute the stored procedure
        // Note: The execution call is correct; the issue was the parameter name.
        await request.execute('dataimporttodb'); 

        return `Successfully executed EXEC dataimporttodb '${fileId}'`;

    } catch (error) {
        console.error('SQL Error in importCSVToDBProcedure:', error.message);
        throw new Error(`Database Error: Failed to execute dataimporttodb for ID ${fileId}. Details: ${error.message}`);
    }
}

/**
 * NEW: Executes the EXEC bulkdataimporttodb stored procedure for BULK uploads.
 * @param {string} fileId - The unique file ID.
 * @returns {string} Success message or throws an error.
 */
export async function importBulkCSVToDBProcedure(fileId) {
    if (!pool) {
        throw new Error("Database pool is not initialized.");
    }

    try {
        const request = pool.request();
        request.input('serialnumber', sql.VarChar(100), fileId); 
        await request.execute('bulkdataimporttodb'); // Calls the BULK Stored Procedure
        return `Successfully executed EXEC bulkdataimporttodb '${fileId}'`;

    } catch (error) {
        console.error('SQL Error in importBulkCSVToDBProcedure:', error.message);
        throw new Error(`Database Error (Bulk): Failed to execute bulkdataimporttodb for ID ${fileId}. Details: ${error.message}`);
    }
}

// -------------------------------------------------------------------------
// NEW FUNCTIONS FOR DYNAMIC BULK UPLOAD (STAGING & CONFIG)
// -------------------------------------------------------------------------

/**
 * Fetches machinery configuration for dynamic column generation.
 */
export const getShipMachineryConfig = async (shipId) => {
    if (!pool) throw new Error("Database pool is not initialized.");
    
    // UPDATED: Added MachineryRecordID
    const query = `
        SELECT DISTINCT
            mt.Id AS TypeId,
            mt.MachineryTypeKey,
            mt.Power AS FlagPower,
            mt.Rpm AS FlagRpm,
            mt.Fuel_Consumption AS FlagFuel,
            mt.Electrical_Consumption AS FlagElectrical,
            sm.CustomMachineryName,
            sm.MachineryRecordID
        FROM MEMP_ShipMachinery sm
        JOIN MEMP_MachineryTypes mt 
            ON sm.MachineryTypeKey = mt.MachineryTypeKey
        WHERE sm.ShipID = @ShipID 
          AND sm.IsActive = 1
        ORDER BY mt.Id, sm.CustomMachineryName;
    `;
    
    const request = pool.request();
    request.input('ShipID', sql.Int, shipId);
    
    try {
        const result = await request.query(query);
        return result.recordset;
    } catch (error) {
        console.error('Error in getShipMachineryConfig:', error);
        throw new Error('Failed to fetch ship machinery configuration.');
    }
};

/**
 * Helper to get Vessel Short Code
 * UPDATED: Uses 'Short_Name' from MEMP_Ships
 */
export const getVesselShortCode = async (shipId) => {
    // Attempt to fetch specific code, fallback to ID if fails/missing
    try {
        // UPDATED QUERY: Fetch 'Short_Name' instead of 'VesselCode'
        const q = `SELECT TOP 1 Short_Name FROM MEMP_Ships WHERE ShipID = @ShipID`; 
        const request = pool.request();
        request.input('ShipID', sql.Int, shipId);
        const result = await request.query(q);
        if (result.recordset.length > 0 && result.recordset[0].Short_Name) {
            return result.recordset[0].Short_Name;
        }
        return `Vessel_${shipId}`; 
    } catch (e) {
        return `Vessel_${shipId}`;
    }
};

/**
 * 1. CREATE STAGING TABLE ONLY (For Pre-Creation on Download)
 * Drops existing table and creates new empty one based on headers.
 */
export const createStagingTableOnly = async (shipId, headers) => {
    if (!pool) throw new Error("Database connection failed.");

    // A. Get Table Name using Short_Name
    const shortCode = await getVesselShortCode(shipId);
    // Sanitize table name (Alphanumeric only)
    const safeShortCode = shortCode.replace(/[^a-zA-Z0-9_]/g, '');
    const tableName = `${safeShortCode}_Bulk_Upload_Staging`;
    
    // B. Build CREATE TABLE Script
    // UPDATED: Allow # and . in column names via Regex /[^a-zA-Z0-9_#.]/g
    // This allows "AE_#1_Power" to be a valid column name in SQL
    const sanitizeSqlName = (name) => name.replace(/[^a-zA-Z0-9_#.]/g, '_');
    
    const columnDefs = headers.map(h => `[${sanitizeSqlName(h)}] NVARCHAR(MAX)`).join(', ');
    
    const createTableSql = `
        IF OBJECT_ID('dbo.[${tableName}]', 'U') IS NOT NULL 
            DROP TABLE dbo.[${tableName}];
        
        CREATE TABLE dbo.[${tableName}] (
            ${columnDefs}
        );
    `;

    // C. Execute
    const request = pool.request();
    await request.query(createTableSql);
    return tableName;
};

/**
 * 2. Create Dynamic Staging Table AND Load Data (For Upload process)
 */
export const createAndLoadStagingTable = async (shipId, csvFilePath, headers) => {
    if (!pool) throw new Error("Database connection failed.");

    // 1. Create the table structure first (Reusing logic logic implies calling function, but here we inline for safety/speed)
    // Note: We could call createStagingTableOnly here, but to ensure `tableName` scope is clear:
    const tableName = await createStagingTableOnly(shipId, headers);

    // 2. BULK INSERT
    const bulkInsertSql = `
        BULK INSERT dbo.[${tableName}]
        FROM '${csvFilePath}'
        WITH (
            FORMAT = 'CSV',
            FIRSTROW = 2,
            FIELDTERMINATOR = ',',
            ROWTERMINATOR = '\\n',
            TABLOCK
        );
    `;

    const request = pool.request();
    try {
        await request.query(bulkInsertSql);
        return { success: true, tableName, message: `Staging table ${tableName} created and loaded.` };
    } catch (err) {
        console.error("Bulk Insert Failed:", err.message);
        throw new Error(`Failed to load data into ${tableName}. Ensure SQL Server has access to file path.`);
    }
};

/**
 * *** NEW ***
 * Executes the SP_Import_Voyages_And_VoyageLegs_CSV stored procedure.
 * @param {string} fileId - The unique SerialNumber from the filename.
 */
export async function importVoyageCSVToDBProcedure(fileId) {
    if (!pool) {
        throw new Error("Database pool is not initialized.");
    }

    try {
        const request = pool.request();
        // Pass @SerialNumber parameter
        request.input('SerialNumber', sql.VarChar(100), fileId);
        
        await request.execute('SP_Import_Voyages_And_VoyageLegs_CSV');

        return `Successfully executed SP_Import_Voyages_And_VoyageLegs_CSV for SerialNumber '${fileId}'`;

    } catch (error) {
        console.error('SQL Error in importVoyageCSVToDBProcedure:', error.message);
        throw new Error(`Database Error (Voyage): Failed to execute SP_Import_Voyages_And_VoyageLegs_CSV for ID ${fileId}. Details: ${error.message}`);
    }
}

// -------------------------------------------------------------------------
// *** NEW: BUNKER FUNCTIONS WITH USER-PROVIDED CTE SCRIPT ***
// -------------------------------------------------------------------------

export const getBunkerTemplateData = async (shipId) => {
    if (!pool) throw new Error("Database pool is not initialized.");
    
    // Using the EXACT script provided by the user using FULL JOINs and CTEs
    const query = `
        DECLARE @ShipID INT = ${shipId};

        ;WITH
        /* --------------------------------------------
           1. Voyage + Voyage Leg
        -------------------------------------------- */
        cte_Voyage AS (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY VoyageID, VoyageLegID) AS rn,
                ShipID,
                VoyageNumber,
                VoyageID,
                VoyageLegID,
                LegName
            FROM MEMP_VoyageLegs
            WHERE IsActive = 1
              AND ShipID = @ShipID
              AND VoyageLegID >= (
                    SELECT TOP 1 VoyageLegID
                    FROM MEMP_VesselDailyReports
                    WHERE ShipID = @ShipID
                    ORDER BY ReportID DESC
              )

            UNION ALL

            SELECT 
                ROW_NUMBER() OVER (ORDER BY VoyageID) AS rn,
                ShipID,
                VoyageNumber,
                VoyageID,
                NULL AS VoyageLegID,
                NULL AS LegName
            FROM MEMP_Voyages
            WHERE IsActive = 1
              AND ShipID = @ShipID
              AND VoyageID >= (
                    SELECT TOP 1 VoyageID
                    FROM MEMP_VesselDailyReports
                    WHERE ShipID = @ShipID
                    ORDER BY ReportID DESC
              )
        ),

        /* --------------------------------------------
           2. Bunker Category
        -------------------------------------------- */
        cte_BunkerCategory AS (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY BunkerCategory) AS rn,
                BunkerCategory
            FROM (
                SELECT DISTINCT BunkerCategory
                FROM MEMP_BunkeringData
            ) t
        ),

        /* --------------------------------------------
           3. Fuel Types
        -------------------------------------------- */
        cte_FuelType AS (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY FuelTypeKey) AS rn,
                FuelTypeKey
            FROM MEMP_FuelTypes
        ),

        /* --------------------------------------------
           4. Lube Oil Types
        -------------------------------------------- */
        cte_LubeOilType AS (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY LubeOilTypeKey) AS rn,
                LubeOilTypeKey
            FROM MEMP_LubeOilTypes
        ),

        /* --------------------------------------------
           5. Operation Type (STATIC VALUES)
        -------------------------------------------- */
        cte_OperationType AS (
            SELECT ROW_NUMBER() OVER (ORDER BY OperationType) AS rn, OperationType
            FROM (VALUES
                ('BUNKER'),
                ('DEBUNKER'),
                ('CORRECTION')
            ) v(OperationType)
        ),

        /* --------------------------------------------
           6. Ports
        -------------------------------------------- */
        cte_Ports AS (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY PortName, PortCode) AS rn,
                PortName,
                PortCode
            FROM (
                SELECT DISTINCT PortName, PortCode
                FROM MEMP_SeaPorts
            ) t
        )

        /* --------------------------------------------
           FINAL SINGLE TEMPLATE TABLE
        -------------------------------------------- */
        SELECT
            ISNULL(CAST(V.ShipID AS NVARCHAR(50)), '')        AS ShipID,
            ISNULL(CAST(V.VoyageNumber AS NVARCHAR(50)), '') AS VoyageNumber,
            ISNULL(CAST(V.VoyageID AS NVARCHAR(50)), '')     AS VoyageID,
            ISNULL(CAST(V.VoyageLegID AS NVARCHAR(50)), '')  AS VoyageLegID,
            ISNULL(V.LegName, '')                            AS LegName,

            ISNULL(BC.BunkerCategory, '')                    AS BunkerCategory,
            ISNULL(FT.FuelTypeKey, '')                       AS FuelTypeKey,
            ISNULL(LO.LubeOilTypeKey, '')                    AS LubeOilTypeKey,

            ISNULL(OP.OperationType, '')                     AS OperationType,
            ISNULL(P.PortName, '')                           AS PortName,
            ISNULL(P.PortCode, '')                           AS PortCode

        FROM cte_Voyage V
        FULL JOIN cte_BunkerCategory BC 
            ON V.rn = BC.rn
        FULL JOIN cte_FuelType FT 
            ON COALESCE(V.rn, BC.rn) = FT.rn
        FULL JOIN cte_LubeOilType LO 
            ON COALESCE(V.rn, BC.rn, FT.rn) = LO.rn
        FULL JOIN cte_OperationType OP
            ON COALESCE(V.rn, BC.rn, FT.rn, LO.rn) = OP.rn
        FULL JOIN cte_Ports P
            ON COALESCE(V.rn, BC.rn, FT.rn, LO.rn, OP.rn) = P.rn

        ORDER BY COALESCE(V.rn, BC.rn, FT.rn, LO.rn, OP.rn, P.rn);
    `;

    try {
        const request = pool.request();
        const result = await request.query(query);
        
        // This query returns a single merged result set matching the Lookups sheet structure
        return {
            lookupData: result.recordset || []
        };
    } catch (error) {
        console.error('Bunker Template Data Error:', error.message);
        // Return empty array on failure
        return { lookupData: [] };
    }
};

export async function importBunkerCSVToDBProcedure(fileId) {
    if (!pool) throw new Error("Database pool is not initialized.");
    try {
        const request = pool.request();
        request.input('SerialNumber', sql.VarChar(100), fileId); 
        
        // *** HERE IS THE CHANGE YOU REQUESTED ***
        await request.execute('Import_BunkeringDatatodb'); 

        return `Successfully executed Import_BunkeringDatatodb for SerialNumber '${fileId}'`;
    } catch (error) {
        console.error('SQL Error in importBunkerCSVToDBProcedure:', error.message);
        throw new Error(`Database Error (Bunker): Failed to execute Import_BunkeringDatatodb for ID ${fileId}. Details: ${error.message}`);
    }
}

// =========================================================================
// UPLOAD TOKEN FUNCTIONS
// =========================================================================

/**
 * Generate a unique upload token for a template
 * @param {number} shipId - Ship ID
 * @param {number} createdBy - User ID who generated the template (optional)
 * @param {number} expiresInDays - Token expiration in days (default 365)
 * @param {number} maxUsageCount - Max number of times token can be used (optional)
 * @param {string} notes - Additional notes (optional)
 * @returns {object} Token details
 */
export async function generateUploadToken(shipId, createdBy = null, expiresInDays = 365, maxUsageCount = null, notes = null) {
    if (!pool) throw new Error("Database pool is not initialized.");
    
    try {
        const request = pool.request();
        request.input('ShipID', sql.Int, shipId);
        request.input('CreatedBy', sql.Int, createdBy);
        request.input('ExpiresInDays', sql.Int, expiresInDays);
        request.input('MaxUsageCount', sql.Int, maxUsageCount);
        request.input('Notes', sql.NVarChar(500), notes);
        
        const result = await request.execute('GenerateUploadToken');
        return result.recordset[0];
    } catch (error) {
        console.error('Error generating upload token:', error.message);
        throw new Error(`Failed to generate upload token: ${error.message}`);
    }
}

/**
 * Validate upload token
 * @param {string} token - The upload token to validate
 * @param {string} ipAddress - IP address of the requester (optional)
 * @returns {object} Validation result with IsValid, ShipID, Message
 */
export async function validateUploadToken(token, ipAddress = null) {
    if (!pool) throw new Error("Database pool is not initialized.");
    
    try {
        const request = pool.request();
        request.input('Token', sql.NVarChar(255), token);
        request.input('IPAddress', sql.NVarChar(100), ipAddress);
        
        const result = await request.execute('ValidateUploadToken');
        return result.recordset[0];
    } catch (error) {
        console.error('Error validating upload token:', error.message);
        throw new Error(`Failed to validate upload token: ${error.message}`);
    }
}

/**
 * Revoke an upload token
 * @param {string} token - The token to revoke
 * @returns {object} Revocation result
 */
export async function revokeUploadToken(token) {
    if (!pool) throw new Error("Database pool is not initialized.");
    
    try {
        const request = pool.request();
        request.input('Token', sql.NVarChar(255), token);
        
        const result = await request.execute('RevokeUploadToken');
        return result.recordset[0];
    } catch (error) {
        console.error('Error revoking upload token:', error.message);
        throw new Error(`Failed to revoke upload token: ${error.message}`);
    }
}

/**
 * Get all tokens for a specific ship
 * @param {number} shipId - Ship ID
 * @returns {array} List of tokens
 */
export async function getUploadTokensByShip(shipId) {
    if (!pool) throw new Error("Database pool is not initialized.");
    
    try {
        const request = pool.request();
        request.input('ShipID', sql.Int, shipId);
        
        const result = await request.execute('GetUploadTokensByShip');
        return result.recordset;
    } catch (error) {
        console.error('Error fetching upload tokens:', error.message);
        throw new Error(`Failed to fetch upload tokens: ${error.message}`);
    }
}