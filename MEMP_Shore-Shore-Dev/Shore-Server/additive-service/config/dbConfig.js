import dotenv from 'dotenv';
dotenv.config();

export const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // 🔴 FIX: Changed from DB_SERVER to DB_HOST to match your .env
    server: process.env.DB_HOST, 
    database: process.env.DB_DATABASE,
    options: {
        // 🔴 FIX: Added instance name support
        instanceName: process.env.DB_INSTANCE_NAME, 
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true',
        enableArithAbort: true
    }
};