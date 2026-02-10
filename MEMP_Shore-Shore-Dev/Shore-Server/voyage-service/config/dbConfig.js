// viswa-digital-backend/voyage-service/config/dbConfig.js
import dotenv from 'dotenv';
dotenv.config();

const getDbConfig = () => {
    const dbHost = process.env.DB_HOST;
    const dbInstanceName = process.env.DB_INSTANCE_NAME;
    const serverName = dbInstanceName ? `${dbHost}\\${dbInstanceName}` : dbHost;

    const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: serverName, // Use the combined server name
        database: process.env.DB_DATABASE,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true',
            instanceName: process.env.DB_INSTANCE_NAME || undefined,
            // *** THIS IS THE FIX: Disable automatic UTC conversion ***
            useUTC: false 
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        },
        connectionTimeout: 30000,
        requestTimeout: 30000
    };

    if (!config.server) {
        console.error('[VoyageService getDbConfig fn] CRITICAL: DB_HOST is undefined. Check .env file for voyage-service. DB_HOST was not loaded!');
    }
    return config;
};

export default getDbConfig;