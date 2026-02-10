import dotenv from 'dotenv';
dotenv.config();

// --- Correctly read the server and instance name from your .env file ---
const dbHost = process.env.DB_HOST;
const dbInstanceName = process.env.DB_INSTANCE_NAME;

// --- Combine host and instance if an instance name is provided ---
const serverName = dbInstanceName ? `${dbHost}\\${dbInstanceName}` : dbHost;

console.log(`[DB Config] Using server address: ${serverName}`);
console.log(`[DB Config] Using database: ${process.env.DB_DATABASE}`);

export const dbConfig = {
    // Correctly use the combined server name
    server: serverName, 
    
    // Read user, password, and database from your .env
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    
    options: {
        // Use DB_ENCRYPT from your .env
        encrypt: process.env.DB_ENCRYPT === 'true', 
        
        // Correctly use DB_TRUST_CERTIFICATE from your .env
        trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true'
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};