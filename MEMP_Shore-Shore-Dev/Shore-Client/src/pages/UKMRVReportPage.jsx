// Shore-Client/src/pages/UKMRVReportPage.jsx
import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import { FaSpinner, FaCalculator, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { previewUkMrvData } from '../api';
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

const UKMRVReportPage = () => {
    // Filter states
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedYear, setSelectedYear] = useState('');

    // UK MRV states
    const [ukMrvLoading, setUkMrvLoading] = useState(false);
    const [ukMrvData, setUkMrvData] = useState(null);
    const [ukMrvAttempted, setUkMrvAttempted] = useState(false);
    const [ukMrvCollapsed, setUkMrvCollapsed] = useState(false);
    const [activeUkMrvTab, setActiveUkMrvTab] = useState('basicData');

    const loadVesselOptions = useVesselOptions();

    const handleCalculateUkMrv = async () => {
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

        setUkMrvLoading(true);
        setUkMrvAttempted(true);
        setActiveUkMrvTab('basicData');

        try {
            const response = await previewUkMrvData({
                shipId: selectedVessel.value,
                fromDate: effectiveFromDate,
                toDate: effectiveToDate,
                year: selectedYear
            });
            if (response.success) {
                setUkMrvData(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch UK MRV data.');
            }
        } catch (error) {
            console.error('Error calculating UK MRV:', error);
            alert('Error calculating UK MRV data. Please try again.');
        } finally {
            setUkMrvLoading(false);
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

    const renderUkMrvDetails = (data) => {
        if (!data || data.length === 0) {
            return <p className="no-data-message">No UK MRV data available for this period.</p>;
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

        const ukMrvFields = [
            { label: 'Ship Name', key: 'Ship_Name', unit: '' },
            { label: 'IMO Number', key: 'IMO_Number', unit: '' },
            { label: 'Total Distance (NM)', key: 'Total_Distance_NM', unit: 'NM' },
            { label: 'Total Time (Hours)', key: 'Total_Time_Hours', unit: 'hrs' },
            { label: 'Total Fuel Consumed (MT)', key: 'Total_Fuel_Consumed_MT', unit: 'MT' },
            { label: 'Total CO2 Emitted (MT)', key: 'Total_CO2_Emitted_MT', unit: 'MT' },
            { label: 'UK MRV Status', key: 'UK_MRV_Status', unit: '' },
        ];

        return (
            <div style={{ marginTop: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', maxWidth: '80vw', margin: '0 auto' }}>
                {/* Header with Toggle */}
                <div
                    onClick={() => setUkMrvCollapsed(!ukMrvCollapsed)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        cursor: 'pointer',
                        borderBottom: !ukMrvCollapsed ? '1px solid #e5e7eb' : 'none',
                        transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#f9fafb')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        {ukMrvCollapsed ? <FaChevronDown size={18} /> : <FaChevronUp size={18} />}
                        <span style={{ fontWeight: 600, fontSize: '16px' }}>UK MRV Report Details</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '20px', color: '#8b5cf6' }}>
                        {row.UK_MRV_Status || 'N/A'}
                    </span>
                </div>

                {/* Collapsed Content */}
                {!ukMrvCollapsed && (
                    <div style={{ padding: '16px' }}>
                        <div className="uk-mrv-details-grid">
                            <div className="uk-mrv-status-card">
                                <div className="status-header">UK MRV Compliance Status</div>
                                <div className="status-value" style={{ color: '#8b5cf6' }}>
                                    {row.UK_MRV_Status || 'N/A'}
                                </div>
                            </div>
                            <div className="uk-mrv-data-card">
                                {ukMrvFields.map(field => (
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
                    <h1 className="page-title">UK MRV Report Details</h1>
                    <p className="page-subtitle">Calculate and view UK Monitoring, Reporting and Verification data</p>
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
                                onClick={handleCalculateUkMrv}
                                disabled={!selectedVessel || (!selectedYear && (!fromDate || !toDate)) || ukMrvLoading}
                                style={{
                                    height: '45px',
                                    padding: '0 24px',
                                    background: ukMrvLoading ? '#6b7280' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: ukMrvLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: ukMrvLoading ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.3)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!ukMrvLoading) {
                                        e.target.style.transform = 'translateY(-1px)';
                                        e.target.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!ukMrvLoading) {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                                    }
                                }}
                            >
                                {ukMrvLoading ? <FaSpinner className="fa-spin" /> : <FaCalculator />}
                                {ukMrvLoading ? ' Calculating...' : ' Calculate UK MRV'}
                            </button>
                        </div>
                    </div>
                </div>

                {ukMrvAttempted && (
                    <div className="data-preview-section">
                        <h2>UK MRV Calculation Results</h2>
                        {ukMrvLoading ? (
                            <p>Loading UK MRV data...</p>
                        ) : ukMrvData ? (
                            <>
                                    <div className="tab-navigation">
                                        <button
                                            className={activeUkMrvTab === 'basicData' ? 'active' : ''}
                                            onClick={() => setActiveUkMrvTab('basicData')}
                                        >
                                            Basic Data ({ukMrvData.ukMrvBasicData?.length || 0})
                                        </button>
                                        <button
                                            className={activeUkMrvTab === 'voyageSummary' ? 'active' : ''}
                                            onClick={() => setActiveUkMrvTab('voyageSummary')}
                                        >
                                            Voyage Summary ({ukMrvData.ukMrvVoyageSummary?.length || 0})
                                        </button>
                                        <button
                                            className={activeUkMrvTab === 'annualAggregator' ? 'active' : ''}
                                            onClick={() => setActiveUkMrvTab('annualAggregator')}
                                        >
                                            Annual Aggregator ({ukMrvData.ukAnnualAggregator?.length || 0})
                                        </button>
                                    </div>
                                    <div className="tab-content" style={{ width: '100%' }}>
                                        {activeUkMrvTab === 'basicData' && renderEuMrvTable(ukMrvData.ukMrvBasicData)}
                                        {activeUkMrvTab === 'voyageSummary' && renderEuMrvTable(ukMrvData.ukMrvVoyageSummary)}
                                        {activeUkMrvTab === 'annualAggregator' && renderEuMrvTable(ukMrvData.ukAnnualAggregator)}
                                    </div>
                                </>
                            ) : (
                                <p className="no-data-message">No UK MRV data available for this selection.</p>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UKMRVReportPage;