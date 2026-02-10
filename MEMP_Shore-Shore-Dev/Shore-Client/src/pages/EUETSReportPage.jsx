// Shore-Client/src/pages/EUETSReportPage.jsx
import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import { FaSpinner, FaCalculator, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { previewEuEtsData } from '../api';
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

const EUETSReportPage = () => {
    // Filter states
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedYear, setSelectedYear] = useState('');

    // EU ETS states
    const [euEtsLoading, setEuEtsLoading] = useState(false);
    const [euEtsData, setEuEtsData] = useState(null);
    const [euEtsAttempted, setEuEtsAttempted] = useState(false);
    const [euEtsCollapsed, setEuEtsCollapsed] = useState(false);
    const [activeEuEtsTab, setActiveEuEtsTab] = useState('mrvVoyage');

    const loadVesselOptions = useVesselOptions();

    const handleCalculateEuEts = async () => {
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

        setEuEtsLoading(true);
        setEuEtsAttempted(true);
        setActiveEuEtsTab('mrvVoyage');

        try {
            const response = await previewEuEtsData({
                shipId: selectedVessel.value,
                fromDate: effectiveFromDate,
                toDate: effectiveToDate,
                year: selectedYear
            });
            if (response.success) {
                setEuEtsData(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch EU ETS data.');
            }
        } catch (error) {
            console.error('Error calculating EU ETS:', error);
            alert('Error calculating EU ETS data. Please try again.');
        } finally {
            setEuEtsLoading(false);
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

    return (
        <div className="compliances-cards-page">
            <div className="content-container">
                <div className="cards-header">
                    <h1 className="page-title">EU ETS Report Details</h1>
                    <p className="page-subtitle">Calculate and view EU Emissions Trading System data</p>
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
                                onClick={handleCalculateEuEts}
                                disabled={!selectedVessel || (!selectedYear && (!fromDate || !toDate)) || euEtsLoading}
                                style={{
                                    height: '45px',
                                    padding: '0 24px',
                                    background: euEtsLoading ? '#6b7280' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: euEtsLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: euEtsLoading ? 'none' : '0 4px 12px rgba(245, 158, 11, 0.3)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!euEtsLoading) {
                                        e.target.style.transform = 'translateY(-1px)';
                                        e.target.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!euEtsLoading) {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                                    }
                                }}
                            >
                                {euEtsLoading ? <FaSpinner className="fa-spin" /> : <FaCalculator />}
                                {euEtsLoading ? ' Calculating...' : ' Calculate EU ETS'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* EU ETS Results Section */}
                {euEtsAttempted && (
                    <div className="data-preview-section">
                        <h2>EU ETS Calculation Results</h2>
                        {euEtsLoading ? (
                            <p>Loading EU ETS data...</p>
                        ) : euEtsData ? (
                            <>
                                <div className="tab-navigation">
                                    <button
                                        className={activeEuEtsTab === 'mrvVoyage' ? 'active' : ''}
                                            onClick={() => setActiveEuEtsTab('mrvVoyage')}
                                        >
                                            MRV Voyage Summary ({euEtsData.euEtsMrvVoyageSummary?.length || 0})
                                        </button>
                                        <button
                                            className={activeEuEtsTab === 'etsVoyage' ? 'active' : ''}
                                            onClick={() => setActiveEuEtsTab('etsVoyage')}
                                        >
                                            EU ETS Voyage Summary ({euEtsData.euEtsVoyageSummary?.length || 0})
                                        </button>
                                        <button
                                            className={activeEuEtsTab === 'euEtsAggregator' ? 'active' : ''}
                                            onClick={() => setActiveEuEtsTab('euEtsAggregator')}
                                        >
                                            EU ETS Aggregator ({euEtsData.euEtsAggregator?.length || 0})
                                        </button>
                                    </div>
                                    <div className="tab-content" style={{ width: '100%' }}>
                                        {activeEuEtsTab === 'mrvVoyage' && renderEuMrvTable(euEtsData.euEtsMrvVoyageSummary)}
                                        {activeEuEtsTab === 'etsVoyage' && renderEuMrvTable(euEtsData.euEtsVoyageSummary)}
                                        {activeEuEtsTab === 'euEtsAggregator' && renderEuMrvTable(euEtsData.euEtsAggregator)}
                                    </div>
                                </>
                            ) : (
                                <p className="no-data-message">No EU ETS data available for this selection.</p>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EUETSReportPage;