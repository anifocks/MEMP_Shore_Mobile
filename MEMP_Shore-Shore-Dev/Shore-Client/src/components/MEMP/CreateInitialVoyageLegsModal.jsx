// Client/src/components/MEMP/CreateInitialVoyageLegsModal.jsx
import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import debounce from 'lodash.debounce';
import { FaPaperclip, FaTimes } from 'react-icons/fa'; // NEW IMPORT

const API_BASE_URL = 'http://localhost:7000/api';

const CreateInitialVoyageLegsModal = ({ voyageId, voyageData, onClose, onCreationSuccess }) => {
    
    // Helper to format UTC date string from backend to local datetime-local format
    const formatDateTimeLocal = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // States for the necessary ports and Leg 1's scheduling/cargo details
    const [formData, setFormData] = useState({
        // Ports
        MidVoyageArrivalPortCode: '', // Leg 1 Arrival / Leg 2 Departure
        MidVoyageArrivalPortName: '',
        FinalArrivalPortCode: '', // Leg 2 Arrival
        FinalArrivalPortName: '',
        
        // Scheduling and Cargo (These details are used for Leg 1 and CLONED for Leg 2)
        ETD_UTC: formatDateTimeLocal(new Date()),
        ETA_UTC: '',
        ATD_UTC: '',
        ATA_UTC: '',
        CargoDescription: '',
        CargoWeightMT: '',
    });

    // NEW STATE: For file attachments
    const [attachments, setAttachments] = useState([]);

    // FIX: Localized state management for suggestions for each port
    const [midPortSuggestions, setMidPortSuggestions] = useState([]);
    const [finalPortSuggestions, setFinalPortSuggestions] = useState([]);
    const [showMidPortSuggestions, setShowMidPortSuggestions] = useState(false);
    const [showFinalPortSuggestions, setShowFinalPortSuggestions] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const VOYAGE_NUM = voyageData.VoyageNumber;
    const VOYAGE_DEP_PORT = voyageData.DeparturePortCode;
    const VOYAGE_DEP_PORT_NAME = voyageData.Departure_Port_Name;
    const VOYAGE_ID = voyageId;
    
    const midArrivalPortRef = useRef(null);
    const finalArrivalPortRef = useRef(null);
    
    // Helper function to fetch ports (shared logic)
    const fetchPortSuggestions = useCallback(debounce(async (searchTerm) => {
        if (searchTerm.length < 2) return [];
        try {
            const response = await axios.get(`${API_BASE_URL}/ports/names-only`, {
                params: { search: searchTerm }
            });
            return response.data;
        } catch (err) {
            console.error("[CreateLegModal] Error fetching port suggestions:", err);
            return [];
        }
    }, 300), []);


    // Handlers for Port Autocomplete
    const handlePortSearchChange = async (e, portField) => {
        const value = e.target.value;
        const suggestions = await fetchPortSuggestions(value);

        setFormData(prev => ({ ...prev, 
            [portField + 'Name']: value, 
            [portField + 'Code']: ''
        }));
        
        // FIX: Update only the specific suggestion list and visibility
        if (portField === 'MidVoyageArrivalPort') {
            setMidPortSuggestions(suggestions);
            setShowMidPortSuggestions(true);
            setShowFinalPortSuggestions(false); // Hide the other list
        } else if (portField === 'FinalArrivalPort') {
            setFinalPortSuggestions(suggestions);
            setShowFinalPortSuggestions(true);
            setShowMidPortSuggestions(false); // Hide the other list
        }
    }
    
    const handlePortSelect = (port, portField) => {
        setFormData(prev => ({ 
            ...prev, 
            [portField + 'Name']: port.PortName, 
            [portField + 'Code']: port.PortCode 
        }));
        
        // FIX: Hide only the specific list
        if (portField === 'MidVoyageArrivalPort') {
            setShowMidPortSuggestions(false);
        } else if (portField === 'FinalArrivalPort') {
            setShowFinalPortSuggestions(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    // NEW HANDLER: For file input changes
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        // Basic validation for file types accepted by the backend (PDF, JPG, PNG)
        const validFiles = newFiles.filter(file => file.type === 'application/pdf' || file.type.startsWith('image/'));

        if (validFiles.length !== newFiles.length) {
             setError('Warning: Only PDF, JPG, and PNG files are accepted.');
        } else {
             setError('');
        }
        
        setAttachments(prev => [...prev, ...validFiles]);
        e.target.value = null; 
    };

    // NEW HANDLER: To remove a selected file before submission
    const handleRemoveAttachment = (fileToRemove) => {
        setAttachments(prev => prev.filter(file => file !== fileToRemove));
    };

    // Consolidated Render Port Suggestions
    const renderPortSuggestions = (suggestions, selectedPortName, selectHandler, isVisible) => {
        if (!isVisible || !suggestions || suggestions.length === 0) return null;
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
    
    // Submission Logic (Cloning logic needs to be run in sequence)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const { MidVoyageArrivalPortCode, FinalArrivalPortCode } = formData;

        if (!MidVoyageArrivalPortCode || !FinalArrivalPortCode) {
            setError("Please select both the Mid-Voyage Arrival Port and the Final Arrival Port.");
            return;
        }

        setLoading(true);

        const SCHEDULE_CARGO_DATA = {
            ETD_UTC: formData.ETD_UTC || null,
            ETA_UTC: formData.ETA_UTC || null,
            ATD_UTC: formData.ATD_UTC || null,
            ATA_UTC: formData.ATA_UTC || null,
            CargoDescription: formData.CargoDescription || null,
            CargoWeightMT: parseFloat(formData.CargoWeightMT) || null,
        };

        try {
            // 1. Create LEG 1 (Departure -> Mid-Voyage Port) - Uses FormData for attachments
            const formDataLeg1 = new FormData();
            
            // Append Leg 1 data
            formDataLeg1.append('lastLegNumber', '0'); 
            formDataLeg1.append('voyageNumber', VOYAGE_NUM);
            formDataLeg1.append('departurePortCode', VOYAGE_DEP_PORT);
            formDataLeg1.append('ArrivalPortCode', MidVoyageArrivalPortCode); 
            
            // Append Schedule/Cargo data
            for (const key in SCHEDULE_CARGO_DATA) {
                if (SCHEDULE_CARGO_DATA[key] !== null) {
                    formDataLeg1.append(key, String(SCHEDULE_CARGO_DATA[key]));
                }
            }
            
            // Append attachments (files are cloned for both requests on the client side)
            attachments.forEach((file) => {
                formDataLeg1.append('attachments', file);
            });
            
            // Send Leg 1 Request
            await axios.post(`${API_BASE_URL}/voyages/${VOYAGE_ID}/legs`, formDataLeg1);

            // 2. Create LEG 2 (Mid-Voyage Port -> Final Arrival Port) - Uses FormData for attachments
            const formDataLeg2 = new FormData();
            
            // Append Leg 2 data
            formDataLeg2.append('lastLegNumber', '1'); 
            formDataLeg2.append('voyageNumber', VOYAGE_NUM);
            formDataLeg2.append('departurePortCode', MidVoyageArrivalPortCode); 
            formDataLeg2.append('ArrivalPortCode', FinalArrivalPortCode); 
            
            // Append Schedule/Cargo data
            for (const key in SCHEDULE_CARGO_DATA) {
                if (SCHEDULE_CARGO_DATA[key] !== null) {
                    formDataLeg2.append(key, String(SCHEDULE_CARGO_DATA[key]));
                }
            }
            
            // Append attachments
            attachments.forEach((file) => {
                formDataLeg2.append('attachments', file);
            });

            // Send Leg 2 Request
            await axios.post(`${API_BASE_URL}/voyages/${VOYAGE_ID}/legs`, formDataLeg2);

            alert("Initial Legs (Mid-Voyage and Final) successfully created with attachments!");
            onCreationSuccess(); 
            
        } catch (err) {
            console.error("Error creating initial voyage legs:", err);
            setError('Failed to create initial legs: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };
    

    return (
        <div className="modal-backdrop landscape-modal-backdrop">
            <div className="modal-content modal-landscape modal-lg-initial">
                <div className="modal-header">
                    <h2>Define Initial Voyage Route (Voyage: {VOYAGE_NUM})</h2>
                    <button type="button" className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                {error && <p className="form-error-message page-level-error">{error}</p>}

                <form onSubmit={handleSubmit} className="voyage-form">
                    
                    {/* -------------------- PORT DEFINITION (Primary 2 fields) -------------------- */}
                    <div className="ports-section">
                         <h3>Route Definition</h3>
                         <div className="form-grid initial-legs-grid">
                            
                            <div className="form-group">
                                <label>Current Departure Port:</label>
                                <input type="text" value={VOYAGE_DEP_PORT_NAME || VOYAGE_DEP_PORT} disabled />
                            </div>

                            <div className="form-group" ref={midArrivalPortRef}>
                                <label htmlFor="MidVoyageArrivalPortName">
                                    Mid-Voyage Arrival Port <span className="required-star">*</span>:
                                </label>
                                <input
                                    type="text"
                                    id="MidVoyageArrivalPortName"
                                    name="MidVoyageArrivalPortName"
                                    value={formData.MidVoyageArrivalPortName}
                                    onChange={(e) => handlePortSearchChange(e, 'MidVoyageArrivalPort')}
                                    onFocus={() => setShowMidPortSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowMidPortSuggestions(false), 200)}
                                    placeholder="Search & Select Mid-Voyage Port"
                                    disabled={loading}
                                    required
                                    autoComplete="off"
                                />
                                {renderPortSuggestions(midPortSuggestions, 'MidVoyageArrivalPort', handlePortSelect, showMidPortSuggestions)}
                            </div>

                            <div className="form-group" ref={finalArrivalPortRef}>
                                <label htmlFor="FinalArrivalPortName">
                                    Final Arrival Port <span className="required-star">*</span>:
                                </label>
                                <input
                                    type="text"
                                    id="FinalArrivalPortName"
                                    name="FinalArrivalPortName"
                                    value={formData.FinalArrivalPortName}
                                    onChange={(e) => handlePortSearchChange(e, 'FinalArrivalPort')}
                                    onFocus={() => setShowFinalPortSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowFinalPortSuggestions(false), 200)}
                                    placeholder="Search & Select Final Port"
                                    disabled={loading}
                                    required
                                    autoComplete="off"
                                />
                                {renderPortSuggestions(finalPortSuggestions, 'FinalArrivalPort', handlePortSelect, showFinalPortSuggestions)}
                            </div>
                            
                            <div className="form-group full-width">
                                <p className="modal-info-text">
                                    This creates two legs: **Leg 1** ({VOYAGE_DEP_PORT_NAME} &rarr; Mid-Voyage) and **Leg 2** (Mid-Voyage &rarr; Final Arrival).
                                </p>
                            </div>
                        </div>
                    </div> {/* End ports-section */}
                    
                    {/* -------------------- SCHEDULING AND CARGO DETAILS (Cloned for both legs) -------------------- */}
                    <div className="legs-split-container">
                         <div className="leg-form-section full-width-leg-section">
                             <h3>Scheduling & Cargo Details (Applied to both legs)</h3>
                             <div className="form-grid initial-legs-grid">
                                
                                {/* DATE FIELDS (Applied to both legs) */}
                                <div className="form-group">
                                    <label htmlFor="ETD_UTC">ETD (L1 Departure):</label>
                                    <input type="datetime-local" id="ETD_UTC" name="ETD_UTC" 
                                        value={formData.ETD_UTC} onChange={handleFormChange} disabled={loading} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="ETA_UTC">ETA (L1 Arrival):</label>
                                    <input type="datetime-local" id="ETA_UTC" name="ETA_UTC" 
                                        value={formData.ETA_UTC} onChange={handleFormChange} disabled={loading} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="ATD_UTC">ATD (L1 Actual):</label>
                                    <input type="datetime-local" id="ATD_UTC" name="ATD_UTC" 
                                        value={formData.ATD_UTC} onChange={handleFormChange} disabled={loading} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="ATA_UTC">ATA (L1 Actual):</label>
                                    <input type="datetime-local" id="ATA_UTC" name="ATA_UTC" 
                                        value={formData.ATA_UTC} onChange={handleFormChange} disabled={loading} />
                                </div>

                                {/* CARGO FIELDS (Applied to both legs) */}
                                <div className="form-group full-width">
                                    <label htmlFor="CargoDescription">Cargo Description:</label>
                                    <textarea id="CargoDescription" name="CargoDescription" rows="2"
                                        value={formData.CargoDescription} onChange={handleFormChange} disabled={loading} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="CargoWeightMT">Cargo Weight (MT):</label>
                                    <input type="number" step="0.01" id="CargoWeightMT" name="CargoWeightMT" 
                                        value={formData.CargoWeightMT} onChange={handleFormChange} disabled={loading} />
                                </div>
                            </div>
                        </div>
                    </div> {/* End legs-split-container */}
                    
                    {/* -------------------- DOCUMENT UPLOAD SECTION -------------------- */}
                    <div className="form-group full-width document-upload-section">
                        <label>Documents (Optional):</label>
                         <div className="file-upload-controls">
                            <label htmlFor="initial-legs-attachments" className="btn btn-secondary file-upload-label">
                                <FaPaperclip /> Choose Files {/* Matches your desired style */}
                            </label>
                            <input
                                type="file"
                                id="initial-legs-attachments"
                                name="attachments"
                                multiple
                                accept=".pdf, image/jpeg, image/png" 
                                onChange={handleFileChange}
                                style={{ display: 'none' }} 
                                disabled={loading}
                            />
                        </div>
                         {/* Display selected files */}
                        {attachments.length > 0 && (
                            <div className="selected-files-list">
                                <p>Files to Upload:</p>
                                <ul>
                                    {attachments.map((file, index) => (
                                        <li key={file.name + index}> 
                                            {file.name}
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveAttachment(file)}
                                                className="remove-file-btn"
                                                title="Remove file"
                                                disabled={loading}
                                            >
                                                <FaTimes style={{ color: 'red' }} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                         {/* Placeholder for "No file chosen" - handled by the input field's label simulation */}
                        {attachments.length === 0 && (
                            <input type="text" value="No file chosen" disabled className="file-placeholder-input" />
                        )}
                        <p className="note-text mt-2">Accepted formats: PDF, JPG, PNG.</p>
                    </div>
                    {/* -------------------- END DOCUMENT UPLOAD SECTION -------------------- */}

                    <div className="modal-actions">
                        <button 
                            type="submit" 
                            className="submit-button" 
                            disabled={loading || !formData.MidVoyageArrivalPortCode || !formData.FinalArrivalPortCode}
                        >
                            {loading ? 'Creating...' : 'Create Legs 1 & 2'}
                        </button>
                        <button type="button" className="cancel-button" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateInitialVoyageLegsModal;