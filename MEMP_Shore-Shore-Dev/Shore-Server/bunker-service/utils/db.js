import sql from 'mssql';
import { dbConfig } from '../config/dbConfig.js';

let pool = null;

export const getPool = async () => {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    console.log('[DB TankService] Connection pool is not available or not connected. Creating a new one...');
    pool = await sql.connect(dbConfig);
    console.log('[DB TankService] New connection pool created and connected successfully.');
    return pool;
  } catch (err) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('!!! TANK SERVICE DATABASE CONNECTION FAILED - CHECK .env FILE AND SERVER STATUS !!!');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('Detailed Error:', err);
    pool = null;
    throw new Error('Could not connect to the Tank Service database.');
  }
};