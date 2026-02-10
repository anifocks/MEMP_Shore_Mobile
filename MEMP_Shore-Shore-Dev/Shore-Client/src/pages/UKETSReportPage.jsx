// Shore-Client/src/pages/UKETSReportPage.jsx
import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import { FaSpinner, FaCalculator, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { previewUkEtsData } from '../api';
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

const UKETSReportPage = () => {
    // Filter states
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedYear, setSelectedYear] = useState('');

    // UK ETS states
    const [ukEtsLoading, setUkEtsLoading] = useState(false);
    const [ukEtsData, setUkEtsData] = useState(null);
    const [ukEtsAttempted, setUkEtsAttempted] = useState(false);
    const [ukEtsCollapsed, setUkEtsCollapsed] = useState(false);
    const [activeUkEtsTab, setActiveUkEtsTab] = useState('mrvVoyage');

    const loadVesselOptions = useVesselOptions();

    const handleCalculateUkEts = async () => {
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

        setUkEtsLoading(true);
        setUkEtsAttempted(true);
        setActiveUkEtsTab('mrvVoyage');

        try {
            const response = await previewUkEtsData({
                shipId: selectedVessel.value,
                fromDate: effectiveFromDate,
                toDate: effectiveToDate,
                year: selectedYear
            });
            if (response.success) {
                setUkEtsData(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch UK ETS data.');
            }
        } catch (error) {
            console.error('Error calculating UK ETS:', error);
            alert('Error calculating UK ETS data. Please try again.');
        } finally {
            setUkEtsLoading(false);
        }
    };

    const renderEuMrvTable = (tableData) => {
        if (!tableData || tableData.length === 0) {
            return <p className="no-data-message">No data available for this period.</p>;
        }

        const columns = Object.keys(tableData[0]);
        return (
            <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem',
                    border: '1px solid #ccc'
                }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #ccc' }}>
                            {columns.map(col => (
                                <th key={col} style={{
                                    padding: '10px',
                                    textAlign: 'left',
                                    fontWeight: 'bold',
                                    borderRight: '1px solid #ccc'
                                }}>
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, idx) => (
                            <tr key={idx} style={{
                                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                                borderBottom: '1px solid #e5e7eb',
                            }}>
                                {columns.map(col => (
                                    <td key={col} style={{
                                        padding: '10px',
                                        borderRight: '1px solid #ccc',
                                        textAlign: typeof row[col] === 'number' ? 'right' : 'left'
                                    }}>
                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'N/A'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderUkEtsDetails = (data) => {
        if (!data || data.length === 0) {
            return <p className="no-data-message">No UK ETS data available for this period.</p>;
        }

        const row = data[0];

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

        const ukEtsFields = [
            { label: 'Ship Name', key: 'Ship_Name', unit: '' },
            { label: 'IMO Number', key: 'IMO_Number', unit: '' },
            { label: 'Total Distance (NM)', key: 'Total_Distance_NM', unit: 'NM' },
            { label: 'Total Time (Hours)', key: 'Total_Time_Hours', unit: 'hrs' },
            { label: 'Total Fuel Consumed (MT)', key: 'Total_Fuel_Consumed_MT', unit: 'MT' },
            { label: 'Total CO2 Emitted (MT)', key: 'Total_CO2_Emitted_MT', unit: 'MT' },
            { label: 'UK ETS Allowance', key: 'UK_ETS_Allowance', unit: 'tCO2' },
            { label: 'UK ETS Surrendered', key: 'UK_ETS_Surrendered', unit: 'tCO2' },
            { label: 'UK ETS Status', key: 'UK_ETS_Status', unit: '' },
        ];

        return (
            <div style={{ marginTop: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', maxWidth: '80vw', margin: '0 auto' }}>
                {/* Header with Toggle */}
                <div
                    onClick={() => setUkEtsCollapsed(!ukEtsCollapsed)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        cursor: 'pointer',
                        borderBottom: !ukEtsCollapsed ? '1px solid #e5e7eb' : 'none',
                        transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#f9fafb')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        {ukEtsCollapsed ? <FaChevronDown size={18} /> : <FaChevronUp size={18} />}
                        <span style={{ fontWeight: 600, fontSize: '16px' }}>UK ETS Report Details</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '20px', color: '#f59e0b' }}>
                        {row.UK_ETS_Status || 'N/A'}
                    </span>
                </div>

                {/* Collapsed Content */}
                {!ukEtsCollapsed && (
                    <div style={{ padding: '16px' }}>
                        <div className="uk-ets-details-grid">
                            <div className="uk-ets-status-card">
                                <div className="status-header">UK ETS Compliance Status</div>
                                <div className="status-value" style={{ color: '#f59e0b' }}>
                                    {row.UK_ETS_Status || 'N/A'}
                                </div>
                            </div>
                            <div className="uk-ets-data-card">
                                {ukEtsFields.map(field => (
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
                    <h1 className="page-title">UK ETS Report Details</h1>
                    <p className="page-subtitle">Calculate and view UK Emissions Trading System data</p>
                </div>

                {/* Filters Section */}
                <div className="filters-section">
                    <h3>Filters</h3>
                    <div className="report-form horizontal-form">
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
                                onClick={handleCalculateUkEts}
                                disabled={!selectedVessel || (!selectedYear && (!fromDate || !toDate)) || ukEtsLoading}
                                style={{
                                    height: '45px',
                                    padding: '0 24px',
                                    background: ukEtsLoading ? '#6b7280' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: ukEtsLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: ukEtsLoading ? 'none' : '0 4px 12px rgba(239, 68, 68, 0.3)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!ukEtsLoading) {
                                        e.target.style.transform = 'translateY(-1px)';
                                        e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!ukEtsLoading) {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                                    }
                                }}
                            >
                                {ukEtsLoading ? <FaSpinner className="fa-spin" /> : <FaCalculator />}
                                {ukEtsLoading ? ' Calculating...' : ' Calculate UK ETS'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* UK ETS Results Section */}
                {ukEtsAttempted && (
                    <div className="data-preview-section">
                        <h2>UK ETS Calculation Results</h2>
                        {ukEtsLoading ? (
                            <p>Loading UK ETS data...</p>
                        ) : ukEtsData ? (
                            <>
                                <div className="tab-navigation">
                                    <button
                                        className={activeUkEtsTab === 'mrvVoyage' ? 'active' : ''}
                                            onClick={() => setActiveUkEtsTab('mrvVoyage')}
                                        >
                                            MRV Voyage Summary ({ukEtsData.ukEtsMrvVoyageSummary?.length || 0})
                                        </button>
                                        <button
                                            className={activeUkEtsTab === 'etsVoyage' ? 'active' : ''}
                                            onClick={() => setActiveUkEtsTab('etsVoyage')}
                                        >
                                            ETS Voyage Summary ({ukEtsData.ukEtsVoyageSummary?.length || 0})
                                        </button>                                        <button
                                            className={activeUkEtsTab === 'etsAggregator' ? 'active' : ''}
                                            onClick={() => setActiveUkEtsTab('etsAggregator')}
                                        >
                                            ETS Aggregator ({ukEtsData.ukEtsAggregator?.length || 0})
                                        </button>                                    </div>
                                    <div className="tab-content" style={{ width: '100%' }}>
                                        {activeUkEtsTab === 'mrvVoyage' && renderEuMrvTable(ukEtsData.ukEtsMrvVoyageSummary)}
                                        {activeUkEtsTab === 'etsVoyage' && renderEuMrvTable(ukEtsData.ukEtsVoyageSummary)}                                        {activeUkEtsTab === 'etsAggregator' && renderEuMrvTable(ukEtsData.ukEtsAggregator)}                                    </div>
                                </>
                            ) : (
                                <p className="no-data-message">No UK ETS data available for this selection.</p>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UKETSReportPage;