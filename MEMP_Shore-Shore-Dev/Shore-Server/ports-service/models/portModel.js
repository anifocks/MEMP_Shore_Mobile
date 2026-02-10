// viswa-digital-backend/ports-service/models/portModel.js
import sql from 'mssql';
import { getPool } from '../utils/db.js';

export const fetchAllPorts = async (searchTerm) => {
    const pool = await getPool();
    let query = 'SELECT PortID, PortName, Country, PortCode, IsActive FROM MEMP_SeaPorts';
    const request = pool.request();
    if (searchTerm) {
        query += ' WHERE PortName LIKE @searchTerm OR PortCode LIKE @searchTerm OR Country LIKE @searchTerm';
        request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
    }
    query += ' ORDER BY PortName;';
    const result = await request.query(query);
    return result.recordset;
};

// NEW: Function to fetch only PortName and PortCode based on PortName search
export const fetchPortNamesBySearch = async (searchTerm) => {
    const pool = await getPool();
    const request = pool.request();
    let query = 'SELECT PortName, PortCode FROM MEMP_SeaPorts';
    if (searchTerm) {
        // Ensure the search term is used correctly with LIKE and wildcards
        query += ' WHERE PortName LIKE @searchTerm';
        request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
    }
    query += ' ORDER BY PortName;'; // Order for consistent display
    const result = await request.query(query);
    return result.recordset;
};

// NEW: Function to fetch port details (including Lat/Lng) by PortCode
export const fetchPortByCode = async (portCode) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('PortCode', sql.NVarChar, portCode)
        .query('SELECT PortID, PortName, Country, CountryCode, UTCOffSet, Latitude, Longitude, EuInd, UkInd FROM MEMP_SeaPorts WHERE PortCode = @PortCode');
    return result.recordset[0]; // Returns the first matching record or undefined
};


export const fetchPortById = async (portId) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('PortID', sql.BigInt, portId) // Ensure sql.BigInt for PortID type
        .query('SELECT * FROM MEMP_SeaPorts WHERE PortID = @PortID');
    return result.recordset[0];
};

export const insertPort = async (portData) => {
    const { PortName, PortCode, Country, CountryCode, UTCOffSet, Latitude, Longitude, EuInd, UkInd, username } = portData;

    const euIndicator = EuInd === 'Yes' ? 'Yes' : 'No';
    const ukIndicator = UkInd === 'Yes' ? 'Yes' : 'No';

    const pool = await getPool();
    const result = await pool.request()
        .input('PortName', sql.NVarChar, PortName)
        .input('PortCode', sql.NVarChar, PortCode)
        .input('Country', sql.NVarChar, Country)
        .input('CountryCode', sql.NVarChar, CountryCode || null)
        .input('UTCOffSet', sql.NVarChar, UTCOffSet || null)
        .input('Latitude', sql.Numeric(12, 6), Latitude)
        .input('Longitude', sql.Numeric(12, 6), Longitude)
        .input('EuInd', sql.NVarChar, euIndicator)
        .input('UkInd', sql.NVarChar, ukIndicator)
        .input('CreatedBy', sql.NVarChar, username || 'SYSTEM')
        .query(`
            INSERT INTO MEMP_SeaPorts (PortName, PortCode, Country, CountryCode, UTCOffSet, Latitude, Longitude, EuInd, UkInd, IsActive, CreatedDate, CreatedBy, ModifiedDate, ModifiedBy)
            OUTPUT inserted.PortID
            VALUES (@PortName, @PortCode, @Country, @CountryCode, @UTCOffSet, @Latitude, @Longitude, @EuInd, @UkInd, 1, GETDATE(), @CreatedBy, GETDATE(), @CreatedBy);
        `);
    return result.recordset[0].PortID;
};

export const updateExistingPort = async (portId, portData) => {
    const { PortName, PortCode, Country, CountryCode, UTCOffSet, Latitude, Longitude, EuInd, UkInd, IsActive, username } = portData;

    const euIndicator = EuInd === 'Yes' ? 'Yes' : 'No';
    // FIX: Corrected ternary operator syntax here
    const ukIndicator = UkInd === 'Yes' ? 'Yes' : 'No';

    const pool = await getPool();
    await pool.request()
        .input('PortID', sql.BigInt, portId)
        .input('PortName', sql.NVarChar, PortName)
        .input('PortCode', sql.NVarChar, PortCode)
        .input('Country', sql.NVarChar, Country)
        .input('CountryCode', sql.NVarChar, CountryCode || null)
        .input('UTCOffSet', sql.NVarChar, UTCOffSet || null)
        .input('Latitude', sql.Numeric(12, 6), Latitude)
        .input('Longitude', sql.Numeric(12, 6), Longitude)
        .input('EuInd', sql.NVarChar, euIndicator)
        .input('UkInd', sql.NVarChar, ukIndicator)
        .input('IsActive', sql.TinyInt, IsActive ? 1 : 0)
        .input('ModifiedBy', sql.NVarChar, username || 'SYSTEM')
        .query(`
            UPDATE MEMP_SeaPorts SET
            PortName = @PortName, PortCode = @PortCode, Country = @Country, CountryCode = @CountryCode, UTCOffSet = @UTCOffSet, Latitude = @Latitude, Longitude = @Longitude, EuInd = @EuInd, UkInd = @UkInd, IsActive = @IsActive, ModifiedDate = GETDATE(), Modifiedby = @ModifiedBy
            WHERE PortID = @PortID;
        `);
};

export const setPortInactive = async (portId, username) => {
    const pool = await getPool();
    await pool.request()
        .input('PortID', sql.BigInt, portId)
        .input('ModifiedBy', sql.NVarChar, username || 'SYSTEM')
        .query(`UPDATE MEMP_SeaPorts SET IsActive = 0, ModifiedDate = GETDATE(), ModifiedBy = @ModifiedBy WHERE PortID = @PortID;`);
};