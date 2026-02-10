import sql from 'mssql';
import { dbConfig } from '../config/dbConfig.js';

let pool;

export const getPool = async () => {
  if (!pool) {
    try {
      pool = await sql.connect(dbConfig);
      console.log("Database connection successful.");
    } catch (err) {
      console.error("Database connection failed:", err);
      // Exit process if DB connection fails
      process.exit(1);
    }
  }
  return pool;
};