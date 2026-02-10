// client/src/pages/VoyageAddEditPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import debounce from 'lodash.debounce';
// UPDATED: Added icons for file handling and a download icon
import { FaRoute, FaInfoCircle, FaCalendarAlt, FaMapMarkerAlt, FaShip, FaPaperclip, FaTimes, FaDownload, FaTrashAlt } from 'react-icons/fa'; 
import './VoyageAddEditPage.css';
import UpdateVoyageLegModal from '../components/MEMP/UpdateVoyageLegModal';
import CreateInitialVoyageLegsModal from '../components/MEMP/CreateInitialVoyageLegsModal';
import CreateSubsequentVoyageLegsModal from '../components/MEMP/CreateSubsequentVoyageLegsModal'; // NEW IMPORT

const API_BASE_URL = 'http://localhost:7000/api';
//const API_BASE_URL = 'https://veemsonboardupgrade.theviswagroup.com/api';


const customStyles = {
    menu: (provided, state) => ({
        ...provided,
        zIndex: 9999,
        position: 'absolute',
        display: 'block',
        opacity: 1,
        visibility: 'visible',
        backgroundColor: 'white',
        border: '1px solid #ccc',
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
        maxHeight: '200px',
        overflowY: 'auto',
        padding: '5px',
    }),
    option: (provided, state) => ({
        ...provided,
        display: 'block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        padding: '8px 12px',
        cursor: 'pointer',
        color: state.isSelected ? 'white' : '#333',
        backgroundColor: state.isSelected
            ? '#007bff'
            : state.isFocused
                ? '#f0f0f0'
                : 'white',
    }),
};

// Helper function to construct the correct URL for file downloads
const getAttachmentUrl = (filename) => {
    // Uses the API Gateway's exposed static route for voyage attachments
    return `${API_BASE_URL}/voyages/uploads/voyage_attachments/${filename}`;
};


const VoyageAddEditPage = () => {
    const { voyageId } = useParams();
    const navigate = useNavigate();
    const isEditing = !!voyageId;

    const [voyageData, setVoyageData] = useState(null); // To hold details including LastLegNumber
    const [voyageLegs, setVoyageLegs] = useState([]); // State for voyage legs
    const [legsAttachments, setLegsAttachments] = useState({}); // Attachments keyed by VoyageLegID
    
    // NEW STATES FOR HEADER ATTACHMENTS
    const [attachments, setAttachments] = useState([]); // New files to upload for header
    const [existingHeaderAttachments, setExistingHeaderAttachments] = useState([]); // Existing files for header

    // MODAL STATES
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false); 
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); 
    const [isSubsequentModalOpen, setIsSubsequentModalOpen] = useState(false); 
    const [selectedLeg, setSelectedLeg] = useState(null);
    const [newSubsequentLegDetails, setNewSubsequentLegDetails] = useState(null);
    
    // MODAL HANDLERS
    const openLegModal = (leg) => {
        setSelectedLeg(leg);
        setIsUpdateModalOpen(true);
    };

    const closeLegModal = () => {
        setIsUpdateModalOpen(false);
        setSelectedLeg(null);
    };

    const openCreateLegsModal = () => {
        setIsCreateModalOpen(true);
    };

    const closeCreateLegsModal = () => {
        setIsCreateModalOpen(false);
    };
    
    const closeSubsequentLegModal = () => {
        setIsSubsequentModalOpen(false);
        setNewSubsequentLegDetails(null);
    };

    const handleLegUpdateSuccess = () => {
        closeLegModal();
        fetchVoyageData(); // Re-fetch all data to refresh the table
    };
    
    const handleInitialLegsCreationSuccess = () => {
        closeCreateLegsModal();
        fetchVoyageData(); // Re-fetch all data to refresh the table
    };
    
    const handleSubsequentLegCreationSuccess = () => { 
        closeSubsequentLegModal();
        fetchVoyageData();
    };
    // END MODAL HANDLERS


    const [formData, setFormData] = useState({
        ShipID: '',
        VoyageNumber: '',
        DeparturePortCode: '',
        ArrivalPortCode: '',
        ETD_UTC: '',
        ATD_UTC: '',
        ETA_UTC: '',
        ATA_UTC: '',
        DistancePlannedNM: '',
        DistanceSailedNM: '',
        CargoDescription: '',
        CargoWeightMT: '',
        VoyageStatus: 'Planned',
        Notes: '',
        IsActive: true,
    });

    const [initialVesselOption, setInitialVesselOption] = useState(null);
    const [departurePortSearchTerm, setDeparturePortSearchTerm] = useState('');
    const [departurePortSuggestions, setDeparturePortSuggestions] = useState([]);
    const [showDepartureSuggestions, setShowDepartureSuggestions] = useState(false);
    const [arrivalPortSearchTerm, setArrivalPortSearchTerm] = useState('');
    const [arrivalPortSuggestions, setArrivalPortSuggestions] = useState([]);
    const [showArrivalSuggestions, setShowArrivalSuggestions] = useState(false);
    const departurePortRef = useRef(null);
    const arrivalPortRef = useRef(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(isEditing);
    const [error, setError] = useState('');

    const formatDateTimeLocal = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString); // Parses the backend's local time string
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // MODIFIED: Reusable function to fetch legs and their attachments
    const fetchLegs = async (id) => {
        if (!id) return { legs: [], attachments: {} };
        
        try {
            const legsResponse = await axios.get(`${API_BASE_URL}/voyages/${id}/legs`);
            const legs = legsResponse.data;
            const attachmentsMap = {};

            // Fetch attachments for all legs concurrently
            const attachmentPromises = legs.map(async (leg) => {
                try {
                    const legId = leg.VoyageLegID;
                    const attachResponse = await axios.get(`${API_BASE_URL}/voyages/legs/${legId}/attachments`);
                    attachmentsMap[legId] = attachResponse.data;
                } catch (err) {
                    console.error(`Error fetching attachments for leg ${leg.VoyageLegID}:`, err);
                    attachmentsMap[leg.VoyageLegID] = [];
                }
            });

            await Promise.all(attachmentPromises);
            
            return { legs: legs, attachments: attachmentsMap };
            
        } catch (error) {
            console.error("Error fetching voyage legs during data load:", error);
            return { legs: [], attachments: {} };
        }
    }


    // Function to fetch all necessary voyage data
    const fetchVoyageData = useCallback(async () => {
        setLoadingDetails(true);
        setError('');
        if (!isEditing || !voyageId) {
            setLoadingDetails(false);
            return;
        }

        try {
            // 1. Fetch Voyage Details (now includes LastLegNumber)
            const [voyageResponse, headerAttachmentsResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/voyages/details/${voyageId}`),
                axios.get(`${API_BASE_URL}/voyages/${voyageId}/attachments`) // Fetch main header attachments
            ]);
            
            const details = voyageResponse.data;
            
            setVoyageData(details); 
            setExistingHeaderAttachments(headerAttachmentsResponse.data); // Store existing header attachments

            // Map details to formData for the form inputs
            setFormData({
                ShipID: details.ShipID,
                VoyageNumber: details.VoyageNumber || '',
                DeparturePortCode: details.DeparturePortCode || '',
                ArrivalPortCode: details.ArrivalPortCode || '',
                ETD_UTC: formatDateTimeLocal(details.ETD_UTC),
                ATD_UTC: formatDateTimeLocal(details.ATD_UTC),
                ETA_UTC: formatDateTimeLocal(details.ETA_UTC),
                ATA_UTC: formatDateTimeLocal(details.ATA_UTC),
                DistancePlannedNM: details.DistancePlannedNM || '',
                DistanceSailedNM: details.DistanceSailedNM || '',
                CargoDescription: details.CargoDescription || '',
                CargoWeightMT: details.CargoWeightMT || '',
                VoyageStatus: details.VoyageStatus || 'Planned',
                Notes: details.Notes || '',
                IsActive: details.IsActive,
            });
            if (details.ShipID && details.VesselName) {
                setInitialVesselOption({ value: details.ShipID, label: `${details.VesselName} (${details.IMO_Number})` });
            } else {
                setInitialVesselOption(null);
            }
            if (details.DeparturePortCode && details.Departure_Port_Name) {
                setDeparturePortSearchTerm(details.Departure_Port_Name);
            }
            if (details.ArrivalPortCode && details.Arrival_Port_Name) {
                setArrivalPortSearchTerm(details.Arrival_Port_Name);
            }

            // 2. Fetch Voyage Legs and their Attachments
            const { legs, attachments } = await fetchLegs(voyageId);
            setVoyageLegs(legs);
            setLegsAttachments(attachments); // Store the attachments map
            
            // 3. Clear existing modal state if data is now ready
            if (legs.length > 0) {
                setIsCreateModalOpen(false);
            }

        } catch (err) {
            console.error("Error fetching voyage details or legs for edit:", err);
            setError("Failed to load voyage details for editing. " + (err.response?.data?.error || err.message));
        } finally {
            setLoadingDetails(false);
        }
    }, [isEditing, voyageId]);


    useEffect(() => {
        if (isEditing) {
            fetchVoyageData();
        } else {
             // Reset state for Add mode
             setFormData({
                 ShipID: '', VoyageNumber: '', DeparturePortCode: '', ArrivalPortCode: '',
                 ETD_UTC: '', ATD_UTC: '', ETA_UTC: '', ATA_UTC: '',
                 DistancePlannedNM: '', DistanceSailedNM: '', CargoDescription: '', CargoWeightMT: '',
                 VoyageStatus: 'Planned', Notes: '', IsActive: true,
             });
             setVoyageLegs([]);
             setVoyageData(null);
             setInitialVesselOption(null);
             setDeparturePortSearchTerm('');
             setArrivalPortSearchTerm('');
             setLoadingDetails(false);
             // Clear attachments on mode change to Add
             setAttachments([]); 
             setExistingHeaderAttachments([]);
        }
    }, [isEditing, voyageId, fetchVoyageData]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (departurePortRef.current && !departurePortRef.current.contains(event.target)) {
                setShowDepartureSuggestions(false);
            }
            if (arrivalPortRef.current && !arrivalPortRef.current.contains(event.target)) {
                setShowArrivalSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const loadVesselOptions = useCallback(debounce(async (inputValue, callback) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/ships/active`, { // Corrected URL
                params: { search: inputValue }
            });
            if (Array.isArray(response.data)) {
                const options = response.data.map(v => ({ value: v.ShipID, label: `${v.ShipName} (${v.IMO_Number})` }));
                callback(options);
            } else {
                callback([]);
            }
        } catch (err) {
            console.error("[VoyageAddEditPage] Error loading vessel options:", err);
            setError(`Failed to fetch vessels: ${err.response?.data?.error || err.message}`);
            callback([]);
        }
    }, 300), []);

    const fetchPortSuggestions = useCallback(debounce(async (searchTerm, setSuggestions) => {
        setSuggestions([]);
        if (searchTerm.length < 2) {
            return;
        }
        try {
            const response = await axios.get(`${API_BASE_URL}/ports/names-only`, {
                params: { search: searchTerm }
            });
            if (Array.isArray(response.data)) {
                setSuggestions(response.data);
            } else {
                setSuggestions([]);
            }
        } catch (err) {
            console.error("[VoyageAddEditPage] Error fetching port suggestions:", err);
            setError(`Failed to fetch ports: ${err.response?.data?.error || err.message}`);
            setSuggestions([]);
        }
    }, 300), []);

    const handlePortSearchChange = (e, portType) => {
        const value = e.target.value;
        if (portType === 'departure') {
            setDeparturePortSearchTerm(value);
            setShowDepartureSuggestions(true);
            fetchPortSuggestions(value, setDeparturePortSuggestions);
            if (value === '') {
                setFormData(prev => ({ ...prev, DeparturePortCode: '' }));
            }
        } else if (portType === 'arrival') {
            setArrivalPortSearchTerm(value);
            setShowArrivalSuggestions(true);
            fetchPortSuggestions(value, setArrivalPortSuggestions);
            if (value === '') {
                setFormData(prev => ({ ...prev, ArrivalPortCode: '' }));
            }
        }
    };
    
    const handlePortSelect = (port, portType) => {
        if (portType === 'departure') {
            setDeparturePortSearchTerm(port.PortName);
            setFormData(prev => ({ ...prev, DeparturePortCode: port.PortCode }));
            setShowDepartureSuggestions(false);
        } else if (portType === 'arrival') {
            setArrivalPortSearchTerm(port.PortName);
            setFormData(prev => ({ ...prev, ArrivalPortCode: port.PortCode }));
            setShowArrivalSuggestions(false);
        }
    };

    const handlePortInputFocus = (portType) => {
        if (portType === 'departure') {
            setShowDepartureSuggestions(true);
            if (departurePortSearchTerm.length >= 2) {
                fetchPortSuggestions(departurePortSearchTerm, setDeparturePortSuggestions);
            }
        } else if (portType === 'arrival') {
            setShowArrivalSuggestions(true);
            if (arrivalPortSearchTerm.length >= 2) {
                fetchPortSuggestions(arrivalPortSearchTerm, setArrivalPortSuggestions);
            }
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSelectChange = (selectedOption, { name }) => {
        setFormData(prev => ({
            ...prev,
            [name]: selectedOption ? selectedOption.value : ''
        }));
        if (name === "ShipID") {
            setInitialVesselOption(selectedOption);
        }
    };
    
    // HANDLER: For file input changes (New files to upload)
    const handleNewFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        // Basic validation for file types accepted by the backend (PDF, JPG, PNG)
        const validFiles = newFiles.filter(file => file.type === 'application/pdf' || file.type.startsWith('image/'));

        if (validFiles.length !== newFiles.length) {
            setError('Warning: Only PDF, JPG, and PNG files are accepted as voyage documents.');
        } else {
             setError('');
        }
        
        setAttachments(prev => [...prev, ...validFiles]);
        e.target.value = null; 
    };

    // HANDLER: To remove a selected new file before submission
    const handleRemoveNewAttachment = (fileToRemove) => {
        setAttachments(prev => prev.filter(file => file !== fileToRemove));
    };

    // NEW HANDLER: To soft-delete an existing attachment
    const handleDeleteExistingAttachment = async (attachmentId) => {
        if (!window.confirm("Are you sure you want to delete this document? This cannot be undone.")) return;

        try {
            await axios.delete(`${API_BASE_URL}/voyages/attachments/${attachmentId}`);
            alert('Document deleted successfully!');
            // Refresh attachments state
            setExistingHeaderAttachments(prev => prev.filter(att => att.Attachment_Id !== attachmentId));
        } catch (err) {
            console.error("Error deleting attachment:", err);
            setError('Failed to delete document: ' + (err.response?.data?.message || err.message));
        }
    };


    // MODIFIED: This function now populates state and opens the modal instead of making a direct API call
    const handleAddSubsequentLeg = async () => {
        if (!voyageData) { 
            alert("Voyage data is not fully loaded. Please wait or refresh the page.");
            return;
        }

        setSubmitLoading(true);
        setError('');
        let legsToUse = voyageLegs;

        // Force a fresh fetch if local state is empty/stale (safety check)
        if (legsToUse.length === 0) {
            try {
                const { legs: fetchedLegs } = await fetchLegs(voyageId);
                legsToUse = fetchedLegs;
                setVoyageLegs(legsToUse); 
            } catch (err) {
                alert("Failed to retrieve existing legs. Please check network connection.");
                setSubmitLoading(false);
                return;
            }
        }
        
        const lastLeg = legsToUse[legsToUse.length - 1];
        
        if (!lastLeg) {
             alert("Error: Missing legs after creation attempt. This indicates a server data issue. Please use the 'Create Initial Legs' button.");
             setSubmitLoading(false);
             return;
        }
        
        // Determine the Departure Port for the NEW leg (Leg N+1)
        let newDeparturePortCode = lastLeg.ArrivalPortCode;
        let newDeparturePortName = lastLeg.Arrival_Port_Name;

        if (!newDeparturePortCode) {
            // RELAXED VALIDATION: Fallback to the previous leg's departure port
            newDeparturePortCode = lastLeg.DeparturePortCode;
            newDeparturePortName = lastLeg.Departure_Port_Name; // Use the name of the departure port for the warning

            alert(`Warning: The previous leg (Leg ${lastLeg.LegNumber}) is incomplete (Arrival Port missing). The new leg's departure port has been defaulted to the previous leg's Departure Port (${newDeparturePortName}). Please update the details of the previous leg to maintain a continuous route.`);
        }
        
        // Populate state and open the modal
        setNewSubsequentLegDetails({
            voyageId: voyageId,
            newLegNumber: voyageData.LastLegNumber + 1,
            voyageNumber: voyageData.VoyageNumber,
            newDeparturePortCode: newDeparturePortCode,
            newDeparturePortName: newDeparturePortName,
        });

        // Open the modal instead of calling API directly
        setIsSubsequentModalOpen(true);
        setSubmitLoading(false);
    };


    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);

    if (!formData.ShipID || !formData.VoyageNumber || !formData.DeparturePortCode || !formData.ArrivalPortCode) {
        setError('Please fill in all required fields (Vessel Name, Voyage Number, Departure Port, Arrival Port).');
        setSubmitLoading(false);
        return;
    }

    // *** BASE PAYLOAD CONSTRUCTION ***
    const basePayload = {
        ...formData,
        ETD_UTC: formData.ETD_UTC || null,
        ATD_UTC: formData.ATD_UTC || null,
        ETA_UTC: formData.ETA_UTC || null,
        ATA_UTC: formData.ATA_UTC || null,
        
        DistancePlannedNM: parseFloat(formData.DistancePlannedNM) || null,
        DistanceSailedNM: parseFloat(formData.DistanceSailedNM) || null,
        CargoWeightMT: parseFloat(formData.CargoWeightMT) || null,
        IsActive: formData.IsActive ? 1 : 0,
    };
    
    // --- ATTACHMENTS HANDLING ---
    const apiPath = isEditing ? `${API_BASE_URL}/voyages/${voyageId}` : `${API_BASE_URL}/voyages`;
    const method = isEditing ? 'put' : 'post';
    
    try {
        const formDataPayload = new FormData();
        
        // 1. Append JSON data
        for (const key in basePayload) {
            // Convert to string for FormData, handling null/undefined safely
            const value = basePayload[key] === null || basePayload[key] === undefined ? '' : String(basePayload[key]);
            formDataPayload.append(key, value); 
        }

        // 2. Append files using the multer field name 'attachments'
        attachments.forEach(file => {
            formDataPayload.append('attachments', file); 
        });

        // CRITICAL FIX: Send FormData without manually setting Content-Type.
        const response = await axios({
            method: method,
            url: apiPath,
            data: formDataPayload,
        });

        // Handle success
        if (isEditing) {
            alert('Voyage updated successfully!');
        } else {
            alert('Voyage created successfully! Initial legs must be created via the Edit flow.');
        }
        navigate('/app/memp/voyages');
    } catch (err) {
        console.error("Submission error:", err);
        setError('Failed to save voyage: ' + (err.response?.data?.error || err.response?.data?.message || err.message || 'Please check your input.'));
    } finally {
        setSubmitLoading(false);
    }
   };

    if (loadingDetails) {
        return <div className="voyage-add-edit-loading">Loading voyage details...</div>;
    }

    // Helper function to render port suggestions (used by all three forms)
    const renderPortSuggestions = (suggestions, selectedPortName, selectHandler) => {
        if (!suggestions || suggestions.length === 0) return null;
        return (
            <ul className="port-suggestions-list">
                {suggestions.map(port => (
                    <li
                        key={port.PortCode}
                        onClick={() => selectHandler(port, selectedPortName)}
                    >
                        {port.PortName} ({port.PortCode})
                    </li>
                ))}
            </ul>
        );
    }


    return (
        <div className="voyage-add-edit-page-container">
            {/* MODAL RENDERING */}
            {isUpdateModalOpen && selectedLeg && (
                <UpdateVoyageLegModal 
                    leg={selectedLeg}
                    legAttachments={legsAttachments[selectedLeg.VoyageLegID] || []} // Pass existing attachments
                    onClose={closeLegModal}
                    onUpdateSuccess={handleLegUpdateSuccess}
                />
            )}
            {isCreateModalOpen && voyageData && (
                <CreateInitialVoyageLegsModal
                    voyageId={voyageId}
                    voyageData={voyageData}
                    onClose={closeCreateLegsModal}
                    onCreationSuccess={handleInitialLegsCreationSuccess}
                />
            )}
            {isSubsequentModalOpen && newSubsequentLegDetails && ( // NEW MODAL RENDER
                <CreateSubsequentVoyageLegsModal
                    newLegDetails={newSubsequentLegDetails}
                    onClose={closeSubsequentLegModal}
                    onCreationSuccess={handleSubsequentLegCreationSuccess}
                />
            )}
            {/* END MODAL RENDERING */}

            <div className="page-header">
                <h1>{isEditing ? `Edit Voyage: ${formData.VoyageNumber || ''}` : 'Create New Voyage'}</h1>
                <Link to="/app/memp/voyages" className="back-link">&larr; Back to Voyage List</Link>
            </div>

            {error && <p className="form-error-message page-level-error">{error}</p>}

            <section className="form-section">
                <form onSubmit={handleSubmit} className="voyage-form">
                    <div className="form-grid">
                        {/* Vessel Name Dropdown */}
                        <div className="form-group">
                            <label htmlFor="ShipID">Vessel Name <span className="required-star">*</span>:</label>
                            <AsyncSelect
                                id="ShipID"
                                name="ShipID"
                                cacheOptions={false}
                                loadOptions={loadVesselOptions}
                                defaultOptions={true}
                                value={initialVesselOption}
                                onChange={(selectedOption) => handleSelectChange(selectedOption, { name: "ShipID" })}
                                placeholder="Search & Select Vessel"
                                isClearable
                                isDisabled={submitLoading || isEditing}
                                required
                                classNamePrefix="react-select"
                                styles={customStyles}
                                menuPortalTarget={document.body}
                            />
                        </div>

                        {/* Voyage Number Input */}
                        <div className="form-group">
                            <label htmlFor="VoyageNumber">Voyage Number <span className="required-star">*</span>:</label>
                            <input
                                type="text"
                                id="VoyageNumber"
                                name="VoyageNumber"
                                value={formData.VoyageNumber}
                                onChange={handleChange}
                                disabled={submitLoading || isEditing}
                                required
                            />
                        </div>

                        {/* Departure Port - Custom Autocomplete */}
                        <div className="form-group" ref={departurePortRef}>
                            <label htmlFor="DeparturePortName">Departure Port <span className="required-star">*</span>:</label>
                            <input
                                type="text"
                                id="DeparturePortName"
                                name="DeparturePortName"
                                value={departurePortSearchTerm}
                                onChange={(e) => handlePortSearchChange(e, 'departure')}
                                onFocus={() => handlePortInputFocus('departure')}
                                placeholder="Search & Select Departure Port (Type 2+ chars)"
                                disabled={submitLoading}
                                required
                                autoComplete="off"
                                className="port-search-input"
                            />
                            {showDepartureSuggestions && renderPortSuggestions(departurePortSuggestions, 'departure', handlePortSelect)}
                            {showDepartureSuggestions && departurePortSearchTerm.length >= 2 && departurePortSuggestions.length === 0 && (
                                <div className="no-options-message">No matching ports found.</div>
                            )}
                        </div>

                        {/* Arrival Port - Custom Autocomplete */}
                        <div className="form-group" ref={arrivalPortRef}>
                            <label htmlFor="ArrivalPortName">Arrival Port <span className="required-star">*</span>:</label>
                            <input
                                type="text"
                                id="ArrivalPortName"
                                name="ArrivalPortName"
                                value={arrivalPortSearchTerm}
                                onChange={(e) => handlePortSearchChange(e, 'arrival')}
                                onFocus={() => handlePortInputFocus('arrival')}
                                placeholder="Search & Select Arrival Port (Type 2+ chars)"
                                disabled={submitLoading}
                                required
                                autoComplete="off"
                                className="port-search-input"
                            />
                            {showArrivalSuggestions && renderPortSuggestions(arrivalPortSuggestions, 'arrival', handlePortSelect)}
                            {showArrivalSuggestions && arrivalPortSearchTerm.length >= 2 && arrivalPortSuggestions.length === 0 && (
                                <div className="no-options-message">No matching ports found.</div>
                            )}
                        </div>

                        {/* *** MODIFIED: Labels for Date/Time Inputs updated for clarity. *** */}
                        <div className="form-group">
                            <label htmlFor="ETD_UTC">ETD:</label>
                            <input
                                type="datetime-local"
                                id="ETD_UTC"
                                name="ETD_UTC"
                                value={formData.ETD_UTC}
                                onChange={handleChange}
                                disabled={submitLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ATD_UTC">ATD:</label>
                            <input
                                type="datetime-local"
                                id="ATD_UTC"
                                name="ATD_UTC"
                                value={formData.ATD_UTC}
                                onChange={handleChange}
                                disabled={submitLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ETA_UTC">ETA:</label>
                            <input
                                type="datetime-local"
                                id="ETA_UTC"
                                name="ETA_UTC"
                                value={formData.ETA_UTC}
                                onChange={handleChange}
                                disabled={submitLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ATA_UTC">ATA:</label>
                            <input
                                type="datetime-local"
                                id="ATA_UTC"
                                name="ATA_UTC"
                                value={formData.ATA_UTC}
                                onChange={handleChange}
                                disabled={submitLoading}
                            />
                        </div>

                        {/* Distance & Cargo Inputs */}
                        <div className="form-group">
                            <label htmlFor="DistancePlannedNM">Planned Distance (NM):</label>
                            <input
                                type="number"
                                step="0.01"
                                id="DistancePlannedNM"
                                name="DistancePlannedNM"
                                value={formData.DistancePlannedNM}
                                onChange={handleChange}
                                disabled={submitLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="DistanceSailedNM">Sailed Distance (NM):</label>
                            <input
                                type="number"
                                step="0.01"
                                id="DistanceSailedNM"
                                name="DistanceSailedNM"
                                value={formData.DistanceSailedNM}
                                onChange={handleChange}
                                disabled={submitLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="CargoWeightMT">Cargo Weight (MT):</label>
                            <input
                                type="number"
                                step="0.01"
                                id="CargoWeightMT"
                                name="CargoWeightMT"
                                value={formData.CargoWeightMT}
                                onChange={handleChange}
                                disabled={submitLoading}
                            />
                        </div>

                        {/* Voyage Status Dropdown */}
                        <div className="form-group">
                            <label htmlFor="VoyageStatus">Voyage Status:</label>
                            <select
                                id="VoyageStatus"
                                name="VoyageStatus"
                                value={formData.VoyageStatus}
                                onChange={handleChange}
                                disabled={submitLoading}
                                required
                            >
                                <option value="Planned">Planned</option>
                                <option value="InProgress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Delayed">Delayed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                        
                        {/* --- NEW SECTION: Document Uploads --- */}
                        <div className="form-group full-width attachment-section">
                            <label>Documents:</label>
                             
                            {/* Combined Input and Button Styling to match Bunker UI */}
                            <div className="file-input-group">
                                <label htmlFor="attachments" className="file-upload-button">
                                    <FaPaperclip /> Choose Files
                                </label>
                                <input
                                    type="file"
                                    id="attachments"
                                    name="attachments"
                                    multiple
                                    // Accept file types as configured in voyageFileUtils.js
                                    accept=".pdf, image/jpeg, image/png" 
                                    onChange={handleNewFileChange}
                                    style={{ display: 'none' }} // Hide the actual file input
                                    disabled={submitLoading}
                                />
                                {/* Visible text input to display chosen files count or placeholder */}
                                <input
                                    type="text"
                                    readOnly
                                    disabled
                                    value={attachments.length > 0 ? `${attachments.length} new file(s) selected` : 'No file chosen'}
                                    className="file-chosen-display"
                                />
                            </div>
                            
                            {/* Display selected new files */}
                            {attachments.length > 0 && (
                                <div className="selected-files-list">
                                    <p className="mt-2">Files to Upload:</p>
                                    <ul className="attachment-preview-list">
                                        {attachments.map((file, index) => (
                                            <li key={'new-' + file.name + index}> 
                                                <span>{file.name}</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveNewAttachment(file)}
                                                    className="remove-file-btn"
                                                    title="Remove file"
                                                    disabled={submitLoading}
                                                >
                                                    <FaTimes style={{ color: 'red' }} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                             {/* Display existing header attachments */}
                            {existingHeaderAttachments.length > 0 && (
                                <div className="existing-files-list">
                                    <p className="mt-2">Existing Documents:</p>
                                    <ul className="attachment-preview-list">
                                        {existingHeaderAttachments.map((attachment) => (
                                            <li key={attachment.Attachment_Id}>
                                                <span>{attachment.OriginalName}</span>
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    <a 
                                                        href={getAttachmentUrl(attachment.FilePath)}
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="attachment-link"
                                                        title="Download Document"
                                                    >
                                                        <FaDownload />
                                                    </a>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleDeleteExistingAttachment(attachment.Attachment_Id)}
                                                        className="remove-file-btn"
                                                        title="Delete Document"
                                                        disabled={submitLoading}
                                                    >
                                                        <FaTrashAlt style={{ color: '#dc3545' }} />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}


                            <p className="note-text">
                                Accepted formats: PDF, JPG, PNG.
                            </p>
                        </div>
                        {/* END NEW SECTION: Document Uploads */}


                        {/* Textarea Inputs */}
                        <div className="form-group full-width">
                            <label htmlFor="CargoDescription">Cargo Description:</label>
                            <textarea
                                id="CargoDescription"
                                name="CargoDescription"
                                value={formData.CargoDescription}
                                onChange={handleChange}
                                disabled={submitLoading}
                                rows="2"
                            ></textarea>
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="Notes">Notes:</label>
                            <textarea
                                id="Notes"
                                name="Notes"
                                value={formData.Notes}
                                onChange={handleChange}
                                disabled={submitLoading}
                                rows="3"
                            ></textarea>
                        </div>

                        {/* Is Active Checkbox (only for editing) */}
                        {isEditing && (
                            <div className="form-group full-width">
                                <label htmlFor="IsActive" className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        id="IsActive"
                                        name="IsActive"
                                        checked={formData.IsActive}
                                        onChange={handleChange}
                                        disabled={submitLoading}
                                    />
                                    Is Active
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Error Message Display */}
                    {error && <p className="form-error-message page-level-error">{error}</p>}

                    {/* Form Action Buttons */}
                    <div className="form-actions">
                        <button type="submit" className="submit-button" disabled={submitLoading}>
                            {submitLoading ? 'Saving...' : (isEditing ? 'Update Voyage' : 'Create Voyage')}
                        </button>
                        <Link to="/app/memp/voyages" className="cancel-button" disabled={submitLoading}>
                            Cancel
                        </Link>
                    </div>
                </form>
            </section>

            {/* NEW: Voyage Legs Management Section (Only in Edit Mode) */}
            {isEditing && voyageData && (
                <section className="voyage-legs-section">
                    <div className="section-header">
                        <h2>Voyage Legs Management</h2>
                        
                        {/* Conditional Button: Show CREATE if legs are missing, show ADD if they exist */}
                        {voyageLegs.length === 0 ? (
                            <button 
                                type="button" 
                                className="submit-button add-leg-btn" 
                                onClick={openCreateLegsModal} // Opens the dedicated modal
                                disabled={submitLoading}
                            >
                                Create Initial Legs (1 & 2)
                            </button>
                        ) : (
                             <button 
                                 type="button" 
                                 className="submit-button add-leg-btn" 
                                 onClick={handleAddSubsequentLeg}
                                 disabled={submitLoading}
                             >
                                 Add New Leg (Leg {voyageData.LastLegNumber + 1})
                             </button>
                        )}
                        
                    </div>

                    {/* Voyage Legs Table (Similar to Details Page) */}
                    <div className="table-responsive">
                        <table className="details-table voyage-legs-table">
                            <thead>
                                <tr>
                                    <th>Vessel Name</th> {/* UPDATED COLUMN */}
                                    <th>Voyage No.</th> {/* UPDATED COLUMN */}
                                    <th>Leg No.</th>
                                    <th>Leg Name</th>
                                    <th>Departure Port</th>
                                    <th>Arrival Port</th>
                                    <th>ETD</th>
                                    <th>ETA</th>
                                    <th>Cargo Desc</th>
                                    <th>Weight (MT)</th>
                                    <th>Documents</th> {/* NEW COLUMN */}
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {voyageLegs.length > 0 ? voyageLegs.map((leg) => (
                                    <tr key={leg.VoyageLegID}>
                                        <td>{leg.VesselName || 'N/A'}</td> {/* NEW DATA */}
                                        <td>{leg.VoyageNumber || 'N/A'}</td> {/* NEW DATA */}
                                        <td>{leg.LegNumber}</td>
                                        <td>{leg.LegName}</td>
                                        <td>{leg.Departure_Port_Name || leg.DeparturePortCode}</td>
                                        <td>{leg.Arrival_Port_Name || leg.ArrivalPortCode || 'N/A'}</td>
                                        <td>{leg.ETD_UTC ? new Date(leg.ETD_UTC).toLocaleString() : 'N/A'}</td>
                                        <td>{leg.ETA_UTC ? new Date(leg.ETA_UTC).toLocaleString() : 'N/A'}</td>
                                        <td>{leg.CargoDescription || 'N/A'}</td>
                                        <td>{leg.CargoWeightMT || 'N/A'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {legsAttachments[leg.VoyageLegID]?.length > 0 ? (
                                                <a 
                                                    href={getAttachmentUrl(legsAttachments[leg.VoyageLegID][0].FilePath)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    title={`Download: ${legsAttachments[leg.VoyageLegID][0].OriginalName}`}
                                                >
                                                    <FaDownload style={{ color: '#007bff' }} /> ({legsAttachments[leg.VoyageLegID].length})
                                                </a>
                                            ) : 'N/A'}
                                        </td>
                                        <td>
                                            <button 
                                                type="button" 
                                                className="btn-edit"
                                                onClick={() => openLegModal(leg)} // Open Edit modal
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="12" style={{ textAlign: 'center' }}>No active legs found. Use the "Create Initial Legs" button above.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
            {/* END NEW: Voyage Legs Management Section */}
        </div>
    );
};

export default VoyageAddEditPage;