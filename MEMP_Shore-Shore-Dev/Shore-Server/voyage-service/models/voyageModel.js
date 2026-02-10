// viswa-digital-backend/voyage-service/models/voyageModel.js
import sql from 'mssql';
import { executeQuery } from '../utils/db.js';

// NEW FUNCTION: fetchVesselShortName (Reused logic for voyage service)
export const fetchVesselShortName = async (shipId) => {
    const query = `
        SELECT TOP 1 Short_Name
        FROM dbo.MEMP_Ships WITH (NOLOCK)
        WHERE ShipID = @ShipID;
    `;
    const inputs = [{ name: 'ShipID', type: sql.Int, value: shipId }];
    const result = await executeQuery(query, inputs, "FetchVesselShortName");
    return result.recordset[0]?.Short_Name;
};

// NEW FUNCTION: fetchNextVoyageNumber
export const fetchNextVoyageNumber = async (shipId) => {
    const shortName = await fetchVesselShortName(shipId);

    if (!shortName) {
        return null;
    }

    const prefix = `${shortName}-VY-`;
    
    // Find the highest existing sequential number for this vessel's prefix
    const latestVoyageResult = await executeQuery(`
        SELECT TOP 1 VoyageNumber
        FROM [MEMP_Voyages] WITH (NOLOCK)
        WHERE VoyageNumber LIKE @Prefix
        ORDER BY VoyageNumber DESC;
    `, [{ name: 'Prefix', type: sql.NVarChar(50), value: `${prefix}%` }], "FetchLatestVoyageNumber");
    
    let nextNumber = 1;

    if (latestVoyageResult.recordset.length > 0) {
        const lastVoyageNumber = latestVoyageResult.recordset[0].VoyageNumber;
        const parts = lastVoyageNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1], 10);
        
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }

    // Format the number with leading zeros (e.g., 1 -> 001)
    const formattedNumber = String(nextNumber).padStart(3, '0');
    
    return `${prefix}${formattedNumber}`;
};


// --- fetchAllVoyages: Uses new column names and formats dates as strings ---
// *** MODIFIED: Added ATD to the selection list ***
export const fetchAllVoyages = async () => {
    const query = `
        SELECT
             a.[VoyageID]
            ,a.[ShipID]
            ,s.ShipName AS VesselName
            ,a.[VoyageNumber]
            ,b.PortName as Departure_Port
            ,c.PortName as Arrival_Port
            ,a.[CreatedDate]
            ,a.[IsActive]
            ,a.[VoyageStatus]               -- Added for consistency
            ,a.[ATD]                        -- ADDED: Actual Time of Departure
            ,FORMAT(a.[ETD], 'yyyy-MM-ddTHH:mm:ss') AS ETD_UTC
            ,FORMAT(a.[ETA], 'yyyy-MM-ddTHH:mm:ss') AS ETA_UTC
        FROM [MEMP_Voyages] a WITH (NOLOCK)
        INNER JOIN MEMP_SeaPorts b WITH (NOLOCK) ON a.[DeparturePortCode] = b.PortCode
        INNER JOIN MEMP_SeaPorts c WITH (NOLOCK) ON a.[ArrivalPortCode] = c.PortCode
        INNER JOIN MEMP_Ships s WITH (NOLOCK) ON a.[ShipID] = s.ShipID
        ORDER BY a.CreatedDate DESC;
    `;
    const result = await executeQuery(query, [], "FetchAllVoyages");
    return result.recordset;
};

// --- fetchVoyageDetailsById: UPDATED to include main voyage port coordinates ---
export const fetchVoyageDetailsById = async (voyageId) => {
// ... (rest of function remains unchanged)
    const query = `
        SELECT
             a.[VoyageID]
            ,a.[ShipID]
            ,s.ShipName AS VesselName
            ,s.IMO_Number
            ,a.[VoyageNumber]
            ,a.[DeparturePortCode]
            ,dp.PortName AS Departure_Port_Name
            ,dp.Latitude AS DepartureLatitude         -- ADDED FOR MAP
            ,dp.Longitude AS DepartureLongitude       -- ADDED FOR MAP
            ,a.[ArrivalPortCode]
            ,ap.PortName AS Arrival_Port_Name
            ,ap.Latitude AS ArrivalLatitude           -- ADDED FOR MAP
            ,ap.Longitude AS ArrivalLongitude         -- ADDED FOR MAP
            ,FORMAT(a.[ETD], 'yyyy-MM-ddTHH:mm:ss') AS ETD_UTC
            ,FORMAT(a.[ATD], 'yyyy-MM-ddTHH:mm:ss') AS ATD_UTC
            ,FORMAT(a.[ETA], 'yyyy-MM-ddTHH:mm:ss') AS ETA_UTC
            ,FORMAT(a.[ATA], 'yyyy-MM-ddTHH:mm:ss') AS ATA_UTC
            ,a.[DistancePlannedNM]
            ,a.[DistanceSailedNM]
            ,a.[CargoDescription]
            ,a.[CargoWeightMT]
            ,a.[VoyageStatus]
            ,a.[Notes]
            ,a.[CreatedDate]
            ,a.[CreatedBy]
            ,a.[ModifiedDate]
            ,a.[ModifiedBy]
            ,a.[IsActive]
            ,a.[LastLegNumber] 
        FROM [MEMP_Voyages] a
        INNER JOIN MEMP_SeaPorts dp WITH (NOLOCK) ON a.[DeparturePortCode] = dp.PortCode -- Join for Dep Coords
        INNER JOIN MEMP_SeaPorts ap WITH (NOLOCK) ON a.[ArrivalPortCode] = ap.PortCode   -- Join for Arr Coords
        INNER JOIN MEMP_Ships s WITH (NOLOCK) ON a.[ShipID] = s.ShipID
        WHERE a.VoyageID = @VoyageID;
    `;
    const inputs = [{ name: 'VoyageID', type: sql.Int, value: voyageId }];
    const result = await executeQuery(query, inputs, "FetchVoyageDetailsById");
    return result.recordset[0];
};

// MODIFIED: fetchVoyagesByShipId now fetches only PARENT VOYAGES (for first dropdown)
// *** FIXED: Added Joins AND ETD/ETA formats so filtered list matches main list structure ***
export const fetchVoyagesByShipId = async (shipId) => {
    const query = `
        SELECT
             a.[VoyageID]
            ,a.[ShipID]
            ,s.ShipName AS VesselName       -- Added Vessel Name
            ,a.[VoyageNumber]
            ,b.PortName as Departure_Port   -- Added Port Name Join
            ,c.PortName as Arrival_Port     -- Added Port Name Join
            ,a.[CreatedDate]                -- Added Created Date
            ,a.[VoyageStatus]               -- Added Status
            ,a.[IsActive]
            ,a.[Voyage_Completed]
            ,a.[ATD]                        -- ADDED: Actual Time of Departure
            ,FORMAT(a.[ETD], 'yyyy-MM-ddTHH:mm:ss') AS ETD_UTC -- ADDED: Estimated Departure (Fallback)
            ,FORMAT(a.[ETA], 'yyyy-MM-ddTHH:mm:ss') AS ETA_UTC -- ADDED: Estimated Arrival
            ,a.[DeparturePortCode]          -- Kept raw code just in case
            ,a.[ArrivalPortCode]            -- Kept raw code just in case
        FROM [MEMP_Voyages] a
        INNER JOIN MEMP_SeaPorts b WITH (NOLOCK) ON a.[DeparturePortCode] = b.PortCode
        INNER JOIN MEMP_SeaPorts c WITH (NOLOCK) ON a.[ArrivalPortCode] = c.PortCode
        INNER JOIN MEMP_Ships s WITH (NOLOCK) ON a.[ShipID] = s.ShipID
        WHERE a.ShipID = @ShipID 
          AND a.IsActive = 1 
          AND a.Voyage_Completed = 'No'
        ORDER BY a.VoyageNumber DESC;
    `;
    const inputs = [{ name: 'ShipID', type: sql.Int, value: shipId }];
    const result = await executeQuery(query, inputs, "FetchVoyagesByShipId");
    return result.recordset;
};

// NEW FUNCTION: fetchActiveVoyageLegsByShipId (For second dropdown filter)
export const fetchActiveVoyageLegsByShipId = async (shipId) => {
// ... (rest of function remains unchanged)
    const parsedShipId = parseInt(shipId);
    if (isNaN(parsedShipId) || parsedShipId <= 0) {
        return [];
    }
    const query = `
        SELECT
            vl.VoyageID,                       
            vl.VoyageLegID,
            vl.LegNumber,
            vl.LegName AS LegIdentifier,
            vl.DeparturePortCode,
            vl.ArrivalPortCode,
            v.VoyageNumber,
            v.Voyage_Completed
        FROM [MEMP_VoyageLegs] vl WITH (NOLOCK)
        INNER JOIN [MEMP_Voyages] v WITH (NOLOCK)
            ON vl.VoyageID = v.VoyageID
        WHERE vl.ShipID = @ShipID 
          AND vl.IsActive = 1
          AND v.Voyage_Completed = 'No' 
        ORDER BY vl.VoyageID DESC, vl.LegNumber ASC;
    `;
    const inputs = [{ name: 'ShipID', type: sql.Int, value: parsedShipId }];
    const result = await executeQuery(query, inputs, "FetchActiveVoyageLegsByShipId");
    return result.recordset;
};

// --- Helper function to insert a single Voyage Leg - UPDATED to insert VoyageNumber and ShipID ---
export const insertVoyageLeg = async (legData) => {
// ... (rest of function remains unchanged)
    const {
        VoyageID, LegNumber, LegName, DeparturePortCode, ArrivalPortCode,
        ETD_UTC, ATD_UTC, ETA_UTC, ATA_UTC,
        CargoDescription, CargoWeightMT,
        VoyageNumber, ShipID // NEW FIELDS
    } = legData;

    const query = `
        INSERT INTO [MEMP_VoyageLegs] (
            VoyageID, VoyageNumber, ShipID, LegNumber, LegName, DeparturePortCode, ArrivalPortCode,
            ETD, ATD, ETA, ATA,
            CargoDescription, CargoWeightMT, IsActive, DateAdded
        )
        OUTPUT inserted.VoyageLegID
        VALUES (
            @VoyageID, @VoyageNumber, @ShipID, @LegNumber, @LegName, @DeparturePortCode, @ArrivalPortCode,
            @ETD, @ATD, @ETA, @ATA,
            @CargoDescription, @CargoWeightMT, 1, GETUTCDATE()
        );
    `;

    // The ArrivalPortCode is passed explicitly, allowing it to be null OR a port code.
    const inputs = [
        { name: 'VoyageID', type: sql.Int, value: VoyageID },
        { name: 'VoyageNumber', type: sql.NVarChar(50), value: VoyageNumber }, // NEW INPUT
        { name: 'ShipID', type: sql.Int, value: ShipID },                   // NEW INPUT
        { name: 'LegNumber', type: sql.Int, value: LegNumber },
        { name: 'LegName', type: sql.NVarChar(150), value: LegName },
        { name: 'DeparturePortCode', type: sql.NVarChar(50), value: DeparturePortCode },
        { name: 'ArrivalPortCode', type: sql.NVarChar(50), value: ArrivalPortCode || null },
        { name: 'ETD', type: sql.DateTime2, value: ETD_UTC || null },
        { name: 'ATD', type: sql.DateTime2, value: ATD_UTC || null },
        { name: 'ETA', type: sql.DateTime2, value: ETA_UTC || null },
        { name: 'ATA', type: sql.DateTime2, value: ATA_UTC || null },
        { name: 'CargoDescription', type: sql.NVarChar(500), value: CargoDescription || null },
        { name: 'CargoWeightMT', type: sql.Decimal(18, 3), value: CargoWeightMT || null }
    ];

    const result = await executeQuery(query, inputs, "InsertVoyageLeg");
    return result.recordset[0].VoyageLegID;
};

// --- modifyVoyageLeg: NEW function to update an existing leg by ID ---
export const modifyVoyageLeg = async (legId, legData) => {
// ... (rest of function remains unchanged)
    const {
        ArrivalPortCode, // Allow updating arrival port (only for uncompleted legs, usually Leg 2)
        ETD_UTC, ATD_UTC, ETA_UTC, ATA_UTC,
        CargoDescription, CargoWeightMT,
        IsActive // Although usually handled by soft delete, keep here for flexibility
    } = legData;

    const query = `
        UPDATE [MEMP_VoyageLegs] SET
            ArrivalPortCode = @ArrivalPortCode,
            ETD = @ETD,
            ATD = @ATD,
            ETA = @ETA,
            ATA = @ATA,
            CargoDescription = @CargoDescription,
            CargoWeightMT = @CargoWeightMT,
            IsActive = @IsActive,
            LastModified = GETUTCDATE()
        WHERE VoyageLegID = @VoyageLegID;
    `;

    const inputs = [
        { name: 'VoyageLegID', type: sql.BigInt, value: legId },
        { name: 'ArrivalPortCode', type: sql.NVarChar(50), value: ArrivalPortCode || null },
        { name: 'ETD', type: sql.DateTime2, value: ETD_UTC || null },
        { name: 'ATD', type: sql.DateTime2, value: ATD_UTC || null },
        { name: 'ETA', type: sql.DateTime2, value: ETA_UTC || null },
        { name: 'ATA', type: sql.DateTime2, value: ATA_UTC || null },
        { name: 'CargoDescription', type: sql.NVarChar(500), value: CargoDescription || null },
        { name: 'CargoWeightMT', type: sql.Decimal(18, 3), value: CargoWeightMT || null },
        { name: 'IsActive', type: sql.Bit, value: IsActive === undefined ? 1 : (IsActive ? 1 : 0) }
    ];

    await executeQuery(query, inputs, "ModifyVoyageLeg");
};


// --- fetchVoyageLegsByVoyageId: UPDATED to fetch port coordinates for mapping ---
export const fetchVoyageLegsByVoyageId = async (voyageId) => {
// ... (rest of function remains unchanged)
    const query = `
        SELECT
             vl.[VoyageLegID]
            ,vl.[VoyageID]
            ,vl.[VoyageNumber] AS VoyageNumber      
            ,vl.[ShipID] AS ShipID                  
            ,s.ShipName AS VesselName             
            ,vl.[LegNumber]
            ,vl.[LegName]
            ,vl.[DeparturePortCode]
            ,dp.PortName AS Departure_Port_Name
            ,dp.Latitude AS DepartureLatitude         -- ADDED FOR MAP
            ,dp.Longitude AS DepartureLongitude       -- ADDED FOR MAP
            ,vl.[ArrivalPortCode]
            ,ap.PortName AS Arrival_Port_Name
            ,ap.Latitude AS ArrivalLatitude           -- ADDED FOR MAP
            ,ap.Longitude AS ArrivalLongitude         -- ADDED FOR MAP
            ,FORMAT(vl.[ETD], 'yyyy-MM-ddTHH:mm:ss') AS ETD_UTC
            ,FORMAT(vl.[ATD], 'yyyy-MM-ddTHH:mm:ss') AS ATD_UTC
            ,FORMAT(vl.[ETA], 'yyyy-MM-ddTHH:mm:ss') AS ETA_UTC
            ,FORMAT(vl.[ATA], 'yyyy-MM-ddTHH:mm:ss') AS ATA_UTC
            ,vl.[CargoDescription]
            ,vl.[CargoWeightMT]
            ,vl.[IsActive]
        FROM [MEMP_VoyageLegs] vl WITH (NOLOCK)
        INNER JOIN [MEMP_Ships] s WITH (NOLOCK) ON vl.ShipID = s.ShipID        
        LEFT JOIN MEMP_SeaPorts dp WITH (NOLOCK) ON vl.[DeparturePortCode] = dp.PortCode -- Join for Departure Port Coords
        LEFT JOIN MEMP_SeaPorts ap WITH (NOLOCK) ON vl.[ArrivalPortCode] = ap.PortCode   -- Join for Arrival Port Coords
        WHERE vl.VoyageID = @VoyageID AND vl.IsActive = 1
        ORDER BY vl.LegNumber ASC;
    `;
    const inputs = [{ name: 'VoyageID', type: sql.Int, value: voyageId }];
    const result = await executeQuery(query, inputs, "FetchVoyageLegsByVoyageId");
    return result.recordset;
};

// --- addVoyageLeg: UPDATED to fetch ShipID before inserting leg data ---
export const addVoyageLeg = async (voyageId, lastLegNumber, voyageNumber, departurePortCode, arrivalPortCode = null, optionalDetails = {}) => {
// ... (rest of function remains unchanged)
    
    // 1. Fetch ShipID from the parent MEMP_Voyages table
    const voyageDetailsQuery = `
        SELECT ShipID FROM [MEMP_Voyages] 
        WHERE VoyageID = @VoyageID;
    `;
    const voyageResult = await executeQuery(voyageDetailsQuery, [{ name: 'VoyageID', type: sql.Int, value: voyageId }], "FetchShipIDForLeg");
    const ShipID = voyageResult.recordset[0]?.ShipID;

    if (!ShipID) {
        throw new Error(`Could not find ShipID for VoyageID: ${voyageId}`);
    }

    const newLegNumber = lastLegNumber + 1;
    const newLegName = `${voyageNumber}_Leg${newLegNumber}`;
    
    // 2. Merge required and optional details for insertion
    const newLegData = {
        VoyageID: voyageId,
        VoyageNumber: voyageNumber, // NEW FIELD
        ShipID: ShipID,             // NEW FIELD
        LegNumber: newLegNumber,
        LegName: newLegName,
        DeparturePortCode: departurePortCode,
        ArrivalPortCode: arrivalPortCode, 
        ETD_UTC: optionalDetails.ETD_UTC || null,
        ATD_UTC: optionalDetails.ATD_UTC || null,
        ETA_UTC: optionalDetails.ETA_UTC || null,
        ATA_UTC: optionalDetails.ATA_UTC || null,
        CargoDescription: optionalDetails.CargoDescription || null,
        CargoWeightMT: optionalDetails.CargoWeightMT || null
    };

    // 3. Insert the new leg
    const newLegId = await insertVoyageLeg(newLegData);

    // 4. Increment LastLegNumber in MEMP_Voyages
    const updateQuery = `
        UPDATE [MEMP_Voyages]
        SET LastLegNumber = @NewLegNumber,
            ModifiedDate = GETDATE()
        WHERE VoyageID = @VoyageID;
    `;
    const updateInputs = [
        { name: 'VoyageID', type: sql.Int, value: voyageId },
        { name: 'NewLegNumber', type: sql.Int, value: newLegNumber }
    ];
    await executeQuery(updateQuery, updateInputs, "IncrementLastLegNumber");

    return newLegId;
};

// --- insertVoyage: Inserts into new column names, sets LastLegNumber=0 ---
export const insertVoyage = async (voyageData) => {
// ... (rest of function remains unchanged)
    const {
        ShipID, VoyageNumber, DeparturePortCode, ArrivalPortCode,
        ETD_UTC, ETA_UTC, ATD_UTC, ATA_UTC,
        DistancePlannedNM, DistanceSailedNM, CargoDescription, CargoWeightMT,
        VoyageStatus, Notes, CreatedBy
    } = voyageData;

    // The main voyage record is created with LastLegNumber set to 0.
    const query = `
        INSERT INTO [MEMP_Voyages] (
            ShipID, VoyageNumber, DeparturePortCode, ArrivalPortCode,
            ETD, ATD, ETA, ATA,
            DistancePlannedNM, DistanceSailedNM, CargoDescription, CargoWeightMT,
            VoyageStatus, Notes, CreatedDate, CreatedBy, ModifiedDate, ModifiedBy, IsActive,
            LastLegNumber 
        )
        OUTPUT inserted.VoyageID
        VALUES (
            @ShipID, @VoyageNumber, @DeparturePortCode, @ArrivalPortCode,
            @ETD, @ATD, @ETA, @ATA,
            @DistancePlannedNM, @DistanceSailedNM, @CargoDescription, @CargoWeightMT,
            @VoyageStatus, @Notes, GETDATE(), @CreatedBy, GETDATE(), @CreatedBy, 1,
            0 -- VALUE: Start with 0 legs until successfully created in the edit flow
        );
    `;

    const inputs = [
        { name: 'ShipID', type: sql.Int, value: ShipID || null },
        { name: 'VoyageNumber', type: sql.NVarChar(50), value: VoyageNumber },
        { name: 'DeparturePortCode', type: sql.NVarChar(10), value: DeparturePortCode },
        { name: 'ArrivalPortCode', type: sql.NVarChar(10), value: ArrivalPortCode },
        { name: 'ETD', type: sql.DateTime2, value: ETD_UTC || null },
        { name: 'ATD', type: sql.DateTime2, value: ATD_UTC || null },
        { name: 'ETA', type: sql.DateTime2, value: ETA_UTC || null },
        { name: 'ATA', type: sql.DateTime2, value: ATA_UTC || null },
        { name: 'DistancePlannedNM', type: sql.Decimal(18, 2), value: DistancePlannedNM || null },
        { name: 'DistanceSailedNM', type: sql.Decimal(18, 2), value: DistanceSailedNM || null },
        { name: 'CargoDescription', type: sql.NVarChar(255), value: CargoDescription || null },
        { name: 'CargoWeightMT', type: sql.Decimal(18, 2), value: CargoWeightMT || null },
        { name: 'VoyageStatus', type: sql.NVarChar(50), value: VoyageStatus || 'Planned' },
        { name: 'Notes', type: sql.NVarChar(sql.MAX), value: Notes || null },
        { name: 'CreatedBy', type: sql.NVarChar(50), value: CreatedBy || 'System' }
    ];

    const result = await executeQuery(query, inputs, "InsertVoyage");
    return result.recordset[0].VoyageID;
};

// --- modifyVoyage: Updates new column names and optionally LastLegNumber ---
export const modifyVoyage = async (voyageId, voyageData) => {
// ... (rest of function remains unchanged)
    const {
        ShipID, VoyageNumber, DeparturePortCode, ArrivalPortCode,
        ETD_UTC, ETA_UTC, ATD_UTC, ATA_UTC,
        DistancePlannedNM, DistanceSailedNM, CargoDescription, CargoWeightMT,
        VoyageStatus, Notes, ModifiedBy, IsActive, LastLegNumber 
    } = voyageData;

    const query = `
        UPDATE [MEMP_Voyages] SET
            ShipID = @ShipID,
            VoyageNumber = @VoyageNumber,
            DeparturePortCode = @DeparturePortCode,
            ArrivalPortCode = @ArrivalPortCode,
            ETD = @ETD,
            ATD = @ATD,
            ETA = @ETA,
            ATA = @ATA,
            DistancePlannedNM = @DistancePlannedNM,
            DistanceSailedNM = @DistanceSailedNM,
            CargoDescription = @CargoDescription,
            CargoWeightMT = @CargoWeightMT,
            VoyageStatus = @VoyageStatus,
            Notes = @Notes,
            ModifiedDate = GETDATE(),
            ModifiedBy = @ModifiedBy,
            IsActive = @IsActive,
            LastLegNumber = COALESCE(@LastLegNumber, LastLegNumber) -- Update only if provided
        WHERE VoyageID = @VoyageID;
    `;

    const inputs = [
        { name: 'VoyageID', type: sql.Int, value: voyageId },
        { name: 'ShipID', type: sql.Int, value: ShipID || null },
        { name: 'VoyageNumber', type: sql.NVarChar(50), value: VoyageNumber },
        { name: 'DeparturePortCode', type: sql.NVarChar(10), value: DeparturePortCode },
        { name: 'ArrivalPortCode', type: sql.NVarChar(10), value: ArrivalPortCode },
        { name: 'ETD', type: sql.DateTime2, value: ETD_UTC || null },
        { name: 'ATD', type: sql.DateTime2, value: ATD_UTC || null },
        { name: 'ETA', type: sql.DateTime2, value: ETA_UTC || null },
        { name: 'ATA', type: sql.DateTime2, value: ATA_UTC || null },
        { name: 'DistancePlannedNM', type: sql.Decimal(18, 2), value: DistancePlannedNM || null },
        { name: 'DistanceSailedNM', type: sql.Decimal(18, 2), value: DistanceSailedNM || null },
        { name: 'CargoDescription', type: sql.NVarChar(255), value: CargoDescription || null },
        { name: 'CargoWeightMT', type: sql.Decimal(18, 2), value: CargoWeightMT || null },
        { name: 'VoyageStatus', type: sql.NVarChar(50), value: VoyageStatus || 'Planned' },
        { name: 'Notes', type: sql.NVarChar(sql.MAX), value: Notes || null },
        { name: 'ModifiedBy', type: sql.NVarChar(50), value: ModifiedBy || 'System' },
        { name: 'IsActive', type: sql.Bit, value: IsActive ? 1 : 0 },
        { name: 'LastLegNumber', type: sql.Int, value: LastLegNumber || null }
    ];

    await executeQuery(query, inputs, "ModifyVoyage");
};

// --- softDeleteVoyage: No changes needed here ---
export const softDeleteVoyage = async (voyageId) => {
// ... (rest of function remains unchanged)
    const query = `
        UPDATE [MEMP_Voyages] SET
            IsActive = 0,
            ModifiedDate = GETDATE(),
            ModifiedBy = 'System'
        WHERE VoyageID = @VoyageID;
    `;
    const inputs = [{ name: 'VoyageID', type: sql.Int, value: voyageId }];
    await executeQuery(query, inputs, "SoftDeleteVoyage");
};

// ===============================================
// ATTACHMENT AND LOOKUP HELPER FUNCTIONS
// ===============================================

// FIX: Helper function to fetch ShipID and VoyageNumber for attachment metadata
export const fetchVoyageAttachmentMetadata = async (voyageId) => {
// ... (rest of function remains unchanged)
    const query = `
        SELECT ShipID, VoyageNumber
        FROM [MEMP_Voyages] WITH (NOLOCK)
        WHERE VoyageID = @VoyageID;
    `;
    const inputs = [{ name: 'VoyageID', type: sql.Int, value: voyageId }];
    const result = await executeQuery(query, inputs, "FetchVoyageAttachmentMetadata");
    return result.recordset[0]; // Returns { ShipID, VoyageNumber } or undefined
};

// NEW: Helper function to fetch minimal leg details (for attachments)
export const fetchVoyageLegDetails = async (legId) => {
// ... (rest of function remains unchanged)
    const query = `
        SELECT VoyageID, ShipID, VoyageNumber
        FROM [MEMP_VoyageLegs] WITH (NOLOCK)
        WHERE VoyageLegID = @VoyageLegID;
    `;
    const inputs = [{ name: 'VoyageLegID', type: sql.BigInt, value: legId }];
    const result = await executeQuery(query, inputs, "fetchVoyageLegDetails");
    return result.recordset[0]; // Returns { VoyageID, ShipID, VoyageNumber } or undefined
};


// NEW: Helper function to insert voyage attachment metadata into DB
export const createVoyageAttachmentInDB = async (attachmentData) => {
// ... (rest of function remains unchanged)
    const { VoyageID, VoyageLegID, OriginalName, FilePath, ShipID, VoyageNumber, MimeType } = attachmentData;
    
    const query = `
        INSERT INTO dbo.MEMP_Voyage_Attachments (
            VoyageID, VoyageLegID, OriginalName, FilePath, ShipID, VoyageNumber, MimeType, UploadDate, IsActive
        )
        OUTPUT Inserted.*
        VALUES (
            @VoyageID, @VoyageLegID, @OriginalName, @FilePath, @ShipID, @VoyageNumber, @MimeType, GETDATE(), 1
        );
    `;
    const inputs = [
        { name: 'VoyageID', type: sql.BigInt, value: VoyageID },
        { name: 'VoyageLegID', type: sql.BigInt, value: VoyageLegID || null },
        { name: 'OriginalName', type: sql.NVarChar(255), value: OriginalName },
        { name: 'FilePath', type: sql.NVarChar(500), value: FilePath },
        { name: 'ShipID', type: sql.Int, value: ShipID },
        { name: 'VoyageNumber', type: sql.NVarChar(25), value: VoyageNumber },
        { name: 'MimeType', type: sql.NVarChar(100), value: MimeType || null }
    ];
    
    const result = await executeQuery(query, inputs, "CreateVoyageAttachment");
    return result.recordset[0];
};

// NEW: Helper function to soft-delete an attachment
export const softDeleteVoyageAttachment = async (attachmentId) => {
// ... (rest of function remains unchanged)
    const query = `
        UPDATE dbo.MEMP_Voyage_Attachments
        SET IsActive = 0, DeleteDate = GETDATE()
        WHERE Attachment_Id = @Attachment_Id;
    `;
    const inputs = [{ name: 'Attachment_Id', type: sql.BigInt, value: attachmentId }];
    await executeQuery(query, inputs, "SoftDeleteVoyageAttachment");
};

// NEW: Helper function to fetch voyage attachments from DB (main header only)
export const getVoyageAttachmentsFromDB = async (voyageId) => {
// ... (rest of function remains unchanged)
    const query = `
        SELECT Attachment_Id, VoyageID, VoyageLegID, OriginalName, FilePath, MimeType, UploadDate
        FROM dbo.MEMP_Voyage_Attachments WITH (NOLOCK)
        WHERE VoyageID = @VoyageID AND VoyageLegID IS NULL AND IsActive = 1
        ORDER BY UploadDate DESC;
    `;
    const inputs = [{ name: 'VoyageID', type: sql.BigInt, value: voyageId }];
    const result = await executeQuery(query, inputs, "GetVoyageAttachments");
    return result.recordset;
};

// NEW: Helper function to fetch voyage attachments from DB by Leg ID
export const getVoyageAttachmentsByLegId = async (voyageLegId) => {
// ... (rest of function remains unchanged)
    const query = `
        SELECT Attachment_Id, VoyageID, VoyageLegID, OriginalName, FilePath, MimeType, UploadDate
        FROM dbo.MEMP_Voyage_Attachments WITH (NOLOCK)
        WHERE VoyageLegID = @VoyageLegID AND IsActive = 1
        ORDER BY UploadDate DESC;
    `;
    const inputs = [{ name: 'VoyageLegID', type: sql.BigInt, value: voyageLegId }];
    const result = await executeQuery(query, inputs, "GetVoyageAttachmentsByLegId");
    return result.recordset;
};


// NEW: Helper function to fetch file path and name for download
export const getAttachmentDetailsForDownload = async (attachmentId) => {
// ... (rest of function remains unchanged)
    const query = `
        SELECT FilePath, OriginalName
        FROM dbo.MEMP_Voyage_Attachments WITH (NOLOCK)
        WHERE Attachment_Id = @Attachment_Id AND IsActive = 1;
    `;
    const inputs = [{ name: 'Attachment_Id', type: sql.BigInt, value: attachmentId }];
    const result = await executeQuery(query, inputs, "GetAttachmentDetailsForDownload");
    return result.recordset[0];
};