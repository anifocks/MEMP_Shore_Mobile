// viswa-digital-backend/task-service/config/dbConfig.js

// THIS FILE SHOULD ONLY DEFINE AND EXPORT getDbConfig.
// IT SHOULD NOT CONTAIN ANY 'import getDbConfig from ...' STATEMENTS
// OR MULTIPLE 'const getDbConfig = ...' DECLARATIONS.

const getDbConfig = () => {
    const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true',
            instanceName: process.env.DB_INSTANCE_NAME || undefined
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
        console.error('[TaskService getDbConfig fn] CRITICAL: DB_HOST is undefined. Check .env file in task-service. DB_HOST was not loaded!');
    }
    if (!config.user && process.env.DB_HOST) { // Only warn if DB_HOST was set but user is missing
        console.warn('[TaskService getDbConfig fn] WARNING: DB_USER is undefined. Check .env file.');
    }
    // You can add similar checks for DB_PASSWORD and DB_DATABASE for thoroughness

    return config;
};

export default getDbConfig;