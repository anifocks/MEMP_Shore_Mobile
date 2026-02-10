import sql from 'mssql';
import { dbConfig } from '../config/dbConfig.js';

let pool;
export const getPool = async () => {
  if (pool && pool.connected) {
    return pool;
  }
  try {
    pool = await sql.connect(dbConfig);
    return pool;
  } catch (err) {
    console.error('DATABASE CONNECTION FAILED:', err);
    pool = null;
    throw err;
  }
};