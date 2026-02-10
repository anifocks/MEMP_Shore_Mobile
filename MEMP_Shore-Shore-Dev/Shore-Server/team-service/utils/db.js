// viswa-digital-backend/team-service/utils/db.js
import sql from 'mssql';
import dbConfig from '../config/dbConfig.js';

let pool;

const connectDB = async () => {
  try {
    if (pool && pool.connected) {
      return; // Already connected
    }
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    console.log('[TeamService] Database connection successful.');
  } catch (err) {
    console.error('[TeamService] Database connection failed:', err);
    pool = null; 
    process.exit(1);
  }
};

const getPool = () => {
  if (!pool || !pool.connected) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return pool;
};

const closePool = async () => {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('[TeamService] Database connection closed.');
  }
};

export { connectDB, getPool, closePool };