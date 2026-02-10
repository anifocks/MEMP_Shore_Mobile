// viswa-digital-backend/auth-service/controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as userModel from '../models/userModel.js';
// --- CRITICAL IMPORTS FOR MULTER ---
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
// Assuming authServer.js exports USER_IMAGE_DIR, otherwise this path join must be consistent
// For consistency with the last provided version, we'll keep the path.join locally:
// import { USER_IMAGE_DIR } from '../authServer.js'; 


// Get the directory name for Multer destination
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USER_IMAGE_DESTINATION = path.join(__dirname, '..', 'public', 'uploads', 'user_images');

// --- MULTER CONFIGURATION FOR USER IMAGES ---
const userImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Destination points to the static directory set up in authServer.js
        cb(null, USER_IMAGE_DESTINATION);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, `user-${uniqueSuffix}${fileExtension}`);
    }
});
const upload = multer({ 
    storage: userImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Export the Multer middleware for use in routes
export const uploadUserImageMiddleware = upload.single('profileImage');

// Controller to handle the response after file upload
export const uploadUserImage = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    // Return the relative path to the image, exposed statically in authServer.js
    const relativePath = path.join('/public/uploads/user_images', req.file.filename);
    res.json({ 
        message: 'Image uploaded successfully.', 
        imageUrl: relativePath 
    });
};
// ----------------------------------------------

// =========================================================
// OTP (Email) Helpers
// =========================================================
const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const maskEmail = (email) => {
    if (!email || !email.includes('@')) return 'your email';
    const [name, domain] = email.split('@');
    const maskedName = name.length <= 2 ? `${name[0]}*` : `${name[0]}${'*'.repeat(Math.min(4, name.length - 2))}${name[name.length - 1]}`;
    return `${maskedName}@${domain}`;
};

// Create a persistent transporter with connection pooling for faster email sending
let emailTransporter = null;
const createOtpTransporter = () => {
    if (emailTransporter) {
        return emailTransporter;
    }
    
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        return null;
    }
    
    emailTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        pool: true, // Enable connection pooling
        maxConnections: 5,
        maxMessages: 100,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        },
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
        },
        connectionTimeout: 5000, // 5 seconds connection timeout
        greetingTimeout: 5000,
        socketTimeout: 10000
    });
    
    return emailTransporter;
};

const sendOtpEmail = async (toEmail, otp) => {
    const transporter = createOtpTransporter();
    if (!transporter) {
        throw new Error('SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
    }
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
        from: `"MEMP" <${fromEmail}>`,
        to: toEmail,
        subject: 'Your MEMP Shore OTP',
        text: `Your one-time password (OTP) is: ${otp}. It expires in 10 minutes.`
    });
};

// =========================================================
// TWO-WAY AUTHENTICATION (OTP via Email) - NEW ENDPOINTS
// =========================================================

/**
 * Step 1: Request OTP for Login
 * Verifies password and sends OTP to user's email
 */
export const requestLoginOtp = async (req, res, next) => {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
        return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    try {
        let user = await userModel.findUserByEmail(identifier);
        if (!user) {
            user = await userModel.findUserByUsername(identifier);
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        if (!user.IsActive) {
            return res.status(403).json({ error: 'Account is inactive. Please contact administrator.' });
        }

        const isMatch = await bcrypt.compare(password, user.Password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Check if 2FA is required for this user
        if (!user.Require2FA) {
            // 2FA not required, login directly
            const currentJwtSecret = process.env.JWT_SECRET;
            if (!currentJwtSecret) {
                console.error('[AuthService] CRITICAL: JWT_SECRET is not defined!');
                return next(new Error('Server configuration error during token generation.'));
            }

            const tokenPayload = {
                userId: user.User_ID,
                username: user.Username,
                userRights: user.User_Rights
            };
            const token = jwt.sign(tokenPayload, currentJwtSecret, { expiresIn: '1h' });

            console.log(`[AuthService] User '${user.Username}' logged in successfully (no 2FA required).`);
            return res.json({
                message: 'Login successful',
                token: token,
                require2FA: false,
                user: {
                    userId: user.User_ID,
                    username: user.Username,
                    email: user.Email,
                    userRights: user.User_Rights
                }
            });
        }

        // 2FA is required, generate and send OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with expiration
        otpStore.set(user.User_ID, {
            otp,
            email: user.Email,
            createdAt: Date.now(),
            purpose: 'login'
        });

        // Send OTP via email
        try {
            await sendOtpEmail(user.Email, otp);
        } catch (emailError) {
            console.error('[AuthService] Failed to send OTP email:', emailError);
            return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
        }

        console.log(`[AuthService] OTP requested for login - User ID: ${user.User_ID}`);
        res.json({
            message: 'OTP sent to your email',
            maskedEmail: maskEmail(user.Email),
            userId: user.User_ID,
            require2FA: true
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Step 2: Verify OTP and Complete Login
 */
export const verifyLoginOtp = async (req, res, next) => {
    const { userId, otp } = req.body;
    
    if (!userId || !otp) {
        return res.status(400).json({ error: 'User ID and OTP are required.' });
    }

    try {
        const storedOtpData = otpStore.get(userId);
        
        if (!storedOtpData) {
            return res.status(401).json({ error: 'OTP not found or expired. Please request a new OTP.' });
        }

        // Check OTP expiration
        if (Date.now() - storedOtpData.createdAt > OTP_TTL_MS) {
            otpStore.delete(userId);
            return res.status(401).json({ error: 'OTP has expired. Please request a new OTP.' });
        }

        // Verify OTP
        if (storedOtpData.otp !== otp) {
            return res.status(401).json({ error: 'Invalid OTP. Please try again.' });
        }

        // OTP verified, now generate JWT token
        const user = await userModel.getUserById(userId);
        if (!user || !user.IsActive) {
            return res.status(404).json({ error: 'User not found or inactive.' });
        }

        const currentJwtSecret = process.env.JWT_SECRET;
        if (!currentJwtSecret) {
            console.error('[AuthService] CRITICAL: JWT_SECRET is not defined at OTP verification!');
            return next(new Error('Server configuration error during token generation.'));
        }

        const tokenPayload = {
            userId: user.User_ID,
            username: user.Username,
            userRights: user.User_Rights
        };
        const token = jwt.sign(tokenPayload, currentJwtSecret, { expiresIn: '1h' });

        // Clean up OTP
        otpStore.delete(userId);

        console.log(`[AuthService] User '${user.Username}' logged in successfully via OTP.`);
        res.json({
            message: 'Login successful',
            token: token,
            user: {
                userId: user.User_ID,
                username: user.Username,
                email: user.Email,
                userRights: user.User_Rights
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Step 1: Request OTP for Forgot Password (no password required)
 */
export const requestForgotPasswordOtp = async (req, res, next) => {
    const { identifier } = req.body;
    
    if (!identifier) {
        return res.status(400).json({ error: 'Username or Email is required.' });
    }

    try {
        let user = await userModel.findUserByEmail(identifier);
        if (!user) {
            user = await userModel.findUserByUsername(identifier);
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        if (!user.IsActive) {
            return res.status(403).json({ error: 'Account is inactive. Please contact administrator.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with expiration
        otpStore.set(user.User_ID, {
            otp,
            email: user.Email,
            createdAt: Date.now(),
            purpose: 'forgot-password'
        });

        // Send OTP via email
        try {
            await sendOtpEmail(user.Email, otp);
        } catch (emailError) {
            console.error('[AuthService] Failed to send OTP email:', emailError);
            return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
        }

        console.log(`[AuthService] OTP requested for forgot password - User ID: ${user.User_ID}`);
        res.json({
            message: 'OTP sent to your email',
            maskedEmail: maskEmail(user.Email),
            userId: user.User_ID
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Step 2: Verify OTP for Forgot Password and Reset Password
 */
export const verifyForgotPasswordOtp = async (req, res, next) => {
    const { userId, otp, newPassword } = req.body;
    
    if (!userId || !otp || !newPassword) {
        return res.status(400).json({ error: 'User ID, OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    try {
        const storedOtpData = otpStore.get(userId);
        
        if (!storedOtpData) {
            return res.status(401).json({ error: 'OTP not found or expired. Please request a new OTP.' });
        }

        // Check OTP expiration
        if (Date.now() - storedOtpData.createdAt > OTP_TTL_MS) {
            otpStore.delete(userId);
            return res.status(401).json({ error: 'OTP has expired. Please request a new OTP.' });
        }

        // Verify OTP
        if (storedOtpData.otp !== otp) {
            return res.status(401).json({ error: 'Invalid OTP. Please try again.' });
        }

        // Get user and update password
        const user = await userModel.getUserById(userId);
        if (!user || !user.IsActive) {
            return res.status(404).json({ error: 'User not found or inactive.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const success = await userModel.updateUserPassword(user.Username, hashedNewPassword);

        if (!success) {
            return res.status(500).json({ error: 'Failed to update password.' });
        }

        // Clean up OTP
        otpStore.delete(userId);

        console.log(`[AuthService] Password reset successfully for user '${user.Username}' via OTP.`);
        res.json({
            message: 'Password reset successfully. Please login with your new password.'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Step 1: Request OTP for Change Password (after old password verification)
 */
export const requestChangePasswordOtp = async (req, res, next) => {
    const { identifier, oldPassword } = req.body;
    
    if (!identifier || !oldPassword) {
        return res.status(400).json({ error: 'Username/Email and old password are required.' });
    }

    try {
        let user = await userModel.findUserByEmail(identifier);
        if (!user) {
            user = await userModel.findUserByUsername(identifier);
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        if (!user.IsActive) {
            return res.status(403).json({ error: 'Account is inactive. Please contact administrator.' });
        }

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.Password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect old password.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with expiration
        otpStore.set(user.User_ID, {
            otp,
            email: user.Email,
            createdAt: Date.now(),
            purpose: 'change-password'
        });

        // Send OTP via email
        try {
            await sendOtpEmail(user.Email, otp);
        } catch (emailError) {
            console.error('[AuthService] Failed to send OTP email:', emailError);
            return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
        }

        console.log(`[AuthService] OTP requested for change password - User ID: ${user.User_ID}`);
        res.json({
            message: 'OTP sent to your email',
            maskedEmail: maskEmail(user.Email),
            userId: user.User_ID
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Step 2: Verify OTP for Change Password
 */
export const verifyChangePasswordOtp = async (req, res, next) => {
    const { userId, otp, newPassword } = req.body;
    
    if (!userId || !otp || !newPassword) {
        return res.status(400).json({ error: 'User ID, OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    try {
        const storedOtpData = otpStore.get(userId);
        
        if (!storedOtpData) {
            return res.status(401).json({ error: 'OTP not found or expired. Please request a new OTP.' });
        }

        // Check OTP expiration
        if (Date.now() - storedOtpData.createdAt > OTP_TTL_MS) {
            otpStore.delete(userId);
            return res.status(401).json({ error: 'OTP has expired. Please request a new OTP.' });
        }

        // Verify OTP
        if (storedOtpData.otp !== otp) {
            return res.status(401).json({ error: 'Invalid OTP. Please try again.' });
        }

        // Get user and update password
        const user = await userModel.getUserById(userId);
        if (!user || !user.IsActive) {
            return res.status(404).json({ error: 'User not found or inactive.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const success = await userModel.updateUserPassword(user.Username, hashedNewPassword);

        if (!success) {
            return res.status(500).json({ error: 'Failed to update password.' });
        }

        // Clean up OTP
        otpStore.delete(userId);

        console.log(`[AuthService] Password changed successfully for user '${user.Username}' via OTP.`);
        res.json({
            message: 'Password changed successfully.'
        });
    } catch (err) {
        next(err);
    }
};

// =========================================================
// AUTHENTICATION FUNCTIONS 
// =========================================================

export const register = async (req, res, next) => {
    // UPDATED: Destructure userRights
    const { username, email, password, userRights } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }
    try {
        let existingUser = await userModel.findUserByUsername(username);
        if (existingUser) return res.status(409).json({ error: 'Username already exists.' });
        existingUser = await userModel.findUserByEmail(email);
        if (existingUser) return res.status(409).json({ error: 'Email already registered.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // UPDATED: Pass userRights (or default) to model
        const rightsToSave = userRights || 'Vessel User';
        const newUser = await userModel.createUser(username, email, hashedPassword, rightsToSave);
        
        if (!newUser) throw new Error("User creation returned no result.");

        console.log(`[AuthService] User '${newUser.Username}' (ID: ${newUser.User_ID}) registered with rights: ${rightsToSave}.`);
        const { Password, ...userResponse } = newUser;
        res.status(201).json({ message: 'User registered successfully', user: userResponse });
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    // Debug log: print incoming request body
    console.log('[AuthService] Incoming login request body:', req.body);
    const { identifier, password } = req.body;
    if (!identifier || !password) {
        return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    const currentJwtSecret = process.env.JWT_SECRET;
    if (!currentJwtSecret) {
        console.error('[AuthService] CRITICAL: JWT_SECRET is not defined in environment variables at login time!');
        return next(new Error('JWT signing secret is missing on the server.'));
    }

    try {
        let user;
        // Attempt to find the user by email first
        user = await userModel.findUserByEmail(identifier);

        // If no user found by email, attempt to find by username
        if (!user) {
            user = await userModel.findUserByUsername(identifier);
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        if (!user.IsActive) {
            return res.status(403).json({ error: 'Account is inactive. Please contact administrator.' });
        }

        const isMatch = await bcrypt.compare(password, user.Password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // UPDATED: Add userRights to token payload
        const tokenPayload = { 
            userId: user.User_ID, 
            username: user.Username,
            userRights: user.User_Rights 
        };
        const token = jwt.sign(tokenPayload, currentJwtSecret, { expiresIn: '1h' });

        console.log(`[AuthService] User '${user.Username}' logged in successfully.`);
        res.json({
            message: 'Login successful',
            token: token,
            // UPDATED: Add userRights to response object
            user: { 
                userId: user.User_ID, 
                username: user.Username, 
                email: user.Email,
                userRights: user.User_Rights
            }
        });
    } catch (err) {
        if (err.message && err.message.includes("secretOrPrivateKey must have a value")) {
             console.error('[AuthService] jwt.sign error even after check:', err);
             return next(new Error('Server configuration error during token generation.'));
        }
        next(err);
    }
};

export const changePassword = async (req, res, next) => {
    // ... (rest of changePassword remains the same)
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Username, old password, and new password are required.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }
    try {
        const user = await userModel.findUserByUsername(username);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        if (!user.IsActive) return res.status(403).json({ error: 'Account is inactive.' });

        const isMatch = await bcrypt.compare(oldPassword, user.Password);
        if (!isMatch) return res.status(401).json({ error: 'Incorrect old password.' });

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const success = await userModel.updateUserPassword(username, hashedNewPassword);

        if (success) {
            console.log(`[AuthService] Password updated for user '${username}'.`);
            res.json({ message: 'Password updated successfully.' });
        } else {
            res.status(404).json({ error: 'User not found or password update failed.' });
        }
    } catch (err) {
        next(err);
    }
};

export const verifyAdminPassword = async (req, res, next) => {
    // ... (rest of verifyAdminPassword remains the same)
    const { password } = req.body;
    try {
        const isMatch = await bcrypt.compare(password, 'hardcoded_admin_hash_here');
        if (password === 'admin') {
            return res.status(200).json({ isValid: true, message: 'Password verified successfully.' });
        } else {
            return res.status(401).json({ isValid: false, message: 'Incorrect password.' });
        }
    } catch (error) {
        next(error);
    }
};


// =========================================================
// USER MANAGEMENT FUNCTIONS
// =========================================================

// NEW FUNCTION: Controller to fetch distinct user rights
export const getUserRights = async (req, res, next) => {
    try {
        const rights = await userModel.getDistinctUserRights();
        res.json(rights); 
    } catch (err) {
        console.error('[AuthService] Error fetching user rights:', err);
        res.status(500).json({ error: 'Failed to retrieve user rights metadata.' });
    }
};


export const getUsersList = async (req, res, next) => {
    // ... (rest of getUsersList remains the same)
    try {
        const users = await userModel.getAllActiveUsers(); 
        res.json(users);
    } catch (err) {
        console.error('[AuthService] Error fetching user list:', err);
        next(err);
    }
};

export const getSingleUser = async (req, res, next) => {
    // ... (rest of getSingleUser remains the same)
    const userId = req.params.id;
    try {
        const user = await userModel.getUserById(userId); 
        if (!user) return res.status(404).json({ error: 'User not found.' });
        
        const { Password, ...userResponse } = user; // Exclude password from response
        res.json(userResponse);
    } catch (err) {
        console.error(`[AuthService] Error fetching user ID ${userId}:`, err);
        next(err);
    }
};

export const addUserByAdmin = async (req, res, next) => {
    // UPDATED: Destructure UserRights and Require2FA
    const { Username, Email, Password, FirstName, LastName, Designation, Fleet, Vessels, ImageURL, UserRights, Require2FA } = req.body;
    
    // For creation, all basic auth fields must be present and non-empty
    if (!Username || !Email || !Password) {
        return res.status(400).json({ error: 'Username, email, and password are required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(Email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    try {
        let existingUser = await userModel.findUserByUsername(Username); 
        if (existingUser) return res.status(409).json({ error: 'Username already exists.' });
        existingUser = await userModel.findUserByEmail(Email); 
        if (existingUser) return res.status(409).json({ error: 'Email already registered.' });

        const hashedPassword = await bcrypt.hash(Password, 10);
        
        // UPDATED: Pass UserRights and Require2FA to model
        const newUser = await userModel.createUserWithDetails(
            Username, 
            Email, 
            hashedPassword, 
            FirstName, 
            LastName, 
            Designation, 
            Fleet, 
            Vessels, 
            ImageURL,
            UserRights,
            Require2FA
        );

        if (!newUser) throw new Error("Admin user creation returned no result.");

        console.log(`[AuthService] Admin created user '${newUser.Username}' (ID: ${newUser.User_ID}).`);
        const { Password: NewUserPassword, ...userResponse } = newUser;
        res.status(201).json({ message: 'User created successfully', user: userResponse });
    } catch (err) {
        console.error('[AuthService] Error adding user by admin:', err);
        next(err);
    }
};

export const editUserDetails = async (req, res, next) => {
    // UPDATED: Destructure UserRights and Require2FA
    const userId = req.params.id;
    const { Username, Email, Password, FirstName, LastName, Designation, Fleet, Vessels, ImageURL, UserRights, Require2FA } = req.body; 
    
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });

    try {
        let hashedPassword = null;
        
        if (Password) {
            // Hash password only if it was provided in the request body
            hashedPassword = await bcrypt.hash(Password, 10);
        }
        
        // UPDATED: Pass UserRights and Require2FA to model
        const success = await userModel.updateUserDetails(
            userId,
            Username, 
            Email, 
            FirstName, 
            LastName, 
            Designation, 
            Fleet, 
            Vessels, 
            ImageURL,
            hashedPassword, // Pass null or the hashed password
            UserRights, // Pass the UserRights field
            Require2FA // Pass the Require2FA field
        );

        if (success) {
            console.log(`[AuthService] Admin updated details for user ID ${userId}.`);
            res.json({ message: 'User details updated successfully.' });
        } else {
            res.status(404).json({ error: 'User not found or update failed.' });
        }
    } catch (err) {
        console.error(`[AuthService] Error updating user ID ${userId}:`, err);
        next(err);
    }
};

export const softDeleteUser = async (req, res, next) => {
    // ... (rest of softDeleteUser remains the same)
    const userId = req.params.id;
    try {
        const success = await userModel.softDeleteUser(userId);
        if (success) {
            console.log(`[AuthService] User ID ${userId} soft-deleted (IsActive=0).`);
            res.json({ message: 'User successfully soft-deleted.' });
        } else {
            res.status(404).json({ error: 'User not found or soft delete failed (perhaps already deleted).' });
        }
    } catch (err) {
        console.error(`[AuthService] Error soft-deleting user ID ${userId}:`, err);
        next(err);
    }
};