// Client/src/components/MEMP/UpdateVoyageLegModal.jsx
import React, { useState, useEffect } from 'react';
// import axios from 'axios'; // REMOVED
import { FaPaperclip, FaTimes, FaDownload } from 'react-icons/fa'; 
// *** ADDED: Import centralized API functions and constant ***
import { 
    fetchVoyageLegAttachments, 
    updateVoyageLeg, 
    getVoyageAttachmentUrl 
} from '../../api';

// REMOVED: Hardcoded API_BASE_URL and getAttachmentUrl helper

const UpdateVoyageLegModal = ({ leg, onClose, onUpdateSuccess }) => {
    // Check if leg data exists and is active, otherwise bail
    if (!leg) return null; 

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

    const [formData, setFormData] = useState({
        // Dates need to be converted to the required local datetime-local format for the input field
        ETD_UTC: formatDateTimeLocal(leg.ETD_UTC),
        ATD_UTC: formatDateTimeLocal(leg.ATD_UTC),
        ETA_UTC: formatDateTimeLocal(leg.ETA_UTC),
        ATA_UTC: formatDateTimeLocal(leg.ATA_UTC),
        CargoDescription: leg.CargoDescription || '',
        CargoWeightMT: leg.CargoWeightMT || '',
        ArrivalPortCode: leg.ArrivalPortCode || null,
        IsActive: leg.IsActive,
    });
    
    // NEW STATES
    const [attachments, setAttachments] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch existing attachments for this leg on load
    useEffect(() => {
        const fetchAttachments = async () => {
            try {
                // *** UPDATED: Use centralized API function fetchVoyageLegAttachments ***
                const data = await fetchVoyageLegAttachments(leg.VoyageLegID);
                setExistingAttachments(data);
            } catch (err) {
                console.error("Error fetching leg attachments:", err);
                setExistingAttachments([]);
            }
        };
        fetchAttachments();
    }, [leg.VoyageLegID]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    // NEW HANDLER: For new file input changes
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

    // NEW HANDLER: To remove a selected new file before submission
    const handleRemoveAttachment = (fileToRemove) => {
        setAttachments(prev => prev.filter(file => file !== fileToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // 1. Prepare FormData Payload
        const formDataPayload = new FormData();
        
        // Append all form data fields
        for (const key in formData) {
            let value = formData[key];
            if (key === 'CargoWeightMT') {
                value = parseFloat(value) || '';
            } else if (key === 'IsActive') {
                value = value ? 1 : 0;
            } else if (key.endsWith('UTC') && value === '') {
                value = ''; 
            }
            formDataPayload.append(key, String(value));
        }

        // Append attachments
        attachments.forEach((file) => {
            formDataPayload.append('attachments', file);
        });


        try {
            // *** UPDATED: Use centralized API function updateVoyageLeg ***
            await updateVoyageLeg(leg.VoyageLegID, formDataPayload);
            
            alert(`Voyage Leg ${leg.LegNumber} updated successfully with attachments!`);
            onUpdateSuccess();
        } catch (err) {
            console.error('Error updating voyage leg:', err);
            setError(err.message || 'Failed to update leg: An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop landscape-modal-backdrop">
            <div className="modal-content modal-landscape">
                <div className="modal-header">
                    <h2>Update Leg {leg.LegNumber}: {leg.LegName}</h2>
                    <button type="button" className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                {error && <p className="form-error-message page-level-error">{error}</p>}

                <form onSubmit={handleSubmit} className="voyage-form">
                    <div className="form-grid modal-form-grid">
                        
                        {/* Static Port Information (Non-editable here) */}
                        <div className="form-group">
                            <label>Departure Port</label>
                            <input type="text" value={leg.Departure_Port_Name || leg.DeparturePortCode} disabled />
                        </div>
                        <div className="form-group">
                            <label>Arrival Port</label>
                             <input type="text" value={leg.Arrival_Port_Name || leg.ArrivalPortCode || 'N/A'} disabled />
                        </div>

                        {/* Date/Time Updates */}
                        <div className="form-group">
                            <label htmlFor="ETD_UTC">ETD (Planned):</label>
                            <input
                                type="datetime-local"
                                id="ETD_UTC"
                                name="ETD_UTC"
                                value={formData.ETD_UTC}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="ETA_UTC">ETA (Planned):</label>
                            <input
                                type="datetime-local"
                                id="ETA_UTC"
                                name="ETA_UTC"
                                value={formData.ETA_UTC}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="ATD_UTC">ATD (Actual)</label>
                            <input
                                type="datetime-local"
                                id="ATD_UTC"
                                name="ATD_UTC"
                                value={formData.ATD_UTC}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="ATA_UTC">ATA (Actual)</label>
                            <input
                                type="datetime-local"
                                id="ATA_UTC"
                                name="ATA_UTC"
                                value={formData.ATA_UTC}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        {/* Cargo Updates */}
                        <div className="form-group full-width">
                            <label htmlFor="CargoDescription">Cargo Description:</label>
                            <textarea
                                id="CargoDescription"
                                name="CargoDescription"
                                value={formData.CargoDescription}
                                onChange={handleChange}
                                disabled={loading}
                                rows="2"
                            ></textarea>
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
                                disabled={loading}
                            />
                        </div>
                        
                        {/* -------------------- DOCUMENT UPLOAD SECTION -------------------- */}
                        <div className="form-group full-width document-upload-section">
                            <label>Documents:</label>
                             <div className="file-upload-controls">
                                <label htmlFor="update-leg-attachments" className="btn btn-secondary file-upload-label">
                                    <FaPaperclip /> Choose Files
                                </label>
                                <input
                                    type="file"
                                    id="update-leg-attachments"
                                    name="attachments"
                                    multiple
                                    accept=".pdf, image/jpeg, image/png" 
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }} 
                                    disabled={loading}
                                />
                            </div>
                             {/* Display selected new files */}
                            {attachments.length > 0 && (
                                <div className="selected-files-list">
                                    <p>New Files to Upload:</p>
                                    <ul>
                                        {attachments.map((file, index) => (
                                            <li key={'new-' + file.name + index}> 
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
                            {attachments.length === 0 && existingAttachments.length === 0 && (
                                <input type="text" value="No file chosen" disabled className="file-placeholder-input" />
                            )}
                            
                             {/* Display existing attachments */}
                            {existingAttachments.length > 0 && (
                                <div className="existing-files-list">
                                    <p>Existing Documents:</p>
                                    <ul>
                                        {existingAttachments.map((attachment) => (
                                            <li key={attachment.Attachment_Id}>
                                                {attachment.OriginalName}
                                                <a 
                                                    // *** UPDATED: Use the imported getVoyageAttachmentUrl ***
                                                    href={getVoyageAttachmentUrl(attachment.FilePath)}
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="attachment-link"
                                                >
                                                    <FaDownload style={{ marginLeft: '5px' }} />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <p className="note-text mt-2">Accepted formats: PDF, JPG, PNG. Existing documents are visible above.</p>
                        </div>
                        {/* -------------------- END DOCUMENT UPLOAD SECTION -------------------- */}

                    </div>

                    <div className="form-actions">
                        <button type="submit" className="submit-button" disabled={loading}>
                            {loading ? 'Updating...' : 'Save Leg Updates'}
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

export default UpdateVoyageLegModal;