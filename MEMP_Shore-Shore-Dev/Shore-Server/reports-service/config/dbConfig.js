import dotenv from 'dotenv';
dotenv.config();

console.log('[ReportsService] Loading environment variables...');
console.log('[ReportsService] DB_HOST:', process.env.DB_HOST);
console.log('[ReportsService] DB_INSTANCE_NAME:', process.env.DB_INSTANCE_NAME);
console.log('[ReportsService] DB_USER:', process.env.DB_USER ? '***' : 'undefined');
console.log('[ReportsService] DB_DATABASE:', process.env.DB_DATABASE);

const dbHost = process.env.DB_HOST;
const dbInstanceName = process.env.DB_INSTANCE_NAME;
const serverName = dbInstanceName ? `${dbHost}\\${dbInstanceName}` : dbHost;

console.log(`[ReportsService DB Config] Using server address: ${serverName}`);

export const dbConfig = {
    server: serverName,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true'
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
};