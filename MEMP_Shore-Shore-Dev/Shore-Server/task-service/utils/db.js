// viswa-digital-backend/task-service/utils/db.js
import sql from 'mssql';
import getDbConfig from '../config/dbConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let pool = null;
let poolConnectPromise = null;

const getConfig = () => getDbConfig();

const initializePool = async () => {
    const currentDbConfig = getConfig();
    if (!currentDbConfig || !currentDbConfig.server) { // Added check for currentDbConfig itself
        throw new Error("[TaskService DB Initialize] Database server configuration (DB_HOST) is missing or getDbConfig() returned undefined.");
    }
    try {
        console.log(`[TaskService DB] Initializing connection pool to ${currentDbConfig.server}${currentDbConfig.instanceName ? '\\' + currentDbConfig.instanceName : ''}...`);
        const newPool = new sql.ConnectionPool(currentDbConfig);
        poolConnectPromise = newPool.connect();
        pool = await poolConnectPromise;
        console.log(`[TaskService DB] Connection pool established successfully to ${currentDbConfig.database}.`);
        pool.on('error', async (err) => {
            console.error('[TaskService DB] Connection pool error:', err);
            if (pool) { try { await pool.close(); } catch (closeErr) { console.error('[TaskService DB] Error closing errored pool:', closeErr); } }
            pool = null; poolConnectPromise = null;
        });
    } catch (err) {
        console.error('[TaskService DB] Failed to create connection pool during initialization:', err);
        pool = null; poolConnectPromise = null;
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
        console.error("[TaskService DB] Attempted to get pool, but it's not available. Trying to re-initialize.");
        await initializePool();
        if (!pool) throw new Error("[TaskService DB] Database connection pool is definitively not available after re-attempt.");
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
        console.error(`[TaskService DB - ${operationName}] SQL Error executing query "${query.substring(0,100)}...": ${err.message}`, err);
        throw err;
    }
};

export const closeDbPool = async () => {
    if (pool) {
        try {
            console.log('[TaskService DB Util] Attempting to close database connection pool...');
            await pool.close();
            console.log('[TaskService DB Util] Database connection pool closed successfully.');
        } catch (err) {
            console.error('[TaskService DB Util] Error closing database pool:', err);
        } finally {
            pool = null;
            poolConnectPromise = null;
        }
    } else {
        console.log('[TaskService DB Util] Database connection pool already closed or not initialized.');
    }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NEW: This is the code that handles the file upload directory
export const taskUploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'task_attachments');

export const ensureTaskUploadsDirectoryExists = () => {
    if (!fs.existsSync(taskUploadsDir)) {
        fs.mkdirSync(taskUploadsDir, { recursive: true });
        console.log(`[TaskService Utils] Created directory for task attachments: ${taskUploadsDir}`);
    }
};