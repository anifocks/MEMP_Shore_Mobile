// src/pages/AdminMenuPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminMenuPage.css';
import CueCard from '../components/CueCard.jsx'; // Import the CueCard component
import { FaToggleOn, FaToggleOff, FaTrashRestore, FaTrash, FaUsers, FaShip } from 'react-icons/fa'; // Icons

// Helper to generate a simple slug (for URL suggestions)
const slugify = (text) => { /* ... (your existing slugify function) ... */ 
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-'); // Replace multiple - with single -
};


// --- Password Modal Component (Simple Inline) ---
const PasswordConfirmModal = ({ isOpen, onClose, onConfirm, actionType, itemName }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // THIS IS A MOCK ADMIN PASSWORD. Replace with a more secure mechanism in a real app.
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

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="admin-password-modal-overlay">
      <div className="admin-password-modal-content">
        <h3>Confirm {actionType === 'deactivate' ? 'Deactivation' : 'Reactivation'}</h3>
        <p>Please enter the admin password to {actionType} menu item: <strong>{itemName}</strong>.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="adminPassword">Admin Password:</label>
            <input
              type="password"
              id="adminPassword"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              required
              autoFocus
            />
          </div>
          {error && <p className="modal-error-message">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="modal-button cancel">Cancel</button>
            <button type="submit" className="modal-button confirm">{actionType === 'deactivate' ? 'Deactivate' : 'Reactivate'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
// --- End Password Modal Component ---


const AdminMenuPage = ({ addMenuItemCallback, currentMenuItems, toggleMenuItemActiveStateCallback }) => {
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('internal');
  const [isNewSubmenuHub, setIsNewSubmenuHub] = useState(false);
  const [pageRouteSegment, setPageRouteSegment] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [parentId, setParentId] = useState('');
  const [suggestedRoute, setSuggestedRoute] = useState('');
  const navigate = useNavigate();

  // State for password modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [itemToModify, setItemToModify] = useState(null); // { id, name, desiredActiveState }
  const [actionTypeForModal, setActionTypeForModal] = useState(''); // 'deactivate' or 'reactivate'


  const findMenuItemById = (items, id) => { /* ... (your existing findMenuItemById) ... */ 
    if (!items || !id) return null;
    for (const item of items) {
      if (item.id === id) return item;
      if (item.subItems) {
        const found = findMenuItemById(item.subItems, id);
        if (found) return found;
      }
    }
    return null;
  };

  useEffect(() => {
    // ... (your existing useEffect for suggestedRoute)
    if (itemType === 'internal' && !isNewSubmenuHub && itemName) {
      let basePath = '/app';
      if (parentId) {
        const parentItem = findMenuItemById(currentMenuItems, parentId);
        if (parentItem && parentItem.route) {
          if (parentItem.route.startsWith('/app/menu/')) {
            const pathParts = parentItem.route.split('/');
            if (pathParts.length > 3 && pathParts[2] === 'menu') { 
                basePath = `/app/${pathParts[3]}`; 
            } else { basePath = parentItem.route; }
          } else { basePath = parentItem.route; }
        }
      }
      const segment = pageRouteSegment || slugify(itemName);
      setSuggestedRoute(`${basePath}/${segment}`.replace(/\/+/g, '/'));
    } else if (itemType === 'internal' && isNewSubmenuHub) {
      setSuggestedRoute('(Auto-generated for Sub-menu Hub: /app/menu/unique-id)');
    } else { setSuggestedRoute(''); }
  }, [itemName, itemType, isNewSubmenuHub, parentId, pageRouteSegment, currentMenuItems]);

  const handleSubmitNewItem = (e) => { /* ... (your existing handleSubmit logic for adding new item, ensure isActive: true is set) ... */
    e.preventDefault();
    if (!itemName.trim()) { alert('Menu Item Name is required.'); return; }
    let finalRoute = '';
    const uniqueIdPart = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (itemType === 'external') {
      if (!externalUrl.trim() || !externalUrl.startsWith('http')) { alert('Valid External URL (starting with http/https) is required.'); return; }
      finalRoute = externalUrl.trim();
    } else { 
      if (isNewSubmenuHub) { finalRoute = `/app/menu/${uniqueIdPart}`; } 
      else {
        if (!pageRouteSegment.trim() && !slugify(itemName)) { alert('Page Route Segment or a valid Item Name is required for a content page.'); return; }
        let basePathForNewUrl = '/app';
        if (parentId) {
            const parentItem = findMenuItemById(currentMenuItems, parentId);
            if (parentItem && parentItem.route) {
                if (parentItem.route.startsWith('/app/menu/')) {
                    const slugFromParentRoute = parentItem.route.substring('/app/menu/'.length);
                    basePathForNewUrl = `/app/${slugFromParentRoute}`;
                } else { basePathForNewUrl = parentItem.route; }
            }
        }
        const currentSegment = pageRouteSegment.trim() || slugify(itemName.trim());
        finalRoute = `${basePathForNewUrl}/${currentSegment}`.replace(/\/\//g, '/'); 
        if (!finalRoute.startsWith('/app/')) { alert('Internal page route must start with /app/. Suggested: ' + finalRoute); return; }
        alert(`Reminder: For the new content page with route "${finalRoute}", you must manually:\n1. Create the React component.\n2. Add a <Route path="${finalRoute}" /> in App.jsx.`);
      }
    }
    const newItemData = { id: uniqueIdPart, name: itemName.trim(), route: finalRoute, backgroundImage: imageFileName.trim() ? `/menu-backgrounds/${imageFileName.trim()}` : '/menu-backgrounds/default-card-bg.jpg', type: itemType, hasSubmenu: itemType === 'internal' && isNewSubmenuHub, subItems: (itemType === 'internal' && isNewSubmenuHub) ? [] : undefined, isActive: true }; // Ensure isActive
    addMenuItemCallback(newItemData, parentId === '' ? null : parentId);
    setItemName(''); setItemType('internal'); setIsNewSubmenuHub(false); setPageRouteSegment(''); setExternalUrl(''); setImageFileName(''); setParentId(''); setSuggestedRoute(''); // Reset form
  };

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

  const renderMenuOptions = (items, prefix = '') => { /* ... (your existing renderMenuOptions) ... */ 
    let options = []; if (!Array.isArray(items)) return options;
    items.forEach(item => {
      if (item.type !== 'external') { 
        options.push(<option key={item.id} value={item.id}>{prefix + item.name}</option>);
        if (item.subItems && item.subItems.length > 0) { options = options.concat(renderMenuOptions(item.subItems, prefix + '-- ')); }
      }
    });
    return options;
  };

  // Recursive function to render the list of menu items for management
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
                title={item.isActive === false ? 'Reactivate' : 'Deactivate'}
              >
                {item.isActive === false ? <FaTrashRestore /> : <FaToggleOff />} 
                {/* Using FaToggleOff for deactivate, FaTrashRestore for reactivate */}
              </button>
              {/* Add Edit/Delete buttons here later if needed */}
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
        <h1>Admin Hub</h1>
        <button onClick={() => navigate('/app/dashboard')} className="close-admin-btn">
          Back to Dashboard
        </button>
      </div>

      {/* --- CUE CARD SECTION (Admin Hub Dashboard) --- */}
      <div className="admin-cue-cards">
        <h2>Modules</h2>
        <div className="cue-card-list">
            <CueCard 
                title="Users"
                icon={FaUsers}
                backgroundImage="/menu-backgrounds/User-Rights.jpg"
                onClick={() => navigate('/app/admin/users')}
            />
            {/* The Fleet Management Cue Card has been removed from here as requested. */}
            <CueCard 
                title="Manage Menu Items"
                backgroundImage="/menu-backgrounds/Manage-Navigation-Menus.jpg"
                onClick={() => document.getElementById('menu-management-section').scrollIntoView({ behavior: 'smooth' })}
            />
            {/* Add other admin module cue cards here */}
        </div>
      </div>
      {/* --- END CUE CARD SECTION --- */}
      
      <hr className="section-divider" />

      {/* Section to Add New Item (your existing form) */}
      <form onSubmit={handleSubmitNewItem} className="admin-menu-form">
        <h2>Add New Menu / Sub-menu Item</h2>
        {/* ... (All your form group divs for itemName, itemType, parentId, etc. from previous version) ... */}
        <div className="form-group"> <label htmlFor="itemName">Item Name:</label> <input type="text" id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} required /> </div>
        <div className="form-group"> <label htmlFor="itemType">Link Type:</label> <select id="itemType" value={itemType} onChange={(e) => { setItemType(e.target.value); setIsNewSubmenuHub(false); setPageRouteSegment(''); setExternalUrl(''); }}> <option value="internal">Internal Page / Sub-menu Hub</option> <option value="external">External URL</option> </select> </div>
        <div className="form-group"> <label htmlFor="parentId">Place Under (Parent Menu):</label> <select id="parentId" value={parentId} onChange={(e) => setParentId(e.target.value)}> <option value="">-- Add as Top Level Menu --</option> {renderMenuOptions(currentMenuItems)} </select> </div>
        {itemType === 'internal' && ( <> <div className="form-group form-group-checkbox"> <input type="checkbox" id="isNewSubmenuHub" checked={isNewSubmenuHub} onChange={(e) => {setIsNewSubmenuHub(e.target.checked); if(e.target.checked) setPageRouteSegment('');}} /> <label htmlFor="isNewSubmenuHub" className="checkbox-label">This item is a new Sub-menu Hub</label> </div> {!isNewSubmenuHub && ( <div className="form-group"> <label htmlFor="pageRouteSegment">Page Route Segment (e.g., `our-history`):</label> <input type="text" id="pageRouteSegment" placeholder="Auto-suggested from Item Name" value={pageRouteSegment} onChange={(e) => setPageRouteSegment(e.target.value)} /> <p className="route-hint">Full Suggested Route: <code>{suggestedRoute || "Will be generated"}</code></p> <p className="route-hint" style={{color: 'red', fontWeight: 'bold'}}> Important: For new content pages, you must manually create the React component and add the route in App.jsx. </p> </div> )} {isNewSubmenuHub && ( <p className="route-hint">Route for Sub-menu Hub: <code>{suggestedRoute}</code></p> )} </> )}
        {itemType === 'external' && ( <div className="form-group"> <label htmlFor="externalUrl">External URL:</label> <input type="url" id="externalUrl" placeholder="https://example.com" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} required={itemType === 'external'} /> </div> )}
        <div className="form-group"> <label htmlFor="imageFileName">Image File Name (e.g., `my-image.jpg`):</label> <input type="text" id="imageFileName" placeholder="default-card-bg.jpg" value={imageFileName} onChange={(e) => setImageFileName(e.target.value)} /> <p className="route-hint">Image will be sourced from <code>/menu-backgrounds/your-file-name.jpg</code>.</p> </div>
        <button type="submit">Add Item</button>
      </form>

      <hr className="section-divider" />

      {/* Section to Manage Existing Items */}
      <div id="menu-management-section" className="manage-existing-items">
        <h2>Manage Existing Menu Items</h2>
        {renderManageableMenuItems(currentMenuItems)}
      </div>
      
      <PasswordConfirmModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={confirmToggleActiveState}
        actionType={actionTypeForModal}
        itemName={itemToModify?.name}
      />

      <p className="admin-note">
        {/* ... (your existing admin note) ... */}
        <strong>Note:</strong> Changes are saved to browser's local storage. Deactivating/Reactivating items requires a mock admin password ("adminpassword123") for this demo.
      </p>
    </div>
  );
};

export default AdminMenuPage;