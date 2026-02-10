// auth-service/routes/authRoutes.js
import express from 'express';
// --- CORRECT IMPORTS ---
import { 
    register, 
    login, 
    changePassword, 
    verifyAdminPassword,
    getUsersList,             
    getSingleUser,            
    addUserByAdmin,           
    editUserDetails,          
    softDeleteUser,
    uploadUserImage,          
    uploadUserImageMiddleware,
    getUserRights,
    requestLoginOtp,
    verifyLoginOtp,
    requestForgotPasswordOtp,
    verifyForgotPasswordOtp,
    requestChangePasswordOtp,
    verifyChangePasswordOtp
} from '../controllers/authController.js';

const router = express.Router();

// Middleware placeholder - In a real app, import and use your JWT verification and isAdmin middleware here

// Authentication Routes
router.post('/register', register);
router.post('/login', login);
router.post('/change-password', changePassword);
router.post('/verify-admin-password', verifyAdminPassword); 

// NEW: Two-Way Authentication Routes (OTP via Email)
router.post('/request-login-otp', requestLoginOtp);
router.post('/verify-login-otp', verifyLoginOtp);
router.post('/request-forgot-password-otp', requestForgotPasswordOtp);
router.post('/verify-forgot-password-otp', verifyForgotPasswordOtp);
router.post('/request-change-password-otp', requestChangePasswordOtp);
router.post('/verify-change-password-otp', verifyChangePasswordOtp); 

// =========================================================
// USER MANAGEMENT ROUTES 
// =========================================================

// NEW ROUTE: Fetch distinct user rights
router.get('/users/metadata/rights', getUserRights);

// FIX: File Upload Endpoint. Uses the Multer middleware.
router.post('/users/upload-image', uploadUserImageMiddleware, uploadUserImage);

// User CRUD Endpoints
router.get('/users', getUsersList); 
router.get('/users/:id', getSingleUser);
router.post('/users', addUserByAdmin);
router.put('/users/:id', editUserDetails);
router.delete('/users/:id', softDeleteUser); 

export default router;