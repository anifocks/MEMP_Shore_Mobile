// auth-service/config/dbConfig.js
const getDbConfig = () => {
    console.log('[getDbConfig fn] DB_HOST from process.env:', process.env.DB_HOST);
    console.log('[getDbConfig fn] DB_INSTANCE_NAME from process.env:', process.env.DB_INSTANCE_NAME); // Added for debug

    const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true',
            instanceName: process.env.DB_INSTANCE_NAME || undefined // This should now pick up ANIL_DB
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
        console.error('[getDbConfig fn] CRITICAL: config.server is undefined. DB_HOST was not loaded!');
    }
    return config;
};

export default getDbConfig;