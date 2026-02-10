import sql from 'mssql';
import { dbConfig } from '../config/dbConfig.js';

let poolPromise;

export const getPool = async () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then((pool) => {
        console.log('✅ [AdditiveService] Connected to SQL Database');
        return pool;
      })
      .catch((err) => {
        console.error('❌ [AdditiveService] Database Connection Failed:', err);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
};