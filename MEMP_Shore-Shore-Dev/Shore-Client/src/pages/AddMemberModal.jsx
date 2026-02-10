// Client/src/components/AddMemberModal.jsx
import React, { useState, useEffect } from 'react';
import './AddMemberModal.css';

const AddMemberModal = ({ isOpen, onClose, onAddMember }) => {
  const [memberName, setMemberName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [rights, setRights] = useState('');
  const [imageFilename, setImageFilename] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setMemberName('');
      setRole('');
      setEmail('');
      setRights('');
      setImageFilename('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!memberName || !role || !email) {
      setError('Name, Role, and Email are required.');
      return;
    }
    
    setIsSubmitting(true);

    // Create a plain JavaScript object for the JSON payload
    const memberData = {
      Member_Name: memberName,
      Role: role,
      Email: email,
      Rights: rights || null, // Send null if rights is empty
      ImageFilename: imageFilename || 'default-member.png' // Provide a default image
    };

    try {
      // The onAddMember function (in TeamPage.jsx) will send this as JSON
      await onAddMember(memberData);
      onClose(); 
    } catch (apiError) {
      // Display any error messages from the server
      setError(apiError.response?.data?.message || apiError.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add New Team Member</h2>
        {error && <p className="form-error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="memberName">Name:</label>
            <input type="text" id="memberName" value={memberName} onChange={(e) => setMemberName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="role">Role:</label>
            <input type="text" id="role" value={role} onChange={(e) => setRole(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="rights">Rights (optional):</label>
            <input type="number" id="rights" value={rights} onChange={(e) => setRights(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="imageFilename">Image Filename (optional):</label>
            <input type="text" id="imageFilename" value={imageFilename} onChange={(e) => setImageFilename(e.target.value)} placeholder="e.g., member-avatar.png" />
            <p className="form-hint">Image should be in the <code>Client/public/member_images/</code> folder.</p>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;