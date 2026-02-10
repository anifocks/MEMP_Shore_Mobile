// Bunker Modified/viswa-digital-backend/reports-service/utils/db.js
import sql from 'mssql';
import { dbConfig } from '../config/dbConfig.js';

let pool = null;

export const getPool = async () => {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    console.log('[DB ReportsService] Connection pool is not available or not connected. Creating a new one...');
    pool = await sql.connect(dbConfig);
    console.log('[DB ReportsService] New connection pool created and connected successfully.');
    return pool;
  } catch (err) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('!!! REPORTS SERVICE DATABASE CONNECTION FAILED - CHECK .env FILE AND SERVER STATUS !!!');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('Detailed Error:', err);
    pool = null;
    throw new Error('Could not connect to the Reports Service database.');
  }
};

/**
 * Executes a SQL query against the database.
 * @param {string} query - The SQL query string.
 * @param {Array<{name: string, type: sql.TYPES, value: any}>} inputs - An array of input parameters.
 * @param {string} debugName - A name for debugging purposes.
 * @returns {Promise<sql.IResult<any>>} - The result of the query.
 */
export const executeQuery = async (query, inputs = [], debugName = 'Unnamed Query') => {
  try {
    const request = new sql.Request(await getPool());
    inputs.forEach(input => {
      request.input(input.name, input.type, input.value);
    });
    // console.log(`[DB ${debugName}] Executing query: ${query}`); // Uncomment for detailed query logging
    const result = await request.query(query);
    return result;
  } catch (err) {
    console.error(`[DB ${debugName}] Error executing query:`, err);
    throw err;
  }
};