// viswa-digital-backend/ships-service/models/shipsModel.js
import sql from 'mssql';
import { getPool } from '../utils/db.js';

// =========================================================
// COLUMN DEFINITIONS (Consolidated for clarity and scoping)
// =========================================================
const FLEET_COLUMNS = 'FleetID, FleetName, LogoFilename, Description, DateCreated, LastModified, IsActive';

// =========================================================
// SHIP (VESSEL) MANAGEMENT FUNCTIONS (Existing & Updated)
// =========================================================

export const fetchAllShips = async () => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
        S.ShipID, S.IMO_Number, S.ShipName, S.Short_Name, S.VesselTypeKey, S.CapacityDWT, S.YearOfBuild, S.IsActive, S.Imagename, 
        F.FleetID, F.FleetName
    FROM dbo.MEMP_Ships S
    LEFT JOIN dbo.MEMP_Fleets F ON S.FleetID = F.FleetID 
    ORDER BY S.ShipName
  `);
  return result.recordset;
};

export const fetchShipById = async (id) => {
  const pool = await getPool();
  const result = await pool.request()
    .input('ShipID', sql.Int, id)
    .query('SELECT * FROM MEMP_Ships WHERE ShipID = @ShipID');
  return result.recordset[0];
};

export const fetchShipDetailsById = async (shipId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('ShipID', sql.Int, shipId)
        .query(`
            SELECT
                s.ShipID, s.IMO_Number, s.ShipName, s.Short_Name, s.YearOfBuild, s.IsActive, s.Imagename, 
                s.FlagState, s.PortOfRegistry, s.CallSign, s.MMSI,
                s.LengthOverall, s.Breadth, s.Depth, s.MaxDraftForward as Draft_Fwd, s.MaxDraftAft as Draft_Aft, s.Displacement, s.Pitch,
                s.CapacityDWT, s.CapacityGT, s.NetTonnage, s.CapacityTEU, s.CapacityCBM as Capacity_M3, s.CapacityLaneMeters, s.CapacityPassengers,
                s.ClassSociety, s.EEDI, s.EEXI, s.HasShaPoLi as Shaft_Power_Limitation,
                s.VesselTypeKey,
                ic.IceClassDescription, ic.ClassificationSystem AS IceClassSystem,
                st.ShipTypeDescription AS CIIRegulationShipType,
                st.ParameterA AS CII_ParameterA,
                st.ParameterC AS CII_ParameterC,
                f.FleetID, f.FleetName 
            FROM dbo.MEMP_Ships AS s
            LEFT JOIN dbo.MEMP_IceClasses AS ic ON s.IceClass = ic.IceClassKey
            LEFT JOIN dbo.MEMP_ShipTypes_Parameters AS st ON s.VesselTypeKey = st.VesselTypeKey 
            LEFT JOIN dbo.MEMP_Fleets AS f ON s.FleetID = f.FleetID 
            WHERE s.ShipID = @ShipID;
        `);
    return result.recordset[0];
};

// MODIFIED: fetchShipTypes to include VesselTypeKey
export const fetchShipTypes = async () => {
    const pool = await getPool();
    const result = await pool.request().query('SELECT ShipTypeKey, ShipTypeDescription, VesselTypeKey FROM MEMP_ShipTypes_Parameters ORDER BY ShipTypeDescription');
    return result.recordset;
};

export const fetchIceClasses = async () => {
    const pool = await getPool();
    const result = await pool.request().query('SELECT IceClassKey, IceClassDescription FROM MEMP_IceClasses ORDER BY IceClassDescription');
    return result.recordset;
};

export const insertShip = async (shipData) => {
  const {
    IMO_Number, ShipName, Short_Name, VesselTypeKey, CapacityDWT, CapacityGT, YearOfBuild, IsActive, 
    NetTonnage, FlagState, PortOfRegistry, CallSign, MMSI, EEDI, EEXI, HasShaPoLi, ClassSociety,
    CapacityTEU, CapacityCBM, CapacityPassengers, LengthOverall, Breadth, MaxDraftForward, MaxDraftAft,
    Depth, Displacement, Pitch, IceClass, Imagename 
  } = shipData;
  console.log("Data for insertShip:", shipData); // ADD THIS

  const pool = await getPool();
  const result = await pool.request()
    .input('IMO_Number', sql.VarChar(20), IMO_Number)
    .input('ShipName', sql.VarChar(255), ShipName)
    .input('Short_Name', sql.VarChar(50), Short_Name) // ADDED: Short_Name input parameter
    .input('VesselTypeKey', sql.VarChar(100), VesselTypeKey)
    .input('CapacityDWT', sql.Decimal(18, 2), parseFloat(CapacityDWT) || 0)
    .input('CapacityGT', sql.Decimal(18, 2), (CapacityGT === '' || CapacityGT === null) ? null : parseFloat(CapacityGT))
    .input('YearOfBuild', sql.Int, parseInt(YearOfBuild, 10) || 0)
    .input('IsActive', sql.Bit, IsActive ? 1 : 0)
    .input('NetTonnage', sql.Decimal(18, 2), (NetTonnage === '' || NetTonnage === null) ? null : parseFloat(NetTonnage))
    .input('FlagState', sql.VarChar(100), FlagState || null)
    .input('PortOfRegistry', sql.VarChar(100), PortOfRegistry || null)
    .input('CallSign', sql.VarChar(20), CallSign || null)
    .input('MMSI', sql.VarChar(20), MMSI || null)
    .input('EEDI', sql.Decimal(10, 4), (EEDI === '' || EEDI === null) ? null : parseFloat(EEDI))
    .input('EEXI', sql.Decimal(10, 4), (EEXI === '' || EEXI === null) ? null : parseFloat(EEXI))
    .input('HasShaPoLi', sql.Bit, HasShaPoLi ? 1 : 0)
    .input('ClassSociety', sql.VarChar(100), ClassSociety || null)
    .input('CapacityTEU', sql.Int, (CapacityTEU === '' || CapacityTEU === null) ? null : parseInt(CapacityTEU, 10))
    .input('CapacityCBM', sql.Decimal(18, 2), (CapacityCBM === '' || CapacityCBM === null) ? null : parseFloat(CapacityCBM))
    .input('CapacityPassengers', sql.Int, (CapacityPassengers === '' || CapacityPassengers === null) ? null : parseInt(CapacityPassengers, 10))
    .input('LengthOverall', sql.Decimal(18, 2), (LengthOverall === '' || LengthOverall === null) ? null : parseFloat(LengthOverall))
    .input('Breadth', sql.Decimal(18, 2), (Breadth === '' || Breadth === null) ? null : parseFloat(Breadth))
    .input('MaxDraftForward', sql.Decimal(10, 2), (MaxDraftForward === '' || MaxDraftForward === null) ? null : parseFloat(MaxDraftForward))
    .input('MaxDraftAft', sql.Decimal(10, 2), (MaxDraftAft === '' || MaxDraftAft === null) ? null : parseFloat(MaxDraftAft))
    .input('Depth', sql.Decimal(10, 2), (Depth === '' || Depth === null) ? null : parseFloat(Depth))
    .input('Displacement', sql.Decimal(18, 2), (Displacement === '' || Displacement === null) ? null : parseFloat(Displacement))
    .input('Pitch', sql.Decimal(18, 2), (Pitch === '' || Pitch === null) ? null : parseFloat(Pitch)) // ADDED: Pitch input parameter
    .input('IceClass', sql.VarChar(50), IceClass || null)
    .input('Imagename', sql.VarChar(1024), Imagename || null)
    .query(`
      INSERT INTO MEMP_Ships (
        IMO_Number, ShipName, Short_Name, VesselTypeKey, CapacityDWT, CapacityGT, YearOfBuild, IsActive, DateAdded, LastModified, 
        NetTonnage, FlagState, PortOfRegistry, CallSign, MMSI, EEDI, EEXI, HasShaPoLi, ClassSociety,
        CapacityTEU, CapacityCBM, CapacityPassengers, LengthOverall, Breadth, MaxDraftForward, MaxDraftAft,
        Depth, Displacement, Pitch, IceClass, Imagename
      )
      OUTPUT inserted.ShipID
      VALUES (
        @IMO_Number, @ShipName, @Short_Name, @VesselTypeKey, @CapacityDWT, @CapacityGT, @YearOfBuild, @IsActive, GETDATE(), GETDATE(), 
        @NetTonnage, @FlagState, @PortOfRegistry, @CallSign, @MMSI, @EEDI, @EEXI, @HasShaPoLi, @ClassSociety,
        @CapacityTEU, @CapacityCBM, @CapacityPassengers, @LengthOverall, @Breadth, @MaxDraftForward, @MaxDraftAft,
        @Depth, @Displacement, @Pitch, @IceClass, @Imagename
      );
    `);
  return result.recordset[0].ShipID;
};

export const modifyShip = async (id, shipData) => {
  const {
    IMO_Number, ShipName, Short_Name, VesselTypeKey, CapacityDWT, CapacityGT, YearOfBuild, IsActive, 
    NetTonnage, FlagState, PortOfRegistry, CallSign, MMSI, EEDI, EEXI, HasShaPoLi, ClassSociety,
    CapacityTEU, CapacityCBM, CapacityPassengers, LengthOverall, Breadth, MaxDraftForward, MaxDraftAft,
    Depth, Displacement, Pitch, IceClass, Imagename 
  } = shipData;
  console.log("Data for modifyShip:", shipData); // ADD THIS

  const pool = await getPool();
  await pool.request()
    .input('ShipID', sql.Int, id)
    .input('IMO_Number', sql.VarChar, IMO_Number)
    .input('ShipName', sql.VarChar, ShipName)
    .input('Short_Name', sql.VarChar(50), Short_Name) // ADDED: Short_Name input parameter
    .input('VesselTypeKey', sql.VarChar, VesselTypeKey)
    .input('CapacityDWT', sql.Decimal(18, 2), parseFloat(CapacityDWT) || 0)
    .input('CapacityGT', sql.Decimal(18, 2), (CapacityGT === '' || CapacityGT === null) ? null : parseFloat(CapacityGT))
    .input('YearOfBuild', sql.Int, parseInt(YearOfBuild, 10) || 0)
    .input('IsActive', sql.Bit, IsActive ? 1 : 0)
    .input('NetTonnage', sql.Decimal(18, 2), (NetTonnage === '' || NetTonnage === null) ? null : parseFloat(NetTonnage))
    .input('FlagState', sql.VarChar(100), FlagState || null)
    .input('PortOfRegistry', sql.VarChar(100), PortOfRegistry || null)
    .input('CallSign', sql.VarChar(20), CallSign || null)
    .input('MMSI', sql.VarChar(20), MMSI || null)
    .input('EEDI', sql.Decimal(10, 4), (EEDI === '' || EEDI === null) ? null : parseFloat(EEDI))
    .input('EEXI', sql.Decimal(10, 4), (EEXI === '' || EEXI === null) ? null : parseFloat(EEXI))
    .input('HasShaPoLi', sql.Bit, HasShaPoLi ? 1 : 0)
    .input('ClassSociety', sql.VarChar(100), ClassSociety || null)
    .input('CapacityTEU', sql.Int, (CapacityTEU === '' || CapacityTEU === null) ? null : parseInt(CapacityTEU, 10))
    .input('CapacityCBM', sql.Decimal(18, 2), (CapacityCBM === '' || CapacityCBM === null) ? null : parseFloat(CapacityCBM))
    .input('CapacityPassengers', sql.Int, (CapacityPassengers === '' || CapacityPassengers === null) ? null : parseInt(CapacityPassengers, 10))
    .input('LengthOverall', sql.Decimal(18, 2), (LengthOverall === '' || LengthOverall === null) ? null : parseFloat(LengthOverall))
    .input('Breadth', sql.Decimal(18, 2), (Breadth === '' || Breadth === null) ? null : parseFloat(Breadth))
    .input('MaxDraftForward', sql.Decimal(10, 2), (MaxDraftForward === '' || MaxDraftForward === null) ? null : parseFloat(MaxDraftForward))
    .input('MaxDraftAft', sql.Decimal(10, 2), (MaxDraftAft === '' || MaxDraftAft === null) ? null : parseFloat(MaxDraftAft))
    .input('Depth', sql.Decimal(10, 2), (Depth === '' || Depth === null) ? null : parseFloat(Depth))
    .input('Displacement', sql.Decimal(18, 2), (Displacement === '' || Displacement === null) ? null : parseFloat(Displacement))
    .input('Pitch', sql.Decimal(18, 2), (Pitch === '' || Pitch === null) ? null : parseFloat(Pitch)) // ADDED: Pitch input parameter
    .input('IceClass', sql.VarChar(50), IceClass || null)
    .input('Imagename', sql.VarChar(1024), Imagename || null)
    .query(`
      UPDATE MEMP_Ships SET
        IMO_Number = @IMO_Number, ShipName = @ShipName, Short_Name = @Short_Name, VesselTypeKey = @VesselTypeKey, 
        CapacityDWT = @CapacityDWT, CapacityGT = @CapacityGT, YearOfBuild = @YearOfBuild,
        IsActive = @IsActive, LastModified = GETDATE(),
        NetTonnage = @NetTonnage, FlagState = @FlagState, PortOfRegistry = @PortOfRegistry,
        CallSign = @CallSign, MMSI = @MMSI, EEDI = @EEDI, EEXI = @EEXI, HasShaPoLi = @HasShaPoLi,
        ClassSociety = @ClassSociety, CapacityTEU = @CapacityTEU, CapacityCBM = @CapacityCBM,
        CapacityPassengers = @CapacityPassengers, LengthOverall = @LengthOverall, Breadth = @Breadth,
        MaxDraftForward = @MaxDraftForward, MaxDraftAft = @MaxDraftAft, Depth = @Depth,
        Displacement = @Displacement, Pitch = @Pitch, IceClass = @IceClass, Imagename = @Imagename
      WHERE ShipID = @ShipID;
    `);
};

export const setShipInactive = async (id) => {
    const pool = await getPool();
    await pool.request()
        .input('ShipID', sql.Int, id)
        .query(`UPDATE MEMP_Ships SET IsActive = 0, LastModified = GETDATE() WHERE ShipID = @ShipID`);
};

export const fetchActiveShips = async () => {
    const pool = await getPool();
    const result = await pool.request()
        .query(`
            SELECT
                ShipID,
                ShipName,
                IMO_Number,
                Short_Name 
            FROM dbo.MEMP_Ships
            WHERE IsActive = 1
            ORDER BY ShipName;
        `);
    return result.recordset;
};
export const fetchShipByIMO = async (imoNumber) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('IMO_Number', sql.VarChar(20), imoNumber)
        .query('SELECT * FROM MEMP_Ships WHERE IMO_Number = @IMO_Number');
    return result.recordset[0];
};

const isUniqueConstraintError = (error) => {
    if (error.number === 2627 || error.number === 2601) return true;
    return error.message && error.message.toLowerCase().includes('unique key constraint');
};

// =========================================================
// FLEET MANAGEMENT FUNCTIONS (NEW)
// =========================================================

// NEW: Fetch active and unmapped ships for dropdown
export const fetchShipsForMapping = async (currentFleetId) => {
    const pool = await getPool();
    // Fetch ships where IsActive=1 AND (FleetID IS NULL OR FleetID = @currentFleetId)
    const query = `
        SELECT ShipID, ShipName, IMO_Number, FleetID
        FROM dbo.MEMP_Ships
        WHERE IsActive = 1 
          AND (FleetID IS NULL OR FleetID = @currentFleetId)
        ORDER BY ShipName;
    `;
    const result = await pool.request()
        .input('currentFleetId', sql.Int, currentFleetId || null)
        .query(query);
    return result.recordset;
};

// NEW: Transactional update to map/unmap ships to a fleet
export const mapShipsToFleet = async (fleetId, shipIds) => {
    const pool = await getPool();
    const transaction = pool.transaction();

    try {
        await transaction.begin();

        // 1. Unmap all ships previously associated with this fleet
        await transaction.request()
            .input('fleetId', sql.Int, fleetId)
            .query(`
                UPDATE dbo.MEMP_Ships 
                SET FleetID = NULL, LastModified = GETDATE()
                WHERE FleetID = @fleetId;
            `);

        // 2. Map the new set of ships to this fleet
        if (shipIds && shipIds.length > 0) {
            const shipIdList = shipIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            
            // To be robust, use dynamic SQL with the IDs
            const shipIdString = shipIdList.join(',');
            
            // Perform the update for the selected ships
            await transaction.request()
                .input('targetFleetId', sql.Int, fleetId)
                .query(`
                    UPDATE dbo.MEMP_Ships 
                    SET FleetID = @targetFleetId, LastModified = GETDATE() 
                    WHERE ShipID IN (${shipIdString});
                `);
        }
        
        await transaction.commit();
        return true;
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};


export const getAllFleets = async () => {
    const pool = await getPool();
    const query = `SELECT ${FLEET_COLUMNS} FROM dbo.MEMP_Fleets WHERE IsActive = 1 ORDER BY FleetName`;
    const result = await pool.request().query(query);
    return result.recordset;
};

export const getFleetById = async (fleetId) => {
    const pool = await getPool();
    const query = `SELECT ${FLEET_COLUMNS} FROM dbo.MEMP_Fleets WHERE FleetID = @fleetId AND IsActive = 1`;
    const result = await pool.request()
        .input('fleetId', sql.Int, fleetId)
        .query(query);
    return result.recordset[0];
};

export const createFleet = async ({ FleetName, LogoFilename, Description }) => {
    const pool = await getPool();
    const query = `
        INSERT INTO dbo.MEMP_Fleets (FleetName, LogoFilename, Description, DateCreated, IsActive)
        OUTPUT Inserted.*
        VALUES (@FleetName, @LogoFilename, @Description, GETDATE(), 1)
    `;
    const result = await pool.request()
        .input('FleetName', sql.NVarChar, FleetName)
        .input('LogoFilename', sql.NVarChar(1024), LogoFilename || null)
        .input('Description', sql.NVarChar(sql.MAX), Description || null)
        .query(query);
    return result.recordset[0];
};

export const updateFleet = async (fleetId, { FleetName, LogoFilename, Description }) => {
    const pool = await getPool();
    const query = `
        UPDATE dbo.MEMP_Fleets
        SET 
            FleetName = @FleetName,
            LogoFilename = @LogoFilename,
            Description = @Description,
            LastModified = GETDATE()
        WHERE FleetID = @fleetId AND IsActive = 1
    `;
    const result = await pool.request()
        .input('fleetId', sql.Int, fleetId)
        .input('FleetName', sql.NVarChar, FleetName)
        .input('LogoFilename', sql.NVarChar(1024), LogoFilename || null)
        .input('Description', sql.NVarChar(sql.MAX), Description || null)
        .query(query);
    return result.rowsAffected[0] > 0;
};

export const softDeleteFleet = async (fleetId) => {
    const pool = await getPool();
    const query = 'UPDATE dbo.MEMP_Fleets SET IsActive = 0, LastModified = GETDATE() WHERE FleetID = @fleetId AND IsActive = 1';
    const result = await pool.request()
        .input('fleetId', sql.Int, fleetId)
        .query(query);
    return result.rowsAffected[0] > 0;
};