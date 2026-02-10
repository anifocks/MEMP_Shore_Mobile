// src/pages/AddEditUserPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// *** CHANGE 1: Use standard fetchFleets/fetchVessels (security is now handled in api.js) ***
import { fetchUserDetails, saveUser, uploadUserProfileImage, getUserProfileImageUrl, fetchUserRights, fetchFleets, fetchVessels, softDeleteUser } from '../api.js';
import { FaSave, FaTimes, FaCamera, FaTrash } from 'react-icons/fa';
import './AddEditUserPage.css'; 

const FALLBACK_USER_RIGHTS_OPTIONS = [
    { value: 'Admin', label: 'Admin' },
    // *** CHANGE 2: Added Super User option ***
    { value: 'Super User', label: 'Super User' },
    { value: 'Supervisor', label: 'Supervisor' },
    { value: 'Vessel User', label: 'Vessel User' },
];

const DEFAULT_MEMBER_IMAGE_PATH = '/member_images/default-member.png';

const AddEditUserPage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    
    const isEditMode = window.location.pathname.includes('/edit');
    const isViewMode = !isEditMode && userId; 

    const [user, setUser] = useState({
        userId: null,
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        designation: '',
        fleet: '',   
        vessels: '', 
        isActive: true,
        imageUrl: null,
        userRights: FALLBACK_USER_RIGHTS_OPTIONS[3].value, // Default to Vessel User
    });
    
    const [passwordError, setPasswordError] = useState('');
    const [loading, setLoading] = useState(!!userId);
    const [submitting, setSubmitting] = useState(false);
    
    const [file, setFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    
    const [userRightsOptions, setUserRightsOptions] = useState(FALLBACK_USER_RIGHTS_OPTIONS);
    const [fleetOptions, setFleetOptions] = useState([]);
    const [vesselOptions, setVesselOptions] = useState([]);

    const loadUser = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        try {
            const data = await fetchUserDetails(userId); 
            setUser({
                ...data,
                password: '', 
            });
            const fullImagePath = data.imageUrl 
                ? getUserProfileImageUrl(data.imageUrl) 
                : null;
            setImagePreview(fullImagePath);
        } catch (err) {
            alert(`Error loading user details: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        const loadMetadata = async () => {
            try {
                // *** CHANGE 3: Standard calls. 'Super User' login will automatically see ALL data. ***
                const [rights, fleets, vessels] = await Promise.all([
                    fetchUserRights(),
                    fetchFleets(), 
                    fetchVessels()
                ]);

                if (rights && rights.length > 0) {
                    setUserRightsOptions(rights.map(r => ({ value: r, label: r })));
                }
                setFleetOptions(fleets || []);
                setVesselOptions(vessels || []);

            } catch (error) {
                console.error("Error loading metadata:", error);
            }
        };
        loadMetadata();
        loadUser();
    }, [loadUser]);

    const handleChange = (e) => {
        if (isViewMode) return;
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setUser(prev => ({ ...prev, [name]: val }));
    };

    const handleMultiSelectChange = (field, value) => {
        if (isViewMode) return;
        const currentString = user[field] || '';
        let currentList = currentString ? currentString.split(',').map(s => s.trim()) : [];
        
        if (currentList.includes(value)) {
            currentList = currentList.filter(item => item !== value);
        } else {
            currentList.push(value);
        }
        setUser(prev => ({ ...prev, [field]: currentList.join(', ') }));
    };

    const handleFileChange = (e) => {
        if (isViewMode) return;
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        if (selectedFile) {
            setImagePreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleDeleteUser = async () => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            await softDeleteUser(userId);
            alert("User deleted successfully.");
            navigate('/app/memp/admin/users');
        } catch (error) {
            alert(`Failed to delete user: ${error.message}`);
        }
    };

    const validateForm = () => {
        let isValid = true;
        setPasswordError('');
        if (!user.username || !user.email) {
            alert('Username and Email are required.');
            isValid = false;
        }
        if (!userId && !user.password) {
            alert('Password is required for new users.');
            isValid = false;
        }
        if (!user.userRights) {
            alert('User Rights selection is required.');
            isValid = false;
        }
        if (user.password && user.password.length < 6) {
            setPasswordError('Password must be at least 6 characters long.');
            isValid = false;
        }
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isViewMode) return;
        if (!validateForm()) return;
        
        setSubmitting(true);
        let finalImageUrl = user.imageUrl;
        try {
            if (file) {
                const uploadResponse = await uploadUserProfileImage(file);
                finalImageUrl = uploadResponse.imageUrl;
            }
            const payload = {
                ...user,
                imageUrl: finalImageUrl, 
                password: !userId || user.password ? user.password : undefined,
            };
            await saveUser(userId, payload);
            alert(`User ${userId ? 'updated' : 'added'} successfully!`);
            navigate('/app/memp/admin/users');
        } catch (err) {
            alert(`Save failed: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Helper: Checkbox Grid
    const CheckboxGroup = ({ label, options, fieldName, selectedString }) => {
        const selectedList = selectedString ? selectedString.split(',').map(s => s.trim()) : [];
        return (
            <div className="form-section-full">
                <label className="section-label">{label}</label>
                <div className="checkbox-grid-container">
                    {options.map((opt) => {
                        const itemValue = opt.fleetName || opt.ShipName; 
                        const isChecked = selectedList.includes(itemValue);
                        return (
                            <div 
                                key={itemValue} 
                                className={`checkbox-chip ${isChecked ? 'checked' : ''} ${isViewMode ? 'disabled' : ''}`}
                                onClick={() => handleMultiSelectChange(fieldName, itemValue)}
                            >
                                <input type="checkbox" checked={isChecked} readOnly />
                                <span>{itemValue}</span>
                            </div>
                        );
                    })}
                    {options.length === 0 && <span className="no-data">No items available.</span>}
                </div>
            </div>
        );
    };

    if (loading) return <div className="loading-screen">Loading...</div>;

    const primaryImageSrc = imagePreview || DEFAULT_MEMBER_IMAGE_PATH;
    const pageTitle = userId ? (isEditMode ? 'Edit User' : 'User Details') : 'Create User';
    const breadcrumbName = user.firstName ? `${user.firstName} ${user.lastName}` : 'New User';

    // *** LOGIC REVERTED: We removed the client-side filtering logic ***
    // Now we rely on the backend (via api.js permissions) to return either "All" (for Super User/Admin)
    // or "Assigned Only" (for everyone else). We display whatever comes back.
    
    return (
        <div className="modern-user-page">
            <div className="page-header-simple">
                <div className="breadcrumb-area">
                    <span className="breadcrumb-link" onClick={() => navigate('/app/memp')}>MEMP</span>
                    <span className="separator">•</span>
                    <span className="breadcrumb-link" onClick={() => navigate('/app/memp/admin')}>Admin</span>
                    <span className="separator">•</span>
                    <span className="breadcrumb-link" onClick={() => navigate('/app/memp/admin/users')}>Users</span>
                    <span className="separator">•</span>
                    <span className="current-page">{breadcrumbName}</span>
                </div>
                <h1 className="page-heading">{pageTitle}</h1>
            </div>

            <form onSubmit={handleSubmit} className="split-layout-container">
                <div className="left-column">
                    <div className="profile-card card-shadow">
                        <div className="profile-img-container">
                            <img 
                                src={primaryImageSrc} 
                                alt="Profile" 
                                className="profile-avatar"
                                onError={(e) => { e.target.src = DEFAULT_MEMBER_IMAGE_PATH; }}
                            />
                            {!isViewMode && (
                                <div className="upload-overlay">
                                    <label htmlFor="file-upload" className="upload-btn-icon">
                                        <FaCamera />
                                    </label>
                                </div>
                            )}
                        </div>
                        
                        {!isViewMode && (
                            <>
                                <div className="upload-instruction">
                                    <label htmlFor="file-upload" className="upload-link">Upload Photo</label>
                                    <input id="file-upload" type="file" onChange={handleFileChange} accept="image/*" />
                                    <p className="help-text">Allowed *.jpeg, *.jpg, *.png, *.gif max size of 3 Mb</p>
                                </div>
                                <div className="status-toggles">
                                    <div className="toggle-row">
                                        <span className="toggle-label">Active Account</span>
                                        <label className="switch">
                                            <input 
                                                type="checkbox" 
                                                name="isActive" 
                                                checked={user.isActive} 
                                                onChange={handleChange} 
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                </div>
                                {userId && (
                                    <button type="button" className="delete-user-btn" onClick={handleDeleteUser}>
                                        Delete user
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="right-column">
                    <div className="details-card card-shadow">
                        <div className="form-grid-2-col">
                            <div className="input-group">
                                <label>First Name</label>
                                <input 
                                    type="text" name="firstName" 
                                    value={user.firstName} onChange={handleChange} 
                                    readOnly={isViewMode} 
                                    className="modern-input"
                                />
                            </div>
                            <div className="input-group">
                                <label>Last Name</label>
                                <input 
                                    type="text" name="lastName" 
                                    value={user.lastName} onChange={handleChange} 
                                    readOnly={isViewMode} 
                                    className="modern-input"
                                />
                            </div>

                            <div className="input-group">
                                <label>Email Address <span className="req">*</span></label>
                                <input 
                                    type="email" name="email" 
                                    value={user.email} onChange={handleChange} 
                                    required readOnly={isViewMode} 
                                    className="modern-input"
                                />
                            </div>
                            <div className="input-group">
                                <label>Username <span className="req">*</span></label>
                                <input 
                                    type="text" name="username" 
                                    value={user.username} onChange={handleChange} 
                                    required readOnly={isViewMode || !!userId} 
                                    className="modern-input"
                                />
                            </div>

                            <div className="input-group">
                                <label>Password {userId && <span className="hint">(Leave empty to keep)</span>}</label>
                                <input 
                                    type="password" name="password" 
                                    value={user.password} onChange={handleChange} 
                                    placeholder={userId ? '••••••••' : ''}
                                    readOnly={isViewMode} 
                                    className="modern-input"
                                />
                                {passwordError && <span className="error-text">{passwordError}</span>}
                            </div>
                            <div className="input-group">
                                <label>User Rights <span className="req">*</span></label>
                                <select 
                                    name="userRights" 
                                    value={user.userRights} onChange={handleChange} 
                                    required disabled={isViewMode}
                                    className="modern-select"
                                >
                                    <option value="">Select Role</option>
                                    {userRightsOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                             <div className="input-group full-width">
                                <label>Designation</label>
                                <input 
                                    type="text" name="designation" 
                                    value={user.designation} onChange={handleChange} 
                                    readOnly={isViewMode} 
                                    className="modern-input"
                                />
                            </div>
                        </div>

                        <div className="selection-area">
                            <CheckboxGroup 
                                label="Assigned Fleets" 
                                options={fleetOptions} 
                                fieldName="fleet" 
                                selectedString={user.fleet} 
                            />
                            
                            <CheckboxGroup 
                                label="Assigned Vessels" 
                                options={vesselOptions} 
                                fieldName="vessels" 
                                selectedString={user.vessels} 
                            />
                        </div>

                        <div className="card-footer">
                            {!isViewMode && (
                                <button type="submit" className="save-changes-btn" disabled={submitting}>
                                    {submitting ? 'Saving...' : 'Save changes'}
                                </button>
                            )}
                            {isViewMode && (
                                <button type="button" className="save-changes-btn" onClick={() => navigate(`/app/memp/admin/users/${userId}/edit`)}>
                                    Edit Profile
                                </button>
                            )}
                             <button type="button" className="cancel-btn" onClick={() => navigate('/app/memp/admin/users')}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddEditUserPage;