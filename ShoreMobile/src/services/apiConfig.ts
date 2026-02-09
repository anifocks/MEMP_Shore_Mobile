// src/services/apiConfig.ts

/**
 * Mobile API Configuration
 * For mobile, we use __DEV__ to detect development mode
 */

const isProduction = !__DEV__;

const PROD_URL = 'https://veemsonboardupgrade.theviswagroup.com';
const DEV_URL = 'http://localhost:7000'; // Or your local IP if testing on device

export const API_GATEWAY_URL = isProduction ? PROD_URL : DEV_URL;

console.log(`[Mobile API Config] Running in ${isProduction ? 'production' : 'development'} mode. Gateway: ${API_GATEWAY_URL}`);