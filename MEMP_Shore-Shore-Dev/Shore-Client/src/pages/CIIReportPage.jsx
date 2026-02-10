// Shore-Client/src/pages/CIIReportPage.jsx
import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import { FaSpinner, FaCalculator, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { previewVerifaviaData } from '../api';
import { useVesselOptions } from '../hooks/useVesselOptions';
import './CompliancesDashboardPage.css';

const customSelectStyles = {
    control: (provided) => ({
        ...provided,
        borderColor: '#ccc',
        height: '40px',
    }),
    menu: (provided) => ({ ...provided, zIndex: 9999 }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
};

const CIIReportPage = () => {
    // Filter states
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedYear, setSelectedYear] = useState('');

    // CII states
    const [ciiLoading, setCiiLoading] = useState(false);
    const [ciiData, setCiiData] = useState(null);
    const [ciiAttempted, setCiiAttempted] = useState(false);
    const [ciiCollapsed, setCiiCollapsed] = useState(false);

    const loadVesselOptions = useVesselOptions();

    const handleCalculateCii = async () => {
        if (!selectedVessel) {
            alert('Please select a vessel.');
            return;
        }

        // If year is selected but dates are not, use the full year
        let effectiveFromDate = fromDate;
        let effectiveToDate = toDate;
        
        if (selectedYear && (!fromDate || !toDate)) {
            effectiveFromDate = `${selectedYear}-01-01`;
            effectiveToDate = `${selectedYear}-12-31`;
        } else if (!fromDate || !toDate) {
            alert('Please select both "From" and "To" dates, or select a year to use the full year.');
            return;
        }

        setCiiLoading(true);
        setCiiAttempted(true);

        try {
            const response = await previewVerifaviaData({
                shipId: selectedVessel.value,
                fromDate: effectiveFromDate,
                toDate: effectiveToDate,
                year: selectedYear
            });
            if (response.success) {
                setCiiData(response.data.ciiData);
            } else {
                throw new Error(response.error || 'Failed to fetch CII data.');
            }
        } catch (error) {
            console.error('Error calculating CII:', error);
            alert('Error calculating CII data. Please try again.');
        } finally {
            setCiiLoading(false);
        }
    };

    const renderCiiDetails = (data) => {
        if (!data) {
            return <p className="no-data-message">No CII data available for this selection. Please check the date range and vessel selection.</p>;
        }

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
            <div style={{ width: '100%', padding: '10px' }}>
                <div style={{ marginTop: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', width: '100%', margin: '0 auto' }}>
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        borderBottom: '1px solid #e5e7eb',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: '16px' }}>CII Report Details</span>
                        {rating && (
                            <span
                                style={{
                                    backgroundColor: ratingColor,
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                }}
                            >
                                Rating: {rating}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '16px',
                        width: '100%',
                    }}>
                        {detailFields.map(field => (
                            <div
                                key={field.key}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb',
                                }}
                            >
                                <span style={{ fontWeight: 500, color: '#374151' }}>
                                    {field.label}{field.unit ? ` (${field.unit})` : ''}:
                                </span>
                                <span style={{ fontWeight: 600, color: '#111827' }}>
                                    {formatValue(data[field.key])}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {ciiCollapsed ? null : (
                <div style={{ padding: '16px', maxHeight: '50vh', overflowY: 'auto', width: '100%' }}>
                    <div className="cii-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', width: '100%' }}>
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
                </div>
            )}
            </div>
        );
    };

    return (
        <div className="compliances-cards-page">
            <div className="content-container">
                <div className="cards-header">
                    <h1 className="page-title">CII Report Details</h1>
                    <p className="page-subtitle">Calculate and view Carbon Intensity Indicator ratings</p>
                </div>

                {/* Filters Section */}
                <div className="filters-section">
                    <h3>Filters</h3>
                    <div className="report-form horizontal-form" style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
                        <div className="form-group">
                            <label>Vessel</label>
                            <AsyncSelect
                                cacheOptions
                                loadOptions={loadVesselOptions}
                                defaultOptions
                                value={selectedVessel}
                                onChange={setSelectedVessel}
                                placeholder="Select a vessel..."
                                styles={customSelectStyles}
                                isClearable
                                menuPortalTarget={document.body}
                            />
                        </div>
                        <div className="form-group">
                            <label>From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label>To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label>Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="form-control"
                            >
                                <option value="">Select Year</option>
                                {Array.from({ length: 10 }, (_, i) => {
                                    const year = new Date().getFullYear() - i;
                                    return <option key={year} value={year}>{year}</option>;
                                })}
                            </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button
                                onClick={handleCalculateCii}
                                disabled={!selectedVessel || (!selectedYear && (!fromDate || !toDate)) || ciiLoading}
                                style={{
                                    height: '45px',
                                    padding: '0 24px',
                                    background: ciiLoading ? '#6b7280' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: ciiLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: ciiLoading ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!ciiLoading) {
                                        e.target.style.transform = 'translateY(-1px)';
                                        e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!ciiLoading) {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                    }
                                }}
                            >
                                {ciiLoading ? <FaSpinner className="fa-spin" /> : <FaCalculator />}
                                {ciiLoading ? ' Calculating...' : ' Calculate CII'}
                            </button>
                        </div>
                    </div>
                </div>

                {ciiAttempted && (
                    <div className="data-preview-section">
                        <h2>CII Calculation Results</h2>
                        {ciiLoading ? (
                            <p>Loading CII data...</p>
                        ) : (
                            renderCiiDetails(ciiData)
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CIIReportPage;