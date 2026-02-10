import sql from 'mssql';
import { dbConfig } from '../config/dbConfig.js';

let pool = null;

// A simpler, more direct connection pool handler
export const getPool = async () => {
  // If we already have a connected pool, reuse it.
  if (pool && pool.connected) {
    return pool;
  }
  
  try {
    console.log('[DB] Connection pool is not available or not connected. Creating a new one...');
    // Create and connect a new pool.
    pool = await sql.connect(dbConfig);
    console.log('[DB] New connection pool created and connected successfully.');
    return pool;
  } catch (err) {
    // Log the detailed error to the terminal
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('!!! DATABASE CONNECTION FAILED - CHECK .env FILE AND SERVER STATUS !!!');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('Detailed Error:', err);
    
    // Set pool to null so the next request will try to reconnect
    pool = null; 
    
    // Throw a generic error to the controller, which will result in the 500 error.
    // The real error details are in this terminal window.
    throw new Error('Could not connect to the database.');
  }
};