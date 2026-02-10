// src/components/Login/Login.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Login.css';
import RotatingBackground from '../RotatingBackground'; 
import { 
    loginUser, 
    changePassword,
    requestLoginOtp,
    verifyLoginOtp,
    requestForgotPasswordOtp,
    verifyForgotPasswordOtp,
    requestChangePasswordOtp,
    verifyChangePasswordOtp
} from '../../api';

const Login = () => {
    // Login states
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    
    // OTP states
    const [otpStep, setOtpStep] = useState(null); // null, 'login', 'forgot-password', 'change-password'
    const [otp, setOtp] = useState('');
    const [userId, setUserId] = useState(null);
    const [maskedEmail, setMaskedEmail] = useState('');
    
    // Change password states
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [newPasswordForForgot, setNewPasswordForForgot] = useState('');
    const [confirmNewPasswordForForgot, setConfirmNewPasswordForForgot] = useState('');
    
    // Show forgot password
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordIdentifier, setForgotPasswordIdentifier] = useState('');
    
    const loginContainerRef = useRef(null);
    const logoRef = useRef(null);
    const CompanylogoRef = useRef(null);

    useEffect(() => {
        if (!error && loginContainerRef.current) {
            loginContainerRef.current.style.height = '';
        }

        const adjustLogoSize = () => {
            if (loginContainerRef.current && logoRef.current) {
                const containerHeight = loginContainerRef.current.clientHeight;
                let logoHeight = containerHeight * 0.15;
                logoHeight = Math.max(50, Math.min(logoHeight, 120));
                logoRef.current.style.maxHeight = `${logoHeight}px`;
            }
        };

        adjustLogoSize();
        window.addEventListener('resize', adjustLogoSize);

        return () => {
            window.removeEventListener('resize', adjustLogoSize);
        };
    }, [error]);

    // =============================================
    // LOGIN WITH OTP FLOW
    // =============================================
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!identifier.trim() || !password.trim()) {
            setError('Username/Email and Password are required.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await requestLoginOtp(identifier, password);
            
            // Check if 2FA is required
            if (response.require2FA === false) {
                // User doesn't need 2FA, login directly
                if (response.user && response.user.username) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', response.user.username);
                    if (response.user.userId) {
                        localStorage.setItem('userId', response.user.userId.toString());
                    }
                    if (response.token) {
                        localStorage.setItem('token', response.token);
                    }
                    console.log('Login successful (no 2FA):', response.message);
                    navigate('/app/memp');
                } else {
                    setError('Login failed. Please try again.');
                }
            } else {
                // 2FA required, proceed to OTP step
                setUserId(response.userId);
                setMaskedEmail(response.maskedEmail);
                setOtpStep('login');
                setOtp('');
                console.log('OTP sent to email for login');
            }
        } catch (err) {
            console.error('Login request error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyLoginOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!otp.trim()) {
            setError('OTP is required.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await verifyLoginOtp(userId, otp);
            
            if (response && response.user && response.user.username) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', response.user.username);
                if (response.user.userId) {
                    localStorage.setItem('userId', response.user.userId.toString());
                }
                if (response.token) {
                    localStorage.setItem('token', response.token);
                }
                console.log('Login successful with OTP:', response.message);
                setOtpStep(null);
                navigate('/app/memp');
            } else {
                setError('Login failed. Please try again.');
            }
        } catch (err) {
            console.error('OTP verification error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendLoginOtp = async () => {
        setError('');
        setIsLoading(true);

        try {
            const response = await requestLoginOtp(identifier, password);
            setMaskedEmail(response.maskedEmail);
            setOtp('');
            setError('');
            console.log('OTP resent to email');
        } catch (err) {
            console.error('Resend OTP error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // =============================================
    // FORGOT PASSWORD WITH OTP FLOW
    // =============================================
    const handleForgotPasswordClick = () => {
        setShowForgotPassword(true);
        setError('');
        setForgotPasswordIdentifier('');
    };

    const handleCancelForgotPassword = () => {
        setShowForgotPassword(false);
        setOtpStep(null);
        setError('');
        setForgotPasswordIdentifier('');
        setOtp('');
        setNewPasswordForForgot('');
        setConfirmNewPasswordForForgot('');
    };

    const handleRequestForgotPasswordOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!forgotPasswordIdentifier.trim()) {
            setError('Username or Email is required.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await requestForgotPasswordOtp(forgotPasswordIdentifier);
            setUserId(response.userId);
            setMaskedEmail(response.maskedEmail);
            setOtpStep('forgot-password');
            setOtp('');
            console.log('OTP sent for forgot password');
        } catch (err) {
            console.error('Forgot password request error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyForgotPasswordOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!otp.trim()) {
            setError('OTP is required.');
            setIsLoading(false);
            return;
        }

        if (!newPasswordForForgot.trim() || !confirmNewPasswordForForgot.trim()) {
            setError('New password is required.');
            setIsLoading(false);
            return;
        }

        if (newPasswordForForgot !== confirmNewPasswordForForgot) {
            setError('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        if (newPasswordForForgot.length < 6) {
            setError('Password must be at least 6 characters long.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await verifyForgotPasswordOtp(userId, otp, newPasswordForForgot);
            alert(response.message || 'Password reset successfully. Please login with your new password.');
            handleCancelForgotPassword();
        } catch (err) {
            console.error('Verify forgot password OTP error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // =============================================
    // CHANGE PASSWORD WITH OTP FLOW
    // =============================================
    const handleChangePasswordClick = () => {
        setShowChangePassword(true);
        setError('');
        setIdentifier('');
        setOldPassword('');
    };

    const handleCancelChangePassword = () => {
        setShowChangePassword(false);
        setOtpStep(null);
        setError('');
        setIdentifier('');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setOtp('');
    };

    const handleRequestChangePasswordOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!identifier.trim() || !oldPassword.trim()) {
            setError('Username/Email and old password are required.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await requestChangePasswordOtp(identifier, oldPassword);
            setUserId(response.userId);
            setMaskedEmail(response.maskedEmail);
            setOtpStep('change-password');
            setOtp('');
            console.log('OTP sent for change password');
        } catch (err) {
            console.error('Change password request error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyChangePasswordOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!otp.trim()) {
            setError('OTP is required.');
            setIsLoading(false);
            return;
        }

        if (!newPassword.trim() || !confirmNewPassword.trim()) {
            setError('New password is required.');
            setIsLoading(false);
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setError('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await verifyChangePasswordOtp(userId, otp, newPassword);
            alert(response.message || 'Password changed successfully.');
            handleCancelChangePassword();
        } catch (err) {
            console.error('Verify change password OTP error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // =============================================
    // RENDER
    // =============================================
    return (
        <RotatingBackground className="login-bg-wrapper" forceRotating={true}>
                
                <img 
                    src="/viswalogo.png" 
                    alt="Viswa Company Logo" 
                    className="viswa-logo-overlay" 
                    ref={CompanylogoRef} 
                />

                <div className="login-container" ref={loginContainerRef}>
                <img 
                    src="/Teamlogo.png" 
                    alt="Viswa Digital Logo" 
                    className="team-logo-login" 
                    ref={logoRef} 
                />
                
                {error && <div className="error-message">{error}</div>}

                {/* MAIN LOGIN FORM */}
                {!showChangePassword && !showForgotPassword && !otpStep && (
                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <label htmlFor="login-identifier">Username or Email:</label>
                            <input
                                type="text"
                                id="login-identifier"
                                name="identifier"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Enter your username or email"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="login-password">Password:</label>
                            <input
                                type="password"
                                id="login-password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <button type="submit" className="login-button" disabled={isLoading}>
                            {isLoading ? 'Processing...' : 'Login'}
                        </button>
                        <p
                            className="change-password-link"
                            onClick={handleForgotPasswordClick}
                            style={{ marginTop: '10px', cursor: 'pointer' }}
                        >
                            Forgot Password?
                        </p>
                        <p
                            className="change-password-link"
                            onClick={handleChangePasswordClick}
                            style={{ marginTop: '5px', cursor: 'pointer' }}
                        >
                            Change Password?
                        </p>
                    </form>
                )}

                {/* LOGIN OTP VERIFICATION */}
                {otpStep === 'login' && (
                    <form onSubmit={handleVerifyLoginOtp}>
                        <h3>Enter OTP</h3>
                        <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            We've sent an OTP to {maskedEmail}
                        </p>
                        <div className="input-group">
                            <label htmlFor="login-otp">One-Time Password (OTP):</label>
                            <input
                                type="text"
                                id="login-otp"
                                name="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                                maxLength="6"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <button type="submit" className="login-button" disabled={isLoading}>
                            {isLoading ? 'Verifying...' : 'Verify OTP & Login'}
                        </button>
                        <button 
                            type="button" 
                            className="cancel-button" 
                            onClick={() => {
                                setOtpStep(null);
                                setOtp('');
                                setError('');
                            }} 
                            disabled={isLoading}
                            style={{ marginTop: '10px' }}
                        >
                            Back
                        </button>
                        <p
                            className="change-password-link"
                            onClick={handleResendLoginOtp}
                            style={{ marginTop: '10px', cursor: 'pointer' }}
                            title="Resend OTP to your email"
                        >
                            Didn't receive OTP? Resend
                        </p>
                    </form>
                )}

                {/* FORGOT PASSWORD FORM */}
                {showForgotPassword && !otpStep && (
                    <form onSubmit={handleRequestForgotPasswordOtp}>
                        <h3>Forgot Password</h3>
                        <div className="input-group">
                            <label htmlFor="forgot-identifier">Username or Email:</label>
                            <input
                                type="text"
                                id="forgot-identifier"
                                name="forgotIdentifier"
                                value={forgotPasswordIdentifier}
                                onChange={(e) => setForgotPasswordIdentifier(e.target.value)}
                                placeholder="Enter your username or email"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <button type="submit" className="login-button" disabled={isLoading}>
                            {isLoading ? 'Sending OTP...' : 'Request OTP'}
                        </button>
                        <button 
                            type="button" 
                            className="cancel-button" 
                            onClick={handleCancelForgotPassword} 
                            disabled={isLoading}
                            style={{ marginTop: '10px' }}
                        >
                            Back
                        </button>
                    </form>
                )}

                {/* FORGOT PASSWORD OTP VERIFICATION */}
                {otpStep === 'forgot-password' && (
                    <form onSubmit={handleVerifyForgotPasswordOtp}>
                        <h3>Reset Password</h3>
                        <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            OTP sent to {maskedEmail}
                        </p>
                        <div className="input-group">
                            <label htmlFor="forgot-otp">One-Time Password (OTP):</label>
                            <input
                                type="text"
                                id="forgot-otp"
                                name="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                                maxLength="6"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="new-password-forgot">New Password:</label>
                            <input
                                type="password"
                                id="new-password-forgot"
                                name="newPassword"
                                value={newPasswordForForgot}
                                onChange={(e) => setNewPasswordForForgot(e.target.value)}
                                placeholder="Enter new password"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="confirm-password-forgot">Confirm Password:</label>
                            <input
                                type="password"
                                id="confirm-password-forgot"
                                name="confirmPassword"
                                value={confirmNewPasswordForForgot}
                                onChange={(e) => setConfirmNewPasswordForForgot(e.target.value)}
                                placeholder="Confirm new password"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <button type="submit" className="login-button" disabled={isLoading}>
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                        <button 
                            type="button" 
                            className="cancel-button" 
                            onClick={handleCancelForgotPassword} 
                            disabled={isLoading}
                            style={{ marginTop: '10px' }}
                        >
                            Cancel
                        </button>
                    </form>
                )}

                {/* CHANGE PASSWORD FORM */}
                {showChangePassword && !otpStep && (
                    <form onSubmit={handleRequestChangePasswordOtp}>
                        <h3>Change Password</h3>
                        <div className="input-group">
                            <label htmlFor="change-identifier">Username or Email:</label>
                            <input
                                type="text"
                                id="change-identifier"
                                name="identifier"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Enter your username or email"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="old-password">Old Password:</label>
                            <input
                                type="password"
                                id="old-password"
                                name="oldPassword"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder="Enter your old password"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <button type="submit" className="login-button" disabled={isLoading}>
                            {isLoading ? 'Sending OTP...' : 'Request OTP'}
                        </button>
                        <button 
                            type="button" 
                            className="cancel-button" 
                            onClick={handleCancelChangePassword} 
                            disabled={isLoading}
                            style={{ marginTop: '10px' }}
                        >
                            Back
                        </button>
                    </form>
                )}

                {/* CHANGE PASSWORD OTP VERIFICATION */}
                {otpStep === 'change-password' && (
                    <form onSubmit={handleVerifyChangePasswordOtp}>
                        <h3>Change Password</h3>
                        <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            OTP sent to {maskedEmail}
                        </p>
                        <div className="input-group">
                            <label htmlFor="change-otp">One-Time Password (OTP):</label>
                            <input
                                type="text"
                                id="change-otp"
                                name="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                                maxLength="6"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="new-password">New Password:</label>
                            <input
                                type="password"
                                id="new-password"
                                name="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="confirm-new-password">Confirm New Password:</label>
                            <input
                                type="password"
                                id="confirm-new-password"
                                name="confirmNewPassword"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <button type="submit" className="login-button" disabled={isLoading}>
                            {isLoading ? 'Changing...' : 'Change Password'}
                        </button>
                        <button 
                            type="button" 
                            className="cancel-button" 
                            onClick={handleCancelChangePassword} 
                            disabled={isLoading}
                            style={{ marginTop: '10px' }}
                        >
                            Cancel
                        </button>
                    </form>
                )}

                {error && <div className="error-message">{error}</div>}
            </div>
        </RotatingBackground>
    );
};

export default Login;