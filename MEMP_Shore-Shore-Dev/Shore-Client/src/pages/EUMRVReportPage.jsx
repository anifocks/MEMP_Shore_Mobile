// Shore-Client/src/pages/EUMRVReportPage.jsx
import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import { FaSpinner, FaCalculator, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { previewEuMrvData } from '../api';
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

const EUMRVReportPage = () => {
    // Filter states
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedYear, setSelectedYear] = useState('');

    // EU MRV states
    const [euMrvLoading, setEuMrvLoading] = useState(false);
    const [euMrvData, setEuMrvData] = useState(null);
    const [euMrvAttempted, setEuMrvAttempted] = useState(false);
    const [euMrvCollapsed, setEuMrvCollapsed] = useState(false);
    const [activeEuMrvTab, setActiveEuMrvTab] = useState('daily');

    const loadVesselOptions = useVesselOptions();

    const handleCalculateEuMrv = async () => {
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

        setEuMrvLoading(true);
        setEuMrvAttempted(true);
        setActiveEuMrvTab('daily');

        try {
            const response = await previewEuMrvData({
                shipId: selectedVessel.value,
                fromDate: effectiveFromDate,
                toDate: effectiveToDate,
                year: selectedYear
            });
            console.log('Response from previewEuMrvData:', response);
            if (response.success) {
                console.log('Setting euMrvData to:', response.data);
                setEuMrvData(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch EU MRV data.');
            }
        } catch (error) {
            console.error('Error calculating EU MRV:', error);
            alert('Error calculating EU MRV data. Please try again.');
        } finally {
            setEuMrvLoading(false);
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

    const renderAnnualAggregatorCard = (data) => {
        if (!data || data.length === 0) {
            return <p className="no-data-message">No annual data available for this period.</p>;
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

        const detailFields = [
            { label: 'Ship Name', key: 'Ship Name' },
            { label: 'IMO Number', key: 'IMO Number' },
            { label: 'Total Fuel Consumed (MT)', key: 'Total_Fuel_Consumed_MT' },
            { label: 'Total CO2 Emitted (MT)', key: 'Total_CO2_Emitted_MT' },
            { label: 'Total GHG CO2e (MT)', key: 'Total_GHG_CO2e_MT' },
            { label: 'Sea Fuel Consumed (MT)', key: 'Sea_Fuel_Consumed_MT' },
            { label: 'Port Fuel Consumed (MT)', key: 'Port_Fuel_Consumed_MT' },
            { label: 'Sea CO2 Emitted (MT)', key: 'Sea_CO2_Emitted_MT' },
            { label: 'Port CO2 Emitted (MT)', key: 'Port_CO2_Emitted_MT' },
            { label: 'Total Distance (NM)', key: 'Total_Distance_NM' },
            { label: 'Average Cargo (MT)', key: 'Avg_Cargo_MT' },
        ];

        return (
            <div className="cii-data-card">
                {detailFields.map(field => (
                    <div className="detail-item" key={field.key}>
                        <span className="detail-label">{field.label}</span>
                        <span className="detail-value">{formatValue(row[field.key])}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="compliances-cards-page">
            <div className="content-container">
                <div className="cards-header">
                    <h1 className="page-title">EU MRV Report Details</h1>
                    <p className="page-subtitle">Calculate and view EU Monitoring, Reporting and Verification data</p>
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
                                onClick={handleCalculateEuMrv}
                                disabled={!selectedVessel || (!selectedYear && (!fromDate || !toDate)) || euMrvLoading}
                                style={{
                                    height: '45px',
                                    padding: '0 24px',
                                    background: euMrvLoading ? '#6b7280' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: euMrvLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: euMrvLoading ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!euMrvLoading) {
                                        e.target.style.transform = 'translateY(-1px)';
                                        e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!euMrvLoading) {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                    }
                                }}
                            >
                                {euMrvLoading ? <FaSpinner className="fa-spin" /> : <FaCalculator />}
                                {euMrvLoading ? ' Calculating...' : ' Calculate EU MRV'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* EU MRV Results Section */}
                {euMrvAttempted && (
                    <div className="data-preview-section">
                        <h2>EU MRV Calculation Results</h2>
                        {euMrvLoading ? (
                            <p>Loading EU MRV data...</p>
                        ) : euMrvData ? (
                            <>
                                <div className="tab-navigation">
                                    <button
                                        className={activeEuMrvTab === 'daily' ? 'active' : ''}
                                            onClick={() => setActiveEuMrvTab('daily')}
                                        >
                                            Daily Reports ({euMrvData.dailyReports?.length || 0})
                                        </button>
                                        <button
                                            className={activeEuMrvTab === 'voyages' ? 'active' : ''}
                                            onClick={() => setActiveEuMrvTab('voyages')}
                                        >
                                            Voyages Aggregator ({euMrvData.voyagesAggregator?.length || 0})
                                        </button>
                                        <button
                                            className={activeEuMrvTab === 'annual' ? 'active' : ''}
                                            onClick={() => setActiveEuMrvTab('annual')}
                                        >
                                            Annual Aggregator ({euMrvData.annualAggregator?.length || 0})
                                        </button>
                                    </div>
                                    <div className="tab-content" style={{ width: '100%' }}>
                                        {activeEuMrvTab === 'daily' && renderEuMrvTable(euMrvData.dailyReports)}
                                        {activeEuMrvTab === 'voyages' && renderEuMrvTable(euMrvData.voyagesAggregator)}
                                        {activeEuMrvTab === 'annual' && renderAnnualAggregatorCard(euMrvData.annualAggregator)}
                                    </div>
                                </>
                            ) : (
                                <p className="no-data-message">No EU MRV data available for this selection.</p>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EUMRVReportPage;