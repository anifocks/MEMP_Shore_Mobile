// Client/src/components/ReactivateMemberModal.jsx
import React, { useState } from 'react';
// *** FIXED IMPORT PATH: Changed "../../api" to "../api" ***
import { loginUser } from "../api";
import './AddMemberModal.css';


const ReactivateMemberModal = ({ isOpen, onClose, member, onConfirm }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        setError('');
        setIsSubmitting(true);
        try {
            // Get the username of the logged-in user from localStorage
            const username = localStorage.getItem('username');
            if (!username) {
                setError('Username not found. Please log in again.');
                setIsSubmitting(false);
                return;
            }

            // Step 1: Verify the password against the logged-in user's credentials.
            await loginUser(username, password);

            // Step 2: If the password is correct, proceed with the reactivation via callback
            await onConfirm(member.Team_Id);
            onClose(); // Close modal on success
        } catch (apiError) {
            // Catch the standardized error message thrown by loginUser
            setError(apiError.message || 'An unexpected error occurred during confirmation.');
        } finally {
            setIsSubmitting(false);
            setPassword(''); // Clear password after attempt
        }
    };
    
    // Clear state when the modal is closed/re-opened
    const handleClose = () => {
        setPassword('');
        setError('');
        setIsSubmitting(false);
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Reactivate Team Member</h2>
                <p>
                    Are you sure you want to reactivate <strong>{member?.Member_Name}</strong>?
                </p>
                <p className="form-hint" style={{ marginTop: '1rem' }}>
                    Please enter your password to confirm this action.
                </p>
                
                {error && <p className="form-error-message">{error}</p>}

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label htmlFor="reactivate-password">Password:</label>
                    <input
                        id="reactivate-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password to confirm"
                        autoComplete="current-password"
                    />
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        className="btn-submit" 
                        onClick={handleConfirm} 
                        disabled={isSubmitting} 
                        style={{ backgroundColor: '#28a745', borderColor: '#1e7e34' }}
                    >
                        {isSubmitting ? 'Reactivating...' : 'Reactivate Member'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReactivateMemberModal;