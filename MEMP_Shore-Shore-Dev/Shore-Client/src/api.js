// File: Client/src/api.js

import axios from 'axios';
import { API_GATEWAY_URL } from './config/apiConfig'; 

/**
 * An axios instance for making data requests (GET, POST, PUT, etc.) through the gateway.
 */
export const apiClient = axios.create({
  baseURL: `${API_GATEWAY_URL}/api`,
});

// --- SERVICE NAME CONSTANTS ---
const VOYAGE_SERVICE_NAME = 'voyages';
const SHIPS_SERVICE_NAME = 'ships'; 
const MACHINERY_SERVICE_NAME = 'machinery';
const PORTS_SERVICE_NAME = 'ports'; 
const REPORTS_SERVICE_NAME = 'reporting'; 
const BUNKER_SERVICE_NAME = 'bunkering'; 
const AUTH_SERVICE_NAME = 'auth'; 
const ADDITIVE_SERVICE_NAME = 'additives'; // NEW: Added Additive Service
export const EXCEL_SERVICE_NAME = 'excel'; // NEW: Added Excel Service


// --- FILE PATH CONSTANTS ---
const BASE_FILE_URL = `${API_GATEWAY_URL}/api/${VOYAGE_SERVICE_NAME}/uploads/voyage_attachments/`; 
export const VESSEL_IMAGE_BASE_PATH = `${API_GATEWAY_URL}/api/${SHIPS_SERVICE_NAME}/uploads/vessel_images/`;
export const BUNKER_ATTACHMENT_BASE_PATH = `${API_GATEWAY_URL}/api/${BUNKER_SERVICE_NAME}/uploads/bunker_attachments/`; 
// Path to fetch user profile pictures
export const USER_IMAGE_GATEWAY_BASE_URL = `${API_GATEWAY_URL}/api/${AUTH_SERVICE_NAME}`;
export const USER_IMAGE_BASE_PATH = `${API_GATEWAY_URL}/api/${AUTH_SERVICE_NAME}/public/uploads/user_images/`;
// NEW: Base path for fetching fleet logos
export const FLEET_LOGO_BASE_PATH = `${API_GATEWAY_URL}/api/${SHIPS_SERVICE_NAME}/public/uploads/fleet_logos/`;

// --- API HELPER: RETRY LOGIC ---
/**
 * Retries a promise-based function on failure, specifically for 5xx server errors.
 * @param {Function} fn The async function to execute.
 * @param {number} retries Number of times to retry.
 * @param {number} delay Delay between retries in ms.
 * @returns {Promise<any>}
 */
const retryOnServerError = async (fn, retries = 2, delay = 1500) => {
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (error.response && error.response.status >= 500 && error.response.status < 600) {
                if (i === retries) throw error;
                console.warn(`API call failed with status ${error.response.status}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                throw error;
            }
        }
    }
};

// ------------------------------------------
// --- 🔐 ACCESS CONTROL HELPER (NEW) ---
// ------------------------------------------
const getUserContext = () => {
    try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
};

const filterDataByUserAccess = (data, type) => {
    const user = getUserContext();
    
    // *** CHANGE: Allow 'Admin' AND 'Super User' to see everything ***
    if (!user || user.userRights === 'Admin' || user.userRights === 'Super User') {
        return data;
    }

    // 2. Parse Assignments (Logic for restricted users remains the same)
    const assignedFleets = user.fleet ? user.fleet.split(',').map(s => s.trim().toLowerCase()) : [];
    const assignedVessels = user.vessels ? user.vessels.split(',').map(s => s.trim().toLowerCase()) : [];

    const hasFleetAccess = (fleetName) => fleetName && assignedFleets.includes(fleetName.toLowerCase());
    const hasVesselAccess = (vesselName, fleetName) => {
        return (vesselName && assignedVessels.includes(vesselName.toLowerCase())) || 
               (fleetName && hasFleetAccess(fleetName));
    };

    if (Array.isArray(data)) {
        if (type === 'fleet') {
            return data.filter(f => hasFleetAccess(f.fleetName || f.FleetName || f.Fleet));
        }
        if (type === 'vessel') {
            return data.filter(v => {
                const vName = v.shipName || v.ShipName || v.vesselName || v.VesselName || v.Ship;
                const vFleet = v.fleetName || v.FleetName || v.Fleet; 
                return hasVesselAccess(vName, vFleet);
            });
        }
    } 
    else if (data && typeof data === 'object') {
        if (type === 'fleet') {
            if (!hasFleetAccess(data.fleetName || data.FleetName || data.Fleet)) {
                throw new Error("Access Denied: You are not assigned to this Fleet.");
            }
        }
        if (type === 'vessel') {
            const vName = data.shipName || data.ShipName || data.vesselName || data.Ship;
            const vFleet = data.fleetName || data.FleetName || data.Fleet;
            if (!hasVesselAccess(vName, vFleet)) {
                 throw new Error("Access Denied: You are not assigned to this Vessel.");
            }
        }
    }
    
    return data;
};


/**
 * Helper to map API response (PascalCase) to frontend state (camelCase).
 * UPDATED: Map User_Rights to userRights.
 * @param {object} user - User object from the API response (PascalCase).
 * @returns {object} CamelCase user object.
 */
const mapUserToFrontend = (user) => {
    if (!user) return null;
    return {
        userId: user.User_ID,
        username: user.Username,
        email: user.Email,
        isActive: user.IsActive,
        firstName: user.FirstName,
        lastName: user.LastName,
        designation: user.Designation,
        fleet: user.Fleet,
        vessels: user.Vessels,
        // Map DB's ImageURL to a consistent local variable name
        imageUrl: user.ImageURL, 
        userRights: user.User_Rights || 'Vessel User', // NEW: Added User_Rights, default if null
        require2FA: user.Require2FA || false, // NEW: Added Require2FA
    };
};

/**
 * Helper to map frontend state (camelCase) to API payload (PascalCase).
 * UPDATED: Map userRights to UserRights.
 * @param {object} user - User object from the frontend state (camelCase).
 * @returns {object} PascalCase user payload.
 */
const mapUserToApi = (user) => {
    // Only map fields that are part of the SQL Server table structure
    const payload = {
        Username: user.username,
        Email: user.email,
        FirstName: user.firstName,
        LastName: user.lastName,
        Designation: user.designation,
        Fleet: user.fleet,
        Vessels: user.vessels,
        ImageURL: user.imageUrl,
        UserRights: user.userRights, // NEW: Added UserRights
        Require2FA: user.require2FA !== undefined ? user.require2FA : false, // NEW: Added Require2FA
    };

    // Conditionally include password for create or change-password scenario
    if (user.password !== undefined && user.password !== null) {
        payload.Password = user.password;
    }
    
    return payload;
};

// NEW: Fleet mapping function
const mapFleetToFrontend = (fleet) => {
    if (!fleet) return null;
    return {
        fleetId: fleet.FleetID,
        fleetName: fleet.FleetName,
        logoFilename: fleet.LogoFilename,
        description: fleet.Description,
        isActive: fleet.IsActive,
        dateCreated: fleet.DateCreated,
        lastModified: fleet.LastModified,
    };
};

// NEW: Vessel mapping function for fleet management dropdown
const mapVesselToMappingItem = (vessel) => {
    if (!vessel) return null;
    return {
        shipId: vessel.ShipID,
        shipName: vessel.ShipName,
        imoNumber: vessel.IMO_Number,
        fleetId: vessel.FleetID, // The fleet it's currently mapped to
        fleetName: vessel.FleetName // Ensure this is mapped if available
    };
};

// NEW: Helper to construct the full fleet logo URL.
export const getFleetLogoUrl = (filename) => {
    if (!filename) return '';
    // The logo filename is typically stored without the path, so we use the base path defined in the client
    return `${FLEET_LOGO_BASE_PATH}${filename}`;
};


export const getImageUrl = (service, imagePath) => {
  if (!imagePath) {
    return ''; 
  }
  return `${API_GATEWAY_URL}/api/${service}${imagePath}`;
};

export const getBunkerAttachmentUrl = (filename) => {
    if (!filename) return '';
    return `${BUNKER_ATTACHMENT_BASE_PATH}${filename}`;
};

// FIX: Dedicated helper to construct the full image URL.
// imagePath is the relative path stored in the DB (e.g., /public/uploads/user_images/filename.jpg).
export const getUserProfileImageUrl = (imagePath) => {
    if (!imagePath) return '';
    // Use the Auth service gateway base URL plus the relative path stored in the DB
    return `${USER_IMAGE_GATEWAY_BASE_URL}${imagePath}`;
};


// ------------------------------------------
// --- 1. AUTHENTICATION & USER MANAGEMENT API FUNCTIONS (UPDATED) ---
// ------------------------------------------

export const loginUser = async (identifier, password) => {
    try {
        const response = await apiClient.post('/auth/login', { identifier, password });
        // NEW: Persist user to localStorage immediately on login for access control
        if(response.data && response.data.user) {
            localStorage.setItem('user', JSON.stringify(mapUserToFrontend(response.data.user)));
        }
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Login failed due to a network error.';
        throw new Error(errorMessage);
    }
};

export const changePassword = async (username, oldPassword, newPassword) => {
    try {
        const response = await apiClient.post('/auth/change-password', {
            username,
            oldPassword,
            newPassword,
        });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Password update failed due to a network error.';
        throw new Error(errorMessage);
    }
};

// =========================================================
// TWO-WAY AUTHENTICATION (OTP via Email) - NEW FUNCTIONS
// =========================================================

/**
 * Request OTP for Login (after password verification)
 */
export const requestLoginOtp = async (identifier, password) => {
    try {
        const response = await apiClient.post('/auth/request-login-otp', { identifier, password });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to request OTP.';
        throw new Error(errorMessage);
    }
};

/**
 * Verify OTP and complete login
 */
export const verifyLoginOtp = async (userId, otp) => {
    try {
        const response = await apiClient.post('/auth/verify-login-otp', { userId, otp });
        // Persist user to localStorage immediately on login for access control
        if(response.data && response.data.user) {
            localStorage.setItem('user', JSON.stringify(mapUserToFrontend(response.data.user)));
        }
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'OTP verification failed.';
        throw new Error(errorMessage);
    }
};

/**
 * Request OTP for Forgot Password (no password required)
 */
export const requestForgotPasswordOtp = async (identifier) => {
    try {
        const response = await apiClient.post('/auth/request-forgot-password-otp', { identifier });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to request OTP.';
        throw new Error(errorMessage);
    }
};

/**
 * Verify OTP and reset password (Forgot Password)
 */
export const verifyForgotPasswordOtp = async (userId, otp, newPassword) => {
    try {
        const response = await apiClient.post('/auth/verify-forgot-password-otp', { userId, otp, newPassword });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'OTP verification failed.';
        throw new Error(errorMessage);
    }
};

/**
 * Request OTP for Change Password (after old password verification)
 */
export const requestChangePasswordOtp = async (identifier, oldPassword) => {
    try {
        const response = await apiClient.post('/auth/request-change-password-otp', { identifier, oldPassword });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to request OTP.';
        throw new Error(errorMessage);
    }
};

/**
 * Verify OTP and change password
 */
export const verifyChangePasswordOtp = async (userId, otp, newPassword) => {
    try {
        const response = await apiClient.post('/auth/verify-change-password-otp', { userId, otp, newPassword });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'OTP verification failed.';
        throw new Error(errorMessage);
    }
};

// --- NEW USER MANAGEMENT FUNCTIONS ---

// NEW FUNCTION: Fetch distinct user rights from DB
export const fetchUserRights = async () => {
    try {
        // Calls the new route /auth/users/metadata/rights
        const response = await apiClient.get('/auth/users/metadata/rights');
        return response.data; // Expected format: ['Admin', 'Supervisor', ...]
    } catch (error) {
        console.error('Failed to fetch user rights:', error.response?.data?.error || error.message);
        throw new Error('Failed to fetch user rights data.');
    }
};

export const fetchUsers = async () => {
    try {
        const response = await apiClient.get('/auth/users');
        // Map all users in the list to camelCase
        return response.data.map(mapUserToFrontend);
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch user list.';
        throw new Error(errorMessage);
    }
};

export const fetchUserDetails = async (userId) => {
    try {
        const response = await apiClient.get(`/auth/users/${userId}`);
        // Map the single user to camelCase
        return mapUserToFrontend(response.data);
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch user details.';
        throw new Error(errorMessage);
    }
};

export const saveUser = async (userId, payload) => {
    const isEditMode = !!userId;
    const url = isEditMode ? `/auth/users/${userId}` : `/auth/users`;
    const method = isEditMode ? 'put' : 'post';

    // Map payload from camelCase back to PascalCase for the API
    const apiPayload = mapUserToApi(payload);

    try {
        const response = await apiClient[method](url, apiPayload);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save user.';
        throw new Error(errorMessage);
    }
};

export const softDeleteUser = async (userId) => {
    try {
        // DELETE request sends the user ID in the URL parameter
        const response = await apiClient.delete(`/auth/users/${userId}`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete user.';
        throw new Error(errorMessage);
    }
};

export const uploadUserProfileImage = async (file) => {
    const formData = new FormData();
    formData.append('profileImage', file);

    try {
        const response = await apiClient.post('/auth/users/upload-image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to upload image.';
        throw new Error(errorMessage);
    }
};

// ------------------------------------------
// --- 2. VESSEL MANAGEMENT API FUNCTIONS ---
// ------------------------------------------

// 🚢 FIX: Reroute to REPORTS_SERVICE_NAME to fetch the latest location data from VDR.
// MODIFIED: Accepts an optional fleetName parameter for filtering.

// 🔐 SECURED: Filters by User Access
export const fetchVesselRecentLocation = async (fleetName = null) => {
    try {
        const params = {};
        // UPDATED CHECK: Filter out 'All Fleets' specifically
        if (fleetName && fleetName.toUpperCase() !== 'ALL' && fleetName !== 'All Fleets') {
             params.fleetName = fleetName;
        }

        const response = await apiClient.get(`/${REPORTS_SERVICE_NAME}/latest-vessel-locations`, { params });
        // APPLY FILTER: Limit locations to assigned vessels
        return filterDataByUserAccess(response.data, 'vessel');
    } catch (error) {
        console.error("Error fetching vessel recent locations:", error);
        throw new Error('Failed to fetch vessel location data.');
    }
};

// 🔐 SECURED: Filters by User Access
export const fetchVessels = async () => {
    try {
        const response = await apiClient.get(`/${SHIPS_SERVICE_NAME}/`);
        // APPLY FILTER
        return filterDataByUserAccess(response.data, 'vessel');
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch vessels.';
        throw new Error(errorMessage);
    }
};

// 🟢 NEW: Active Ships (Used by Excel Integration) - SECURED
export const fetchActiveShips = async () => {
    try {
        const response = await apiClient.get(`/${SHIPS_SERVICE_NAME}/active`);
        // APPLY FILTER
        return filterDataByUserAccess(response.data, 'vessel');
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch active vessels.';
        throw new Error(errorMessage);
    }
};

// 🔐 SECURED: Access Check on Details
export const fetchVesselDetails = async (shipId) => {
    try {
        const response = await apiClient.get(`/${SHIPS_SERVICE_NAME}/details/${shipId}`);
        // APPLY CHECK
        return filterDataByUserAccess(response.data, 'vessel');
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch vessel details.';
        throw new Error(errorMessage);
    }
};

export const deactivateVessel = async (shipId) => {
    try {
        const response = await apiClient.patch(`/${SHIPS_SERVICE_NAME}/${shipId}/inactive`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to deactivate vessel.';
        throw new Error(errorMessage);
    }
};

export const fetchShipTypes = async () => {
    try {
        const response = await apiClient.get(`/${SHIPS_SERVICE_NAME}/metadata/shiptypes`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch ship types.';
        throw new Error(errorMessage);
    }
};

export const fetchIceClasses = async () => {
    try {
        const response = await apiClient.get(`/${SHIPS_SERVICE_NAME}/metadata/iceclasses`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch ice classes.';
        throw new Error(errorMessage);
    }
};

export const saveVessel = async (id, payload) => {
    const isEditMode = !!id;
    const url = isEditMode ? `/${SHIPS_SERVICE_NAME}/${id}` : `/${SHIPS_SERVICE_NAME}`;
    const method = isEditMode ? 'put' : 'post';
    const isFormData = payload instanceof FormData;

    try {
        let response;
        if (isFormData) {
            response = await apiClient[method](url, payload);
        } else {
            response = await apiClient[method](url, payload);
        }
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save vessel. Please check the data and try again.';
        throw new Error(errorMessage);
    }
};


// =========================================================
// FLEET MANAGEMENT API FUNCTIONS (NEW)
// =========================================================

// NEW FUNCTION: Fetch fleets specifically for the map filter dropdown (includes "All Fleets" from server)
// 🔐 SECURED: Filter Dropdowns
export const fetchFleetsForMapFilter = async () => {
    try {
        // Calls GET /api/reporting/fleets
        const response = await apiClient.get(`/${REPORTS_SERVICE_NAME}/fleets`);
        
        const data = response.data;
        // Remove 'All Fleets' if restricted and apply filter
        const user = getUserContext();
        if (user && user.userRights !== 'Admin') {
            const filtered = filterDataByUserAccess(data.filter(f => f.FleetID !== 'ALL'), 'fleet');
            return filtered;
        }
        // The controller already formats this list including { FleetID: 'ALL', FleetName: 'All Fleets' }
        return data; 
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch fleets for map filter.';
        throw new Error(errorMessage);
    }
};


export const fetchFleets = async () => {
    try {
        // Calls GET /api/ships/fleets
        const response = await apiClient.get('/ships/fleets');
        const fleets = response.data.map(mapFleetToFrontend);
        // APPLY FILTER
        return filterDataByUserAccess(fleets, 'fleet');
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch fleets.';
        throw new Error(errorMessage);
    }
};

export const fetchFleetDetails = async (fleetId) => {
    try {
        // Calls GET /api/ships/fleets/:id
        const response = await apiClient.get(`/ships/fleets/${fleetId}`);
        const fleet = mapFleetToFrontend(response.data);
        // APPLY CHECK
        return filterDataByUserAccess(fleet, 'fleet');
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch fleet details.';
        throw new Error(errorMessage);
    }
};

// NEW: Fetch active and unmapped vessels (or those currently mapped to fleetId)
// 🔐 SECURED: Filter Mapping Options
export const fetchShipsForMapping = async (fleetId) => {
    try {
        // Calls GET /api/ships/fleets/ships-for-mapping?fleetId=...
        const response = await apiClient.get('/ships/fleets/ships-for-mapping', {
            params: { fleetId: fleetId || 0 } // Send 0 or current ID
        });
        const ships = response.data.map(mapVesselToMappingItem);
        
        // 🟢 REMOVED: return filterDataByUserAccess(ships, 'vessel');
        // RETURN ALL: Let the backend logic decide.
        return ships; 
    } catch (error) {
        console.error("Error fetching ships for mapping:", error);
        throw new Error('Failed to fetch vessel mapping data.');
    }
};

// NEW: API call to map selected ship IDs to the fleet
export const mapVesselsToFleet = async (fleetId, shipIds) => {
    try {
        // Calls POST /api/ships/fleets/:id/map-vessels
        const response = await apiClient.post(`/ships/fleets/${fleetId}/map-vessels`, {
            shipIds: shipIds, // Array of ShipIDs (integers)
        });
        return response.data;
    } catch (error) {
        console.error("Error mapping vessels to fleet:", error);
        throw new Error('Failed to update vessel-fleet mapping.');
    }
};

export const saveFleet = async (fleetId, payload) => {
    const isEditMode = !!fleetId;
    const url = isEditMode ? `/ships/fleets/${fleetId}` : `/ships/fleets`;
    const method = isEditMode ? 'put' : 'post';
    const isFormData = payload instanceof FormData; 

    if (!isFormData) {
        // Should always be FormData due to logo upload, matching the server's expectation
        throw new Error('Payload must be sent as FormData for fleet management to support logo upload.');
    }

    try {
        const response = await apiClient[method](url, payload);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save fleet.';
        throw new Error(errorMessage);
    }
};

export const softDeleteFleet = async (fleetId) => {
    try {
        // Calls DELETE /api/ships/fleets/:id
        const response = await apiClient.delete(`/ships/fleets/${fleetId}`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete fleet.';
        throw new Error(errorMessage);
    }
};


// ------------------------------------------
// --- 3. MACHINERY MANAGEMENT API FUNCTIONS ---
// ------------------------------------------

export const fetchMachineryTypes = async () => {
    try {
        const response = await apiClient.get(`/${MACHINERY_SERVICE_NAME}/types`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to load machinery types.';
        throw new Error(errorMessage);
    }
};

export const fetchFuelTypes = async () => {
    try {
        const response = await apiClient.get(`/${MACHINERY_SERVICE_NAME}/lookups/fuel-types`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to load fuel types.';
        throw new Error(errorMessage);
    }
};

export const fetchAssignedMachinery = async (shipId) => {
    try {
        const response = await apiClient.get(`/${MACHINERY_SERVICE_NAME}/ship/${shipId}`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to load assigned machinery.';
        throw new Error(errorMessage);
    }
};

export const assignMachineryToVessel = async (shipId, payload) => {
    try {
        const response = await apiClient.post(`/${MACHINERY_SERVICE_NAME}/ship/${shipId}`, payload);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to assign machinery.';
        throw new Error(errorMessage);
    }
};

export const deleteMachineryRecord = async (machineryRecordId, username) => {
    try {
        const response = await apiClient.delete(`/${MACHINERY_SERVICE_NAME}/${machineryRecordId}`, { 
            data: { username } 
        });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete machinery.';
        throw new Error(errorMessage);
    }
};

// ------------------------------------------
// --- 4. PORT MANAGEMENT API FUNCTIONS ---
// ------------------------------------------

export const fetchPorts = async (searchTerm = '') => {
    try {
        const response = await apiClient.get(`/${PORTS_SERVICE_NAME}`, { 
            params: { search: searchTerm } 
        });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch port data.';
        throw new Error(errorMessage);
    }
};

export const fetchPortDetails = async (portId) => {
    try {
        const response = await apiClient.get(`/${PORTS_SERVICE_NAME}/${portId}`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch port details.';
        throw new Error(errorMessage);
    }
};

export const savePort = async (portId, payload) => {
    const isEditMode = !!portId;
    const url = isEditMode ? `/${PORTS_SERVICE_NAME}/${portId}` : `/${PORTS_SERVICE_NAME}`;
    const method = isEditMode ? 'put' : 'post';

    try {
        const response = await apiClient[method](url, payload);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save port.';
        throw new Error(errorMessage);
    }
};

export const deletePort = async (portId, username) => {
    try {
        const response = await apiClient.delete(`/${PORTS_SERVICE_NAME}/${portId}`, { 
            data: { username } 
        });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to mark port as inactive.';
        throw new Error(errorMessage);
    }
};

/**
 * Fetches port details by port code (used in BunkerDetailsPage).
 */
export const fetchPortDetailsByCode = async (portCode) => {
    if (!portCode) throw new Error('Port Code is required.');
    try {
        const response = await apiClient.get(`/${PORTS_SERVICE_NAME}/by-code/${portCode}`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch port details by code.';
        throw new Error(errorMessage);
    }
};


// ------------------------------------------
// --- 5. BUNKER MANAGEMENT API FUNCTIONS ---
// ------------------------------------------

/**
 * Fetches all bunkering records, optionally filtered by vessel ID, and includes attachments.
 */
// 🔐 SECURED: Filter Bunkering Records
export const fetchBunkeringRecords = async (vesselId) => {
    try {
        const endpoint = vesselId ? `/${BUNKER_SERVICE_NAME}/vessel/${vesselId}` : `/${BUNKER_SERVICE_NAME}`;
        const recordsResponse = await apiClient.get(endpoint);
        
        // Filter records based on vessel access
        const filteredRecords = filterDataByUserAccess(recordsResponse.data, 'vessel');

        // This mirrors the component's original complex logic to fetch attachments inline
        const recordsWithAttachments = await Promise.all(filteredRecords.map(async (bunker) => {
            try {
                const attachmentsResponse = await apiClient.get(`/${BUNKER_SERVICE_NAME}/${bunker.BunkerRecordID}/attachments`);
                return { ...bunker, attachments: attachmentsResponse.data };
            } catch (err) {
                return { ...bunker, attachments: [] };
            }
        }));

        return recordsWithAttachments;
    } catch (error) {
        console.error(`Error fetching bunkering records:`, error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch bunkering records.';
        throw new Error(errorMessage);
    }
};

/**
 * Fetches details for a single bunkering record.
 */
export const fetchBunkeringRecordDetails = async (recordId) => {
    try {
        const response = await apiClient.get(`/${BUNKER_SERVICE_NAME}/details/${recordId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching bunker details for ID ${recordId}:`, error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch bunkering record details.';
        throw new Error(errorMessage);
    }
};

/**
 * Fetches attachments for a single bunkering record.
 */
export const fetchBunkerAttachments = async (recordId) => {
    try {
        const response = await apiClient.get(`/${BUNKER_SERVICE_NAME}/${recordId}/attachments`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch bunker attachments.';
        throw new Error(errorMessage);
    }
};


/**
 * Fetches active vessels for the bunkering filter dropdown.
 */
// 🔐 SECURED: Filter Active Vessels
export const fetchActiveVesselsForBunkering = async () => {
    try {
        const response = await apiClient.get(`/${BUNKER_SERVICE_NAME}/lookup/ships/active`);
        // APPLY FILTER
        return filterDataByUserAccess(response.data, 'vessel');
    } catch (error) {
        console.error(`Error fetching active vessels for bunkering:`, error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch active vessels.';
        throw new Error(errorMessage);
    }
};

/**
 * Deactivates a bunker record (sets IsActive = 0).
 */
export const deactivateBunkerRecord = async (recordId) => {
    try {
        const response = await apiClient.put(`/${BUNKER_SERVICE_NAME}/deactivate/${recordId}`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to deactivate record.';
        throw new Error(errorMessage);
    }
};


// ------------------------------------------
// --- 6. VOYAGE MANAGEMENT API FUNCTIONS ---
// ------------------------------------------

/**
 * Fetches all active voyages.
 */
// 🔐 SECURED: Filter Voyages List
export const fetchVoyages = async () => {
    try {
        const response = await apiClient.get(`/${VOYAGE_SERVICE_NAME}`);
        if (Array.isArray(response.data)) {
            // APPLY FILTER
            const activeVoyages = response.data.filter(voyage => voyage.IsActive);
            return filterDataByUserAccess(activeVoyages, 'vessel');
        }
        return [];
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to load voyage list.';
        throw new Error(errorMessage);
    }
};

/**
 * Soft deletes a voyage (sets IsActive = 0).
 */
export const softDeleteVoyage = async (voyageId) => {
    try {
        const response = await apiClient.delete(`/${VOYAGE_SERVICE_NAME}/${voyageId}`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to mark voyage as inactive.';
        throw new Error(errorMessage);
    }
};

/**
 * Fetches the details for a single voyage (includes legs in the response).
 */
export const fetchVoyageDetails = async (voyageId) => {
    try {
        const response = await apiClient.get(`/${VOYAGE_SERVICE_NAME}/details/${voyageId}`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to load voyage details.';
        throw new Error(errorMessage);
    }
};

const handleVoyageSave = async (id, voyageData, attachments = []) => {
    const isEditMode = !!id;
    const url = isEditMode ? `/${VOYAGE_SERVICE_NAME}/${id}` : `/${VOYAGE_SERVICE_NAME}`;
    const method = isEditMode ? 'put' : 'post';

    if (attachments.length > 0) {
        const formData = new FormData();
        
        for (const key in voyageData) {
            formData.append(key, voyageData[key] === null || voyageData[key] === undefined ? '' : String(voyageData[key])); 
        }
        
        attachments.forEach(file => {
            formData.append('attachments', file);
        });

        try {
            const response = await apiClient[method](url, formData);
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(errorMessage);
        }
    } else {
        try {
            const response = await apiClient[method](url, voyageData);
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(errorMessage);
        }
    }
};

export const createVoyage = (voyageData, attachments) => handleVoyageSave(null, voyageData, attachments);
export const updateVoyage = (id, voyageData, attachments) => handleVoyageSave(id, voyageData, attachments);

export const fetchVoyageAttachments = async (voyageId) => {
    try {
        const response = await apiClient.get(`/${VOYAGE_SERVICE_NAME}/${voyageId}/attachments`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch voyage attachments.';
        throw new Error(errorMessage);
    }
};

export const getVoyageAttachmentUrl = (filename) => {
    if (!filename) return '';
    return `${BASE_FILE_URL}${filename}`;
};

export const fetchVoyageLegs = async (voyageId) => {
    try {
        const response = await apiClient.get(`/voyages/${voyageId}/legs`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch voyage legs.';
        throw new Error(errorMessage);
    }
};

export const createVoyageLeg = async (voyageId, legData) => {
    try {
        const response = await apiClient.post(`/voyages/${voyageId}/legs`, legData);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create voyage leg.';
        throw new Error(errorMessage);
    }
};

export const fetchVoyageLegAttachments = async (voyageLegId) => {
    try {
        const response = await apiClient.get(`/${VOYAGE_SERVICE_NAME}/legs/${voyageLegId}/attachments`);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch leg attachments.';
        throw new Error(errorMessage);
    }
};

export const updateVoyageLeg = async (voyageLegId, payload) => {
    try {
        const response = await apiClient.put(`/${VOYAGE_SERVICE_NAME}/legs/${voyageLegId}`, payload);
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update leg.';
        throw new Error(errorMessage);
    }
};


// ------------------------------------------
// --- 7. REPORTING API FUNCTIONS ---
// ------------------------------------------

//------------------------------------------
// --- 7. REPORTING API FUNCTIONS (ADDITIONS) ---
// ------------------------------------------

/**
 * Fetches brief vessel details by ID (used for name lookup in reports).
 * Uses the simple /ships/:shipId route.
 * @param {number} shipId - The ID of the vessel.
 * @returns {Promise<object>} The vessel details object (usually ShipName and IMO).
 */
export const fetchShipById = async (shipId) => {
    try {
        // Route: GET /api/ships/:shipId 
        const response = await apiClient.get(`/${SHIPS_SERVICE_NAME}/${shipId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching vessel details for ID ${shipId}:`, error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch vessel details for lookup.';
        throw new Error(errorMessage);
    }
};

/**
 * Fetches details for a single report record, including all sub-logs.
 * @param {number} reportId - The ID of the report.
 * @returns {Promise<object>} The complete report details object.
 */
export const fetchReportDetails = async (reportId) => {
    try {
        // Route: GET /api/reporting/reports/:reportId
        const response = await apiClient.get(`/${REPORTS_SERVICE_NAME}/reports/${reportId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching report details for ID ${reportId}:`, error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to load report details.';
        throw new Error(errorMessage);
    }
};




export const fetchBdnNumbersByLubeOilType = async (shipId, loTypeKey) => {
    try {
        const response = await apiClient.get(`/reporting/ship/${shipId}/lo-bdn-rob/${loTypeKey}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching BDN numbers for LO Type ${loTypeKey}:`, error);
        return [];
    }
};

export const fetchVoyageParents = async (shipId, referenceDatetime = null) => {
    try {
        const params = referenceDatetime ? { referenceDatetime } : {};
        const response = await apiClient.get(`/reporting/voyages/by-ship/${shipId}/parents`, { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const fetchVoyageLegsByParent = async (voyageId, referenceDatetime = null) => {
    try {
        const params = referenceDatetime ? { referenceDatetime } : {};
        const response = await apiClient.get(`/reporting/voyages/by-voyage/${voyageId}/legs`, { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const fetchVoyageLegsUnified = async (shipId) => {
    try {
        const response = await apiClient.get(`/${REPORTS_SERVICE_NAME}/ship/${shipId}/voyage-legs/unified`);
        return response.data;
    } catch (error) {
        throw new Error('Failed to load voyage filter data.');
    }
};

export const fetchReportTypes = async () => {
    try {
        const response = await apiClient.get(`/${REPORTS_SERVICE_NAME}/report-types`);
        return response.data;
    } catch (error) {
        throw new Error('Failed to load report types.');
    }
};

export const fetchVesselReports = async (params) => {
    try {
        const response = await apiClient.get(`/${REPORTS_SERVICE_NAME}/ship/${params.shipId}/reports`, { params });
        return response.data;
    } catch (error) {
        throw new Error('Failed to load vessel reports.');
    }
};

export const deleteVesselReport = async (reportId) => {
    try {
        const response = await apiClient.delete(`/${REPORTS_SERVICE_NAME}/reports/${reportId}`);
        return response.data;
    } catch (error) {
        throw new Error('Failed to delete report.');
    }
};

// 🟢 FIX: Ensure fetching "All Fleets" works by checking for empty/null fleetName
export const fetchLatestVesselReports = async (fleetName) => {
    try {
        const params = {};
        if (fleetName && fleetName !== 'All Fleets') {
            params.fleetName = fleetName;
        }
        // This will call /api/reporting/latest-vessel-reports
        const response = await apiClient.get(`/${REPORTS_SERVICE_NAME}/latest-vessel-reports`, { params });
        // The filterDataByUserAccess will now correctly handle data even if it has 'Ship' or 'Fleet' keys
        return filterDataByUserAccess(response.data, 'vessel');
    } catch (e) {
        console.error("Error fetching latest vessel reports:", e);
        throw e;
    }
};

// NEW FUNCTION: Get Single Machinery Record
export const fetchMachineryRecordById = async (recordId) => {
    try {
        // CHANGED from `/${MACHINERY_SERVICE_NAME}/machinery/${recordId}`
        // TO `/${MACHINERY_SERVICE_NAME}/${recordId}`
        // This results in /api/machinery/8 instead of /api/machinery/machinery/8
        const response = await apiClient.get(`/${MACHINERY_SERVICE_NAME}/${recordId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching machinery details:", error);
        throw new Error('Failed to load machinery details.');
    }
};

// 🟢 UPDATED: Fetch Machinery Analytics with Voyage support
export const fetchMachineryAnalytics = async (recordId, fromDate, toDate, voyage = null) => {
    try {
        const params = { fromDate, toDate };
        if (voyage) params.voyage = voyage; // Add voyage to params if it exists

        const response = await apiClient.get(`/${MACHINERY_SERVICE_NAME}/${recordId}/analytics`, {
            params: params
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching machinery analytics:", error);
        throw error;
    }
};

// ------------------------------------------
// --- 🟢 8. ADDITIVE & BLENDING (NEW SECURED) ---
// ------------------------------------------

export const fetchAdditiveTypes = async () => {
    try {
        const response = await apiClient.get(`/${ADDITIVE_SERVICE_NAME}/types`);
        return response.data;
    } catch (error) {
        throw new Error('Failed to fetch additive types.');
    }
};

// 🔐 SECURED: Fetch Additive Events
export const fetchAdditiveEvents = async (shipId, params = {}) => {
    try {
        // If shipId is 0 (All), result needs filtering
        const response = await apiClient.get(`/${ADDITIVE_SERVICE_NAME}/ship/${shipId}`, { params });
        // APPLY FILTER
        return filterDataByUserAccess(response.data, 'vessel');
    } catch (error) {
        throw new Error('Failed to fetch additive events.');
    }
};

export const fetchAdditiveDosingRefs = async (shipId) => {
    try {
        const url = shipId && shipId !== 0 
            ? `/${ADDITIVE_SERVICE_NAME}/references?shipId=${shipId}` 
            : `/${ADDITIVE_SERVICE_NAME}/references`;
        // Refs return simple IDs, relying on shipId filter from component or subsequent secure call
        const response = await apiClient.get(url);
        return response.data;
    } catch (error) {
        throw new Error('Failed to fetch dosing references.');
    }
};

export const deleteAdditiveEvent = async (id) => {
    try {
        const response = await apiClient.delete(`/${ADDITIVE_SERVICE_NAME}/event/${id}`);
        return response.data;
    } catch (error) {
        throw new Error('Failed to delete additive event.');
    }
};

// 🔐 SECURED: Dashboard
export const fetchAdditiveDashboard = async (params) => {
    try {
        const response = await apiClient.get(`/${ADDITIVE_SERVICE_NAME}/dashboard`, { params });
        const data = response.data;
        // Secure the Fleet Comparison Chart data
        if (data && Array.isArray(data.byShip)) {
            data.byShip = filterDataByUserAccess(data.byShip, 'vessel');
        }
        return data;
    } catch (error) {
        throw new Error('Failed to fetch additive dashboard data.');
    }
};

// ------------------------------------------
// --- 9. VESSEL STATUS DASHBOARD (NEW) ---
// ------------------------------------------

// Component 1: Get Aggregated Voyage Details (Distance, Durations, Fuel)
// 🟢 NEW: Fetch Voyage List
export const fetchVoyageList = async (shipId) => {
    try {
        const response = await apiClient.get(`/${REPORTS_SERVICE_NAME}/dashboard/voyage-list/${shipId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching voyage list:", error);
        return [];
    }
};

// 🟢 UPDATED: Fetch Voyage Stats (accepts optional voyageNumber)
export const fetchLatestVoyageStats = async (shipId, voyageNumber = null) => {
    try {
        // Append query param if voyageNumber exists
        const url = `/${REPORTS_SERVICE_NAME}/dashboard/voyage-stats/${shipId}${voyageNumber ? `?voyage=${encodeURIComponent(voyageNumber)}` : ''}`;
        const response = await apiClient.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching voyage stats:", error);
        throw new Error('Failed to load voyage statistics.');
    }
};

// Component 2: Get Single Latest Report Details
export const fetchLatestReportSnapshot = async (shipId) => {
    try {
        const response = await apiClient.get(`/${REPORTS_SERVICE_NAME}/dashboard/latest-snapshot/${shipId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching latest report snapshot:", error);
        throw new Error('Failed to load latest report.');
    }
};

// 🟢 UPDATED: Fetch SFOC with Voyage support
export const fetchSFOCAnalytics = async (id, fromDate, toDate, voyage = null) => {
    try {
        const params = { fromDate, toDate };
        if (voyage) params.voyage = voyage; // Add voyage to params if it exists

        const response = await apiClient.get(`/${MACHINERY_SERVICE_NAME}/${id}/sfoc`, {
            params: params
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching SFOC data:", error);
        return []; 
    }
};

// Fetch Emissions Analytics for Vessel Emissions Page
// --- Emissions Analytics (New) ---
export const fetchVesselEmissionsAnalytics = async (shipId, fromDate, toDate, voyage) => {
    try {
        let query = `?fromDate=${fromDate}&toDate=${toDate}`;
        if (voyage) query += `&voyage=${encodeURIComponent(voyage)}`;
        
        // Ensure this matches the route defined in step 3
        const response = await apiClient.get(`/${REPORTS_SERVICE_NAME}/dashboard/emissions-analytics/${shipId}${query}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching emissions analytics:", error);
        return null;
    }
};

export const previewVerifaviaData = async ({ shipId, fromDate, toDate, year }) => {
    const apiCall = () => apiClient.post(
        `/${REPORTS_SERVICE_NAME}/preview/verifavia`,
        { shipId, fromDate, toDate, year }
    );

    try {
        const response = await retryOnServerError(apiCall);
        return response.data;
    } catch (error) {
        console.error('Error fetching Verifavia preview data after retries:', error);
        // Extract a more specific error message from the JSON response
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch preview data.';
        throw new Error(errorMessage);
    }
};

export const generateVerifaviaReport = async ({ shipId, fromDate, toDate }) => {
    const apiCall = () => apiClient.post(
        `/${REPORTS_SERVICE_NAME}/generate/verifavia`,
        { shipId, fromDate, toDate },
        { responseType: 'blob' }
    );

    try {
        const response = await retryOnServerError(apiCall);
        return response.data;
    } catch (error) {
        console.error('Error generating Verifavia report after retries:', error);
        // Handle cases where the error response itself is a blob (e.g., JSON error)
        if (error.response && error.response.data instanceof Blob && error.response.data.type.toLowerCase().includes('json')) {
            const errorText = await error.response.data.text();
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || errorJson.error || 'Failed to generate report file.');
        }
        const errorMessage = error.message || 'Failed to generate the report file.';
        throw new Error(errorMessage);
    }
};

export const previewEuMrvData = async ({ shipId, fromDate, toDate, year }) => {
    const apiCall = () => apiClient.post(
        `/${REPORTS_SERVICE_NAME}/preview/eumrv`,
        { shipId, fromDate, toDate, year }
    );

    try {
        console.log('Making API call to previewEuMrvData');
        const response = await retryOnServerError(apiCall);
        console.log('API response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching EU MRV preview data after retries:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch EU MRV preview data.';
        throw new Error(errorMessage);
    }
};

export const generateEuMrvReport = async ({ shipId, fromDate, toDate }) => {
    const apiCall = () => apiClient.post(
        `/${REPORTS_SERVICE_NAME}/generate/eumrv`,
        { shipId, fromDate, toDate },
        { responseType: 'blob' }
    );

    try {
        const response = await retryOnServerError(apiCall);
        return response.data;
    } catch (error) {
        console.error('Error generating EU MRV report after retries:', error);
        // Handle cases where the error response itself is a blob (e.g., JSON error)
        if (error.response && error.response.data instanceof Blob && error.response.data.type.toLowerCase().includes('json')) {
            const errorText = await error.response.data.text();
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || errorJson.error || 'Failed to generate EU MRV report file.');
        }
        const errorMessage = error.message || 'Failed to generate the EU MRV report file.';
        throw new Error(errorMessage);
    }
};

export const previewEuEtsData = async ({ shipId, fromDate, toDate, year }) => {
    const apiCall = () => apiClient.post(
        `/${REPORTS_SERVICE_NAME}/preview/euets`,
        { shipId, fromDate, toDate, year }
    );

    try {
        const response = await retryOnServerError(apiCall);
        return response.data;
    } catch (error) {
        console.error('Error fetching EU ETS preview data after retries:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch EU ETS preview data.';
        throw new Error(errorMessage);
    }
};

export const generateEuEtsReport = async ({ shipId, fromDate, toDate }) => {
    const apiCall = () => apiClient.post(
        `/${REPORTS_SERVICE_NAME}/generate/euets`,
        { shipId, fromDate, toDate },
        { responseType: 'blob' }
    );

    try {
        const response = await retryOnServerError(apiCall);
        return response.data;
    } catch (error) {
        console.error('Error generating EU ETS report after retries:', error);
        // Handle cases where the error response itself is a blob (e.g., JSON error)
        if (error.response && error.response.data instanceof Blob && error.response.data.type.toLowerCase().includes('json')) {
            const errorText = await error.response.data.text();
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || errorJson.error || 'Failed to generate EU ETS report file.');
        }
        const errorMessage = error.message || 'Failed to generate the EU ETS report file.';
        throw new Error(errorMessage);
    }
};

export const previewUkMrvData = async ({ shipId, fromDate, toDate, year }) => {
    const apiCall = () => apiClient.post(
        `/${REPORTS_SERVICE_NAME}/preview/ukmrv`,
        { shipId, fromDate, toDate, year }
    );

    try {
        const response = await retryOnServerError(apiCall);
        return response.data;
    } catch (error) {
        console.error('Error fetching UK MRV preview data after retries:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch UK MRV preview data.';
        throw new Error(errorMessage);
    }
};

export const generateUkMrvReport = async ({ shipId, fromDate, toDate }) => {
    const apiCall = () => apiClient.post(
        `/${REPORTS_SERVICE_NAME}/generate/ukmrv`,
        { shipId, fromDate, toDate },
        { responseType: 'blob' }
    );

    try {
        const response = await retryOnServerError(apiCall);
        return response.data;
    } catch (error) {
        console.error('Error generating UK MRV report after retries:', error);
        // Handle cases where the error response itself is a blob (e.g., JSON error)
        if (error.response && error.response.data instanceof Blob && error.response.data.type.toLowerCase().includes('json')) {
            const errorText = await error.response.data.text();
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || errorJson.error || 'Failed to generate UK MRV report file.');
        }
        const errorMessage = error.message || 'Failed to generate the UK MRV report file.';
        throw new Error(errorMessage);
    }
};

export const previewUkEtsData = async ({ shipId, fromDate, toDate, year }) => {
    const apiCall = () => apiClient.post(
        `/${REPORTS_SERVICE_NAME}/preview/ukets`,
        { shipId, fromDate, toDate, year }
    );

    try {
        const response = await retryOnServerError(apiCall);
        return response.data;
    } catch (error) {
        console.error('Error fetching UK ETS preview data after retries:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch UK ETS preview data.';
        throw new Error(errorMessage);
    }
};

export const generateUkEtsReport = async ({ shipId, fromDate, toDate }) => {
    const apiCall = () => apiClient.post(
        `/${REPORTS_SERVICE_NAME}/generate/ukets`,
        { shipId, fromDate, toDate },
        { responseType: 'blob' }
    );

    try {
        const response = await retryOnServerError(apiCall);
        return response.data;
    } catch (error) {
        console.error('Error generating UK ETS report after retries:', error);
        // Handle cases where the error response itself is a blob (e.g., JSON error)
        if (error.response && error.response.data instanceof Blob && error.response.data.type.toLowerCase().includes('json')) {
            const errorText = await error.response.data.text();
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || errorJson.error || 'Failed to generate UK ETS report file.');
        }
        const errorMessage = error.message || 'Failed to generate the UK ETS report file.';
        throw new Error(errorMessage);
    }
};