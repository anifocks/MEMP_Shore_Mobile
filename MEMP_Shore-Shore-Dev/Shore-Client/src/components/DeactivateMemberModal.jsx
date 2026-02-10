// src/components/DeactivateMemberModal.jsx
import React, { useState } from 'react';

const DeactivateMemberModal = ({ isOpen, onClose, member, onConfirm }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!password) {
      setError('Password is required for confirmation.');
      setIsSubmitting(false);
      return;
    }

    try {
      await onConfirm(member.Team_Id, password);
      // If successful, TeamPage will close the modal and refresh.
      setPassword(''); 
    } catch (apiError) {
      setError(apiError.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !member) {
    return null;
  }

  // Basic Modal Styling (can be moved to a CSS file or use a library)
  const modalStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1050,
  };
  const modalContentStyle = {
    backgroundColor: '#fff', padding: '25px 35px', borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)', width: '100%', maxWidth: '450px',
    textAlign: 'center',
  };
  const inputStyle = {
    width: 'calc(100% - 22px)', padding: '10px', marginBottom: '20px', marginTop: '5px',
    border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em',
  };
   const labelStyle = {
    display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333', textAlign: 'left'
  };
  const buttonContainerStyle = { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px'};
  const buttonStyle = {
    padding: '10px 20px', border: 'none', borderRadius: '4px',
    cursor: 'pointer', fontSize: '1em',
  };
  const confirmButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', color: 'white'};
  const cancelButtonStyle = { ...buttonStyle, backgroundColor: '#f0f0f0', color: '#333'};
  const errorStyle = { color: 'red', marginBottom: '15px', fontSize: '0.9em', textAlign: 'left' };
  const memberNameStyle = { color: '#006400', fontWeight: 'bold' };


  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h2>Confirm Deactivation</h2>
        <p>Are you sure you want to deactivate team member <strong style={memberNameStyle}>{member.Member_Name}</strong>?</p>
        <p>This action will make them inactive and they will not be displayed.</p>
        
        <hr style={{margin: "20px 0"}}/>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="confirmPassword" style={labelStyle}>Enter your password to confirm:</label>
            <input
              type="password"
              id="confirmPassword"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          {error && <p style={errorStyle}>{error}</p>}
          <div style={buttonContainerStyle}>
            <button type="button" style={cancelButtonStyle} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" style={confirmButtonStyle} disabled={isSubmitting}>
              {isSubmitting ? 'Deactivating...' : 'Confirm Deactivate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeactivateMemberModal;