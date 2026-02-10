// src/pages/ManageExistingItemsPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AdminMenuPage.css'; // Continue using these styles or adapt as needed
import { FaToggleOn, FaToggleOff, FaTrashRestore, FaTrash } from 'react-icons/fa';

// --- Password Modal Component (Can be moved to its own file if preferred) ---
const PasswordConfirmModal = ({ isOpen, onClose, onConfirm, actionType, itemName }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const MOCK_ADMIN_PASSWORD = "adminpassword123"; 

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === MOCK_ADMIN_PASSWORD) {
      onConfirm();
      handleClose();
    } else {
      setError('Incorrect password.');
    }
  };
  const handleClose = () => { setPassword(''); setError(''); onClose(); };
  if (!isOpen) return null;
  return (
    <div className="admin-password-modal-overlay">
      <div className="admin-password-modal-content">
        <h3>Confirm {actionType === 'deactivate' ? 'Deactivation' : 'Reactivation'}</h3>
        <p>Enter admin password to {actionType} menu item: <strong>{itemName}</strong>.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group"> <label htmlFor="adminPassword">Admin Password:</label> <input type="password" id="adminPassword" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} required autoFocus /> </div>
          {error && <p className="modal-error-message">{error}</p>}
          <div className="modal-actions"> <button type="button" onClick={handleClose} className="modal-button cancel">Cancel</button> <button type="submit" className="modal-button confirm">{actionType === 'deactivate' ? 'Deactivate' : 'Reactivate'}</button> </div>
        </form>
      </div>
    </div>
  );
};
// --- End Password Modal Component ---

const ManageExistingItemsPage = ({ currentMenuItems, toggleMenuItemActiveStateCallback }) => {
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [itemToModify, setItemToModify] = useState(null);
  const [actionTypeForModal, setActionTypeForModal] = useState('');

  const handleToggleActiveState = (itemId, itemName, currentIsActive) => {
    setItemToModify({ id: itemId, name: itemName, desiredActiveState: !currentIsActive });
    setActionTypeForModal(!currentIsActive ? 'reactivate' : 'deactivate');
    setIsPasswordModalOpen(true);
  };

  const confirmToggleActiveState = () => {
    if (itemToModify) {
      toggleMenuItemActiveStateCallback(itemToModify.id, itemToModify.desiredActiveState);
    }
  };

  const renderManageableMenuItems = (items, level = 0) => {
    if (!items || items.length === 0) return null;
    return (
      <ul style={{ listStyleType: 'none', paddingLeft: level > 0 ? '20px' : '0' }}>
        {items.map(item => (
          <li key={item.id} className={`manageable-menu-item ${item.isActive === false ? 'inactive' : ''}`}>
            <div className="item-details">
              <span className="item-name">{item.name}</span>
              <span className="item-info"> (ID: {item.id}, Type: {item.type}, Route: {item.route})</span>
              <span className={`item-status ${item.isActive === false ? 'status-inactive' : 'status-active'}`}>
                {item.isActive === false ? 'Inactive' : 'Active'}
              </span>
            </div>
            <div className="item-actions">
              <button
                onClick={() => handleToggleActiveState(item.id, item.name, item.isActive !== false)}
                className={`action-button ${item.isActive === false ? 'reactivate' : 'deactivate'}`}
                title={item.isActive === false ? 'Reactivate Item' : 'Deactivate Item'}
              >
                {item.isActive === false ? <FaTrashRestore aria-label="Reactivate"/> : <FaToggleOff aria-label="Deactivate"/>}
              </button>
            </div>
            {item.subItems && renderManageableMenuItems(item.subItems, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="admin-menu-page">
      <div className="admin-header">
        <h1>Manage Existing Menu Items</h1>
        <Link to="/app/menu/admin-hub" className="close-admin-btn"> {/* Link back to Admin Hub */}
          Back to Admin Menu
        </Link>
      </div>

      <div className="manage-existing-items">
        {(currentMenuItems && currentMenuItems.length > 0) ?
            renderManageableMenuItems(currentMenuItems) :
            <p>No menu items to manage yet. Add some via "Add New Menu Item".</p>
        }
      </div>
      
      <PasswordConfirmModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={confirmToggleActiveState}
        actionType={actionTypeForModal}
        itemName={itemToModify?.name}
      />
       <p className="admin-note" style={{marginTop: '30px'}}>
        <strong>Note:</strong> Deactivating/Reactivating items requires a mock admin password ("adminpassword123") for this demo.
      </p>
    </div>
  );
};

export default ManageExistingItemsPage;