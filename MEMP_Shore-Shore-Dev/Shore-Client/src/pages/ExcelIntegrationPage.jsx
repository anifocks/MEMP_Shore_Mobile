// File: Excel Implementation/Client/src/pages/ExcelIntegrationPage.jsx

import React, { useState, useEffect, useCallback } from 'react'; // ADDED useCallback
import axios from 'axios';
import './ExcelIntegrationPage.css'; 
import SearchableDropdown from '../components/SearchableDropdown/SearchableDropdown'; 
// 🟢 UPDATED: Import secured fetchActiveShips, apiClient, and the new EXCEL_SERVICE_NAME
import { apiClient, fetchActiveShips, EXCEL_SERVICE_NAME } from '../api'; 

// =========================================================================
// REMOVED: Unused hardcoded API base URLs. 
// The apiClient handles all routing via the centralized API Gateway URL.
// =========================================================================


const ExcelIntegrationPage = () => {
    const [ships, setShips] = useState([]);
    const [selectedShipId, setSelectedShipId] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [file, setFile] = useState(null); 
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // STATE FOR PARSED DATA PREVIEW
    const [parsedData, setParsedData] = useState(null); 
    const [uniqueFileId, setUniqueFileId] = useState(null); 

    // NEW STATE: Upload Mode
    const [uploadMode, setUploadMode] = useState('SINGLE'); // 'SINGLE', 'BULK', 'VOYAGE', or 'BUNKER'

    useEffect(() => {
        console.log("ExcelIntegrationPage mounted and rendered!");

        const fetchShips = async () => {
            try {
                // *** UPDATED: Use secured fetchActiveShips ***
                const activeShips = await fetchActiveShips(); 

                if (Array.isArray(activeShips)) {
                    const mappedShips = activeShips.map(ship => ({
                        value: ship.ShipID || ship.shipId,
                        label: `${ship.ShipName || ship.shipName} (${ship.IMO_Number || ship.imoNumber})`
                    }));
                    setShips(mappedShips);
                } else {
                    console.error("API response for ships/active is not an array:", activeShips);
                    setError("Received unexpected data format for ships.");
                }
            } catch (err) {
                console.error("Error fetching ships:", err); 
                setError("Failed to load ships for selection. Check console for details.");
            }
        };
        fetchShips();
    }, []);

    // Function to clear states for a fresh start
    const resetStates = () => {
        setFile(null);
        setParsedData(null);
        setSelectedFileName('');
        const fileInput = document.getElementById('excelFileInput');
        if (fileInput) fileInput.value = '';
        
        setMessage('');
        setError('');
        setLoading(false);
        setUniqueFileId(null); // MODIFIED: Clear the unique file ID
    };

    // --- REFACTORED: Generic Template Exporter ---
    const handleExport = async (templateType, endpoint, filenamePrefix) => {
        if (!selectedShipId) {
            setError(`Please select a ship to generate the ${templateType} template.`);
            return;
        }
        resetStates();
        setLoading(true);

        try {
            // Use the new EXCEL_SERVICE_NAME constant
            const response = await apiClient.get(`/${EXCEL_SERVICE_NAME}${endpoint}`, {
                params: { shipId: selectedShipId },
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${filenamePrefix}_Ship_${selectedShipId}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            setMessage(`${templateType} template downloaded successfully!`);
        } catch (err) {
            console.error(`Error downloading ${templateType} template:`, err);
            const errorMessage = err.response?.data?.details || err.response?.data?.message || err.message;
            setError(`Failed to download ${templateType} template: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Simplified handlers calling the generic function ---
    const handleExportTemplate = () => handleExport('Single Report', '/template/vesselreport', 'Vessel_Report_Template');
    const handleExportBulkTemplate = () => handleExport('Bulk Report', '/template/bulk-vesselreport', 'Bulk_VesselReport_Template');
    const handleExportVoyageTemplate = () => handleExport('Voyage', '/template/voyage', 'Voyage_Template');
    const handleExportBunkerTemplate = () => handleExport('Bunker', '/template/bunker', 'Bunker_Template');

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile); 
        setSelectedFileName(selectedFile ? selectedFile.name : '');
        setMessage('');
        setError('');
        setParsedData(null); 
        setUniqueFileId(null); // Reset file ID when a new file is chosen
    };
    
    // =====================================================================
    // ADDED: Function to fetch preview data from the saved CSV using the ID
    // =====================================================================
    const handleFetchPreview = useCallback(async (fileId) => {
        if (!fileId) return;

        setMessage('Fetching preview data from saved CSV...');
        setError('');

        try {
            // *** NEW API ENDPOINT: Fetch data based on the uniqueFileId from the CSV ***
            const endpoint = `/${EXCEL_SERVICE_NAME}/preview/vesselreport`;
            const response = await apiClient.post(endpoint, { fileId: fileId });
            
            setParsedData(response.data.parsedData);
            setMessage('File successfully processed. Review data from CSV preview before import.');
            
        } catch (err) {
            console.error("Error fetching preview from CSV:", err.response ? err.response.data : err.message); 
            const backendErrorResponse = err.response?.data;
            const detailedMessage = backendErrorResponse?.details || backendErrorResponse?.message || err.message;

            setError(`Failed to retrieve CSV preview: ${detailedMessage}`);
            setParsedData(null);
        }
    }, []);

    // =====================================================================
    // MODIFIED: Main Handler for Single, Bulk, Voyage, and Bunker
    // =====================================================================
    const handleProcessFile = async () => {
        if (!selectedShipId) {
            setError('Please select a ship before uploading data.');
            return;
        }
        if (!file) { 
            setError('Please select an Excel file to upload.');
            return;
        }

        setMessage('');
        setError('');
        setParsedData(null); 
        setUniqueFileId(null); 
        setLoading(true);

        const formData = new FormData();
        formData.append('excelFile', file); 
        
        // For Bulk OR Voyage OR Bunker, we MUST send ShipID
        if (uploadMode !== 'SINGLE') {
            formData.append('shipId', selectedShipId);
        }

        let uploadedFileId = null;

        try {
            let endpoint = `/${EXCEL_SERVICE_NAME}/parse/vesselreport`; // Default Single
            if (uploadMode === 'BULK') {
                endpoint = `/${EXCEL_SERVICE_NAME}/parse/bulk-vesselreport`; 
            } else if (uploadMode === 'VOYAGE') {
                endpoint = `/${EXCEL_SERVICE_NAME}/parse/voyage`; 
            } else if (uploadMode === 'BUNKER') { // NEW
                endpoint = `/${EXCEL_SERVICE_NAME}/parse/bunker`;
            }

            const response = await apiClient.post(endpoint, formData);
            
            uploadedFileId = response.data.uniqueFileId;

            if (uploadMode === 'BULK') {
                // Bulk Response handling
                setMessage(response.data.message + " " + (response.data.details || ""));
            } else if (uploadMode === 'VOYAGE' || uploadMode === 'BUNKER') {
                // *** VOYAGE/BUNKER PREVIEW LOGIC START ***
                // Now enables PREVIEW instead of instant import
                setUniqueFileId(uploadedFileId);
                // The backend now returns the parsed data for preview in the upload response
                setParsedData(response.data.parsedData); 
                setMessage(`${uploadMode} data parsed. Review below and click "Confirm & Import".`);
                // *** VOYAGE/BUNKER PREVIEW LOGIC END ***
            } else {
                // Single Response handling
                if (uploadedFileId) {
                    setUniqueFileId(uploadedFileId);
                    setMessage(response.data.message || `File uploaded and CSV saved successfully. ID: ${uploadedFileId}`);
                    await handleFetchPreview(uploadedFileId); 
                } else {
                    throw new Error("File ID was not returned by the server after upload.");
                }
            }
            
        } catch (err) {
            console.error("Error in file processing sequence:", err.response ? err.response.data : err.message || err.message); 
            const backendErrorResponse = err.response?.data;
            const detailedMessage = backendErrorResponse?.details || backendErrorResponse?.message || err.message;
            setError(`File processing failed: ${detailedMessage}`);
            setParsedData(null);
            setUniqueFileId(null);
        } finally {
            setLoading(false);
        }
    };

    // ADDED: New function for CSV to DB import using the unique ID
    const handleImportCSV = async () => {
        if (!uniqueFileId) {
            setError('The unique CSV File ID is missing. Please upload and parse a file first.');
            return;
        }

        setMessage('');
        setError('');
        setLoading(true);
        
        try {
            // This API call sends the ID to the backend to execute EXEC dataimporttodb (or voyage/bunker SP)
            const response = await apiClient.post('/excel/import-csv-to-db', {
                fileId: uniqueFileId,
                type: uploadMode // *** CRITICAL: Send type so backend knows which SP to call ***
            });

            // MODIFIED: Set a success message and reset states on successful import
            setMessage(response.data.message || `Data imported successfully!`);
            
            // Clear preview after success
            setParsedData(null); 
            setUniqueFileId(null); 
            setFile(null);
            setSelectedFileName('');
            document.getElementById('excelFileInput').value = '';

        } catch (err) {
            console.error("Error running import procedure:", err.response ? err.response.data : err.message); 
            
            const backendErrorResponse = err.response?.data;
            const detailedMessage = backendErrorResponse?.message || backendErrorResponse?.details || err.message;

            setError(`Failed to import data: ${detailedMessage}`);
        } finally {
            setLoading(false);
        }
    };
    
    // MODIFIED: This replaces the old handleSubmitData which is no longer needed 
    // as we are forcing the CSV-based import.
    const handleConfirmAndImport = async () => {
        // Ensure a file has been processed and a unique ID is available
        if (!uniqueFileId) {
            setError('No unique CSV File ID found. Please successfully upload and preview a file first.');
            return;
        }
        await handleImportCSV();
    };

    // Helper to format any value, handling the [object Object] issue
    const formatValue = (value) => {
        if (value === null || value === undefined) return 'N/A';
        
        if (typeof value === 'object') {
            return String(value.result || '[Formula Error/Object]');
        }

        const strValue = String(value);
        return strValue.trim() === '' ? 'N/A' : strValue;
    };

    // Helper function to render data in a structured table-like list (Logic unchanged)
    const renderDataSummary = (title, records, fields) => (
        <div className="preview-section data-summary-card">
            <h4>{title} ({records?.length || 0})</h4>
            {records && records.length > 0 ? (
                <div className="preview-records-list">
                    {/* Map over records (limited to first 5 for preview) */}
                    {records.slice(0, 5).map((record, index) => (
                        <div key={index} className="preview-record-item">
                            <p className="record-header">
                                <strong>Record #{index + 1}</strong>
                            </p>
                            <div className="record-details-grid">
                                {fields.map(field => {
                                    const key = field.key;
                                    let resolvedValue = null;

                                    if (title.includes('Consumption')) {
                                        // Fix 1: Ensure Lube Oil Machinery Name is correctly prioritized
                                        if (key === 'Machinery') {
                                            // Lube Oil uses SpecificMachineryName, Fuel uses MachineryName
                                            resolvedValue = record.SpecificMachineryName || record.MachineryName;
                                        } else {
                                            resolvedValue = record[key];
                                        }
                                    } else if (title.includes('ROB')) {
                                        // Fix 2: Display ItemTypeKey, ItemCategory, and BDN for ROB preview
                                        if (key === 'Item Type') {
                                            // The ROB sheets contain FuelTypeKey/LubeOilTypeKey in their column (ItemTypeKey)
                                            resolvedValue = record.ItemTypeKey || record.FuelTypeKey || record.LubeOilTypeKey;
                                        } else if (key === 'Category') {
                                            // Data is not present in Fuel/LO ROB sheets, but might be present in Bunker ROB.
                                            // If present, use it, otherwise, rely on ItemCategory if available in parsed data.
                                            resolvedValue = record.ItemCategory;
                                        } else if (key === 'BDN No.') {
                                             resolvedValue = record.BDN_Number;
                                        } else {
                                            resolvedValue = record[key];
                                        }
                                    } else if (title.includes('Machinery')) {
                                        resolvedValue = record[key];
                                    }

                                    // Final value lookup if previous logic didn't resolve it (e.g., initial simple keys)
                                    if (resolvedValue === null || resolvedValue === undefined) {
                                         resolvedValue = record[key];
                                    }


                                    return (
                                        <div key={field.key} className="detail-item">
                                            <span className="detail-label">{field.label}</span>
                                            <span className="detail-value">
                                                {formatValue(resolvedValue)} {field.unit || ''}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {records.length > 5 && (
                        <p className="note-message">...and {records.length - 5} more records (full data will be imported).</p>
                    )}
                </div>
            ) : <p className="note-message">No {title.toLowerCase()} records found.</p>}
        </div>
    );
    
    // Helper to render preview data (Logic updated for combinedROB)
    const renderPreview = () => {
        if (!parsedData) return null;

        // *** BUNKER PREVIEW SECTION ***
        if (uploadMode === 'BUNKER') {
            return (
                <div className="preview-container">
                    {renderDataSummary('Bunkering Operations', parsedData['Bunkering'], [
                        { label: 'Date', key: 'BunkerDate' },
                        { label: 'Port', key: 'BunkeringPort' },
                        { label: 'Operation', key: 'OperationType' },
                        { label: 'Fuel/Lube', key: 'FuelTypeKey' }, 
                        { label: 'Qty', key: 'Bunkered_Quantity' },
                        { label: 'BDN', key: 'BDN_Number' }
                    ])}
                </div>
            );
        }

        // *** VOYAGE PREVIEW SECTION ***
        if (uploadMode === 'VOYAGE') {
            const voyages = parsedData['Voyages'] || [];
            const legs = parsedData['VoyageLegs'] || [];
            return (
                <div className="preview-container">
                    {renderDataSummary(
                        'Voyages',
                        voyages,
                        [
                            { label: 'Voyage No', key: 'VoyageNumber' },
                            { label: 'Dep Port', key: 'DeparturePort' },
                            { label: 'Arr Port', key: 'ArrivalPort' },
                            { label: 'ATD', key: 'ATD' },
                            { label: 'Cargo', key: 'CargoDescription' }
                        ]
                    )}
                    {renderDataSummary(
                        'Voyage Legs',
                        legs,
                        [
                            { label: 'Voyage No', key: 'VoyageNumber' },
                            { label: 'Mid Port', key: 'MidPortName' },
                            { label: 'ATA', key: 'MidPort_ATA' },
                            { label: 'ATD', key: 'MidPort_ATD' }
                        ]
                    )}
                </div>
            );
        }

        // *** SINGLE REPORT PREVIEW SECTION ***
        const mainReport = parsedData['VesselDailyReports']?.[0];
        const fuelConsumption = parsedData['Fuel Consumption'] || [];
        const loConsumption = parsedData['Lube Oil Consumption'] || [];
        const machineryData = parsedData['Machinery Data'] || [];
        
        // MODIFIED: Include data from the "Bunker ROB" sheet, which contains the combined Fuel and LO ROB entries.
        const combinedROB = [
            ...(parsedData['Bunker ROB'] || []), 
            //...(parsedData['Fuel ROB'] || []), 
            //...(parsedData['Lube Oil ROB'] || [])
        ];
        
        return (
            <div className="preview-container">
                <div className="preview-section main-report-card">
                    <h4>Vessel Daily Report (Main Entry)</h4>
                    {mainReport ? (
                        <div className="main-report-grid">
                            {/* Display all relevant fields from the report header */}
                            {[
                                { label: 'Report ID', key: 'ReportID' },
                                { label: 'Ship ID', key: 'ShipID' },
                                { label: 'Voyage ID', key: 'VoyageID' },
                                { label: 'Voyage Leg ID', key: 'VoyageLegID' },
                                { label: 'Leg Number', key: 'LegNumber' },
                                { label: 'Voyage No.', key: 'VoyageNumber' },
                                { label: 'Report Type', key: 'ReportTypeKey' },
                                { label: 'Report Status', key: 'ReportStatus' },
                                { label: 'Local Date/Time', key: 'ReportDateTimeLocal' },
                                { label: 'UTC Date/Time', key: 'ReportDateTimeUTC' },
                                { label: 'Time Zone', key: 'TimeZoneAtPort' },
                                
                                // --- POSITIONAL / DISTANCE / DRAFT ---
                                { label: 'Current Port', key: 'CurrentPortCode' },
                                { label: 'From Port', key: 'FromPort' },
                                { label: 'To Port', key: 'ToPort' },
                                { label: 'Latitude', key: 'Latitude' },
                                { label: 'Longitude', key: 'Longitude' },
                                { label: 'Vessel Activity', key: 'VesselActivity' },
                                { label: 'Course (DEG)', key: 'CourseDEG' },
                                { label: 'Speed (kts)', key: 'SpeedKnots' },
                                { label: 'Report Duration (HRS)', key: 'ReportDuration' },
                                { label: 'Steaming Hours', key: 'SteamingHoursPeriod' },
                                { label: 'Time at Anchorage (HRS)', key: 'TimeAtAnchorageHRS' },
                                { label: 'Time at Drifting (HRS)', key: 'TimeAtDriftingHRS' },
                                { label: 'Dist. Since Last (NM)', key: 'DistanceSinceLastReportNM' },
                                { label: 'Engine Dist. (NM)', key: 'EngineDistanceNM' },
                                { label: 'Dist. To Go (NM)', key: 'DistanceToGoNM' },
                                { label: 'Dist. Travelled (HS)', key: 'DistanceTravelledHS_NM' },
                                { label: 'Slip (%)', key: 'SlipPercent' },
                                { label: 'Draft Fwd (m)', key: 'FwdDraft' },
                                { label: 'Draft Aft (m)', key: 'AftDraft' },
                                { label: 'Draft Mid (m)', key: 'MidDraft' },
                                { label: 'Trim (m)', key: 'Trim' },
                                
                                // --- WEATHER / ENVIRONMENTAL ---
                                { label: 'Wind Force', key: 'WindForce' },
                                { label: 'Wind Direction', key: 'WindDirection' },
                                { label: 'Sea State', key: 'SeaState' },
                                { label: 'Swell Direction', key: 'SwellDirection' },
                                { label: 'Swell Height (M)', key: 'SwellHeightM' },
                                { label: 'Air Temp (°C)', key: 'AirTemperatureC' },
                                { label: 'Sea Temp (°C)', key: 'SeaTemperatureC' },
                                { label: 'Bar. Pressure (HPa)', key: 'BarometricPressureHPa' },
                                
                                // --- CARGO / STABILITY ---
                                { label: 'Cargo Activity', key: 'CargoActivity' },
                                { label: 'Cargo Type', key: 'ReportedCargoType' },
                                { label: 'Cargo Qty (MT)', key: 'ReportedCargoQuantityMT' },
                                { label: 'Containers (TEU)', key: 'ContainersTEU' },
                                { label: 'Displacement (MT)', key: 'DisplacementMT' },
                                
                                // --- CHARTERER/AUDIT ---
                                { label: 'Charterer Speed (kts)', key: 'ChartererSpeed' },
                                { label: 'Charterer Cons.', key: 'ChartererConsumption' },
                                { label: 'Submitted By', key: 'SubmittedBy' },
                                { label: 'Remarks', key: 'Remarks' },
                            ].map(field => (
                                // Only display fields that have data in the parsed report OR are explicitly required
                                mainReport[field.key] !== undefined && (
                                    <div key={field.key} className="detail-item">
                                        <span className="detail-label">{field.label}</span>
                                        <span className="detail-value">{formatValue(mainReport[field.key])}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    ) : <p className="error-message">No main report data found. Please ensure the VesselDailyReports sheet has data.</p>}
                </div>
                
                <div className="secondary-reports-grid">
                    {renderDataSummary(
                        'Fuel Consumption',
                        fuelConsumption,
                        [
                            { label: 'Fuel Type', key: 'FuelTypeKey' }, 
                            { label: 'Machinery', key: 'Machinery' }, 
                            { label: 'Consumed By', key: 'ConsumedByDescription' }, 
                            { label: 'BDN No.', key: 'BDN_Number' }, 
                            { label: 'Consumed', key: 'ConsumedMT', unit: 'MT' },
                            { label: 'Entry Date', key: 'EntryDate' }
                        ]
                    )}

                    {renderDataSummary(
                        'Lube Oil Consumption',
                        loConsumption,
                        [
                            { label: 'LO Type', key: 'LOTypeKey' }, 
                            // Fix 1: Changed key to 'Machinery' to engage custom logic in renderDataSummary
                            { label: 'Machinery', key: 'Machinery' }, 
                            { label: 'BDN No.', key: 'BDN_Number' }, 
                            { label: 'Consumed', key: 'ConsumedQty', unit: 'L' },
                            { label: 'Entry Date', key: 'EntryDate' }
                        ]
                    )}
                </div>

                <div className="secondary-reports-grid">
                    {renderDataSummary(
                        'Machinery Data',
                        machineryData,
                        [
                            { label: 'Machinery Name', key: 'MachineryName' }, 
                            { label: 'Type', key: 'MachineryTypeKey' }, 
                            { label: 'Running Hrs', key: 'Running_Hrs' },
                            { label: 'Power', key: 'Power' },
                            { label: 'RPM', key: 'RPM' },
                        ]
                    )}
                    
                    {renderDataSummary(
                        'Bunker ROB (Final Qty)',
                        combinedROB,
                        [
                            // Fix 2: Use keys present in the ROB sheets
                            { label: 'Item Type', key: 'Item Type' },
                            { label: 'Category', key: 'ItemCategory' },
                            { label: 'BDN No.', key: 'BDN_Number' },
                            { label: 'Initial Qty', key: 'Initial_Quantity' },
                            { label: 'Consumed Qty', key: 'Consumed_Quantity' },
                            { label: 'Final Qty', key: 'Final_Quantity' }
                        ]
                    )}
                </div>
            </div>
        );
    };


    return (
        <div className="excel-integration-page-container">
            <h1 className="page-title">Excel Integration for Vessel Reports</h1>

            {/* MODE SWITCHER */}
            <div className="section-card" style={{textAlign:'center', marginBottom:'20px'}}>
                <span style={{marginRight:'10px', fontWeight:'bold'}}>Select Mode:</span>
                <button 
                    className={`action-button ${uploadMode === 'SINGLE' ? 'active-mode' : ''}`}
                    onClick={() => { setUploadMode('SINGLE'); resetStates(); }}
                    style={{marginRight:'10px', backgroundColor: uploadMode==='SINGLE'?'#4472C4':'#ccc'}}
                >
                    Single Report
                </button>
                <button 
                    className={`action-button ${uploadMode === 'BULK' ? 'active-mode' : ''}`}
                    onClick={() => { setUploadMode('BULK'); resetStates(); }}
                    style={{marginRight:'10px', backgroundColor: uploadMode==='BULK'?'#28a745':'#ccc'}}
                >
                    Bulk Upload
                </button>
                <button 
                    className={`action-button ${uploadMode === 'VOYAGE' ? 'active-mode' : ''}`}
                    onClick={() => { setUploadMode('VOYAGE'); resetStates(); }}
                    style={{marginRight:'10px', backgroundColor: uploadMode==='VOYAGE'?'#ffc107':'#ccc', color: uploadMode==='VOYAGE'?'#000':'#fff'}}
                >
                    Voyages
                </button>
                {/* NEW BUNKER MODE BUTTON */}
                <button 
                    className={`action-button ${uploadMode === 'BUNKER' ? 'active-mode' : ''}`}
                    onClick={() => { setUploadMode('BUNKER'); resetStates(); }}
                    style={{backgroundColor: uploadMode==='BUNKER'?'#17a2b8':'#ccc', color: uploadMode==='BUNKER'?'#fff':'#fff'}}
                >
                    Bunkering
                </button>
            </div>

            {/* START: New container for horizontal layout (Single Row) */}
            <div className="feature-sections-row">
                <div className="section-card">
                    <h2>1. Select Vessel</h2>
                    <SearchableDropdown
                        options={ships}
                        value={selectedShipId}
                        onChange={(selectedVal) => {
                            setSelectedShipId(selectedVal);
                            resetStates(); 
                        }}
                        placeholder="Select a Vessel"
                        id="ship-select"
                    />
                    {selectedShipId && <p className="selected-info">Selected Ship ID: {selectedShipId}</p>}
                </div>

                <div className="section-card">
                    <h2>2. Export Report Template</h2>
                    <p>Download an Excel template. Select <strong>Single</strong> for one report or <strong>Bulk</strong> for multiple.</p>
                    
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        {uploadMode === 'SINGLE' && (
                            <button
                                onClick={handleExportTemplate}
                                disabled={!selectedShipId || loading}
                                className="action-button export-button"
                            >
                                {loading ? '...' : 'Single Template'}
                            </button>
                        )}
                        {uploadMode === 'BULK' && (
                            <button
                                onClick={handleExportBulkTemplate}
                                disabled={!selectedShipId || loading}
                                className="action-button export-button"
                                style={{ backgroundColor: '#28a745' }} // Green color to distinguish
                            >
                                {loading ? '...' : 'Bulk Template'}
                            </button>
                        )}
                        {/* *** NEW VOYAGE EXPORT BUTTON *** */}
                        {uploadMode === 'VOYAGE' && (
                            <button
                                onClick={handleExportVoyageTemplate}
                                disabled={!selectedShipId || loading}
                                className="action-button export-button"
                                style={{ backgroundColor: '#ffc107', color:'#000' }}
                            >
                                {loading ? '...' : 'Voyage Template'}
                            </button>
                        )}
                        {/* *** NEW BUNKER EXPORT BUTTON *** */}
                        {uploadMode === 'BUNKER' && (
                            <button
                                onClick={handleExportBunkerTemplate}
                                disabled={!selectedShipId || loading}
                                className="action-button export-button"
                                style={{ backgroundColor: '#17a2b8', color:'#fff' }}
                            >
                                {loading ? '...' : 'Bunker Template'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="section-card">
                    <h2>3. Upload, Save CSV & Process</h2>
                    <p>Upload a filled Excel file to save as a CSV and retrieve a preview of the data from the CSV.</p>
                    <input
                        type="file"
                        // MODIFIED: Added .csv and text/csv to accept attribute
                        accept=".xlsx, .xls, .csv, text/csv"
                        onChange={handleFileChange}
                        id="excelFileInput"
                        className="file-input"
                    />
                    {selectedFileName && <p className="selected-info">Selected file: {selectedFileName}</p>}
                    
                    <button
                        onClick={handleProcessFile}
                        // Disable if already loading OR we don't have ship/file OR if a preview already exists
                        disabled={!selectedShipId || !file || loading || (uploadMode === 'SINGLE' && parsedData)}
                        className="action-button preview-button"
                    >
                        {loading ? 'Processing...' : (uploadMode === 'SINGLE' ? 'Upload & Preview' : 'Upload File')}
                    </button>
                </div>
            </div>
            {/* END: New container for horizontal layout */}

            {loading && <p className="loading-message">Processing Template Please wait...</p>}
            {/* The error message now displays the detailed validation failure */}
            {error && <p className="error-message">⚠️ Data Validation Error: {error}</p>}
            {message && !error && <p className="success-message">{message}</p>}
            
            {/* 4. Data Preview and Final Submission */}
            {(uploadMode === 'SINGLE' || uploadMode === 'VOYAGE' || uploadMode === 'BUNKER') && parsedData && (
                <div className="section-card parsed-data-card">
                    <h2>4. Review and Confirm Import</h2>
                    <p className="note-message">
                        Data shown below is retrieved directly from the **saved CSV file**.
                        Unique File ID for Import: <strong>{uniqueFileId || 'N/A'}</strong> 
                    </p>
                    {renderPreview()}
                    
                    {/* START: Button Group for Submission - NEW WRAPPER */}
                    <div className="submission-buttons-group">
                        
                        {/* MODIFIED: This button is now renamed and exclusively uses the CSV import path */}
                        <button
                            onClick={handleConfirmAndImport}
                            // Requires a uniqueFileId to ensure CSV has been successfully saved 
                            disabled={loading || !uniqueFileId}
                            className="action-button submit-button"
                        >
                            {/* Renaming the button text to clarify the flow */}
                            {loading ? 'Submitting...' : 'Confirm & Import CSV to Database'}
                        </button>
                        
                    </div>
                    {/* END: Button Group for Submission */}
                </div>
            )}
            
        </div>
    );
};

export default ExcelIntegrationPage;