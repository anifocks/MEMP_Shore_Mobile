// File: 7 Excel Ip and Document Module/viswa-digital-backend/tank-service/models/tankModel.js
import sql from 'mssql';
import { getPool } from '../utils/db.js';

// Helper to convert datetime-local string to UTC for DB
const toUtcIsoString = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toISOString();
};

// Fetch all tanks (basic list for TankManagementPage)
export const fetchAllTanks = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT
            vt.VesselTankID,
            vt.Tank_Name,
            t.Designation AS TankDesignation,
            t.TankNumber,
            s.ShipName,
            s.IMO_Number,
            st.VesselTypeDescription,
            vt.CapacityM3,
            vt.ContentCategory,
            vt.ContentTypeKey,
            vt.IsActive,
            vt.CurrentQuantityMT,
            vt.CurrentVolumeM3
        FROM dbo.MEMP_VesselTanks AS vt
        INNER JOIN dbo.MEMP_Tanks AS t ON vt.TankID = t.TankID
        INNER JOIN dbo.MEMP_Ships AS s ON vt.VesselID = s.ShipID
        LEFT JOIN dbo.MEMP_VesselTypes AS st ON s.VesselTypeKey = st.VesselTypeKey
        WHERE vt.IsActive = 1
        ORDER BY s.ShipName, vt.Tank_Name;
    `);
    return result.recordset;
};

// Fetch tanks by Vessel ID (for TankManagementPage filter)
export const fetchTanksByVesselId = async (vesselId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('VesselID', sql.Int, vesselId)
        .query(`
            SELECT
                vt.VesselTankID,
                vt.Tank_Name,
                t.Designation AS TankDesignation,
                t.TankNumber,
                s.ShipName,
                s.IMO_Number,
                st.VesselTypeDescription,
                vt.CapacityM3,
                vt.ContentCategory,
                vt.ContentTypeKey,
                vt.IsActive,
                vt.CurrentQuantityMT,
                vt.CurrentVolumeM3
            FROM dbo.MEMP_VesselTanks AS vt
            INNER JOIN dbo.MEMP_Tanks AS t ON vt.TankID = t.TankID
            INNER JOIN dbo.MEMP_Ships AS s ON vt.VesselID = s.ShipID
            LEFT JOIN dbo.MEMP_VesselTypes AS st ON s.VesselTypeKey = st.VesselTypeKey
            WHERE vt.VesselID = @VesselID AND vt.IsActive = 1
            ORDER BY vt.Tank_Name;
        `);
    return result.recordset;
};

// Fetch comprehensive tank details by ID for TankDetailsPage and AddEditTankPage
export const fetchTankDetailsById = async (vesselTankId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('VesselTankID', sql.BigInt, vesselTankId)
        .query(`
            SELECT
                vt.VesselTankID,
                vt.VesselID,
                s.ShipName,
                s.IMO_Number,
                st.VesselTypeDescription,
                vt.TankID,
                t.TankNumber,
                t.Designation AS TankDesignation,
                vt.Tank_Name,
                vt.ContentCategory,
                vt.ContentTypeKey,
                vt.CapacityM3,
                vt.IsActive,
                vt.Location,
                vt.LengthMeters,
                vt.BreadthMeters,
                vt.DepthMeters,
                vt.Ullage,
                vt.DensityKGM3, -- Now correctly refers to DensityKGM3
                vt.TemperatureC,
                vt.PressureBar,
                vt.VolumeM3,
                vt.WeightMT,
                vt.CreatedDate,
                vt.CreatedBy,
                vt.ModifiedDate,
                vt.ModifiedBy,
                vt.CurrentQuantityMT,
                vt.CurrentVolumeM3,
                vt.CurrentTemperatureC,
                vt.CurrentDensityKGM3,
                vt.CurrentPressureBar,
                -- Join to get standard density for Capacity in MT calculation based on ContentTypeKey
                -- Prioritize fuel density if ContentCategory is FUEL, then lube oil, then default to water density
                COALESCE(
                    (SELECT TOP 1 ft.DensityAt15C FROM dbo.MEMP_FuelTypes ft WHERE ft.FuelTypeKey = vt.ContentTypeKey AND vt.ContentCategory = 'FUEL'),
                    (SELECT TOP 1 lot.DensityAt15C FROM dbo.MEMP_LubeOilTypes lot WHERE lot.LubeOilTypeKey = vt.ContentTypeKey AND vt.ContentCategory = 'LO'),
                    1000.0 -- Default to water density if specific content density not found
                ) AS StandardContentDensityKGM3
            FROM dbo.MEMP_VesselTanks AS vt
            INNER JOIN dbo.MEMP_Tanks AS t ON vt.TankID = t.TankID
            INNER JOIN dbo.MEMP_Ships AS s ON vt.VesselID = s.ShipID
            LEFT JOIN dbo.MEMP_VesselTypes AS st ON s.VesselTypeKey = st.VesselTypeKey
            WHERE vt.VesselTankID = @VesselTankID;
        `);
    return result.recordset[0];
};

// NEW: Fetch current quantities for a list of VesselTankIDs
export const fetchCurrentQuantitiesByIds = async (vesselTankIds) => {
    const pool = await getPool();
    // Ensure vesselTankIds is an array and contains valid numbers
    if (!Array.isArray(vesselTankIds) || vesselTankIds.length === 0) {
        return [];
    }

    const request = pool.request();
    // Build the WHERE clause with an IN operator for the list of IDs
    const idList = vesselTankIds.map((id, index) => {
        request.input(`VesselTankID_${index}`, sql.BigInt, id);
        return `@VesselTankID_${index}`;
    }).join(',');

    const result = await request.query(`
        SELECT
            VesselTankID,
            CurrentQuantityMT
        FROM dbo.MEMP_VesselTanks
        WHERE VesselTankID IN (${idList});
    `);
    return result.recordset;
};


export const insertTank = async (tankData) => {
    const pool = await getPool();
    const {
        VesselID, TankID, Tank_Name, ContentCategory, ContentTypeKey, CapacityM3,
        Location, LengthMeters, BreadthMeters, DepthMeters, Ullage,
        DensityKGM3, TemperatureC, PressureBar, VolumeM3, WeightMT, IsActive
    } = tankData;

    // --- NEW LOGIC for initial content weight and volume ---
    let effectiveDensityKGM3 = parseFloat(DensityKGM3);
    // If density is not provided or invalid, default to 1000 kg/m^3
    if (isNaN(effectiveDensityKGM3) || effectiveDensityKGM3 <= 0) {
        effectiveDensityKGM3 = 1000.0;
    }

    let initialCurrentQuantityMT = parseFloat(WeightMT);
    let initialCurrentVolumeM3 = parseFloat(VolumeM3);

    // Scenario 1: Only WeightMT is provided, calculate VolumeM3
    if (!isNaN(initialCurrentQuantityMT) && isNaN(initialCurrentVolumeM3)) {
        initialCurrentVolumeM3 = initialCurrentQuantityMT * 1000 / effectiveDensityKGM3;
    }
    // Scenario 2: Only VolumeM3 is provided, calculate WeightMT
    else if (isNaN(initialCurrentQuantityMT) && !isNaN(initialCurrentVolumeM3)) {
        initialCurrentQuantityMT = initialCurrentVolumeM3 * effectiveDensityKGM3 / 1000;
    }
    // Scenario 3: Neither provided or both invalid, default to zero
    else if (isNaN(initialCurrentQuantityMT) && isNaN(initialCurrentVolumeM3)) {
        initialCurrentQuantityMT = 0;
        initialCurrentVolumeM3 = 0;
    }
    // Scenario 4: Both provided (use provided values), or one provided and the other calculated
    // No action needed here, variables already hold the parsed/calculated values.

    const initialCurrentTemperatureC = TemperatureC || null;
    const initialCurrentDensityKGM3 = DensityKGM3 || null; // Use original input or null if invalid for storage
    const initialCurrentPressureBar = PressureBar || null;

    const result = await pool.request()
        .input('VesselID', sql.Int, VesselID)
        .input('TankID', sql.Int, TankID)
        .input('Tank_Name', sql.NVarChar(255), Tank_Name)
        .input('ContentCategory', sql.VarChar(50), ContentCategory || null)
        .input('ContentTypeKey', sql.VarChar(50), ContentTypeKey || null)
        .input('CapacityM3', sql.Decimal(10, 3), CapacityM3)
        .input('Location', sql.NVarChar(255), Location || null)
        .input('LengthMeters', sql.Decimal(10, 3), LengthMeters || null)
        .input('BreadthMeters', sql.Decimal(10, 3), BreadthMeters || null)
        .input('DepthMeters', sql.Decimal(10, 3), DepthMeters || null)
        .input('Ullage', sql.Decimal(10, 3), Ullage || null)
        .input('DensityKGM3', sql.Decimal(10, 3), DensityKGM3 || null) // Store original input for DensityKGM3
        .input('TemperatureC', sql.Decimal(5, 1), TemperatureC || null)
        .input('PressureBar', sql.Decimal(8, 3), PressureBar || null)
        .input('VolumeM3', sql.Decimal(10, 3), VolumeM3 || null) // Keep for initial set, store original input
        .input('WeightMT', sql.Decimal(10, 3), WeightMT || null) // Keep for initial set, store original input
        .input('IsActive', sql.TinyInt, IsActive ? 1 : 0)
        .input('CurrentQuantityMT', sql.Decimal(10,3), initialCurrentQuantityMT)
        .input('CurrentVolumeM3', sql.Decimal(10,3), initialCurrentVolumeM3)
        .input('CurrentTemperatureC', sql.Decimal(5,1), initialCurrentTemperatureC)
        .input('CurrentDensityKGM3', sql.Decimal(10,3), initialCurrentDensityKGM3) // Use parsed/calculated initial density for CurrentDensityKGM3
        .input('CurrentPressureBar', sql.Decimal(8,3), initialCurrentPressureBar)
        .query(`
            DECLARE @OutputTableVar TABLE (VesselTankID BIGINT);

            INSERT INTO MEMP_VesselTanks (
                VesselID, TankID, Tank_Name, ContentCategory, ContentTypeKey, CapacityM3,
                Location, LengthMeters, BreadthMeters, DepthMeters, Ullage,
                DensityKGM3, TemperatureC, PressureBar, VolumeM3, WeightMT, IsActive,
                CurrentQuantityMT, CurrentVolumeM3, CurrentTemperatureC, CurrentDensityKGM3, CurrentPressureBar,
                CreatedDate, ModifiedDate
            )
            OUTPUT inserted.VesselTankID INTO @OutputTableVar
            VALUES (
                @VesselID, @TankID, @Tank_Name, @ContentCategory, @ContentTypeKey, @CapacityM3,
                @Location, @LengthMeters, @BreadthMeters, @DepthMeters, @Ullage,
                @DensityKGM3, @TemperatureC, @PressureBar, @VolumeM3, @WeightMT, @IsActive,
                @CurrentQuantityMT, @CurrentVolumeM3, @CurrentTemperatureC, @CurrentDensityKGM3, @CurrentPressureBar,
                GETDATE(), GETDATE()
            );

            SELECT VesselTankID FROM @OutputTableVar;
        `);
    return result.recordset[0].VesselTankID;
};

export const updateTank = async (vesselTankId, tankData) => {
    const pool = await getPool();
    const {
        VesselID, TankID, Tank_Name, ContentCategory, ContentTypeKey, CapacityM3,
        Location, LengthMeters, BreadthMeters, DepthMeters, Ullage,
        DensityKGM3, TemperatureC, PressureBar, IsActive
        // Removed VolumeM3, WeightMT, CurrentQuantityMT, CurrentVolumeM3 from destructuring
    } = tankData;

    await pool.request()
        .input('VesselTankID', sql.BigInt, vesselTankId)
        .input('VesselID', sql.Int, VesselID)
        .input('TankID', sql.Int, TankID)
        .input('Tank_Name', sql.NVarChar(255), Tank_Name)
        .input('ContentCategory', sql.VarChar(50), ContentCategory || null)
        .input('ContentTypeKey', sql.VarChar(50), ContentTypeKey || null)
        .input('CapacityM3', sql.Decimal(10, 3), CapacityM3)
        .input('Location', sql.NVarChar(255), Location || null)
        .input('LengthMeters', sql.Decimal(10, 3), LengthMeters || null)
        .input('BreadthMeters', sql.Decimal(10, 3), BreadthMeters || null)
        .input('DepthMeters', sql.Decimal(10, 3), DepthMeters || null)
        .input('Ullage', sql.Decimal(10, 3), Ullage || null)
        .input('DensityKGM3', sql.Decimal(10, 3), DensityKGM3 || null)
        .input('TemperatureC', sql.Decimal(5, 1), TemperatureC || null)
        .input('PressureBar', sql.Decimal(8, 3), PressureBar || null)
        .input('IsActive', sql.TinyInt, IsActive ? 1 : 0)
        .query(`
            UPDATE MEMP_VesselTanks SET
                VesselID = @VesselID,
                TankID = @TankID,
                Tank_Name = @Tank_Name,
                ContentCategory = @ContentCategory,
                ContentTypeKey = @ContentTypeKey,
                CapacityM3 = @CapacityM3,
                Location = @Location,
                LengthMeters = @LengthMeters,
                BreadthMeters = @BreadthMeters,
                DepthMeters = @DepthMeters,
                Ullage = @Ullage,
                DensityKGM3 = @DensityKGM3,
                TemperatureC = @TemperatureC,
                PressureBar = @PressureBar,
                IsActive = @IsActive,
                ModifiedDate = GETDATE()
            WHERE VesselTankID = @VesselTankID;
        `);
};

export const deactivateTank = async (vesselTankId) => {
    const pool = await getPool();
    await pool.request()
        .input('VesselTankID', sql.BigInt, vesselTankId)
        .query('UPDATE MEMP_VesselTanks SET IsActive = 0, ModifiedDate = GETDATE() WHERE VesselTankID = @VesselTankID');
};

// Metadata functions
export const fetchTankDefinitions = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT TankID, TankNumber, Designation FROM dbo.MEMP_Tanks WHERE IsActive = 1 ORDER BY Designation;`);
    return result.recordset;
};

export const fetchFuelTypes = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT FuelTypeKey, FuelTypeDescription FROM dbo.MEMP_FuelTypes WHERE IsActive = 1 ORDER BY FuelTypeDescription;`);
    return result.recordset;
};

export const fetchWaterTypes = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT WaterTypeKey, WaterTypeDescription FROM dbo.MEMP_WaterTypes WHERE IsActive = 1 ORDER BY WaterTypeDescription;`);
    return result.recordset;
};

export const fetchLubeOilTypes = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT LubeOilTypeKey, LubeOilTypeDescription FROM dbo.MEMP_LubeOilTypes WHERE IsActive = 1 ORDER BY LubeOilTypeDescription;`);
    return result.recordset;
};

export const fetchOilyResidueTypes = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT OilyResidueTypeKey, OilyResidueTypeDescription FROM dbo.MEMP_OilyResidueTypes WHERE IsActive = 1 ORDER BY OilyResidueTypeDescription;`);
    return result.recordset;
};