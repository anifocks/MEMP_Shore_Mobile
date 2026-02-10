import React, { useState, useEffect, useRef } from 'react';
import './HeaderUserProfile.css'; 
import { getUserProfileImageUrl, fetchUsers, uploadUserProfileImage, saveUser } from '../api'; 

const DEFAULT_MEMBER_IMAGE_PATH = '/member_images/default-member.png';

const HeaderUserProfile = () => {
    const [userData, setUserData] = useState({
        firstName: 'User',
        photoUrl: DEFAULT_MEMBER_IMAGE_PATH 
    });
    
    // Store full user object to perform updates
    const [currentUserObj, setCurrentUserObj] = useState(null);
    
    // UI States
    const [showMenu, setShowMenu] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fileInputRef = useRef(null);
    const menuRef = useRef(null);

    // --- 1. Load Data ---
    useEffect(() => {
        // Close menu if clicked outside
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        // Load Data Logic
        const loadFreshUserData = async () => {
            const storedUsername = localStorage.getItem('username');
            if (!storedUsername) return;

            try {
                // Fetch fresh data from DB
                const users = await fetchUsers();
                const foundUser = users.find(u => u.username === storedUsername);

                if (foundUser) {
                    setCurrentUserObj(foundUser); // Save full object for updates later

                    // Determine Name
                    const freshName = foundUser.firstName || storedUsername;
                    
                    // Determine Photo
                    let freshPhoto = DEFAULT_MEMBER_IMAGE_PATH;
                    if (foundUser.imageUrl) {
                        freshPhoto = getUserProfileImageUrl(foundUser.imageUrl);
                    }

                    setUserData({ 
                        firstName: freshName, 
                        photoUrl: freshPhoto 
                    });
                    
                    // Update LocalStorage to keep it in sync for next refresh
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({ ...localUser, ...foundUser }));
                }
            } catch (err) {
                console.error("HeaderUserProfile: Failed to load fresh data", err);
            }
        };

        loadFreshUserData();

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- 2. Menu Handlers ---
    const handleImageClick = () => {
        setShowMenu(!showMenu);
    };

    const handleOptionClick = (option) => {
        setShowMenu(false);
        if (option === 'view') {
            setShowViewModal(true);
        } else if (option === 'upload') {
            if (fileInputRef.current) fileInputRef.current.click();
        }
    };

    // --- 3. Upload Logic (Matches UserManagementPage) ---
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUserObj) return;

        setUploading(true);
        try {
            // A. Upload Image to Server
            const uploadResponse = await uploadUserProfileImage(file);
            const newImageFilename = uploadResponse.imageUrl; // e.g., "user-123.jpg"

            // B. Update User Record in Database
            const payload = {
                ...currentUserObj,
                imageUrl: newImageFilename
            };
            
            await saveUser(currentUserObj.userId, payload);

            // C. Update Local State (Immediate Reflection)
            const newFullUrl = getUserProfileImageUrl(newImageFilename);
            setUserData(prev => ({ ...prev, photoUrl: newFullUrl }));
            setCurrentUserObj(payload);

            // D. Update LocalStorage (So it persists on refresh)
            const localUser = JSON.parse(localStorage.getItem('user') || '{}');
            localUser.imageUrl = newImageFilename;
            localStorage.setItem('user', JSON.stringify(localUser));
            
            // alert("Profile picture updated successfully!");

        } catch (err) {
            console.error("Failed to update profile picture", err);
            alert("Failed to upload image.");
        } finally {
            setUploading(false);
            // Reset input so same file can be selected again if needed
            e.target.value = null; 
        }
    };

    return (
        <div className="header-user-profile" ref={menuRef}>
            <span className="welcome-text">
                Welcome, <strong>{userData.firstName}</strong>
            </span>
            
            {/* Avatar Circle with Click Handler */}
            <div className="avatar-circle" onClick={handleImageClick} title="Click to View or Change Image">
                <img 
                    src={userData.photoUrl} 
                    alt="Profile" 
                    onError={(e) => {
                        if (e.target.src !== DEFAULT_MEMBER_IMAGE_PATH) {
                            e.target.src = DEFAULT_MEMBER_IMAGE_PATH;
                        }
                    }} 
                />
                {uploading && <div className="spinner-overlay"></div>}
            </div>

            {/* Dropdown Menu */}
            {showMenu && (
                <div className="profile-dropdown-menu">
                    <div className="menu-item" onClick={() => handleOptionClick('view')}>
                        View Image
                    </div>
                    <div className="menu-item" onClick={() => handleOptionClick('upload')}>
                        Upload Image
                    </div>
                </div>
            )}

            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleFileChange}
            />

            {/* View Image Modal */}
            {showViewModal && (
                <div className="image-view-modal" onClick={() => setShowViewModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <img src={userData.photoUrl} alt="Full Profile" />
                        <button className="close-modal-btn" onClick={() => setShowViewModal(false)}>×</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeaderUserProfile;