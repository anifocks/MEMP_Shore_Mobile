// GeminiAI/Client/src/pages/SubMenuPage.jsx
import React, { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import CueCard from '../components/CueCard';
import './SubMenuPage.css';
import RotatingBackground from '../components/RotatingBackground'; // <-- ADDED

const findMenuItemById = (items, id) => {
  if (!Array.isArray(items) || !id) return null;
  for (const item of items) {
    if (!item || typeof item !== 'object') continue; // Skip invalid items
    if (item.id === id) return item;
    if (item.subItems) {
      const foundInSub = findMenuItemById(item.subItems, id);
      if (foundInSub) return foundInSub;
    }
  }
  return null;
};

const findParentInfoRecursive = (items, childIdToFind, currentDefaultRoute, currentDefaultName) => {
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    if (item.subItems && item.subItems.some(sub => sub && sub.id === childIdToFind)) {
      return { route: item.route || currentDefaultRoute, name: item.name || currentDefaultName };
    }
    if (item.subItems) {
      const foundDeeper = findParentInfoRecursive(item.subItems, childIdToFind, item.route || currentDefaultRoute, item.name || currentDefaultName);
      if (foundDeeper) return foundDeeper;
    }
  }
  return null;
};

const SubMenuPage = ({ menuConfig }) => {
  const navigate = useNavigate();
  const { menuItemId } = useParams();

  const currentMenu = useMemo(() => {
    if (!menuItemId || !Array.isArray(menuConfig)) return null;
    return findMenuItemById(menuConfig, menuItemId);
  }, [menuConfig, menuItemId]);

  const parentInfo = useMemo(() => {
    const defaultParent = { route: "/app/dashboard", name: "Dashboard" }; // Changed default name for clarity
    if (!currentMenu || !menuItemId || !Array.isArray(menuConfig)) {
      return defaultParent;
    }
    // Find the parent of the current `menuItemId` to construct the backlink
    const info = findParentInfoRecursive(menuConfig, menuItemId, defaultParent.route, defaultParent.name);
    return info || defaultParent;
  }, [menuConfig, menuItemId, currentMenu]);

  const backLinkPath = parentInfo.route;
  const backLinkText = `&larr; Back to ${parentInfo.name}`;

  const handleCardClick = (item) => {
    if (!item || !item.route) {
      console.warn('SubMenuPage: Clicked item has no route defined:', item);
      return;
    }
    if (item.type === 'external') {
      window.open(item.route, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.route);
    }
  };
  
  const activeSubItems = useMemo(() => {
    if (!currentMenu || !Array.isArray(currentMenu.subItems)) {
      return [];
    }
    // Ensure subItem itself is valid and isActive is true or undefined
    return currentMenu.subItems.filter(subItem => subItem && (subItem.isActive !== false));
  }, [currentMenu]);

  if (!currentMenu) {
    return (
      <RotatingBackground>
        <div className="submenu-page-container">
          <h1 className="submenu-page-title">Menu Section Not Found</h1>
          <p className="submenu-error-message">
            The menu section identified by "{menuItemId}" could not be found.
          </p>
          <Link to="/app/dashboard" className="global-back-link" style={{ marginTop: '20px' }}>
            Go to Dashboard
          </Link>
        </div>
      </RotatingBackground>
    );
  }

  if (!currentMenu.hasSubmenu || activeSubItems.length === 0) {
    return (
      <RotatingBackground>
        <div className="submenu-page-container">
          <h1 className="submenu-page-title">{currentMenu.name}</h1>
           <p className="submenu-info-message">
            No active sub-menu items available in the "{currentMenu.name}" section.
          </p>
          <Link to={backLinkPath} className="global-back-link" dangerouslySetInnerHTML={{ __html: backLinkText }} />
        </div>
      </RotatingBackground>
    );
  }

  return (
    <RotatingBackground className="submenu-page-background"> {/* <-- Main Wrapper */}
      <div className="submenu-page-container">
        <h1 className="submenu-page-title">{currentMenu.name}</h1>
        <div className="cue-card-grid">
          {activeSubItems.map((subItem) => {
            if (!subItem || !subItem.id || !subItem.name) {
              return null; 
            }
            return (
              <CueCard
                key={subItem.id}
                title={subItem.name}
                backgroundImage={subItem.backgroundImage}
                onClick={() => handleCardClick(subItem)}
              />
            );
          })}
        </div>
        <Link to={backLinkPath} className="global-back-link" dangerouslySetInnerHTML={{ __html: backLinkText }} />
      </div>
    </RotatingBackground>
  );
};

export default SubMenuPage;