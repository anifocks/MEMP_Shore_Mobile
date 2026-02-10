// src/pages/AddMenuItemPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AdminMenuPage.css'; // You can reuse AdminMenuPage.css or create a new one

// Helper to generate a simple slug (for URL suggestions)
const slugify = (text) => { 
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-') 
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};

// Find a menu item by ID - utility (can be moved to a utils file)
const findMenuItemById = (items, id) => {
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

const AddMenuItemPage = ({ addMenuItemCallback, currentMenuItems }) => {
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('internal');
  const [isNewSubmenuHub, setIsNewSubmenuHub] = useState(false);
  const [pageRouteSegment, setPageRouteSegment] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [parentId, setParentId] = useState('');
  const [suggestedRoute, setSuggestedRoute] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
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

  const handleSubmitNewItem = (e) => {
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
    const newItemData = { id: uniqueIdPart, name: itemName.trim(), route: finalRoute, backgroundImage: imageFileName.trim() ? `/menu-backgrounds/${imageFileName.trim()}` : '/menu-backgrounds/default-card-bg.jpg', type: itemType, hasSubmenu: itemType === 'internal' && isNewSubmenuHub, subItems: (itemType === 'internal' && isNewSubmenuHub) ? [] : undefined, isActive: true };
    addMenuItemCallback(newItemData, parentId === '' ? null : parentId);
    setItemName(''); setItemType('internal'); setIsNewSubmenuHub(false); setPageRouteSegment(''); setExternalUrl(''); setImageFileName(''); setParentId(''); setSuggestedRoute('');
  };

  const renderMenuOptions = (items, prefix = '') => {
    let options = []; if (!Array.isArray(items)) return options;
    items.forEach(item => {
      if (item.type !== 'external') { 
        options.push(<option key={item.id} value={item.id}>{prefix + item.name}</option>);
        if (item.subItems && item.subItems.length > 0) { options = options.concat(renderMenuOptions(item.subItems, prefix + '-- ')); }
      }
    });
    return options;
  };

  return (
    <div className="admin-menu-page"> {/* Can reuse CSS or create specific one */}
      <div className="admin-header">
        <h1>Add New Menu Item</h1>
        <Link to="/app/menu/admin-hub" className="close-admin-btn"> {/* Link back to Admin Hub */}
          Back to Admin Menu
        </Link>
      </div>

      <form onSubmit={handleSubmitNewItem} className="admin-menu-form">
        {/* Form content from your previous AdminMenuPage.jsx for adding items */}
        <div className="form-group"> <label htmlFor="itemName">Item Name:</label> <input type="text" id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} required /> </div>
        <div className="form-group"> <label htmlFor="itemType">Link Type:</label> <select id="itemType" value={itemType} onChange={(e) => { setItemType(e.target.value); setIsNewSubmenuHub(false); setPageRouteSegment(''); setExternalUrl(''); }}> <option value="internal">Internal Page / Sub-menu Hub</option> <option value="external">External URL</option> </select> </div>
        <div className="form-group"> <label htmlFor="parentId">Place Under (Parent Menu):</label> <select id="parentId" value={parentId} onChange={(e) => setParentId(e.target.value)}> <option value="">-- Add as Top Level Menu --</option> {renderMenuOptions(currentMenuItems)} </select> </div>
        {itemType === 'internal' && ( <> <div className="form-group form-group-checkbox"> <input type="checkbox" id="isNewSubmenuHub" checked={isNewSubmenuHub} onChange={(e) => {setIsNewSubmenuHub(e.target.checked); if(e.target.checked) setPageRouteSegment('');}} /> <label htmlFor="isNewSubmenuHub" className="checkbox-label">This item is a new Sub-menu Hub</label> </div> {!isNewSubmenuHub && ( <div className="form-group"> <label htmlFor="pageRouteSegment">Page Route Segment (e.g., `our-history`):</label> <input type="text" id="pageRouteSegment" placeholder="Auto-suggested from Item Name" value={pageRouteSegment} onChange={(e) => setPageRouteSegment(e.target.value)} /> <p className="route-hint">Full Suggested Route: <code>{suggestedRoute || "Will be generated"}</code></p> <p className="route-hint" style={{color: 'red', fontWeight: 'bold'}}> Important: For new content pages, you must manually create the React component and add the route in App.jsx. </p> </div> )} {isNewSubmenuHub && ( <p className="route-hint">Route for Sub-menu Hub: <code>{suggestedRoute}</code></p> )} </> )}
        {itemType === 'external' && ( <div className="form-group"> <label htmlFor="externalUrl">External URL:</label> <input type="url" id="externalUrl" placeholder="https://example.com" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} required={itemType === 'external'} /> </div> )}
        <div className="form-group"> <label htmlFor="imageFileName">Image File Name (e.g., `my-image.jpg`):</label> <input type="text" id="imageFileName" placeholder="default-card-bg.jpg" value={imageFileName} onChange={(e) => setImageFileName(e.target.value)} /> <p className="route-hint">Image will be sourced from <code>/menu-backgrounds/your-file-name.jpg</code>.</p> </div>
        <button type="submit">Add Item</button>
      </form>
      <p className="admin-note" style={{marginTop: '20px'}}>
        <strong>Note:</strong> Changes are saved to browser's local storage.
        For new "Internal Page" routes, you must manually add the corresponding <code>&lt;Route&gt;</code> in <code>App.jsx</code> and create the page component.
      </p>
    </div>
  );
};

export default AddMenuItemPage;