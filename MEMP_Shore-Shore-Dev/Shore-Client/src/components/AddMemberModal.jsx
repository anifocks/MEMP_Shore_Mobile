// src/components/AddMemberModal.jsx
import React, { useState } from 'react';

const AddMemberModal = ({ isOpen, onClose, onAddMember }) => {
  const [memberName, setMemberName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [rights, setRights] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!memberName || !role || !email || !imageFile) {
      setError('Name, Role, Email, and Image are required.');
      setIsSubmitting(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setError('Invalid email format.');
        setIsSubmitting(false);
        return;
    }
    if (rights && isNaN(parseInt(rights, 10))) {
        setError('Rights must be a number if provided.');
        setIsSubmitting(false);
        return;
    }

    const formData = new FormData();
    formData.append('Member_Name', memberName);
    formData.append('Role', role);
    formData.append('Email', email);
    if (rights) {
        formData.append('Rights', rights);
    }
    formData.append('image', imageFile);

    try {
      await onAddMember(formData);
      // Reset form fields after successful submission (or modal close)
      setMemberName('');
      setRole('');
      setEmail('');
      setRights('');
      setImageFile(null);
      // onClose(); // TeamPage already calls setIsModalOpen(false) which triggers onClose in its own state
    } catch (apiError) {
      setError(apiError.message || 'An unexpected error occurred while adding member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const modalStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  };
  const modalContentStyle = {
    backgroundColor: '#fff', padding: '25px 35px', borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)', width: '100%', maxWidth: '500px',
  };
  const inputStyle = {
    width: 'calc(100% - 22px)', padding: '10px', marginBottom: '15px',
    border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em',
  };
  const labelStyle = {
    display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333',
  };
  const buttonContainerStyle = { marginTop: '20px', textAlign: 'right'};
  const buttonStyle = {
    padding: '10px 20px', border: 'none', borderRadius: '4px',
    cursor: 'pointer', fontSize: '1em', marginLeft: '10px',
  };
  const submitButtonStyle = { ...buttonStyle, backgroundColor: '#006400', color: 'white'};
  const cancelButtonStyle = { ...buttonStyle, backgroundColor: '#f0f0f0', color: '#333'};
  const errorStyle = { color: 'red', marginBottom: '15px', fontSize: '0.9em'};

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h2>Add New Team Member</h2>
        {error && <p style={errorStyle}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="memberName" style={labelStyle}>Name:</label>
            <input type="text" id="memberName" style={inputStyle} value={memberName} onChange={(e) => setMemberName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="role" style={labelStyle}>Role:</label>
            <input type="text" id="role" style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="email" style={labelStyle}>Email:</label>
            <input type="email" id="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="rights" style={labelStyle}>Rights (optional numerical value):</label>
            <input type="number" id="rights" style={inputStyle} value={rights} onChange={(e) => setRights(e.target.value)} />
          </div>
          <div>
            <label htmlFor="imageFile" style={labelStyle}>Image:</label>
            <input type="file" id="imageFile" style={{...inputStyle, padding: '10px 0'}} accept="image/png, image/jpeg, image/gif" onChange={handleImageChange} required />
          </div>
          <div style={buttonContainerStyle}>
            <button type="button" style={cancelButtonStyle} onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" style={submitButtonStyle} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;