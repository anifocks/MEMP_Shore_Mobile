// client/src/pages/CiiDedicatedPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import { FaSpinner } from 'react-icons/fa';
import { previewVerifaviaData } from '../api'; // Use the same API as the Verifavia template for consistency
import { useVesselOptions } from '../hooks/useVesselOptions'; 
// import CiiReportPreview from '../components/MEMP/CiiReportPreview'; // REMOVED: Replaced with a more detailed inline renderer.
import './TemplateDetailPage.css'; // Re-use the same styles for consistency

const customSelectStyles = {
    control: (provided) => ({
        ...provided,
        borderColor: '#ccc',
        height: '40px', // Align height with other inputs
    }),
    menu: (provided) => ({ ...provided, zIndex: 9999 }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
};

const CiiDedicatedPage = () => {
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState('');
    const [ciiData, setCiiData] = useState(null);
    const [calculationAttempted, setCalculationAttempted] = useState(false);
    const loadVesselOptions = useVesselOptions();

    // Generate a list of years for the dropdown
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 2009 }, (_, i) => currentYear - i);

    // Handler for when a year is selected from the dropdown
    const handleYearChange = (e) => {
        const year = e.target.value;
        setSelectedYear(year);

        if (year) {
            // Auto-populate From and To dates for the selected year
            setFromDate(`${year}-01-01`);
            setToDate(`${year}-12-31`);
        } else {
            setFromDate('');
            setToDate('');
        }
    };
    const handleCalculateCii = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        setIsLoading(true);
        setCiiData(null);
        setCalculationAttempted(true); // Mark that we've tried to calculate

        try {
            // Use the Verifavia preview endpoint which already contains the CII calculation
            const response = await previewVerifaviaData({
                shipId: selectedVessel.value,
                fromDate,
                toDate,
                year: selectedYear
            });
            if (response.success) {
                // Extract the ciiData object from the comprehensive response
                setCiiData(response.data.ciiData);
            } else {
                // If the API call itself fails at a logical level
                throw new Error(response.error || 'Failed to fetch CII data.');
            }
        } catch (error) {
            // UPDATED: Display the specific error message from the API layer.
            alert(`CII Calculation failed: ${error.message}`);
            console.error("CII Calculation failed:", error);
            setCiiData(null); // Ensure data is cleared on error
        } finally {
            setIsLoading(false);
        }
    };

    // NEW: Detailed renderer for all CII data fields.
    const renderCiiDetails = (data) => {
        if (!data) {
            return <p className="no-data-message">No CII data available for this selection. Please check the date range and vessel selection.</p>;
        }

        // Helper to format numbers and handle null/undefined
        const formatValue = (value, decimals = 2) => {
            if (value === null || value === undefined || value === '') return 'N/A';
            if (typeof value === 'number') {
                return value.toLocaleString(undefined, {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                });
            }
            return String(value);
        };

        // Define the fields to display, their keys in the data object, and any units.
        const detailFields = [
            { label: 'Name of the Ship', key: 'Name of the Ship' },
            { label: 'IMO number', key: 'IMO number' },
            { label: 'Company', key: 'Company' },
            { label: 'Year of delivery', key: 'Year of delivery' },
            { label: 'Flag', key: 'Flag' },
            { label: 'Ship Type', key: 'Ship Type' },
            { label: 'Gross Tonnage', key: 'Gross Tonnage', unit: 'GT' },
            { label: 'DWT', key: 'DWT', unit: 'MT' },
            { label: 'Total Distance', key: 'Total Distance (nm)', unit: 'nm' },
            { label: 'Excluded Distance', key: 'Excluded Distance (nm)', unit: 'nm' },
            { label: 'Distance for CII', key: 'Distance used for CII (nm)', unit: 'nm' },
            { label: 'Total Fuel Consumption', key: 'Total Fuel Consumption (MT)', unit: 'MT' },
            { label: 'Excluded Fuel Consumption', key: 'Excluded Fuel Consumption (MT)', unit: 'MT' },
            { label: 'Fuel for CII', key: 'Fuel Consumption used for CII (MT)', unit: 'MT' },
            { label: 'Total CO2 Emitted', key: 'Total CO2 Emitted (tonnes)', unit: 'tonnes' },
            { label: 'Excluded CO2', key: 'Excluded CO2 (tonnes)', unit: 'tonnes' },
            { label: 'CO2 for CII', key: 'CO2 used for CII (tonnes)', unit: 'tonnes' },
            { label: 'Attained CII (AER)', key: 'Attained CII (AER)' },
            { label: 'Applicable CII', key: 'Applicable CII' },
            { label: 'Required Annual CII', key: 'Required Annual Operational CII' },
        ];

        const rating = data['Operational Carbon Intensity Rating'];
        const ratingColors = {
            'A': '#22c55e', 'B': '#84cc16', 'C': '#eab308', 'D': '#f97316', 'E': '#ef4444',
        };
        const ratingColor = ratingColors[rating] || '#6b7280';

        return (
            <div className="cii-details-grid">
                <div className="cii-rating-card" style={{ borderColor: ratingColor }}>
                    <div className="rating-header">Operational Carbon Intensity Rating</div>
                    <div className="rating-value" style={{ color: ratingColor }}>
                        {rating || 'N/A'}
                    </div>
                </div>
                <div className="cii-data-card">
                    {detailFields.map(field => (
                        <div className="detail-item" key={field.key}>
                            <span className="detail-label">{field.label}</span>
                            <span className="detail-value">
                                {formatValue(data[field.key])}
                                {data[field.key] && field.unit ? ` ${field.unit}` : ''}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="template-detail-container full-width">
            <div className="template-detail-header">
                <Link to="/app/memp" className="back-link">&larr; Back to Fleet Dashboard</Link>
                <h1>CII Rating Calculator</h1>
            </div>

            <div className="report-form horizontal-form">
                <div className="form-group">
                    <label htmlFor="vessel-select">Select Vessel</label>
                    <AsyncSelect
                        id="vessel-select"
                        cacheOptions
                        loadOptions={loadVesselOptions}
                        defaultOptions
                        value={selectedVessel}
                        onChange={setSelectedVessel}
                        placeholder="Type to search for a vessel..."
                        styles={customSelectStyles}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="from-date">From Date</label>
                    <input 
                        type="date" 
                        id="from-date" 
                        value={fromDate} 
                        onChange={(e) => {
                            setFromDate(e.target.value);
                            setSelectedYear(''); // Deselect year on manual date change
                        }} 
                        className="date-input" 
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="to-date">To Date</label>
                    <input 
                        type="date" 
                        id="to-date" 
                        value={toDate} 
                        onChange={(e) => {
                            setToDate(e.target.value);
                            setSelectedYear(''); // Deselect year on manual date change
                        }} 
                        className="date-input" 
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="year-select">Select Year</label>
                    <select id="year-select" value={selectedYear} onChange={handleYearChange} className="date-input">
                        <option value="">-- Select a Year --</option>
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <button onClick={handleCalculateCii} className="search-button" disabled={isLoading}>
                    {isLoading ? (
                        <><FaSpinner className="spinner-icon" /> Calculating...</>
                    ) : (
                        'Calculate CII'
                    )}
                </button>
            </div>

            {calculationAttempted && (
                <div className="preview-section">
                    <div className="preview-header">
                        <h2>CII Rating Result</h2>
                    </div>
                    {isLoading ? ( // Show loading message if calculation is in progress
                        <p>Loading CII data...</p>
                    ) : (
                        renderCiiDetails(ciiData)
                    )}
                </div>
            )}
        </div>
    );
};

export default CiiDedicatedPage;