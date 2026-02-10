// src/services/api.ts

import axios from 'axios';
import { API_GATEWAY_URL } from './apiConfig';

/**
 * Axios instance for mobile API calls
 */
export const apiClient = axios.create({
  baseURL: `${API_GATEWAY_URL}/api`,
  timeout: 10000, // Mobile-specific timeout
});

// --- SERVICE NAME CONSTANTS ---
export const VOYAGE_SERVICE_NAME = 'voyages';
export const SHIPS_SERVICE_NAME = 'ships';
export const MACHINERY_SERVICE_NAME = 'machinery';
export const PORTS_SERVICE_NAME = 'ports';
export const REPORTS_SERVICE_NAME = 'reporting';
export const BUNKER_SERVICE_NAME = 'bunkering';
export const AUTH_SERVICE_NAME = 'auth';
export const ADDITIVE_SERVICE_NAME = 'additives';
export const EXCEL_SERVICE_NAME = 'excel';

// --- FILE PATH CONSTANTS ---
const BASE_FILE_URL = `${API_GATEWAY_URL}/api/${VOYAGE_SERVICE_NAME}/uploads/voyage_attachments/`;
export const VESSEL_IMAGE_BASE_PATH = `${API_GATEWAY_URL}/api/${SHIPS_SERVICE_NAME}/uploads/vessel_images/`;
export const BUNKER_ATTACHMENT_BASE_PATH = `${API_GATEWAY_URL}/api/${BUNKER_SERVICE_NAME}/uploads/bunker_attachments/`;
export const USER_IMAGE_GATEWAY_BASE_URL = `${API_GATEWAY_URL}/api/${AUTH_SERVICE_NAME}`;
export const USER_IMAGE_BASE_PATH = `${API_GATEWAY_URL}/api/${AUTH_SERVICE_NAME}/public/uploads/user_images/`;
export const FLEET_LOGO_BASE_PATH = `${API_GATEWAY_URL}/api/${SHIPS_SERVICE_NAME}/public/uploads/fleet_logos/`;

// --- AUTHENTICATION FUNCTIONS ---
export const login = async (email: string, password: string) => {
  // Accepts username or email as identifier
  try {
    console.log('LOGIN REQUEST:', { identifier: email, password });
    const response = await apiClient.post(`/${AUTH_SERVICE_NAME}/login`, { identifier: email, password });
    console.log('LOGIN RESPONSE:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.log('LOGIN ERROR RESPONSE:', error.response.data);
    } else {
      console.log('LOGIN ERROR:', error);
    }
    throw error;
  }
};

export const logout = async () => {
  const response = await apiClient.post(`/${AUTH_SERVICE_NAME}/logout`);
  return response.data;
};

// --- VESSEL FUNCTIONS ---
export const fetchVessels = async () => {
  const response = await apiClient.get(`/${SHIPS_SERVICE_NAME}/vessels`);
  return response.data;
};

// --- COMPLIANCE FUNCTIONS ---
export const previewEuMrvData = async (vesselId: string, fromDate: string, toDate: string) => {
  const response = await apiClient.get(`/${EXCEL_SERVICE_NAME}/preview/eu-mrv`, {
    params: { vesselId, fromDate, toDate }
  });
  return response.data;
};

export const generateEuMrvReport = async (vesselId: string, fromDate: string, toDate: string) => {
  const response = await apiClient.post(`/${EXCEL_SERVICE_NAME}/generate/eu-mrv`, {
    vesselId, fromDate, toDate
  });
  return response.data;
};

// Add more functions as needed from the web api.js