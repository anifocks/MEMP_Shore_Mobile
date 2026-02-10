// src/config/apiConfig.js

/**
 * Central API Configuration File
 * * This file automatically detects the environment:
 * - Development: Uses 'http://localhost:7000'
 * - Production: Uses 'https://veemsonboardupgrade.theviswagroup.com'
 */

// 1. Determine if we are in production mode
const isProduction = import.meta.env.MODE === 'production';

// 2. Set the Gateway URL based on the environment
// Note: We remove the '/api' suffix if it exists in the env variable 
// because apiClient in api.js adds it automatically.
const PROD_URL = 'https://veemsonboardupgrade.theviswagroup.com';
const DEV_URL = 'http://localhost:7000';

export const API_GATEWAY_URL = isProduction ? PROD_URL : DEV_URL;

// Optional: Log the active environment to the console for easier debugging
console.log(`[API Config] Running in ${import.meta.env.MODE} mode. Gateway: ${API_GATEWAY_URL}`);