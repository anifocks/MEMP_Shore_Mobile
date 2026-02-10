// client/src/components/DeleteConfirmationModal.jsx
import React from 'react';
import './DeleteConfirmationModal.css';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content delete-confirmation-modal-content">
                <div className="modal-header">
                    <h2>Confirm Action</h2>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>
                <div className="modal-body">
                    <p>{message || "Are you sure you want to proceed with this action?"}</p>
                </div>
                <div className="modal-actions">
                    <button onClick={onConfirm} className="confirm-button">Yes, Confirm</button>
                    <button onClick={onClose} className="cancel-button">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;