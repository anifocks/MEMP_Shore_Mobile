// File: Shore-Client/src/layouts/MEMPLayout/MEMPSidebar.jsx
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom'; 
import './MEMPSidebar.css';
import {
  FaBars, FaTimes, FaShip, FaCog, FaChartLine, FaCogs, FaAnchor, FaRoute, FaGasPump, FaFileAlt,
  FaFileExcel,
  FaFileContract,
  FaVials,
  FaUserShield, 
  FaUsers,      
  FaUserFriends, 
  FaChevronDown, 
  FaChevronRight,
  FaThLarge, 
  FaTachometerAlt, 
  FaChartBar,      
  FaLeaf,          
  FaMicrochip
} from 'react-icons/fa';

const MEMPSidebar = ({ menuItems, isCollapsed, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State to track expanded submenus
  const [expandedMenus, setExpandedMenus] = useState({
      'modules-parent': true 
  });

  // *** NEW: Get User Context for Permission Checks ***
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};
  const userRights = user.userRights || '';

  const toggleSubmenu = (itemId, e) => {
    e.preventDefault(); 
    e.stopPropagation();
    setExpandedMenus(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleParentClick = (item, e) => {
    if (item.subItems) {
        if (isCollapsed) {
            toggleSidebar();
            setExpandedMenus({ [item.id]: true });
            return;
        }
        toggleSubmenu(item.id, e);
        if(item.route) navigate(item.route);
    }
  };

  const iconMap = {
    'memp-overview': <FaChartLine />,
    'vessel-dashboard': <FaTachometerAlt />,
    'vessel-status': <FaChartBar />,
    'vessel-emissions': <FaLeaf />,
    'vessel-mach-data': <FaMicrochip />,
    'reporting-templates': <FaFileContract />,
    'admin-console': <FaUserShield />,
    'modules-parent': <FaThLarge />,
    'user-management': <FaUsers />,
    'fleet-management': <FaShip />,
    'team-management': <FaUserFriends />,
    'vessel-info': <FaShip />,
    'machinery-details': <FaCogs />,
    'port-management': <FaAnchor />,
    'voyage-management': <FaRoute />,
    'bunkering-management': <FaGasPump />,
    'vessel-reports': <FaFileAlt />,
    'additive-management': <FaVials />,
    'compliances-dashboard': <FaLeaf />,
    'excel-integration': <FaFileExcel />,
    default: <FaCog />
  };

  const getIcon = (itemId) => {
    return iconMap[itemId] || iconMap.default;
  };

  return (
    <div className={`memp-sidebar-container ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="memp-sidebar-top-header">
        {!isCollapsed && <h3 className="memp-sidebar-title">MEMP Tools</h3>}
        <button onClick={toggleSidebar} className="memp-sidebar-toggle-btn">
          {isCollapsed ? <FaBars /> : <FaTimes />}
        </button>
      </div>
      <nav className="memp-sidebar-nav">
        <ul>
          {menuItems.map(item => {
            if (!item.isActive) return null;

            // *** NEW: PERMISSION CHECK ***
            // If the item is 'admin-console', check if user is Super User (or Admin)
            if (item.id === 'admin-console') {
                if (userRights !== 'Super User' && userRights !== 'Admin') {
                    return null; // Hide this item completely
                }
            }

            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus[item.id];
            const isChildActive = hasSubItems && item.subItems.some(sub => location.pathname.startsWith(sub.route));

            return (
              <li key={item.id} className={`memp-sidebar-item ${hasSubItems ? 'has-submenu' : ''}`} title={isCollapsed ? item.name : ''}>
                
                <div 
                    className={`memp-sidebar-link ${isChildActive || (item.route && location.pathname === item.route) ? 'active' : ''}`}
                    onClick={(e) => hasSubItems ? handleParentClick(item, e) : navigate(item.route)}
                    style={{cursor: 'pointer'}}
                >
                  <div className="memp-sidebar-icon-container">{getIcon(item.id)}</div>
                  
                  {!isCollapsed && (
                    <>
                        <span className="memp-sidebar-link-text">{item.name}</span>
                        {hasSubItems && (
                            <span className="submenu-arrow">
                                {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                            </span>
                        )}
                    </>
                  )}
                </div>

                {!isCollapsed && hasSubItems && isExpanded && (
                    <ul className="memp-sidebar-submenu">
                        {item.subItems.map(subItem => (
                            subItem.isActive && (
                                <li key={subItem.id} className="memp-sidebar-subitem">
                                    <NavLink to={subItem.route} className={({ isActive }) => "memp-sidebar-sublink" + (isActive ? " active" : "")}>
                                        <div className="memp-sub-icon">{getIcon(subItem.id)}</div>
                                        <span>{subItem.name}</span>
                                    </NavLink>
                                </li>
                            )
                        ))}
                    </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default MEMPSidebar;