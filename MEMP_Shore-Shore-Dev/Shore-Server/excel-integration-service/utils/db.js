// excel-integration-service/utils/db.js

import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM setup for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (adjust path as necessary)
// Assuming .env is one level up from utils/
dotenv.config({ path: path.resolve(__dirname, '..', '.env') }); 

// Corrected configuration mapping using DB_HOST and DB_INSTANCE_NAME
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    
    // FIX 1: Use DB_HOST from .env file for the server address
    server: process.env.DB_HOST, 
    
    database: process.env.DB_DATABASE,
    
    // Timeout configurations
    connectionTimeout: 120000, // 120 seconds to connect to database
    requestTimeout: 120000, // 120 seconds to execute queries
    
    options: {
        // FIX 2: Use DB_INSTANCE_NAME for named instance connection
        instanceName: process.env.DB_INSTANCE_NAME, 
        
        // FIX 3: Read and convert DB_TRUST_CERTIFICATE to a boolean
        trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true', 
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool;

try {
    pool = new sql.ConnectionPool(config);
    
    // Attempt to connect immediately
    pool.connect().then(() => {
        console.log('Database connection pool established successfully.');
    }).catch(err => {
        // Log the error but don't crash the entire server initialization 
        // (though the service won't work without a DB connection)
        console.error('Database connection failed on startup:', err.message);
    });
} catch (err) {
    console.error('SQL Initialization failed:', err.message);
}

// Use named exports
export { 
    sql, 
    pool 
};