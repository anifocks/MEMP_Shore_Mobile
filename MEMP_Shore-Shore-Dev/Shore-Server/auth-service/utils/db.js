// auth-service/utils/db.js
import sql from 'mssql';
import getDbConfig from '../config/dbConfig.js';

let pool = null;
let poolConnectPromise = null;

const getConfig = () => {
    return getDbConfig();
};

const initializePool = async () => {
    const currentDbConfig = getConfig();
    if (!currentDbConfig.server) {
        throw new Error("[AuthService DB Initialize] Database server configuration (DB_HOST) is missing.");
    }

    try {
        console.log(`[AuthService DB] Initializing connection pool to ${currentDbConfig.server}${currentDbConfig.instanceName ? '\\' + currentDbConfig.instanceName : ''}...`);
        const newPool = new sql.ConnectionPool(currentDbConfig);
        poolConnectPromise = newPool.connect();
        pool = await poolConnectPromise;
        console.log(`[AuthService DB] Connection pool established successfully to ${currentDbConfig.database}.`);

        pool.on('error', async (err) => {
            console.error('[AuthService DB] Connection pool error:', err);
            if (pool) {
                try {
                    await pool.close();
                } catch (closeErr) {
                    console.error('[AuthService DB] Error closing errored pool:', closeErr);
                }
            }
            pool = null;
            poolConnectPromise = null;
        });
    } catch (err) {
        console.error('[AuthService DB] Failed to create connection pool during initialization:', err);
        pool = null;
        poolConnectPromise = null;
        throw err;
    }
};

export const getPool = async () => {
    if (!pool && !poolConnectPromise) {
        await initializePool();
    } else if (!pool && poolConnectPromise) {
        await poolConnectPromise;
    }
    if (!pool) {
        throw new Error("[AuthService DB] Database connection pool is not available and couldn't be initialized.");
    }
    return pool;
};

export const executeQuery = async (query, inputs = [], operationName = "Query") => {
    const currentPool = await getPool();
    const request = currentPool.request();
    if (Array.isArray(inputs)) {
        inputs.forEach(input => {
            if (input && typeof input.name === 'string' && input.type && input.value !== undefined) {
                request.input(input.name, input.type, input.value);
            }
        });
    }
    try {
        const result = await request.query(query);
        return result;
    } catch (err) {
        console.error(`[AuthService DB - ${operationName}] SQL Error: ${err.message}`, err);
        // This re-throws the error so it can be caught by the global handler
        throw err;
    }
};