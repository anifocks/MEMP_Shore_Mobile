// src/services/apiConfig.ts

/**
 * Mobile API Configuration
 * For mobile, we use __DEV__ to detect development mode
 */

// Robust environment check for React Native, web, and Node
let isProduction = false;
if (typeof globalThis !== 'undefined' && typeof globalThis.__DEV__ !== 'undefined') {
	isProduction = !globalThis.__DEV__;
} else if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
	isProduction = process.env.NODE_ENV === 'production';
}

const PROD_URL = 'https://veemsonboardupgrade.theviswagroup.com';
const DEV_URL = 'http://192.168.1.100:7000'; // Replace with your PC's local IP address for Android testing

export const API_GATEWAY_URL = isProduction ? PROD_URL : DEV_URL;

console.log(`[Mobile API Config] Running in ${isProduction ? 'production' : 'development'} mode. Gateway: ${API_GATEWAY_URL}`);