import sql from 'mssql';
import { getPool } from '../utils/db.js';

// --- 泙 RESTORED: ADD NEW MACHINERY (Original Full Logic) ---
export const assignNewMachinery = async (shipId, machineryTypeKey, quantity, user) => {
    const pool = await getPool();
    
    // Step 1: Get prefix
    const typeResult = await pool.request()
        .input('MachineryTypeKey', sql.VarChar, machineryTypeKey)
        .query('SELECT TypicalNamePrefix FROM MEMP_MachineryTypes WHERE MachineryTypeKey = @MachineryTypeKey');
    
    if (typeResult.recordset.length === 0) {
        throw new Error('Invalid Machinery Type Key provided.');
    }
    const namePrefix = typeResult.recordset[0].TypicalNamePrefix;

    // Step 2: Get max instance
    const maxInstanceResult = await pool.request()
        .input('ShipID', sql.Int, shipId)
        .input('MachineryTypeKey', sql.VarChar, machineryTypeKey)
        .query(`
            SELECT ISNULL(MAX(InstanceNumber), 0) as maxInstance 
            FROM MEMP_ShipMachinery 
            WHERE ShipID = @ShipID AND MachineryTypeKey = @MachineryTypeKey
        `);
    
    const startInstance = maxInstanceResult.recordset[0].maxInstance;

    // Step 3: Transaction insert
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        for (let i = 1; i <= quantity; i++) {
            const request = new sql.Request(transaction);
            const newInstanceNumber = startInstance + i;
            const machineryName = `${namePrefix} #${newInstanceNumber}`;
            
            await request
                .input('ShipID', sql.Int, shipId)
                .input('MachineryTypeKey', sql.VarChar, machineryTypeKey)
                .input('CustomMachineryName', sql.NVarChar, machineryName)
                .input('InstanceNumber', sql.Int, newInstanceNumber)
                .input('UserName', sql.NVarChar, user)
                .query(`
                    INSERT INTO MEMP_ShipMachinery 
                        (ShipID, MachineryTypeKey, CustomMachineryName, InstanceNumber, IsActive, CreatedDate, ModifiedDate, CreatedBy, ModifiedBy)
                    VALUES 
                        (@ShipID, @MachineryTypeKey, @CustomMachineryName, @InstanceNumber, 1, GETDATE(), GETDATE(), @UserName, @UserName);
                `);
        }
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        console.error("Error in assignNewMachinery transaction:", err);
        throw err;
    }
};

// --- VIEW & EDIT FUNCTIONS ---
export const fetchFuelTypes = async () => {
    const pool = await getPool();
    const result = await pool.request().query('SELECT FuelTypeKey, FuelTypeDescription FROM MEMP_FuelTypes WHERE IsActive = 1 ORDER BY FuelTypeDescription');
    return result.recordset;
};

export const fetchMachineryTypes = async () => {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM MEMP_MachineryTypes WHERE IsActive = 1 ORDER BY Description');
    return result.recordset;
};

// 泙 INTEGRATED: Filter logic (Fuel OR Electrical)
export const fetchMachineryForShip = async (shipId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('ShipID', sql.Int, shipId)
        .query(`
            SELECT 
                sm.MachineryRecordID, sm.MachineryTypeKey, sm.CustomMachineryName, sm.PowerKW, sm.Manufacturer, sm.Model, 
                sm.SerialNumber, 
                -- sm.SFOC_g_kWh, -- 🟢 Commented if still failing
                -- sm.PrimaryFuelTypeKey, -- 🟢 Commented if still failing
                -- sm.SecondaryFuelTypeKey, -- 🟢 Commented if still failing
                -- sm.InstallDate, -- 🟢 Commented if still failing
                mt.Description as MachineryTypeDescription,
                fuel1.FuelTypeDescription as PrimaryFuel,
                fuel2.FuelTypeDescription as SecondaryFuel
            FROM MEMP_ShipMachinery sm
            JOIN MEMP_MachineryTypes mt ON sm.MachineryTypeKey = mt.MachineryTypeKey
            LEFT JOIN MEMP_FuelTypes fuel1 ON sm.PrimaryFuelTypeKey = fuel1.FuelTypeKey
            LEFT JOIN MEMP_FuelTypes fuel2 ON sm.SecondaryFuelTypeKey = fuel2.FuelTypeKey
            WHERE sm.ShipID = @ShipID 
              AND sm.IsActive = 1
              AND (mt.Fuel_Consumption = 1 OR mt.Electrical_Consumption = 1)
            ORDER BY mt.Description, sm.CustomMachineryName;
        `);
    return result.recordset;
};

// 泙 RESTORED: Original Update Function
export const updateExistingMachinery = async (machineryRecordId, machineryData, user) => {
    const { 
        CustomMachineryName, PowerKW, Manufacturer, Model, SFOC_g_kWh, 
        PrimaryFuelTypeKey, SecondaryFuelTypeKey, InstallDate 
    } = machineryData;
    const powerKWValue = (PowerKW === '' || PowerKW === null) ? null : parseFloat(PowerKW);
    const sfocValue = (SFOC_g_kWh === '' || SFOC_g_kWh === null) ? null : parseFloat(SFOC_g_kWh);
    const installDateValue = InstallDate || null;
    const pool = await getPool();
    await pool.request()
        .input('MachineryRecordID', sql.Int, machineryRecordId)
        .input('CustomMachineryName', sql.NVarChar, CustomMachineryName)
        .input('PowerKW', sql.Decimal(18, 2), powerKWValue)
        .input('Manufacturer', sql.NVarChar, Manufacturer || null)
        .input('Model', sql.NVarChar, Model || null)
        .input('SFOC_g_kWh', sql.Decimal(10, 2), sfocValue)
        .input('PrimaryFuelTypeKey', sql.VarChar, PrimaryFuelTypeKey || null)
        .input('SecondaryFuelTypeKey', sql.VarChar, SecondaryFuelTypeKey || null)
        .input('InstallDate', sql.Date, installDateValue)
        .input('UserName', sql.NVarChar, user)
        .query(`
            UPDATE MEMP_ShipMachinery SET
                CustomMachineryName = @CustomMachineryName, PowerKW = @PowerKW, Manufacturer = @Manufacturer,
                Model = @Model, SFOC_g_kWh = @SFOC_g_kWh, PrimaryFuelTypeKey = @PrimaryFuelTypeKey,
                SecondaryFuelTypeKey = @SecondaryFuelTypeKey, InstallDate = @InstallDate,
                ModifiedDate = GETDATE(), ModifiedBy = @UserName
            WHERE MachineryRecordID = @MachineryRecordID;
        `);
};

export const setMachineryInactive = async (machineryRecordId, user) => {
    const pool = await getPool();
    await pool.request()
        .input('MachineryRecordID', sql.Int, machineryRecordId)
        .input('UserName', sql.NVarChar, user)
        .query(`
            UPDATE MEMP_ShipMachinery
            SET IsActive = 0, ModifiedDate = GETDATE(), ModifiedBy = @UserName
            WHERE MachineryRecordID = @MachineryRecordID;
        `);
};

export const fetchFuelConsumers = async (shipId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('ShipID', sql.Int, shipId)
        .query(`
            SELECT a.MachineryRecordID, a.CustomMachineryName 
            FROM MEMP_ShipMachinery a
            INNER JOIN MEMP_MachineryTypes b ON a.MachineryTypeKey = b.MachineryTypeKey
            WHERE b.Fuel_Consumption = 1 
            AND a.ShipID = @ShipID
            AND a.IsActive = 1
            ORDER BY a.CustomMachineryName
        `);
    return result.recordset;
};

// 泙 INTEGRATED: Fetch UI Flags (Power, Rpm, Fuel)
export const fetchMachineryById = async (machineryRecordId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('MachineryRecordID', sql.Int, machineryRecordId)
        .query(`
            SELECT 
                sm.MachineryRecordID, sm.ShipID, sm.MachineryTypeKey, sm.CustomMachineryName, 
                sm.PowerKW, sm.Manufacturer, sm.Model, sm.SerialNumber, sm.SFOC_g_kWh, 
                sm.PrimaryFuelTypeKey, sm.SecondaryFuelTypeKey, sm.InstallDate, sm.CreatedDate, sm.CreatedBy,
                mt.Description as MachineryTypeDescription,
                
                -- Flags needed for Frontend Logic
                mt.Fuel_Consumption,
                mt.Power,
                mt.Rpm,
                mt.Electrical_Consumption,

                fuel1.FuelTypeDescription as PrimaryFuel,
                fuel2.FuelTypeDescription as SecondaryFuel
            FROM MEMP_ShipMachinery sm
            LEFT JOIN MEMP_MachineryTypes mt ON sm.MachineryTypeKey = mt.MachineryTypeKey
            LEFT JOIN MEMP_FuelTypes fuel1 ON sm.PrimaryFuelTypeKey = fuel1.FuelTypeKey
            LEFT JOIN MEMP_FuelTypes fuel2 ON sm.SecondaryFuelTypeKey = fuel2.FuelTypeKey
            WHERE sm.MachineryRecordID = @MachineryRecordID
        `);
    return result.recordset[0];
};

/*
// 泙 INTEGRATED: Analytics with Emissions & 5 Graphs + BDN Stats
export const getMachineryAnalytics = async (machineryRecordId, fromDate, toDate) => {
    try {
        const pool = await getPool();
        
        const infoRequest = await pool.request()
            .input('id', sql.Int, machineryRecordId)
            .query('SELECT CustomMachineryName, ShipID FROM MEMP_ShipMachinery WHERE MachineryRecordID = @id');
            
        if (!infoRequest.recordset.length) {
            return { powerStats: {}, fuelStats: [], auditData: [], pieData: [], fuelTrend: [], bdnData: [] };
        }
        
        const { CustomMachineryName, ShipID } = infoRequest.recordset[0];

        // Ensure dates are valid strings
        const safeFromDate = fromDate || '1970-01-01';
        const safeToDate = toDate ? (toDate.includes('T') ? toDate : `${toDate} 23:59:59`) : '2099-12-31 23:59:59';

        const setupRequest = () => pool.request()
            .input('shipId', sql.Int, ShipID)
            .input('name', sql.NVarChar, CustomMachineryName)
            .input('fromDate', sql.DateTime2, safeFromDate)
            .input('toDate', sql.DateTime2, safeToDate);

        // 1. Power
        const powerQuery = `
            WITH Machinery_Status AS (
                SELECT a.Power, a.Running_Hrs
                FROM MEMP_ReportMachineryData a
                INNER JOIN MEMP_VesselDailyReports b ON a.ReportID = b.ReportID
                WHERE a.ShipID = @shipId AND LTRIM(RTRIM(a.MachineryName)) = LTRIM(RTRIM(@name)) AND b.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
            )
            SELECT 
                SUM(TRY_CAST(REPLACE(CAST(Power AS VARCHAR), ',', '') AS DECIMAL(18,2)))       AS Total_Power,
                AVG(TRY_CAST(REPLACE(CAST(Power AS VARCHAR), ',', '') AS DECIMAL(18,2)))       AS Avg_Power,
                SUM(TRY_CAST(REPLACE(CAST(Running_Hrs AS VARCHAR), ',', '') AS DECIMAL(18,2))) AS Running_Hrs
            FROM Machinery_Status;
        `;
        
        // 2. Fuel & Emissions (Card Aggregate)
        const fuelQuery = `
            WITH Fuel_Consumption AS (
                SELECT b.FuelTypeKey, b.ConsumedMT
                FROM MEMP_VesselDailyReports a
                INNER JOIN MEMP_DailyFuelConsumption b ON a.ReportID = b.ReportID
                WHERE a.ShipID = @shipId AND LTRIM(RTRIM(b.MachineryName)) = LTRIM(RTRIM(@name)) AND a.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
            ),
            Fuel_Agg AS (
                SELECT FuelTypeKey, SUM(TRY_CAST(REPLACE(CAST(ConsumedMT AS VARCHAR), ',', '') AS DECIMAL(18,6))) AS Fuel_Consumed_MT
                FROM Fuel_Consumption GROUP BY FuelTypeKey
            )
            SELECT 
                fa.FuelTypeKey,
                fa.Fuel_Consumed_MT as Fuel_Consumed,
                ISNULL(ROUND(fa.Fuel_Consumed_MT * ft.CO2ConversionFactor, 3), 0) AS CO2_MT,
                ISNULL(ROUND(fa.Fuel_Consumed_MT * ft.CH4ConversionFactor, 6), 0) AS CH4_MT,
                ISNULL(ROUND(fa.Fuel_Consumed_MT * ft.N2OConversionFactor, 6), 0) AS N2O_MT,
                ISNULL(ROUND((fa.Fuel_Consumed_MT * ft.CO2ConversionFactor) + (fa.Fuel_Consumed_MT * ft.CH4ConversionFactor * 28) + (fa.Fuel_Consumed_MT * ft.N2OConversionFactor * 265), 3), 0) AS Total_GHG_CO2e_MT
            FROM Fuel_Agg fa
            INNER JOIN MEMP_FuelTypes ft ON fa.FuelTypeKey = ft.FuelTypeKey;
        `;

        // 3. Audit Data (Table with Emissions)
        const auditQuery = `
            WITH Row_Data AS (
                SELECT 
                    fc.ReportID, fc.MachineryName,
                    STRING_AGG(fc.FuelTypeKey, ', ') AS FuelTypes,
                    SUM(fc.ConsumedMT) AS TotalFuelConsumed,
                    SUM(fc.ConsumedMT * ft.CO2ConversionFactor) AS Row_CO2,
                    SUM(fc.ConsumedMT * ft.CH4ConversionFactor) AS Row_CH4,
                    SUM(fc.ConsumedMT * ft.N2OConversionFactor) AS Row_N2O,
                    SUM((fc.ConsumedMT * ft.CO2ConversionFactor) + (fc.ConsumedMT * ft.CH4ConversionFactor * 28) + (fc.ConsumedMT * ft.N2OConversionFactor * 265)) AS Row_GHG
                FROM MEMP_DailyFuelConsumption fc
                JOIN MEMP_FuelTypes ft ON fc.FuelTypeKey = ft.FuelTypeKey
                WHERE LTRIM(RTRIM(fc.MachineryName)) = LTRIM(RTRIM(@name))
                GROUP BY fc.ReportID, fc.MachineryName
            )
            SELECT 
                b.ReportDateTimeLocal as ReportDate, 
                a.MachineryName, a.Power, a.RPM, a.Running_Hrs, a.ConsumedByDescription as Purpose,
                ISNULL(rd.FuelTypes, '-') as Fuel_Type,
                ISNULL(rd.TotalFuelConsumed, 0) as Fuel_Consumed_MT,
                ISNULL(rd.Row_CO2, 0) as CO2_Emissions,
                ISNULL(rd.Row_CH4, 0) as CH4_Emissions,
                ISNULL(rd.Row_N2O, 0) as N2O_Emissions,
                ISNULL(rd.Row_GHG, 0) as Total_GHG
            FROM MEMP_ReportMachineryData a
            INNER JOIN MEMP_VesselDailyReports b ON a.ReportID = b.ReportID
            LEFT JOIN Row_Data rd ON a.ReportID = rd.ReportID AND LTRIM(RTRIM(a.MachineryName)) = LTRIM(RTRIM(rd.MachineryName))
            WHERE a.ShipID = @shipId AND LTRIM(RTRIM(a.MachineryName)) = LTRIM(RTRIM(@name)) AND b.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
            ORDER BY b.ReportDateTimeLocal DESC
        `;

        // 4. Pie Chart Data (Usage by Purpose)
        const pieQuery = `
            WITH Machinery_Status AS (
                SELECT a.ConsumedByDescription, a.ReportID
                FROM MEMP_ReportMachineryData a
                INNER JOIN MEMP_VesselDailyReports b ON a.ReportID = b.ReportID
                WHERE a.ShipID = @shipId AND LTRIM(RTRIM(a.MachineryName)) = LTRIM(RTRIM(@name)) AND b.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
            )
            SELECT 
                ISNULL(ConsumedByDescription, 'Unknown') as name,
                COUNT(ReportID) as value
            FROM Machinery_Status
            GROUP BY ConsumedByDescription;
        `;

        // 5. Fuel Trend Data
        const fuelTrendQuery = `
            SELECT 
                CAST(b.ReportDateTimeLocal AS DATE) as ReportDate,
                d.FuelTypeKey,
                SUM(d.ConsumedMT) as Consumed
            FROM MEMP_VesselDailyReports b
            JOIN MEMP_DailyFuelConsumption d ON b.ReportID = d.ReportID
            WHERE b.ShipID = @shipId
              AND LTRIM(RTRIM(d.MachineryName)) = LTRIM(RTRIM(@name))
              AND b.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
            GROUP BY CAST(b.ReportDateTimeLocal AS DATE), d.FuelTypeKey
            ORDER BY ReportDate;
        `;

        // 6. BDN Usage Stats (NEW)
        const bdnQuery = `
            SELECT 
                d.BDN_Number,
                d.FuelTypeKey,
                SUM(d.ConsumedMT) as Bunker_Consumption
            FROM MEMP_VesselDailyReports b
            JOIN MEMP_DailyFuelConsumption d ON b.ReportID = d.ReportID
            WHERE b.ShipID = @shipId
              AND LTRIM(RTRIM(d.MachineryName)) = LTRIM(RTRIM(@name))
              AND b.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
            GROUP BY d.BDN_Number, d.FuelTypeKey
            ORDER BY d.FuelTypeKey, d.BDN_Number;
        `;

        const [powerResult, fuelResult, auditResult, pieResult, fuelTrendResult, bdnResult] = await Promise.all([
            setupRequest().query(powerQuery),
            setupRequest().query(fuelQuery),
            setupRequest().query(auditQuery),
            setupRequest().query(pieQuery),
            setupRequest().query(fuelTrendQuery),
            setupRequest().query(bdnQuery)
        ]);

        return {
            powerStats: powerResult.recordset[0] || {},
            fuelStats: fuelResult.recordset || [],
            auditData: auditResult.recordset || [],
            pieData: pieResult.recordset || [],
            fuelTrend: fuelTrendResult.recordset || [],
            bdnData: bdnResult.recordset || [] // New Data
        };

    } catch (err) {
        console.error("SQL Error in getMachineryAnalytics:", err);
        throw err; 
    }
};
*/

// 泙 INTEGRATED: Analytics with Emissions & 5 Graphs + BDN Stats + Voyage Filter
export const getMachineryAnalytics = async (machineryRecordId, fromDate, toDate, voyageNum) => {
    try {
        const pool = await getPool();
        
        const infoRequest = await pool.request()
            .input('id', sql.Int, machineryRecordId)
            .query('SELECT CustomMachineryName, ShipID FROM MEMP_ShipMachinery WHERE MachineryRecordID = @id');
            
        if (!infoRequest.recordset.length) {
            return { powerStats: {}, fuelStats: [], auditData: [], pieData: [], fuelTrend: [], bdnData: [] };
        }
        
        const { CustomMachineryName, ShipID } = infoRequest.recordset[0];

        const safeFromDate = fromDate || '1970-01-01';
        const safeToDate = toDate ? (toDate.includes('T') ? toDate : `${toDate} 23:59:59`) : '2099-12-31 23:59:59';

        // 🟢 FIX: Handle 'voyageNum' to ensure it is 'null' if not provided, preventing SQL driver crash
        const setupRequest = () => pool.request()
            .input('shipId', sql.Int, ShipID)
            .input('name', sql.NVarChar, CustomMachineryName)
            .input('fromDate', sql.DateTime2, safeFromDate)
            .input('toDate', sql.DateTime2, safeToDate)
            .input('voyage', sql.NVarChar, voyageNum || null);

        // 1. Power Query
        const powerQuery = `
            WITH Machinery_Status AS (
                SELECT a.Power, a.Running_Hrs
                FROM MEMP_ReportMachineryData a
                INNER JOIN MEMP_VesselDailyReports b ON a.ReportID = b.ReportID
                WHERE a.ShipID = @shipId 
                  AND LTRIM(RTRIM(a.MachineryName)) = LTRIM(RTRIM(@name)) 
                  AND b.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
                  AND (@voyage IS NULL OR b.VoyageNumber = @voyage)
            )
            SELECT 
                SUM(TRY_CAST(REPLACE(CAST(Power AS VARCHAR), ',', '') AS DECIMAL(18,2)))       AS Total_Power,
                AVG(TRY_CAST(REPLACE(CAST(Power AS VARCHAR), ',', '') AS DECIMAL(18,2)))       AS Avg_Power,
                SUM(TRY_CAST(REPLACE(CAST(Running_Hrs AS VARCHAR), ',', '') AS DECIMAL(18,2))) AS Running_Hrs
            FROM Machinery_Status;
        `;
        
        // 2. Fuel Query
        const fuelQuery = `
            WITH Fuel_Consumption AS (
                SELECT b.FuelTypeKey, b.ConsumedMT
                FROM MEMP_VesselDailyReports a
                INNER JOIN MEMP_DailyFuelConsumption b ON a.ReportID = b.ReportID
                WHERE a.ShipID = @shipId 
                  AND LTRIM(RTRIM(b.MachineryName)) = LTRIM(RTRIM(@name)) 
                  AND a.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
                  AND (@voyage IS NULL OR a.VoyageNumber = @voyage)
            ),
            Fuel_Agg AS (
                SELECT FuelTypeKey, SUM(TRY_CAST(REPLACE(CAST(ConsumedMT AS VARCHAR), ',', '') AS DECIMAL(18,6))) AS Fuel_Consumed_MT
                FROM Fuel_Consumption GROUP BY FuelTypeKey
            )
            SELECT 
                fa.FuelTypeKey,
                fa.Fuel_Consumed_MT as Fuel_Consumed,
                ISNULL(ROUND(fa.Fuel_Consumed_MT * ft.CO2ConversionFactor, 3), 0) AS CO2_MT,
                ISNULL(ROUND(fa.Fuel_Consumed_MT * ft.CH4ConversionFactor, 6), 0) AS CH4_MT,
                ISNULL(ROUND(fa.Fuel_Consumed_MT * ft.N2OConversionFactor, 6), 0) AS N2O_MT,
                ISNULL(ROUND((fa.Fuel_Consumed_MT * ft.CO2ConversionFactor) + (fa.Fuel_Consumed_MT * ft.CH4ConversionFactor * 28) + (fa.Fuel_Consumed_MT * ft.N2OConversionFactor * 265), 3), 0) AS Total_GHG_CO2e_MT
            FROM Fuel_Agg fa
            INNER JOIN MEMP_FuelTypes ft ON fa.FuelTypeKey = ft.FuelTypeKey;
        `;

        // 3. Audit Data Query
        const auditQuery = `
            WITH Row_Data AS (
                SELECT 
                    fc.ReportID, fc.MachineryName,
                    STRING_AGG(fc.FuelTypeKey, ', ') AS FuelTypes,
                    SUM(fc.ConsumedMT) AS TotalFuelConsumed,
                    SUM(fc.ConsumedMT * ft.CO2ConversionFactor) AS Row_CO2,
                    SUM(fc.ConsumedMT * ft.CH4ConversionFactor) AS Row_CH4,
                    SUM(fc.ConsumedMT * ft.N2OConversionFactor) AS Row_N2O,
                    SUM((fc.ConsumedMT * ft.CO2ConversionFactor) + (fc.ConsumedMT * ft.CH4ConversionFactor * 28) + (fc.ConsumedMT * ft.N2OConversionFactor * 265)) AS Row_GHG
                FROM MEMP_DailyFuelConsumption fc
                JOIN MEMP_FuelTypes ft ON fc.FuelTypeKey = ft.FuelTypeKey
                WHERE LTRIM(RTRIM(fc.MachineryName)) = LTRIM(RTRIM(@name))
                GROUP BY fc.ReportID, fc.MachineryName
            )
            SELECT 
                b.ReportDateTimeLocal as ReportDate, 
                a.MachineryName, a.Power, a.RPM, a.Running_Hrs, a.ConsumedByDescription as Purpose,
                ISNULL(rd.FuelTypes, '-') as Fuel_Type,
                ISNULL(rd.TotalFuelConsumed, 0) as Fuel_Consumed_MT,
                ISNULL(rd.Row_CO2, 0) as CO2_Emissions,
                ISNULL(rd.Row_CH4, 0) as CH4_Emissions,
                ISNULL(rd.Row_N2O, 0) as N2O_Emissions,
                ISNULL(rd.Row_GHG, 0) as Total_GHG
            FROM MEMP_ReportMachineryData a
            INNER JOIN MEMP_VesselDailyReports b ON a.ReportID = b.ReportID
            LEFT JOIN Row_Data rd ON a.ReportID = rd.ReportID AND LTRIM(RTRIM(a.MachineryName)) = LTRIM(RTRIM(rd.MachineryName))
            WHERE a.ShipID = @shipId 
              AND LTRIM(RTRIM(a.MachineryName)) = LTRIM(RTRIM(@name)) 
              AND b.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
              AND (@voyage IS NULL OR b.VoyageNumber = @voyage)
            ORDER BY b.ReportDateTimeLocal DESC
        `;

        // 4. Pie Chart Query
        const pieQuery = `
            WITH Machinery_Status AS (
                SELECT a.ConsumedByDescription, a.ReportID
                FROM MEMP_ReportMachineryData a
                INNER JOIN MEMP_VesselDailyReports b ON a.ReportID = b.ReportID
                WHERE a.ShipID = @shipId 
                  AND LTRIM(RTRIM(a.MachineryName)) = LTRIM(RTRIM(@name)) 
                  AND b.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
                  AND (@voyage IS NULL OR b.VoyageNumber = @voyage)
            )
            SELECT 
                ISNULL(ConsumedByDescription, 'Unknown') as name,
                COUNT(ReportID) as value
            FROM Machinery_Status
            GROUP BY ConsumedByDescription;
        `;

        // 5. Fuel Trend Query
        const fuelTrendQuery = `
            SELECT 
                CAST(b.ReportDateTimeLocal AS DATE) as ReportDate,
                d.FuelTypeKey,
                SUM(d.ConsumedMT) as Consumed
            FROM MEMP_VesselDailyReports b
            JOIN MEMP_DailyFuelConsumption d ON b.ReportID = d.ReportID
            WHERE b.ShipID = @shipId
              AND LTRIM(RTRIM(d.MachineryName)) = LTRIM(RTRIM(@name))
              AND b.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
              AND (@voyage IS NULL OR b.VoyageNumber = @voyage)
            GROUP BY CAST(b.ReportDateTimeLocal AS DATE), d.FuelTypeKey
            ORDER BY ReportDate;
        `;

        // 6. BDN Query
        const bdnQuery = `
            SELECT 
                d.BDN_Number,
                d.FuelTypeKey,
                SUM(d.ConsumedMT) as Bunker_Consumption
            FROM MEMP_VesselDailyReports b
            JOIN MEMP_DailyFuelConsumption d ON b.ReportID = d.ReportID
            WHERE b.ShipID = @shipId
              AND LTRIM(RTRIM(d.MachineryName)) = LTRIM(RTRIM(@name))
              AND b.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
              AND (@voyage IS NULL OR b.VoyageNumber = @voyage)
            GROUP BY d.BDN_Number, d.FuelTypeKey
            ORDER BY d.FuelTypeKey, d.BDN_Number;
        `;

        const [powerResult, fuelResult, auditResult, pieResult, fuelTrendResult, bdnResult] = await Promise.all([
            setupRequest().query(powerQuery),
            setupRequest().query(fuelQuery),
            setupRequest().query(auditQuery),
            setupRequest().query(pieQuery),
            setupRequest().query(fuelTrendQuery),
            setupRequest().query(bdnQuery)
        ]);

        return {
            powerStats: powerResult.recordset[0] || {},
            fuelStats: fuelResult.recordset || [],
            auditData: auditResult.recordset || [],
            pieData: pieResult.recordset || [],
            fuelTrend: fuelTrendResult.recordset || [],
            bdnData: bdnResult.recordset || [] 
        };

    } catch (err) {
        console.error("SQL Error in getMachineryAnalytics:", err);
        throw err; 
    }
};

export const fetchPeriodSummary = async (shipId, fromDate, toDate) => {
    const pool = await getPool();
    
    // Summary of fuel consumption across all machinery for the period
    const fuelCons = await pool.request()
        .input('shipId', sql.Int, shipId)
        .input('fromDate', sql.DateTime2, fromDate)
        .input('toDate', sql.DateTime2, `${toDate} 23:59:59`)
        .query(`
            SELECT FuelTypeKey, SUM(ConsumedMT) as ConsumedMT
            FROM MEMP_DailyFuelConsumption fc
            JOIN MEMP_VesselDailyReports vdr ON fc.ReportID = vdr.ReportID
            WHERE vdr.ShipID = @shipId AND vdr.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
            GROUP BY FuelTypeKey
        `);

    // Summary of running hours for all machinery for the period
    const machData = await pool.request()
        .input('shipId', sql.Int, shipId)
        .input('fromDate', sql.DateTime2, fromDate)
        .input('toDate', sql.DateTime2, `${toDate} 23:59:59`)
        .query(`
            SELECT MachineryName, SUM(Running_Hrs) as RunningHours
            FROM MEMP_ReportMachineryData rmd
            JOIN MEMP_VesselDailyReports vdr ON rmd.ReportID = vdr.ReportID
            WHERE vdr.ShipID = @shipId AND vdr.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
            GROUP BY MachineryName
        `);

    return {
        fuelConsumptions: fuelCons.recordset,
        machineryData: machData.recordset
    };
};

// 🟢 NEW: SFOC Analytics (Uses your SQL Logic)
export const fetchSFOCAnalytics = async (machineryRecordId, fromDate, toDate) => {
    try {
        const pool = await getPool();

        // 1. Get ShipID and MachineryName for the requested ID
        const infoRequest = await pool.request()
            .input('id', sql.Int, machineryRecordId)
            .query('SELECT CustomMachineryName, ShipID FROM MEMP_ShipMachinery WHERE MachineryRecordID = @id');

        if (!infoRequest.recordset.length) return [];
        const { CustomMachineryName, ShipID } = infoRequest.recordset[0];

        // 2. Handle Dates
        const safeFromDate = fromDate || '1970-01-01';
        const safeToDate = toDate ? (toDate.includes('T') ? toDate : `${toDate} 23:59:59`) : '2099-12-31 23:59:59';

        // 3. Execute Your SQL Script
        const result = await pool.request()
            .input('ShipID', sql.Int, ShipID)
            .input('MachineryName', sql.NVarChar, CustomMachineryName)
            .input('fromDate', sql.DateTime2, safeFromDate)
            .input('toDate', sql.DateTime2, safeToDate)
            .query(`
                SELECT 
                    a.ShipID, 
                    a.ReportID, 
                    a.ReportDateTimeLocal as ReportDate, 
                    b.MachineryName, 
                    CAST(b.Power as INT) as Power, 
                    b.Running_Hrs, 
                    a.VoyageNumber,
                    c.ConsumedMT as [Fuel Consumption], 
                    c.FuelTypeKey, 
                    c.BDN_Number,
                    CAST(((c.ConsumedMT * 1000000) / (b.Power * b.Running_Hrs)) as INT) as SFOC
                FROM 
                    MEMP_VesselDailyReports a, 
                    MEMP_ReportMachineryData b, 
                    MEMP_DailyFuelConsumption c
                WHERE 
                    a.ReportID = b.ReportID
                    AND a.ShipID = b.ShipID
                    AND b.ShipID = c.ShipID
                    AND c.ReportID = b.ReportID
                    
                    -- 🟢 Filters for Specific Machinery & Date
                    AND a.ShipID = @ShipID
                    AND LTRIM(RTRIM(b.MachineryName)) = LTRIM(RTRIM(@MachineryName))
                    AND LTRIM(RTRIM(c.MachineryName)) = LTRIM(RTRIM(@MachineryName)) -- Links fuel to specific engine
                    AND a.ReportDateTimeLocal BETWEEN @fromDate AND @toDate
                    
                    -- 🟢 Your Logic Checks
                    AND b.MachineryTypeKey IN ('MAIN_ENGINE', 'DIESEL_GENERATOR')
                    AND b.Power > 0 
                    AND b.Running_Hrs > 0 
                    AND c.ConsumedMT > 0
                    
                ORDER BY a.ReportDateTimeLocal -- Ordered by Date so the Graph line is correct
            `);

        return result.recordset;

    } catch (err) {
        console.error("SQL Error in fetchSFOCAnalytics:", err);
        throw err;
    }
};

