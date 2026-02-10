// Client/src/components/MEMP/CreateSubsequentVoyageLegsModal.jsx

import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import debounce from 'lodash.debounce';
import { FaPaperclip, FaTimes } from 'react-icons/fa'; // NEW IMPORT

const API_BASE_URL = 'http://localhost:7000/api';

const CreateSubsequentVoyageLegsModal = ({ newLegDetails, onClose, onCreationSuccess }) => {
    
    // newLegDetails contains { voyageId, newLegNumber, voyageNumber, newDeparturePortCode, newDeparturePortName }
    const { voyageId, newLegNumber, voyageNumber, newDeparturePortCode, newDeparturePortName } = newLegDetails;

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

    const [formData, setFormData] = useState({
        ArrivalPortCode: '', 
        ArrivalPortName: '',
        ETD_UTC: formatDateTimeLocal(new Date()), // Default hint to current time
        ETA_UTC: '',
        CargoDescription: '',
        CargoWeightMT: '',
        ATD_UTC: '', 
        ATA_UTC: '',
    });

    // NEW STATE: For file attachments
    const [attachments, setAttachments] = useState([]);

    // FIX: Local state management for port suggestions
    const [portSuggestions, setPortSuggestions] = useState([]);
    const [showPortSuggestions, setShowPortSuggestions] = useState(false);
    const arrivalPortRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchPortSuggestions = useCallback(debounce(async (searchTerm) => {
        if (searchTerm.length < 2) return [];
        try {
            const response = await axios.get(`${API_BASE_URL}/ports/names-only`, {
                params: { search: searchTerm }
            });
            return response.data;
        } catch (err) {
            console.error("[CreateSubsequentLegModal] Error fetching port suggestions:", err);
            return [];
        }
    }, 300), []);


    // Handlers for Port Autocomplete
    const handlePortSearchChange = async (e) => {
        const value = e.target.value;
        const suggestions = await fetchPortSuggestions(value);
        
        setFormData(prev => ({ ...prev, 
            ArrivalPortName: value, 
            ArrivalPortCode: '' // Clear code until selected
        }));
        setPortSuggestions(suggestions);
        setShowPortSuggestions(true);
    }
    
    const handlePortSelect = (port) => {
        setFormData(prev => ({ 
            ...prev, 
            ArrivalPortName: port.PortName, 
            ArrivalPortCode: port.PortCode 
        }));
        setShowPortSuggestions(false);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // NEW HANDLER: For file input changes
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        const validFiles = newFiles.filter(file => file.type === 'application/pdf' || file.type.startsWith('image/'));
        if (validFiles.length !== newFiles.length) {
             setError('Warning: Only PDF, JPG, and PNG files are allowed.');
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

    const renderPortSuggestions = (suggestions, selectHandler) => {
        if (!showPortSuggestions || !suggestions || suggestions.length === 0) return null;
        return (
            <ul className="port-suggestions-list">
                {suggestions.map(port => (
                    <li
                        key={port.PortCode}
                        onClick={() => selectHandler(port)}
                    >
                        {port.PortName} ({port.PortCode})
                    </li>
                ))}
            </ul>
        );
    }

    // Submission Logic
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!formData.ArrivalPortCode) {
            setError("Please select the Arrival Port for the new leg.");
            return;
        }

        setLoading(true);

        const VOYAGE_ID = voyageId;

        // 1. Prepare FormData Payload
        const formDataPayload = new FormData();
        
        // Append Required/Optional fields (converted to strings for FormData)
        formDataPayload.append('lastLegNumber', String(newLegNumber - 1)); 
        formDataPayload.append('voyageNumber', voyageNumber);
        formDataPayload.append('departurePortCode', newDeparturePortCode);
        formDataPayload.append('ArrivalPortCode', formData.ArrivalPortCode);
        
        // Date/Time and Cargo fields (pass null as empty string to FormData for empty fields)
        formDataPayload.append('ETD_UTC', formData.ETD_UTC || '');
        formDataPayload.append('ETA_UTC', formData.ETA_UTC || '');
        formDataPayload.append('ATD_UTC', formData.ATD_UTC || '');
        formDataPayload.append('ATA_UTC', formData.ATA_UTC || '');
        formDataPayload.append('CargoDescription', formData.CargoDescription || '');
        formDataPayload.append('CargoWeightMT', String(parseFloat(formData.CargoWeightMT) || ''));

        // Append attachments
        attachments.forEach((file) => {
            formDataPayload.append('attachments', file);
        });
        
        try {
            // API endpoint: POST /voyages/:id/legs
            await axios.post(`${API_BASE_URL}/voyages/${VOYAGE_ID}/legs`, formDataPayload);

            alert(`Leg ${newLegNumber} created successfully with attachments!`);
            onCreationSuccess(); 
            
        } catch (err) {
            console.error("Error creating subsequent voyage leg:", err);
            setError('Failed to create leg: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };
    

    return (
        <div className="modal-backdrop landscape-modal-backdrop">
            <div className="modal-content modal-landscape">
                <div className="modal-header">
                    <h2>Create Leg: {newLegNumber}</h2>
                    <button type="button" className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <p className="modal-info-text">
                    This leg starts at **{newDeparturePortName || newDeparturePortCode}**. Please specify the arrival details.
                </p>

                {error && <p className="form-error-message page-level-error">{error}</p>}

                <form onSubmit={handleSubmit} className="voyage-form">
                    <div className="form-grid modal-form-grid">
                        
                        {/* DEPARTURE PORT (DISPLAY ONLY) */}
                        <div className="form-group">
                            <label>Departure Port</label>
                            <input type="text" value={newDeparturePortName || newDeparturePortCode} disabled />
                        </div>
                        
                        {/* ARRIVAL PORT (MANUAL INPUT/SEARCH) */}
                        <div className="form-group" ref={arrivalPortRef}>
                            <label htmlFor="ArrivalPortName">
                                Arrival Port <span className="required-star">*</span>:
                            </label>
                            <input
                                type="text"
                                id="ArrivalPortName"
                                name="ArrivalPortName"
                                value={formData.ArrivalPortName}
                                onChange={handlePortSearchChange}
                                onFocus={() => setShowPortSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowPortSuggestions(false), 200)}
                                placeholder="Search & Select Port"
                                disabled={loading}
                                required
                                autoComplete="off"
                            />
                            {renderPortSuggestions(portSuggestions, handlePortSelect)}
                        </div>
                        
                        {/* ETD, ETA, ATD, ATA FIELDS */}
                        <div className="form-group">
                            <label htmlFor="ETD_UTC">ETD (Planned):</label>
                            <input type="datetime-local" id="ETD_UTC" name="ETD_UTC" 
                                value={formData.ETD_UTC} onChange={handleFormChange} disabled={loading} />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ETA_UTC">ETA (Planned):</label>
                            <input type="datetime-local" id="ETA_UTC" name="ETA_UTC" 
                                value={formData.ETA_UTC} onChange={handleFormChange} disabled={loading} />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ATD_UTC">ATD (Actual):</label>
                            <input type="datetime-local" id="ATD_UTC" name="ATD_UTC" 
                                value={formData.ATD_UTC} onChange={handleFormChange} disabled={loading} />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ATA_UTC">ATA (Actual):</label>
                            <input type="datetime-local" id="ATA_UTC" name="ATA_UTC" 
                                value={formData.ATA_UTC} onChange={handleFormChange} disabled={loading} />
                        </div>
                        
                        {/* CARGO FIELDS */}
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
                         
                        {/* -------------------- DOCUMENT UPLOAD SECTION -------------------- */}
                        <div className="form-group full-width document-upload-section">
                            <label>Documents (Optional):</label>
                             <div className="file-upload-controls">
                                <label htmlFor="subsequent-leg-attachments" className="btn btn-secondary file-upload-label">
                                    <FaPaperclip /> Choose Files
                                </label>
                                <input
                                    type="file"
                                    id="subsequent-leg-attachments"
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

                    </div>
                    
                    <div className="form-actions">
                        <button 
                            type="submit" 
                            className="submit-button" 
                            disabled={loading || !formData.ArrivalPortCode}
                        >
                            {loading ? 'Creating...' : `Create Leg ${newLegNumber}`}
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

export default CreateSubsequentVoyageLegsModal;