import dotenv from 'dotenv';
dotenv.config();

const dbHost = process.env.DB_HOST;
const dbInstanceName = process.env.DB_INSTANCE_NAME;
const serverName = dbInstanceName ? `${dbHost}\\${dbInstanceName}` : dbHost;

console.log(`[TankService DB Config] Using server address: ${serverName}`);

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
    }
};