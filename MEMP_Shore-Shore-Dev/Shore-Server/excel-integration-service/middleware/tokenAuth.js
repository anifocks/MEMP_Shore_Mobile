// Token-based authentication middleware
// Checks for X-Upload-Token header and validates it

import { validateUploadToken } from '../models/excelModel.js';

/**
 * Middleware to authenticate requests using upload tokens
 * Can be used alongside JWT authentication (checks token first, falls back to JWT)
 */
export const authenticateWithToken = async (req, res, next) => {
    // Check for upload token in headers
    const uploadToken = req.headers['x-upload-token'];
    
    // If no upload token, proceed to next middleware (e.g., JWT auth)
    if (!uploadToken) {
        return next();
    }
    
    try {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const result = await validateUploadToken(uploadToken, ipAddress);
        
        if (result.IsValid) {
            // Token is valid - attach ship ID to request
            req.uploadTokenValid = true;
            req.shipIdFromToken = result.ShipID;
            req.authMethod = 'upload-token';
            
            console.log(`✅ Upload token validated for Ship ${result.ShipID}`);
            return next();
        } else {
            // Token is invalid
            return res.status(401).send({
                message: 'Invalid or expired upload token',
                details: result.Message
            });
        }
    } catch (error) {
        console.error('Token validation error:', error.message);
        return res.status(500).send({
            message: 'Token validation failed',
            details: error.message
        });
    }
};

/**
 * Optional middleware: Require either upload token OR JWT
 * Use this on routes that should accept both authentication methods
 */
export const requireAuthTokenOrJWT = (req, res, next) => {
    // If upload token was validated, allow access
    if (req.uploadTokenValid) {
        return next();
    }
    
    // If no upload token, check for JWT (assuming JWT middleware ran before this)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // JWT present - let JWT middleware handle it
        return next();
    }
    
    // No valid authentication found
    return res.status(401).send({
        message: 'Authentication required',
        details: 'Please provide either an upload token (X-Upload-Token header) or JWT (Authorization: Bearer token)'
    });
};
