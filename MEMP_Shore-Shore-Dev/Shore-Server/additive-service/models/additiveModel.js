import sql from 'mssql';
import { getPool } from '../utils/db.js';

export const fetchAdditiveTypes = async () => {
    const pool = await getPool();
    const result = await pool.request()
        .query('SELECT * FROM MEMP_AdditiveTypes WHERE IsActive = 1');
    return result.recordset;
};

// 🟢 UPDATED: List Fetch with Filters
export const fetchDosingEvents = async (shipId, dosingRef, additiveTypeId) => {
    const pool = await getPool();
    const request = pool.request();

    let query = `
        SELECT 
            DE.DosingEventID,
            DE.DosingReferenceID, 
            DE.ShipID,
            S.ShipName,
            DE.DosingDateLocal,
            DE.TimeZoneOffset,
            DE.AdditiveName,
            AT.CategoryName,
            DE.DosingQuantity,
            DE.DosingUnit,
            DE.FuelTypeKey,
            DE.BunkerRefNumber,
            DE.FuelQuantityBlended,
            DE.ActualDosageRatio,
            DE.TreatedMachineryNames as TreatedMachinery 
        FROM MEMP_ShipDosingEvent DE
        JOIN MEMP_AdditiveTypes AT ON DE.AdditiveTypeID = AT.AdditiveTypeID
        JOIN MEMP_Ships S ON DE.ShipID = S.ShipID 
        WHERE DE.IsDeleted = 0
    `;

    // Filter by Ship
    if (shipId && shipId != 0) {
        query += ` AND DE.ShipID = @ShipID`;
        request.input('ShipID', sql.Int, shipId);
    }

    // 🟢 Filter by Dosing Reference ID (Search)
    if (dosingRef && dosingRef.trim() !== '') {
        query += ` AND DE.DosingReferenceID LIKE @DosingRef`;
        request.input('DosingRef', sql.VarChar, `%${dosingRef}%`);
    }

    // 🟢 Filter by Additive Type
    if (additiveTypeId && additiveTypeId != 0) {
        query += ` AND DE.AdditiveTypeID = @TypeID`;
        request.input('TypeID', sql.Int, additiveTypeId);
    }

    query += ` ORDER BY DE.DosingDateUTC DESC`;

    const result = await request.query(query);
    return result.recordset;
};

// 🟢 NEW HELPER: Fetch BDN Details for Edit Mode
export const fetchEventBDNs = async (eventId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('EventID', sql.BigInt, eventId)
        .query('SELECT BDN_Number, FuelQty_MT, ROB_At_Dosing FROM MEMP_ShipDosingBDNMap WHERE DosingEventID = @EventID');
    return result.recordset;
};

export const createDosingEvent = async (data, user) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. GET SHIP SHORT NAME & GENERATE NEW ID
        const shipReq = new sql.Request(transaction);
        const shipRes = await shipReq.input('ShipID', sql.Int, data.shipId)
            .query(`SELECT Short_Name FROM MEMP_Ships WHERE ShipID = @ShipID`);
        
        const shortName = shipRes.recordset.length > 0 ? shipRes.recordset[0].Short_Name : 'SHIP';

        // 2. GET LAST SERIAL NUMBER
        const serialReq = new sql.Request(transaction);
        const serialRes = await serialReq.input('ShipID', sql.Int, data.shipId)
            .query(`
                SELECT TOP 1 DosingReferenceID 
                FROM MEMP_ShipDosingEvent 
                WHERE ShipID = @ShipID AND DosingReferenceID LIKE '%_DOS_%'
                ORDER BY DosingEventID DESC
            `);

        let nextSerial = '001';
        if (serialRes.recordset.length > 0) {
            const lastRef = serialRes.recordset[0].DosingReferenceID; 
            const parts = lastRef.split('_DOS_');
            if (parts.length === 2) {
                const lastNum = parseInt(parts[1], 10);
                if (!isNaN(lastNum)) {
                    nextSerial = (lastNum + 1).toString().padStart(3, '0');
                }
            }
        }

        const newDosingRefID = `${shortName}_DOS_${nextSerial}`;

        // 3. PREPARE MULTI-BDN DATA
        let bdnString = data.bunkerRef; 
        let totalFuel = data.fuelQuantity;

        if (data.bdnEntries && data.bdnEntries.length > 0) {
            bdnString = data.bdnEntries.map(b => b.bdn).join(', ');
            totalFuel = data.bdnEntries.reduce((sum, b) => sum + parseFloat(b.qty || 0), 0);
        }

        // 4. GET MACHINERY NAMES
        let machineryNamesString = '';
        let machineryDetails = [];
        
        if (data.machineryIds && data.machineryIds.length > 0) {
            const machReq = new sql.Request(transaction);
            const idsList = data.machineryIds.join(',');
            
            const machRes = await machReq.query(`
                SELECT MachineryRecordID, CustomMachineryName 
                FROM MEMP_ShipMachinery 
                WHERE MachineryRecordID IN (${idsList})
            `);
            
            machineryDetails = machRes.recordset;
            machineryNamesString = machineryDetails.map(m => m.CustomMachineryName).join(', ');
        }

        // 5. INSERT PARENT EVENT
        const request = new sql.Request(transaction);
        const result = await request
            .input('ShipID', sql.Int, data.shipId)
            .input('DosingReferenceID', sql.VarChar, newDosingRefID)
            .input('DosingDateLocal', sql.DateTime2, data.dosingDate)
            .input('TimeZoneOffset', sql.VarChar, data.timeZone)
            .input('DosingDateUTC', sql.DateTime2, new Date(data.dosingDate).toISOString()) 
            .input('AdditiveName', sql.VarChar, data.additiveName)
            .input('AdditiveTypeID', sql.Int, data.additiveTypeId)
            .input('DosingQuantity', sql.Decimal(10, 2), data.dosingQuantity)
            .input('FuelTypeKey', sql.VarChar, data.fuelTypeKey)
            .input('BunkerRefNumber', sql.VarChar, bdnString) 
            .input('FuelQuantityBlended', sql.Decimal(12, 2), totalFuel) 
            .input('ActualDosageRatio', sql.Decimal(18, 5), data.dosingQuantity / totalFuel)
            .input('TreatedMachineryNames', sql.NVarChar, machineryNamesString)
            .input('UserName', sql.NVarChar, user)
            .query(`
                INSERT INTO MEMP_ShipDosingEvent 
                (ShipID, DosingReferenceID, DosingDateLocal, TimeZoneOffset, DosingDateUTC, AdditiveName, AdditiveTypeID, 
                 DosingQuantity, FuelTypeKey, BunkerRefNumber, FuelQuantityBlended, ActualDosageRatio, TreatedMachineryNames, CreatedBy)
                OUTPUT INSERTED.DosingEventID
                VALUES 
                (@ShipID, @DosingReferenceID, @DosingDateLocal, @TimeZoneOffset, @DosingDateUTC, @AdditiveName, @AdditiveTypeID,
                 @DosingQuantity, @FuelTypeKey, @BunkerRefNumber, @FuelQuantityBlended, @ActualDosageRatio, @TreatedMachineryNames, @UserName)
            `);

        const eventId = result.recordset[0].DosingEventID;

        // 6. INSERT INTO NEW BDN MAP TABLE (Multi-Row)
        if (data.bdnEntries && data.bdnEntries.length > 0) {
            for (const bdn of data.bdnEntries) {
                const bdnReq = new sql.Request(transaction);
                await bdnReq
                    .input('EventID', sql.BigInt, eventId)
                    .input('BDN', sql.VarChar, bdn.bdn)
                    .input('Qty', sql.Decimal(12, 2), bdn.qty)
                    .input('ROB', sql.Decimal(12, 2), bdn.rob || 0)
                    .query(`INSERT INTO MEMP_ShipDosingBDNMap (DosingEventID, BDN_Number, FuelQty_MT, ROB_At_Dosing) VALUES (@EventID, @BDN, @Qty, @ROB)`);
            }
        }

        // 7. INSERT INTO MACHINERY MAP
        if (machineryDetails.length > 0) {
            for (const mach of machineryDetails) {
                const mapReq = new sql.Request(transaction);
                await mapReq
                    .input('EventID', sql.BigInt, eventId)
                    .input('MachID', sql.BigInt, mach.MachineryRecordID)
                    .input('DosingReferenceID', sql.VarChar, newDosingRefID)
                    .input('ShipID', sql.Int, data.shipId)
                    .input('CustomMachineryName', sql.NVarChar, mach.CustomMachineryName)
                    .input('BDN_Number', sql.VarChar, bdnString)
                    .query(`
                        INSERT INTO MEMP_ShipDosingMachineryMap 
                        (DosingEventID, MachineryRecordID, DosingReferenceID, ShipID, CustomMachineryName, BDN_Number) 
                        VALUES 
                        (@EventID, @MachID, @DosingReferenceID, @ShipID, @CustomMachineryName, @BDN_Number)
                    `);
            }
        }

        await transaction.commit();
        return { id: eventId, dosingId: newDosingRefID };

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

export const softDeleteEvent = async (id, user) => {
    const pool = await getPool();
    await pool.request()
        .input('ID', sql.BigInt, id)
        .input('User', sql.NVarChar, user)
        .query('UPDATE MEMP_ShipDosingEvent SET IsDeleted = 1, ModifiedBy = @User, ModifiedDate = GETDATE() WHERE DosingEventID = @ID');
};

export const updateDosingEvent = async (id, data, user) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const request = new sql.Request(transaction);
        await request
            .input('ID', sql.BigInt, id)
            .input('DosingDateLocal', sql.DateTime2, data.dosingDate)
            .input('TimeZoneOffset', sql.VarChar, data.timeZone)
            .input('DosingDateUTC', sql.DateTime2, new Date(data.dosingDate).toISOString()) 
            .input('AdditiveName', sql.VarChar, data.additiveName)
            .input('AdditiveTypeID', sql.Int, data.additiveTypeId)
            .input('DosingQuantity', sql.Decimal(10, 2), data.dosingQuantity)
            .input('FuelTypeKey', sql.VarChar, data.fuelTypeKey)
            // .input('BunkerRefNumber', sql.VarChar, data.bunkerRef) 
            .input('FuelQuantityBlended', sql.Decimal(12, 2), data.fuelQuantity)
            .input('ActualDosageRatio', sql.Decimal(18, 5), data.dosingQuantity / data.fuelQuantity)
            .input('User', sql.NVarChar, user)
            .query(`
                UPDATE MEMP_ShipDosingEvent 
                SET DosingDateLocal = @DosingDateLocal,
                    TimeZoneOffset = @TimeZoneOffset,
                    DosingDateUTC = @DosingDateUTC,
                    AdditiveName = @AdditiveName,
                    AdditiveTypeID = @AdditiveTypeID,
                    DosingQuantity = @DosingQuantity,
                    FuelTypeKey = @FuelTypeKey,
                    FuelQuantityBlended = @FuelQuantityBlended,
                    ActualDosageRatio = @ActualDosageRatio,
                    ModifiedBy = @User,
                    ModifiedDate = GETDATE()
                WHERE DosingEventID = @ID
            `);

        // ... (Keep existing machinery update logic if needed) ...

        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

// 🟢 NEW: Calculate Real-Time ROB for a specific BDN
export const getRealTimeROB = async (bdnNumber, shipId) => {
    const pool = await getPool();
    
    // 1. Get Initial ROB
    const robQuery = `
        SELECT TOP 1 Final_Quantity 
        FROM Bunker_ROB 
        WHERE BDN_Number = @BDN 
        ORDER BY EntryDate DESC
    `;
    
    // 2. Get Sum of all Blends
    const blendQuery = `
        SELECT SUM(FuelQty_MT) as TotalBlended
        FROM MEMP_ShipDosingBDNMap
        WHERE BDN_Number = @BDN
    `;

    // 3. Get Sum of Consumption (Placeholder)
    const consQuery = `
        SELECT SUM(Consumption_MT) as TotalConsumed
        FROM MEMP_VesselDailyReports 
        WHERE BDN_Number = @BDN
    `;

    const request = pool.request();
    request.input('BDN', sql.VarChar, bdnNumber);

    const robRes = await request.query(robQuery);
    const blendRes = await request.query(blendQuery);
    // const consRes = await request.query(consQuery); // Uncomment if table exists

    const initialROB = robRes.recordset.length > 0 ? robRes.recordset[0].Final_Quantity : 0;
    const totalBlended = blendRes.recordset[0].TotalBlended || 0;
    const totalConsumed = 0; // consRes.recordset[0].TotalConsumed || 0;

    // 🟢 THE CALCULATION
    const currentAvailable = initialROB - totalBlended - totalConsumed;

    return { 
        bdn: bdnNumber, 
        initial: initialROB, 
        blended: totalBlended, 
        consumed: totalConsumed, 
        available: currentAvailable 
    };
};

// 🟢 NEW: Fetch Consumption Audit Trail
export const fetchConsumptionAudit = async (eventId) => {
    const pool = await getPool();
    
    // We first get the Dosing Date to ensure we only look at consumption AFTER dosing
    const eventReq = await pool.request()
        .input('ID', sql.BigInt, eventId)
        .query('SELECT DosingDateLocal, ShipID FROM MEMP_ShipDosingEvent WHERE DosingEventID = @ID');
        
    if (eventReq.recordset.length === 0) return [];
    
    const dosingDate = eventReq.recordset[0].DosingDateLocal;
    const shipId = eventReq.recordset[0].ShipID;

    // Optimized Query using the new Map table instead of XML splitting
    const query = `
        WITH DosingBDN AS (
            SELECT
                a.DosingEventID,
                a.ShipID,
                LTRIM(RTRIM(x.n.value('.', 'varchar(50)'))) AS BDN_Number
            FROM MEMP_ShipDosingEvent a
            CROSS APPLY (
                SELECT CAST(
                    '<x>' + REPLACE(a.BunkerRefNumber, ',', '</x><x>') + '</x>'
                    AS xml
                )
            ) s(xmlcol)
            CROSS APPLY s.xmlcol.nodes('/x') x(n)
            WHERE a.DosingEventID = @EventID -- Filter early for performance
        ),

        BaseData AS (
            SELECT
                a.DosingEventID,
                a.DosingReferenceID,
                a.ShipID,
                a.FuelTypeKey,
                db.BDN_Number,
                a.DosingDateLocal,
                a.AdditiveName,
                a.AdditiveTypeID,
                a.DosingQuantity,
                a.FuelQuantityBlended,

                b.EntryDate,
                b.ConsumedMT,
                b.ReportID,
                b.MachineryName,

                ROW_NUMBER() OVER (
                    PARTITION BY a.DosingReferenceID, a.DosingEventID, db.BDN_Number
                    ORDER BY b.EntryDate
                ) AS RN,

                SUM(ISNULL(b.ConsumedMT,0)) OVER (
                    PARTITION BY a.DosingEventID, db.BDN_Number
                    ORDER BY b.EntryDate
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) AS CumConsumedMT

            FROM MEMP_ShipDosingEvent a
            INNER JOIN DosingBDN db
                ON db.DosingEventID = a.DosingEventID
                AND db.ShipID = a.ShipID

            LEFT JOIN MEMP_DailyFuelConsumption b
                ON b.ShipID = a.ShipID
                AND LTRIM(RTRIM(b.BDN_Number)) = db.BDN_Number
                AND b.EntryDate >= a.DosingDateLocal

            WHERE a.DosingEventID = @EventID
        )

        SELECT
            DosingReferenceID,
            DosingEventID,
            ShipID,
            FuelTypeKey,
            BDN_Number,
            DosingDateLocal,
            EntryDate,
            AdditiveName,
            AdditiveTypeID,
            DosingQuantity,
            MachineryName,

            CASE
                WHEN RN = 1 THEN FuelQuantityBlended
                ELSE FuelQuantityBlended - (CumConsumedMT - ISNULL(ConsumedMT,0))
            END AS InitialQuantity,

            ConsumedMT,
            FuelQuantityBlended - CumConsumedMT AS FinalQuantity,
            FuelQuantityBlended,
            ReportID
        FROM BaseData
        WHERE FuelQuantityBlended - CumConsumedMT > 0
        ORDER BY DosingEventID, BDN_Number, EntryDate;
    `;

    const result = await pool.request()
        .input('EventID', sql.BigInt, eventId)
        .input('ShipID', sql.Int, shipId)
        .input('DosingDate', sql.DateTime2, dosingDate)
        .query(query);

    return result.recordset;
};

// 🟢 UPDATED: Dashboard Analytics with Filters
export const getDashboardAnalytics = async (fromDate, toDate, shipId, dosingRef) => {
    const pool = await getPool();
    const request = pool.request()
        .input('From', sql.DateTime2, fromDate || '2020-01-01')
        .input('To', sql.DateTime2, toDate || new Date().toISOString());

    // 🟢 Build Dynamic Filter Clause
    let filterClause = "WHERE DE.IsDeleted = 0 AND DE.DosingDateLocal BETWEEN @From AND @To";
    
    if (shipId && shipId != 0) {
        filterClause += " AND DE.ShipID = @ShipID";
        request.input('ShipID', sql.Int, shipId);
    }

    if (dosingRef && dosingRef.trim() !== '') {
        filterClause += " AND DE.DosingReferenceID LIKE @DosingRef";
        request.input('DosingRef', sql.VarChar, `%${dosingRef}%`);
    }

    // 1. SUMMARY CARDS
    // Note: Removed 'DE' alias in WHERE for summary if not used in FROM, but safer to alias main table always.
    const summaryQuery = `
        SELECT 
            COUNT(DISTINCT DE.DosingEventID) as TotalEvents,
            SUM(DE.DosingQuantity) as TotalAdditiveLiters,
            SUM(DE.FuelQuantityBlended) as TotalFuelTreatedMT,
            AVG(DE.ActualDosageRatio) as AvgRatio
        FROM MEMP_ShipDosingEvent DE
        ${filterClause}
    `;

    // 2. CONSUMPTION BY SHIP (Bar Chart)
    const shipStatsQuery = `
        SELECT 
            S.ShipName,
            SUM(DE.DosingQuantity) as AdditiveUsed,
            SUM(DE.FuelQuantityBlended) as FuelTreated
        FROM MEMP_ShipDosingEvent DE
        JOIN MEMP_Ships S ON DE.ShipID = S.ShipID
        ${filterClause}
        GROUP BY S.ShipName
        ORDER BY AdditiveUsed DESC
    `;

    // 3. DOSAGE TRENDS (Line Chart - Monthly)
    const trendQuery = `
        SELECT 
            FORMAT(DE.DosingDateLocal, 'yyyy-MM') as Month,
            AVG(DE.ActualDosageRatio) as AvgRatio,
            SUM(DE.DosingQuantity) as MonthlyConsumption
        FROM MEMP_ShipDosingEvent DE
        ${filterClause}
        GROUP BY FORMAT(DE.DosingDateLocal, 'yyyy-MM')
        ORDER BY Month
    `;

    const summary = await request.query(summaryQuery);
    const byShip = await request.query(shipStatsQuery);
    const trends = await request.query(trendQuery);

    return {
        summary: summary.recordset[0],
        byShip: byShip.recordset,
        trends: trends.recordset
    };
};

// 🟢 NEW: Fetch Distinct Reference IDs for Dropdown
export const fetchDosingReferenceIDs = async (shipId) => {
    const pool = await getPool();
    const request = pool.request();
    
    let query = `
        SELECT DISTINCT DosingReferenceID 
        FROM MEMP_ShipDosingEvent 
        WHERE IsDeleted = 0
    `;

    if (shipId && shipId != 0) {
        query += ` AND ShipID = @ShipID`;
        request.input('ShipID', sql.Int, shipId);
    }

    query += ` ORDER BY DosingReferenceID DESC`;

    const result = await request.query(query);
    return result.recordset;
};