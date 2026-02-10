// File: viswa-digital-backend/bunker-service/models/bunkerModel.js
import sql from 'mssql';
import { getPool } from '../utils/db.js';

// --- Helper function to update the Running On Board (ROB) for Fuel ---
export const updateFuelROB = async (transaction, bunkerDetails, finalQuantity) => {
    // FIXED: Fetch the Initial Quantity strictly from the LAST entry in MEMP_DailyROB
    // This ensures the chain (Previous Final -> New Initial) is never broken.
    const lastROBResult = await transaction.request()
        .input('ShipID', sql.Int, bunkerDetails.ShipID)
        .input('FuelTypeKey', sql.VarChar(50), bunkerDetails.FuelTypeKey)
        .query(`
            SELECT TOP 1 Final_Quantity
            FROM [dbo].[MEMP_DailyROB] WITH (NOLOCK)
            WHERE ShipID = @ShipID AND FuelTypeKey = @FuelTypeKey
            ORDER BY EntryDate DESC, CreatedDate DESC;
        `);
    
    const initialQuantity = lastROBResult.recordset[0]?.Final_Quantity || 0;
    const bunkeredQuantity = parseFloat(bunkerDetails.Bunkered_Quantity) || 0;
    
    // Note: 'finalQuantity' is passed from the main function where it was calculated as (initial + bunkered)
    // We rely on the calculation passed in, but strictly use the DB's last Final for the Initial here.

    await transaction.request()
        .input('ShipID', sql.Int, bunkerDetails.ShipID)
        .input('EntryDate', sql.NVarChar(50), bunkerDetails.BunkerDate)
        .input('FuelTypeKey', sql.VarChar(50), bunkerDetails.FuelTypeKey)
        .input('Bunkered_Quantity', sql.Decimal(10, 3), bunkeredQuantity)
        .input('Consumed_Quantity', sql.Decimal(10, 3), 0)
        .input('Initial_Quantity', sql.Decimal(10, 3), initialQuantity)
        .input('Final_Quantity', sql.Decimal(10, 3), finalQuantity)
        .input('entry_mode', sql.VarChar(50), bunkerDetails.OperationType)
        .query(`
            INSERT INTO [dbo].[MEMP_DailyROB] (ShipID, EntryDate, FuelTypeKey, Bunkered_Quantity, Consumed_Quantity, Initial_Quantity, Final_Quantity, entry_mode, CreatedDate, ModifiedDate)
            VALUES (@ShipID, CONVERT(DATETIME, REPLACE(@EntryDate, 'T', ' ')), @FuelTypeKey, @Bunkered_Quantity, @Consumed_Quantity, @Initial_Quantity, @Final_Quantity, @entry_mode, GETDATE(), GETDATE());
        `);
};

// --- Helper function to update the Running On Board (ROB) for Lube Oil ---
export const updateLubeOilROB = async (transaction, bunkerDetails, finalQuantity) => {
    // FIXED: Fetch the Initial Quantity strictly from the LAST entry in MEMP_ReportLOROB
    const lastROBResult = await transaction.request()
        .input('ShipID', sql.Int, bunkerDetails.ShipID)
        .input('LubeOilTypeKey', sql.VarChar(50), bunkerDetails.LubeOilTypeKey)
        .query(`
            SELECT TOP 1 Final_Quantity
            FROM [dbo].[MEMP_ReportLOROB] WITH (NOLOCK)
            WHERE ShipID = @ShipID AND LubeOilTypeKey = @LubeOilTypeKey
            ORDER BY EntryDate DESC, CreatedDate DESC;
        `);

    const initialQuantity = lastROBResult.recordset[0]?.Final_Quantity || 0;
    const bunkeredQuantity = parseFloat(bunkerDetails.Bunkered_Quantity) || 0;

    await transaction.request()
        .input('ShipID', sql.Int, bunkerDetails.ShipID)
        .input('EntryDate', sql.NVarChar(50), bunkerDetails.BunkerDate)
        .input('LubeOilTypeKey', sql.VarChar(50), bunkerDetails.LubeOilTypeKey)
        .input('Bunkered_Quantity', sql.Decimal(10, 3), bunkeredQuantity)
        .input('Consumed_Quantity', sql.Decimal(10, 3), 0)
        .input('Initial_Quantity', sql.Decimal(10, 3), initialQuantity)
        .input('Final_Quantity', sql.Decimal(10, 3), finalQuantity)
        .input('entry_mode', sql.VarChar(50), bunkerDetails.OperationType)
        .query(`
            INSERT INTO [dbo].[MEMP_ReportLOROB] (ShipID, EntryDate, LubeOilTypeKey, Bunkered_Quantity, Consumed_Quantity, Initial_Quantity, Final_Quantity, entry_mode, CreatedDate, ModifiedDate)
            VALUES (@ShipID, CONVERT(DATETIME, REPLACE(@EntryDate, 'T', ' ')), @LubeOilTypeKey, @Bunkered_Quantity, @Consumed_Quantity, @Initial_Quantity, @Final_Quantity, @entry_mode, GETDATE(), GETDATE());
        `);
};

export const fetchAllBunkers = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT
            bd.BunkerRecordID,
            bd.BunkerDate,
            bd.BDN_Number,
            bd.OperationType,
            s.ShipName,
            s.IMO_Number,
            sp.PortName AS BunkerPortName,
            ft.FuelTypeDescription,
            lot.LubeOilTypeDescription,
            bd.Bunkered_Quantity,
            bd.BunkerCategory,
            bd.IsActive,
            bd.VoyageLegID,
            vl.LegName
        FROM dbo.MEMP_BunkeringData AS bd WITH (NOLOCK)
        INNER JOIN dbo.MEMP_Ships AS s WITH (NOLOCK) ON bd.ShipID = s.ShipID
        LEFT JOIN dbo.MEMP_VoyageLegs AS vl WITH (NOLOCK) ON bd.VoyageLegID = vl.VoyageLegID
        LEFT JOIN dbo.MEMP_SeaPorts AS sp WITH (NOLOCK) ON bd.BunkerPortCode = sp.PortCode
        LEFT JOIN dbo.MEMP_FuelTypes AS ft WITH (NOLOCK) ON bd.FuelTypeKey = ft.FuelTypeKey
        LEFT JOIN dbo.MEMP_LubeOilTypes AS lot WITH (NOLOCK) ON bd.LubeOilTypeKey = lot.LubeOilTypeKey
        ORDER BY bd.BunkerDate DESC;
    `);
    return result.recordset;
};

export const fetchBunkersByVesselId = async (vesselId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('ShipID', sql.Int, vesselId)
        .query(`
            SELECT
                bd.BunkerRecordID,
                bd.BunkerDate,
                bd.BDN_Number,
                s.ShipName,
                s.IMO_Number,
                sp.PortName AS BunkerPortName,
                ft.FuelTypeDescription,
                lot.LubeOilTypeDescription,
                bd.Bunkered_Quantity,
                bd.OperationType,
                bd.BunkerCategory,
                bd.IsActive,
                bd.VoyageLegID,
                vl.LegName
            FROM dbo.MEMP_BunkeringData AS bd WITH (NOLOCK)
            INNER JOIN dbo.MEMP_Ships AS s WITH (NOLOCK)ON bd.ShipID = s.ShipID
            LEFT JOIN dbo.MEMP_VoyageLegs AS vl WITH (NOLOCK) ON bd.VoyageLegID = vl.VoyageLegID
            LEFT JOIN dbo.MEMP_SeaPorts AS sp WITH (NOLOCK) ON  bd.BunkerPortCode = sp.PortCode
            LEFT JOIN dbo.MEMP_FuelTypes AS ft WITH (NOLOCK) ON  bd.FuelTypeKey = ft.FuelTypeKey
            LEFT JOIN dbo.MEMP_LubeOilTypes AS lot WITH (NOLOCK) ON  bd.LubeOilTypeKey = lot.LubeOilTypeKey
            WHERE bd.ShipID = @ShipID
            ORDER BY bd.BunkerDate DESC;
        `);
    return result.recordset;
};

export const fetchBunkerDetailsById = async (bunkerRecordId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('BunkerRecordID', sql.BigInt, bunkerRecordId)
        .query(`
            SELECT
                bd.BunkerRecordID, bd.ShipID, s.ShipName, s.IMO_Number, bd.VoyageID, v.VoyageNumber, bd.VoyageLegID, vl.LegName,
                bd.BunkerPortCode, sp.PortName AS BunkerPortName, bd.BunkerDate, bd.BDN_Number,
                bd.FuelTypeKey, ft.FuelTypeDescription, bd.LubeOilTypeKey, lot.LubeOilTypeDescription,
                bd.Bunkered_Quantity, bd.DensityAt15C, bd.SulphurContentPercent, bd.FlashPointC,
                bd.ViscosityAt50C_cSt, bd.WaterContentPercent, bd.LCV, bd.TemperatureC, bd.PressureBar,
                bd.SupplierName, bd.BargeName, bd.MARPOLSampleSealNumber, bd.BDN_DeclarationReceived,
                bd.Initial_Quantity_MT, bd.Final_Quantity_MT, bd.OperationType, bd.BunkerCategory,
                bd.Initial_Volume_M3, bd.Final_Volume_M3, bd.Bunkered_Volume_M3, bd.Remarks,
                bd.CreatedDate, bd.CreatedBy, bd.ModifiedDate, bd.ModifiedBy, bd.IsActive
            FROM dbo.MEMP_BunkeringData AS bd WITH (NOLOCK)
            INNER JOIN dbo.MEMP_Ships AS s WITH (NOLOCK) ON bd.ShipID = s.ShipID
            LEFT JOIN dbo.MEMP_Voyages AS v WITH (NOLOCK) ON bd.VoyageID = v.VoyageID
            LEFT JOIN dbo.MEMP_VoyageLegs AS vl WITH (NOLOCK) ON bd.VoyageLegID = vl.VoyageLegID
            LEFT JOIN dbo.MEMP_SeaPorts AS sp WITH (NOLOCK) ON bd.BunkerPortCode = sp.PortCode
            LEFT JOIN dbo.MEMP_FuelTypes AS ft WITH (NOLOCK) ON bd.FuelTypeKey = ft.FuelTypeKey
            LEFT JOIN dbo.MEMP_LubeOilTypes AS lot WITH (NOLOCK) ON bd.LubeOilTypeKey = lot.LubeOilTypeKey
            WHERE bd.BunkerRecordID = @BunkerRecordID;
        `);

    const bunkerData = result.recordset[0];
    if (bunkerData) {
        bunkerData.TankAllocations = [];
    }
    return bunkerData;
};

// FIXED: fetchLastROB now queries the Daily/Report tables to find the "Real Value" of the vessel's ROB.
export const fetchLastROB = async (shipId, bunkerCategory, itemTypeKey) => {
    const pool = await getPool();
    if (!shipId || !itemTypeKey) {
        return 0;
    }

    let tableName = '';
    let typeColumn = '';
    
    if (bunkerCategory === 'FUEL') {
        tableName = '[dbo].[MEMP_DailyROB]';
        typeColumn = 'FuelTypeKey';
    } else if (bunkerCategory === 'LUBE_OIL') {
        tableName = '[dbo].[MEMP_ReportLOROB]';
        typeColumn = 'LubeOilTypeKey';
    } else {
        return 0;
    }

    const query = `
        SELECT TOP 1 Final_Quantity
        FROM ${tableName} 
        WHERE ShipID = @ShipID AND ${typeColumn} = @ItemTypeKey
        ORDER BY EntryDate DESC, CreatedDate DESC;
    `;

    const result = await pool.request()
        .input('ShipID', sql.Int, shipId)
        .input('ItemTypeKey', sql.VarChar(50), itemTypeKey)
        .query(query);

    return result.recordset[0]?.Final_Quantity || 0;
};

// NEW: Helper function to fetch the last ROB for a specific BDN from Bunker_ROB table
export const fetchLastROBByBdn = async (bdnNumber) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('BDN_Number', sql.NVarChar(100), bdnNumber)
        .query(`
            SELECT TOP 1 Final_Quantity
            FROM [dbo].[Bunker_ROB] WITH (NOLOCK)
            WHERE BDN_Number = @BDN_Number
            ORDER BY EntryDate DESC, CreatedDate DESC;
        `);
    return result.recordset[0]?.Final_Quantity || 0;
};

export const fetchVoyageLegsByVoyageId = async (voyageId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('VoyageID', sql.BigInt, voyageId)
        .query(`
            SELECT
                VoyageLegID,
                LegNumber,
                LegName,
                DeparturePortCode,
                ArrivalPortCode
            FROM dbo.MEMP_VoyageLegs WITH (NOLOCK)
            WHERE VoyageID = @VoyageID AND IsActive = 1
            ORDER BY LegNumber ASC;
        `);
    return result.recordset;
};

export const fetchVesselShortName = async (shipId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('ShipID', sql.Int, shipId)
        .query(`
            SELECT TOP 1 Short_Name
            FROM dbo.MEMP_Ships WITH (NOLOCK)
            WHERE ShipID = @ShipID;
        `);
    return result.recordset[0]?.Short_Name;
};

export const fetchNextBdnNumber = async (shipId) => {
    const pool = await getPool();
    const shortName = await fetchVesselShortName(shipId);

    if (!shortName) {
        return null;
    }

    const prefix = `${shortName}-BK-`;
    
    const latestBdnResult = await pool.request()
        .input('Prefix', sql.NVarChar(50), `${prefix}%`)
        .query(`
            SELECT TOP 1 BDN_Number
            FROM dbo.MEMP_BunkeringData WITH (NOLOCK)
            WHERE BDN_Number LIKE @Prefix
            ORDER BY BDN_Number DESC;
        `);
    
    let nextNumber = 1;

    if (latestBdnResult.recordset.length > 0) {
        const lastBdn = latestBdnResult.recordset[0].BDN_Number;
        const parts = lastBdn.split('-');
        const lastNumber = parseInt(parts[parts.length - 1], 10);
        
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }

    const formattedNumber = String(nextNumber).padStart(3, '0');
    
    return `${prefix}${formattedNumber}`;
};

export const insertBunker = async (bunkerData) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    let newBunkerRecordId;

    try {
        await transaction.begin();

        const { TankAllocations, CorrectionSign, VoyageLegID, ...bunkerDetails } = bunkerData;

        // --- 1. Calculate Cumulative Totals (For Daily ROB / Audit Logs) ---
        // We fetch the current ROB from the Daily Tables to ensure continuity
        let vesselCurrentROB = 0;
        if (bunkerDetails.BunkerCategory === 'FUEL') {
            vesselCurrentROB = await fetchLastROB(bunkerDetails.ShipID, bunkerDetails.BunkerCategory, bunkerDetails.FuelTypeKey);
        } else if (bunkerDetails.BunkerCategory === 'LUBE_OIL') {
            vesselCurrentROB = await fetchLastROB(bunkerDetails.ShipID, bunkerDetails.BunkerCategory, bunkerDetails.LubeOilTypeKey);
        }

        const bunkeredQuantity = parseFloat(bunkerDetails.Bunkered_Quantity) || 0;
        
        // Calculate the NEW Total Vessel ROB (Cumulative) for Daily ROB tables
        let vesselTotalFinal;
        if (['BUNKER', 'LO_TOPUP', 'INITIAL_FILL'].includes(bunkerDetails.OperationType)) {
            vesselTotalFinal = vesselCurrentROB + bunkeredQuantity;
        } else if (bunkerDetails.OperationType === 'DEBUNKER') {
            vesselTotalFinal = vesselCurrentROB - bunkeredQuantity;
        } else if (bunkerDetails.OperationType === 'CORRECTION') {
            vesselTotalFinal = CorrectionSign === '+' ? vesselCurrentROB + bunkeredQuantity : vesselCurrentROB - bunkeredQuantity;
        } else {
            vesselTotalFinal = vesselCurrentROB;
        }

        // --- 2. Define Bunker Record Values (For MEMP_BunkeringData) ---
        // Logic: Initial should be 0, Final should be Bunkered Quantity (Batch View)
        let bunkerRecordInitial = 0;
        let bunkerRecordFinal = 0;

        if (['BUNKER', 'LO_TOPUP', 'INITIAL_FILL'].includes(bunkerDetails.OperationType)) {
            bunkerRecordInitial = 0;
            bunkerRecordFinal = bunkeredQuantity;
        } else {
            bunkerRecordInitial = 0;
            bunkerRecordFinal = bunkeredQuantity;
        }

        const request = transaction.request();
        const result = await request
            .input('ShipID', sql.Int, bunkerDetails.ShipID)
            .input('VoyageID', sql.BigInt, bunkerDetails.VoyageID || null)
            .input('VoyageLegID', sql.BigInt, VoyageLegID || null)
            .input('BunkerPortCode', sql.VarChar(50), bunkerDetails.BunkerPortCode || null)
            .input('BunkerDate', sql.NVarChar(50), bunkerDetails.BunkerDate)
            .input('BDN_Number', sql.NVarChar(100), bunkerDetails.BDN_Number || null)
            .input('FuelTypeKey', sql.VarChar(50), bunkerDetails.FuelTypeKey || null)
            .input('LubeOilTypeKey', sql.VarChar(50), bunkerDetails.LubeOilTypeKey || null)
            .input('Bunkered_Quantity', sql.Decimal(10, 3), bunkeredQuantity)
            .input('DensityAt15C', sql.Decimal(10, 4), parseFloat(bunkerDetails.DensityAt15C) || null)
            .input('SulphurContentPercent', sql.Decimal(7, 4), bunkerDetails.BunkerCategory === 'FUEL' ? (parseFloat(bunkerDetails.SulphurContentPercent) || null) : null)
            .input('FlashPointC', sql.Decimal(5, 1), parseFloat(bunkerDetails.FlashPointC) || null)
            .input('ViscosityAt50C_cSt', sql.Decimal(8, 2), parseFloat(bunkerDetails.ViscosityAt50C_cSt) || null)
            .input('WaterContentPercent', sql.Decimal(6, 4), parseFloat(bunkerDetails.WaterContentPercent) || null)
            .input('LCV', sql.Decimal(10, 3), bunkerDetails.BunkerCategory === 'FUEL' ? (parseFloat(bunkerDetails.LCV) || null) : null)
            .input('TemperatureC', sql.Decimal(5, 1), parseFloat(bunkerDetails.TemperatureC) || null)
            .input('PressureBar', sql.Decimal(8, 3), parseFloat(bunkerDetails.PressureBar) || null)
            .input('SupplierName', sql.NVarChar(255), bunkerDetails.SupplierName || null)
            .input('BargeName', sql.NVarChar(255), bunkerDetails.BargeName || null)
            .input('MARPOLSampleSealNumber', sql.NVarChar(100), bunkerDetails.MARPOLSampleSealNumber || null)
            .input('BDN_DeclarationReceived', sql.Bit, bunkerDetails.BDN_DeclarationReceived ? 1 : 0)
            
            // Using Batch Logic (0 -> Bunkered) for MEMP_BunkeringData
            .input('Initial_Quantity_MT', sql.Decimal(10, 3), bunkerRecordInitial)
            .input('Final_Quantity_MT', sql.Decimal(10, 3), bunkerRecordFinal)
            
            .input('OperationType', sql.VarChar(50), bunkerDetails.OperationType || null)
            .input('BunkerCategory', sql.VarChar(20), bunkerDetails.BunkerCategory)
            .input('Initial_Volume_M3', sql.Decimal(12, 3), parseFloat(bunkerDetails.Initial_Volume_M3) || null)
            .input('Final_Volume_M3', sql.Decimal(12, 3), parseFloat(bunkerDetails.Final_Volume_M3) || null)
            .input('Bunkered_Volume_M3', sql.Decimal(12, 3), parseFloat(bunkerDetails.Bunkered_Volume_M3) || null)
            .input('Remarks', sql.NVarChar(sql.MAX), bunkerDetails.Remarks || null)
            .input('IsActive', sql.TinyInt, bunkerDetails.IsActive ? 1 : 0)
            .query(`
                INSERT INTO MEMP_BunkeringData (
                    ShipID, VoyageID, VoyageLegID, BunkerPortCode, BunkerDate, BDN_Number, FuelTypeKey, LubeOilTypeKey, BunkerCategory,
                    Bunkered_Quantity, DensityAt15C, SulphurContentPercent, FlashPointC, ViscosityAt50C_cSt, WaterContentPercent, LCV, TemperatureC, PressureBar,
                    SupplierName, BargeName, MARPOLSampleSealNumber, BDN_DeclarationReceived,
                    Initial_Quantity_MT, Final_Quantity_MT, OperationType, Initial_Volume_M3, Final_Volume_M3,
                    Bunkered_Volume_M3, Remarks, IsActive, CreatedDate, ModifiedDate
                )
                OUTPUT inserted.BunkerRecordID
                VALUES (
                    @ShipID, @VoyageID, @VoyageLegID, @BunkerPortCode, CONVERT(DATETIME, REPLACE(@BunkerDate, 'T', ' ')), @BDN_Number, @FuelTypeKey, @LubeOilTypeKey, @BunkerCategory,
                    @Bunkered_Quantity, @DensityAt15C, @SulphurContentPercent, @FlashPointC, @ViscosityAt50C_cSt, @WaterContentPercent, @LCV, @TemperatureC, @PressureBar,
                    @SupplierName, @BargeName, @MARPOLSampleSealNumber, @BDN_DeclarationReceived,
                    @Initial_Quantity_MT, @Final_Quantity_MT, @OperationType, @Initial_Volume_M3, @Final_Volume_M3,
                    @Bunkered_Volume_M3, @Remarks, @IsActive, GETDATE(), GETDATE()
                );
            `);

        newBunkerRecordId = result.recordset[0].BunkerRecordID;

        // --- 3. Update Daily ROB Audit (Uses CUMULATIVE Totals from Daily Tables) ---
        if (bunkerDetails.BunkerCategory === 'FUEL') {
            await updateFuelROB(transaction, bunkerDetails, vesselTotalFinal);
        } else if (bunkerDetails.BunkerCategory === 'LUBE_OIL') {
            await updateLubeOilROB(transaction, bunkerDetails, vesselTotalFinal);
        }

        // --- 4. Update Bunker_ROB Table (Uses Batch Logic: 0 -> Bunkered) ---
        let initialQuantityForROB;
        let finalQuantityForROB;

        if (bunkerDetails.OperationType === 'BUNKER' || bunkerDetails.OperationType === 'LO_TOPUP' || bunkerDetails.OperationType === 'INITIAL_FILL') {
            initialQuantityForROB = 0;
            finalQuantityForROB = bunkeredQuantity;
        } else if (bunkerDetails.OperationType === 'DEBUNKER' || bunkerDetails.OperationType === 'CORRECTION') {
            const lastROB = await fetchLastROBByBdn(bunkerDetails.BDN_Number);
            initialQuantityForROB = lastROB;
            if (bunkerDetails.OperationType === 'DEBUNKER') {
                finalQuantityForROB = initialQuantityForROB - bunkeredQuantity;
            } else { // CORRECTION
                finalQuantityForROB = CorrectionSign === '+' ? initialQuantityForROB + bunkeredQuantity : initialQuantityForROB - bunkeredQuantity;
            }
        } else {
            initialQuantityForROB = 0;
            finalQuantityForROB = 0;
        }

        await transaction.request()
            .input('ShipID', sql.Int, bunkerDetails.ShipID)
            .input('EntryDate', sql.NVarChar(50), bunkerDetails.BunkerDate)
            .input('BDN_Number', sql.NVarChar(100), bunkerDetails.BDN_Number || null)
            .input('ItemTypeKey', sql.VarChar(50), bunkerDetails.FuelTypeKey || bunkerDetails.LubeOilTypeKey)
            .input('Bunkered_Quantity', sql.Decimal(10, 3), bunkeredQuantity)
            .input('Consumed_Quantity', sql.Decimal(10, 3), 0)
            .input('Initial_Quantity', sql.Decimal(10, 3), initialQuantityForROB)
            .input('Final_Quantity', sql.Decimal(10, 3), finalQuantityForROB)
            .input('ItemCategory', sql.NVarChar(20), bunkerDetails.BunkerCategory)
            .query(`
                INSERT INTO [dbo].[Bunker_ROB] (ShipID, EntryDate, BDN_Number, ItemTypeKey, Bunkered_Quantity, Consumed_Quantity, Initial_Quantity, Final_Quantity, ItemCategory)
                VALUES (@ShipID, CONVERT(DATETIME, REPLACE(@EntryDate, 'T', ' ')), @BDN_Number, @ItemTypeKey, @Bunkered_Quantity, @Consumed_Quantity, @Initial_Quantity, @Final_Quantity, @ItemCategory);
            `);


        await transaction.commit();
        return newBunkerRecordId;

    } catch (err) {
        console.error("Error caught in insertBunker model:", err);
        if (transaction && transaction.state === sql.Transaction.BEGUN) {
            await transaction.rollback();
            console.warn("Transaction rolled back due to error.");
        }
        throw err;
    }
};

export const updateBunker = async (bunkerRecordId, bunkerData) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();

        const { TankAllocations, CorrectionSign, VoyageLegID, ...bunkerDetails } = bunkerData;

        let finalQuantity = parseFloat(bunkerDetails.Final_Quantity_MT);
        let initialQuantity = parseFloat(bunkerDetails.Initial_Quantity_MT);
        const bunkeredQuantity = parseFloat(bunkerDetails.Bunkered_Quantity);
        
        let setClause = `
            ShipID = @ShipID, VoyageID = @VoyageID, VoyageLegID = @VoyageLegID, BunkerPortCode = @BunkerPortCode, BunkerDate = CONVERT(DATETIME, REPLACE(@BunkerDate, 'T', ' ')),
            BDN_Number = @BDN_Number,
            BunkerCategory = @BunkerCategory, Bunkered_Quantity = @Bunkered_Quantity, DensityAt15C = @DensityAt15C,
            SulphurContentPercent = @SulphurContentPercent, FlashPointC = @FlashPointC,
            ViscosityAt50C_cSt = @ViscosityAt50C_cSt, WaterContentPercent = @WaterContentPercent, LCV = @LCV,
            TemperatureC = @TemperatureC, PressureBar = @PressureBar, SupplierName = @SupplierName,
            BargeName = @BargeName, MARPOLSampleSealNumber = @MARPOLSampleSealNumber,
            BDN_DeclarationReceived = @BDN_DeclarationReceived, Initial_Quantity_MT = @Initial_Quantity_MT,
            Final_Quantity_MT = @Final_Quantity_MT, OperationType = @OperationType,
            Initial_Volume_M3 = @Initial_Volume_M3, Final_Volume_M3 = @Final_Volume_M3,
            Bunkered_Volume_M3 = @Bunkered_Volume_M3, Remarks = @Remarks, IsActive = @IsActive,
            ModifiedDate = GETDATE()
        `;

        if (bunkerDetails.BunkerCategory === 'FUEL') {
            setClause += `, FuelTypeKey = @FuelTypeKey, LubeOilTypeKey = NULL`;
        } else if (bunkerDetails.BunkerCategory === 'LUBE_OIL') {
            setClause += `, LubeOilTypeKey = @LubeOilTypeKey, FuelTypeKey = NULL`;
        }

        const query = `UPDATE MEMP_BunkeringData SET ${setClause} WHERE BunkerRecordID = @BunkerRecordID;`;

        const request = transaction.request()
            .input('BunkerRecordID', sql.BigInt, bunkerRecordId)
            .input('ShipID', sql.Int, bunkerDetails.ShipID)
            .input('VoyageID', sql.BigInt, bunkerDetails.VoyageID || null)
            .input('VoyageLegID', sql.BigInt, VoyageLegID || null)
            .input('BunkerPortCode', sql.NVarChar(40), bunkerDetails.BunkerPortCode || null)
            .input('BunkerDate', sql.NVarChar(50), bunkerDetails.BunkerDate)
            .input('BDN_Number', sql.NVarChar(100), bunkerDetails.BDN_Number || null)
            .input('Bunkered_Quantity', sql.Decimal(10, 3), bunkeredQuantity)
            .input('DensityAt15C', sql.Decimal(10, 4), parseFloat(bunkerDetails.DensityAt15C) || null)
            .input('SulphurContentPercent', sql.Decimal(7, 4), bunkerDetails.BunkerCategory === 'FUEL' ? (parseFloat(bunkerDetails.SulphurContentPercent) || null) : null)
            .input('FlashPointC', sql.Decimal(5, 1), parseFloat(bunkerDetails.FlashPointC) || null)
            .input('ViscosityAt50C_cSt', sql.Decimal(8, 2), parseFloat(bunkerDetails.ViscosityAt50C_cSt) || null)
            .input('WaterContentPercent', sql.Decimal(6, 4), parseFloat(bunkerDetails.WaterContentPercent) || null)
            .input('LCV', sql.Decimal(10, 3), bunkerDetails.BunkerCategory === 'FUEL' ? (parseFloat(bunkerDetails.LCV) || null) : null)
            .input('TemperatureC', sql.Decimal(5, 1), parseFloat(bunkerDetails.TemperatureC) || null)
            .input('PressureBar', sql.Decimal(8, 3), parseFloat(bunkerDetails.PressureBar) || null)
            .input('SupplierName', sql.NVarChar(255), bunkerDetails.SupplierName || null)
            .input('BargeName', sql.NVarChar(255), bunkerDetails.BargeName || null)
            .input('MARPOLSampleSealNumber', sql.NVarChar(100), bunkerDetails.MARPOLSampleSealNumber || null)
            .input('BDN_DeclarationReceived', sql.Bit, bunkerDetails.BDN_DeclarationReceived ? 1 : 0)
            .input('Initial_Quantity_MT', sql.Decimal(10, 3), initialQuantity)
            .input('Final_Quantity_MT', sql.Decimal(10, 3), finalQuantity)
            .input('OperationType', sql.VarChar(50), bunkerDetails.OperationType || null)
            .input('BunkerCategory', sql.VarChar(20), bunkerDetails.BunkerCategory)
            .input('Initial_Volume_M3', sql.Decimal(12, 3), parseFloat(bunkerDetails.Initial_Volume_M3) || null)
            .input('Final_Volume_M3', sql.Decimal(12, 3), parseFloat(bunkerDetails.Final_Volume_M3) || null)
            .input('Bunkered_Volume_M3', sql.Decimal(12, 3), parseFloat(bunkerDetails.Bunkered_Volume_M3) || null)
            .input('Remarks', sql.NVarChar(sql.MAX), bunkerDetails.Remarks || null)
            .input('IsActive', sql.TinyInt, bunkerDetails.IsActive ? 1 : 0);

        if (bunkerDetails.BunkerCategory === 'FUEL') {
            request.input('FuelTypeKey', sql.VarChar(50), bunkerDetails.FuelTypeKey || null);
        } else if (bunkerDetails.BunkerCategory === 'LUBE_OIL') {
            request.input('LubeOilTypeKey', sql.VarChar(50), bunkerDetails.LubeOilTypeKey || null);
        }
        
        await request.query(query);
        
        // Ensure consistency during updates as well
        if (bunkerDetails.BunkerCategory === 'FUEL') {
            await updateFuelROB(transaction, bunkerDetails, finalQuantity);
        } else if (bunkerDetails.BunkerCategory === 'LUBE_OIL') {
            await updateLubeOilROB(transaction, bunkerDetails, finalQuantity);
        }
        
        let initialQuantityForROB;
        let finalQuantityForROB;

        // Corrected query to use the right column names
        const originalBunkerRecordResult = await transaction.request()
            .input('BunkerRecordID', sql.BigInt, bunkerRecordId)
            .query(`SELECT OperationType, BDN_Number, Initial_Quantity_MT, Final_Quantity_MT FROM MEMP_BunkeringData WHERE BunkerRecordID = @BunkerRecordID`);

        const originalBunkerRecord = originalBunkerRecordResult.recordset[0];
        
        if (bunkerDetails.OperationType === 'BUNKER' || bunkerDetails.OperationType === 'LO_TOPUP' || bunkerDetails.OperationType === 'INITIAL_FILL') {
            initialQuantityForROB = 0;
            finalQuantityForROB = bunkeredQuantity;
        } else if (bunkerDetails.OperationType === 'DEBUNKER' || bunkerDetails.OperationType === 'CORRECTION') {
            const lastROB = await fetchLastROBByBdn(bunkerDetails.BDN_Number);
            initialQuantityForROB = lastROB;
            if (bunkerDetails.OperationType === 'DEBUNKER') {
                finalQuantityForROB = initialQuantityForROB - bunkeredQuantity;
            } else { // CORRECTION
                finalQuantityForROB = CorrectionSign === '+' ? initialQuantityForROB + bunkeredQuantity : initialQuantityForROB - bunkeredQuantity;
            }
        }

        // Update the Bunker_ROB entry with the new values
        await transaction.request()
            .input('BunkerRecordID', sql.BigInt, bunkerRecordId)
            .input('Initial_Quantity', sql.Decimal(10, 3), initialQuantityForROB)
            .input('Final_Quantity', sql.Decimal(10, 3), finalQuantityForROB)
            .query(`
                UPDATE [dbo].[Bunker_ROB]
                SET Initial_Quantity = @Initial_Quantity, Final_Quantity = @Final_Quantity
                WHERE BDN_Number = (SELECT BDN_Number FROM MEMP_BunkeringData WHERE BunkerRecordID = @BunkerRecordID);
            `);

        await transaction.commit();
    } catch (err) {
        console.error("Error caught in updateBunker model:", err);
        if (transaction && transaction.state === sql.Transaction.BEGUN) {
            await transaction.rollback();
            console.warn("Transaction rolled back due to error.");
        }
        throw err;
    }
};

export const setBunkerInactive = async (bunkerRecordId) => {
    const pool = await getPool();
    await pool.request()
        .input('BunkerRecordID', sql.BigInt, bunkerRecordId)
        .query('UPDATE MEMP_BunkeringData SET IsActive = 0, ModifiedDate = GETDATE() WHERE BunkerRecordID = @BunkerRecordID');
};

export const fetchActiveShipsForBunker = async () => {
    const pool = await getPool();
    const result = await pool.request()
        .query(`SELECT ShipID, ShipName, IMO_Number FROM dbo.MEMP_Ships WITH (NOLOCK)WHERE IsActive = 1 ORDER BY ShipName;`);
    return result.recordset;
};

export const fetchVoyagesByShipId = async (shipId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('ShipID', sql.Int, shipId)
        .query(`SELECT VoyageID, VoyageNumber FROM dbo.MEMP_Voyages WITH (NOLOCK)WHERE ShipID = @ShipID AND IsActive = 1 ORDER BY VoyageNumber;`);
    return result.recordset;
};

export const fetchSeaPorts = async () => {
    const pool = await getPool();
    const result = await pool.request()
        .query(`SELECT PortCode, PortName FROM dbo.MEMP_SeaPorts WITH (NOLOCK) WHERE IsActive = 1 ORDER BY PortName;`);
    return result.recordset;
};

export const fetchFuelTypesForBunker = async () => {
    const pool = await getPool();
    const result = await pool.request()
        .query(`SELECT FuelTypeKey, FuelTypeDescription FROM dbo.MEMP_FuelTypes WITH (NOLOCK) WHERE IsActive = 1 ORDER BY FuelTypeDescription;`);
    return result.recordset;
};

export const fetchLubeOilTypesForBunker = async () => {
    const pool = await getPool();
    const result = await pool.request()
        .query(`SELECT LubeOilTypeKey, LubeOilTypeDescription, UnitOfMeasure FROM dbo.MEMP_LubeOilTypes WITH (NOLOCK)WHERE IsActive = 1 ORDER BY LubeOilTypeDescription;`);
    return result.recordset;
};

export const fetchVesselTanksForBunkering = async (shipId, bunkerCategory = null, itemTypeKey = null) => {
    const pool = await getPool();
    let query = `
        SELECT vt.VesselTankID, vt.Tank_Name, t.Designation AS TankDesignation, t.TankNumber,
            vt.ContentCategory, vt.ContentTypeKey, vt.CurrentQuantityMT
        FROM dbo.MEMP_VesselTanks AS vt WITH (NOLOCK)
        INNER JOIN dbo.MEMP_Tanks AS t WITH (NOLOCK) ON vt.TankID = t.TankID
        WHERE vt.VesselID = @ShipID AND vt.IsActive = 1
    `;
    const request = pool.request().input('ShipID', sql.Int, shipId);

    if (bunkerCategory === 'FUEL' && itemTypeKey) {
        query += ` AND (vt.ContentCategory = 'FUEL' AND vt.ContentTypeKey = @ItemTypeKey OR vt.ContentCategory IS NULL OR vt.ContentCategory = '')`;
        request.input('ItemTypeKey', sql.VarChar(50), itemTypeKey);
    } else if (bunkerCategory === 'LUBE_OIL' && itemTypeKey) {
        query += ` AND (vt.ContentCategory = 'LO' AND vt.ContentTypeKey = @ItemTypeKey OR vt.ContentCategory IS NULL OR vt.ContentCategory = '')`;
        request.input('ItemTypeKey', sql.VarChar(50), itemTypeKey);
    } else if (bunkerCategory) {
        query += ` AND (vt.ContentCategory = @BunkerCategory OR vt.ContentCategory IS NULL OR vt.ContentCategory = '')`;
        request.input('BunkerCategory', sql.VarChar(20), bunkerCategory);
    }

    query += ` ORDER BY vt.Tank_Name;`;

    const result = await request.query(query);
    return result.recordset;
};

export const createBunkerAttachmentInDB = async (attachmentData) => {
    const { bunkerRecordId, filename, originalname, mimetype } = attachmentData;
    const pool = await getPool();
    const query = `
        INSERT INTO dbo.Bunker_Record_Attachments (
            BunkerRecordID, Filename, OriginalName, MimeType, UploadDate
        )
        OUTPUT Inserted.*
        VALUES (
            @bunkerRecordId, @filename, @originalname, @mimetype, GETDATE()
        );
    `;
    const inputs = [
        { name: 'bunkerRecordId', type: sql.BigInt, value: bunkerRecordId },
        { name: 'filename', type: sql.NVarChar, value: filename },
        { name: 'originalname', type: sql.NVarChar, value: originalname },
        { name: 'mimetype', type: sql.NVarChar, value: mimetype || null }
    ];
    const result = await pool.request().input(inputs[0].name, inputs[0].type, inputs[0].value).input(inputs[1].name, inputs[1].type, inputs[1].value).input(inputs[2].name, inputs[2].type, inputs[2].value).input(inputs[3].name, inputs[3].type, inputs[3].value).query(query);
    return result.recordset[0];
};

export const getBunkerAttachmentsFromDB = async (bunkerRecordId) => {
    const pool = await getPool();
    const query = `
        SELECT Attachment_Id, Filename, OriginalName, MimeType, UploadDate
        FROM dbo.Bunker_Record_Attachments WITH (NOLOCK)
        WHERE BunkerRecordID = @bunkerRecordId
        ORDER BY UploadDate DESC;
    `;
    const inputs = [{ name: 'bunkerRecordId', type: sql.BigInt, value: bunkerRecordId }];
    const result = await pool.request().input(inputs[0].name, inputs[0].type, inputs[0].value).query(query);
    return result.recordset;
};

export const fetchAllBdnNumbers = async (bunkerCategory) => {
    const pool = await getPool();
    let request = pool.request();
    let query = `
        SELECT DISTINCT BDN_Number 
        FROM dbo.MEMP_BunkeringData WITH (NOLOCK)
        WHERE BDN_Number IS NOT NULL 
        AND BDN_Number != ''
    `;
    
    // Filter by BunkerCategory if provided
    if (bunkerCategory) {
        query += ' AND BunkerCategory = @bunkerCategory';
        request.input('bunkerCategory', sql.NVarChar, bunkerCategory);
    }

    query += ' ORDER BY BDN_Number;';
    const result = await request.query(query);
    return result.recordset.map(record => record.BDN_Number);
};

export const fetchBunkerDetailsByBdn = async (bdnNumber) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('BDN_Number', sql.NVarChar(100), bdnNumber)
        .query(`
            SELECT TOP 1
                bd.BunkerRecordID, bd.ShipID, s.ShipName, s.IMO_Number, bd.VoyageID, v.VoyageNumber, bd.VoyageLegID, vl.LegName,
                bd.BunkerPortCode, sp.PortName AS BunkerPortName, bd.BunkerDate, bd.BDN_Number,
                bd.FuelTypeKey, ft.FuelTypeDescription, bd.LubeOilTypeKey, lot.LubeOilTypeDescription,
                bd.Bunkered_Quantity, bd.DensityAt15C, bd.SulphurContentPercent, bd.FlashPointC,
                bd.ViscosityAt50C_cSt, bd.WaterContentPercent, bd.LCV, bd.TemperatureC, bd.PressureBar,
                bd.SupplierName, bd.BargeName, bd.MARPOLSampleSealNumber, bd.BDN_DeclarationReceived,
                bd.Initial_Quantity_MT, bd.Final_Quantity_MT, bd.OperationType, bd.BunkerCategory,
                bd.Initial_Volume_M3, bd.Final_Volume_M3, bd.Bunkered_Volume_M3, bd.Remarks,
                bd.CreatedDate, bd.CreatedBy, bd.ModifiedDate, bd.ModifiedBy, bd.IsActive
            FROM dbo.MEMP_BunkeringData AS bd WITH (NOLOCK)
            INNER JOIN dbo.MEMP_Ships AS s WITH (NOLOCK) ON bd.ShipID = s.ShipID
            LEFT JOIN dbo.MEMP_Voyages AS v WITH (NOLOCK) ON bd.VoyageID = v.VoyageID
            LEFT JOIN dbo.MEMP_VoyageLegs AS vl WITH (NOLOCK) ON bd.VoyageLegID = vl.VoyageLegID
            LEFT JOIN dbo.MEMP_SeaPorts AS sp WITH (NOLOCK) ON bd.BunkerPortCode = sp.PortCode
            LEFT JOIN dbo.MEMP_FuelTypes AS ft WITH (NOLOCK) ON bd.FuelTypeKey = ft.FuelTypeKey
            LEFT JOIN dbo.MEMP_LubeOilTypes AS lot WITH (NOLOCK)ON bd.LubeOilTypeKey = lot.LubeOilTypeKey
            WHERE bd.BDN_Number = @BDN_Number
            ORDER BY bd.BunkerRecordID DESC;
        `);
    return result.recordset[0];
};

// Add this new function for dropdown in additive consumption
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

// --- NEW: Fetch BDNs based on Dosing Date and Fuel Type ---
// --- UPDATED: Fetch BDNs for Dropdown (With ROB Data) ---
export const fetchBDNsForDosing = async (shipId, fuelType, dosingDate) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('ShipID', sql.Int, shipId)
        .input('FuelTypeKey', sql.VarChar, fuelType)
        .input('DosingDate', sql.VarChar, dosingDate) 
        .query(`
            SELECT 
                B.BDN_Number, 
                -- Use ROB Entry Date if exists, otherwise fallback to original Bunker Date
                ISNULL(R.EntryDate, B.BunkerDate) as EntryDate, 
                -- Use ROB Quantity if exists, otherwise fallback to original Qty
                ISNULL(R.Final_Quantity, B.Final_Quantity_MT) as Quantity_MT
            
            FROM MEMP_BunkeringData B
            -- OUTER APPLY: Joins the latest ROB record if it exists
            OUTER APPLY (
                SELECT TOP 1 EntryDate, Final_Quantity
                FROM Bunker_ROB rob
                WHERE rob.BDN_Number = B.BDN_Number
                AND rob.Final_Quantity > 0
                AND rob.EntryDate <= @DosingDate
                ORDER BY rob.EntryDate DESC
            ) R
            
            WHERE B.ShipID = @ShipID
            AND B.FuelTypeKey = @FuelTypeKey
            AND B.BunkerDate <= @DosingDate
            AND B.IsActive = 1
            AND B.OperationType IN ('BUNKER', 'LO_TOPUP', 'INITIAL_FILL') 
            ORDER BY B.BunkerDate DESC
        `);
    return result.recordset;
};

// --- NEW: Fetch Latest ROB for a specific BDN ---
export const fetchLatestROB = async (bdnNumber, dosingDate) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('BDN_Number', sql.VarChar, bdnNumber)
        .input('DosingDate', sql.VarChar, dosingDate)
        .query(`
            SELECT TOP 1 Final_Quantity, EntryDate 
            FROM Bunker_ROB 
            WHERE BDN_Number = @BDN_Number 
            AND EntryDate <= @DosingDate
            ORDER BY EntryDate DESC
        `);
    
    // Return the full record (Quantity AND Date)
    return result.recordset.length > 0 ? result.recordset[0] : null;
};