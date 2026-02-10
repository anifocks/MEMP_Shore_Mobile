// Shore-Client/src/pages/CompliancesDashboardPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import { FaSpinner, FaChartLine, FaLeaf, FaDownload, FaEye, FaFileExcel, FaCalculator, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { previewVerifaviaData, previewEuMrvData, generateEuMrvReport, previewEuEtsData, generateEuEtsReport, previewUkMrvData, generateUkMrvReport, previewUkEtsData, generateUkEtsReport } from '../api';
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

const COMPLIANCE_CARDS = [
    {
        id: 'cii',
        title: 'CII Rating Calculator',
        icon: FaCalculator,
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        sheets: [
            { name: 'CII Rating Result', action: 'calculate' }
        ]
    },
    {
        id: 'eu-mrv',
        title: 'EU MRV Data',
        icon: FaChartLine,
        color: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
        sheets: [
            { name: 'Daily Reports', action: 'preview' },
            { name: 'Voyages Aggregator', action: 'preview' },
            { name: 'Annual Aggregator', action: 'preview' }
        ]
    },
    {
        id: 'eu-ets',
        title: 'EU ETS Data',
        icon: FaChartLine,
        color: 'linear-gradient(135deg, #ff6600 0%, #ff8533 100%)',
        sheets: [
            { name: 'MRV Voyage Summary', action: 'preview' },
            { name: 'EU ETS Voyage Summary', action: 'preview' },
            { name: 'EU ETS Aggregator', action: 'preview' }
        ]
    },
    {
        id: 'uk-mrv',
        title: 'UK MRV Data',
        icon: FaChartLine,
        color: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
        sheets: [
            { name: 'Basic Data', action: 'preview' },
            { name: 'Voyage Summary', action: 'preview' },
            { name: 'Annual Aggregator', action: 'preview' }
        ]
    },
    {
        id: 'uk-ets',
        title: 'UK ETS Data',
        icon: FaChartLine,
        color: 'linear-gradient(135deg, #ff6600 0%, #ff8533 100%)',
        sheets: [
            { name: 'MRV Voyage Summary', action: 'preview' },
            { name: 'ETS Voyage Summary', action: 'preview' },
            { name: 'ETS Aggregator', action: 'preview' }
        ]
    }
];

const CompliancesDashboardPage = () => {
    // Shared filter states
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    
    // CII states
    const [ciiLoading, setCiiLoading] = useState(false);
    const [ciiData, setCiiData] = useState(null);
    const [ciiAttempted, setCiiAttempted] = useState(false);
    const [ciiCollapsed, setCiiCollapsed] = useState(false);
    
    // EU MRV states
    const [euMrvData, setEuMrvData] = useState(null);
    const [euMrvAttempted, setEuMrvAttempted] = useState(false);
    const [activeEuMrvTab, setActiveEuMrvTab] = useState('daily');
    const [euMrvLoading, setEuMrvLoading] = useState(false);
    const [euMrvCollapsed, setEuMrvCollapsed] = useState(false);
    
    // EU ETS states
    const [euEtsData, setEuEtsData] = useState(null);
    const [euEtsAttempted, setEuEtsAttempted] = useState(false);
    const [activeEuEtsTab, setActiveEuEtsTab] = useState('mrvVoyage');
    const [euEtsLoading, setEuEtsLoading] = useState(false);
    const [euEtsCollapsed, setEuEtsCollapsed] = useState(false);
    
    // UK MRV states
    const [ukMrvData, setUkMrvData] = useState(null);
    const [ukMrvAttempted, setUkMrvAttempted] = useState(false);
    const [activeUkMrvTab, setActiveUkMrvTab] = useState('basicData');
    const [ukMrvLoading, setUkMrvLoading] = useState(false);
    const [ukMrvCollapsed, setUkMrvCollapsed] = useState(false);
    
    // UK ETS states
    const [ukEtsData, setUkEtsData] = useState(null);
    const [ukEtsAttempted, setUkEtsAttempted] = useState(false);
    const [activeUkEtsTab, setActiveUkEtsTab] = useState('mrvVoyage');
    const [ukEtsLoading, setUkEtsLoading] = useState(false);
    const [ukEtsCollapsed, setUkEtsCollapsed] = useState(false);
    
    const loadVesselOptions = useVesselOptions();

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 2009 }, (_, i) => currentYear - i);

    const handleYearChange = (e) => {
        const year = e.target.value;
        setSelectedYear(year);

        if (year) {
            setFromDate(`${year}-01-01`);
            setToDate(`${year}-12-31`);
        } else {
            setFromDate('');
            setToDate('');
        }
    };

    const handleDateChange = () => {
        setSelectedYear('');
    };

    const handleCalculateCii = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        setCiiLoading(true);
        setCiiData(null);
        setCiiAttempted(true);

        try {
            const response = await previewVerifaviaData({
                shipId: selectedVessel.value,
                fromDate,
                toDate,
                year: selectedYear
            });
            if (response.success) {
                setCiiData(response.data.ciiData);
            } else {
                throw new Error(response.error || 'Failed to fetch CII data.');
            }
        } catch (error) {
            alert(`CII Calculation failed: ${error.message}`);
            console.error("CII Calculation failed:", error);
            setCiiData(null);
        } finally {
            setCiiLoading(false);
        }
    };

    const handlePreviewEuMrv = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        setEuMrvLoading(true);
        setEuMrvData(null);
        setEuMrvAttempted(true);
        setActiveEuMrvTab('daily');

        try {
            const response = await previewEuMrvData({
                shipId: selectedVessel.value,
                fromDate,
                toDate,
                year: selectedYear
            });
            if (response.success) {
                setEuMrvData(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch EU MRV data.');
            }
        } catch (error) {
            alert(`EU MRV Preview failed: ${error.message}`);
            console.error("EU MRV Preview failed:", error);
            setEuMrvData(null);
        } finally {
            setEuMrvLoading(false);
        }
    };

    const handleDownloadEuMrv = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        try {
            const blob = await generateEuMrvReport({ shipId: selectedVessel.value, fromDate, toDate });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `EU_MRV_Report_${selectedVessel.value}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(`Download failed: ${error.message}`);
            console.error("Download failed:", error);
        }
    };

    const handlePreviewEuEts = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        setEuEtsLoading(true);
        setEuEtsData(null);
        setEuEtsAttempted(true);
        setActiveEuEtsTab('mrvVoyage');

        try {
            const response = await previewEuEtsData({
                shipId: selectedVessel.value,
                fromDate,
                toDate,
                year: selectedYear
            });
            if (response.success) {
                setEuEtsData(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch EU ETS data.');
            }
        } catch (error) {
            alert(`EU ETS Preview failed: ${error.message}`);
            console.error("EU ETS Preview failed:", error);
            setEuEtsData(null);
        } finally {
            setEuEtsLoading(false);
        }
    };

    const handleDownloadEuEts = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        try {
            const blob = await generateEuEtsReport({ shipId: selectedVessel.value, fromDate, toDate });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `EU_ETS_Report_${selectedVessel.value}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(`Download failed: ${error.message}`);
            console.error("Download failed:", error);
        }
    };

    const handlePreviewUkMrv = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        setUkMrvLoading(true);
        setUkMrvData(null);
        setUkMrvAttempted(true);
        setActiveUkMrvTab('basicData');

        try {
            const response = await previewUkMrvData({
                shipId: selectedVessel.value,
                fromDate,
                toDate,
                year: selectedYear
            });
            if (response.success) {
                setUkMrvData(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch UK MRV data.');
            }
        } catch (error) {
            alert(`UK MRV Preview failed: ${error.message}`);
            console.error("UK MRV Preview failed:", error);
            setUkMrvData(null);
        } finally {
            setUkMrvLoading(false);
        }
    };

    const handleDownloadUkMrv = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        try {
            const blob = await generateUkMrvReport({ shipId: selectedVessel.value, fromDate, toDate });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `UK_MRV_Report_${selectedVessel.value}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(`Download failed: ${error.message}`);
            console.error("Download failed:", error);
        }
    };

    const handlePreviewUkEts = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        setUkEtsLoading(true);
        setUkEtsData(null);
        setUkEtsAttempted(true);
        setActiveUkEtsTab('mrvVoyage');

        try {
            const response = await previewUkEtsData({
                shipId: selectedVessel.value,
                fromDate,
                toDate,
                year: selectedYear
            });
            if (response.success) {
                setUkEtsData(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch UK ETS data.');
            }
        } catch (error) {
            alert(`UK ETS Preview failed: ${error.message}`);
            console.error("UK ETS Preview failed:", error);
            setUkEtsData(null);
        } finally {
            setUkEtsLoading(false);
        }
    };

    const handleDownloadUkEts = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        try {
            const blob = await generateUkEtsReport({ shipId: selectedVessel.value, fromDate, toDate });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `UK_ETS_Report_${selectedVessel.value}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(`Download failed: ${error.message}`);
            console.error("Download failed:", error);
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
            <div style={{ marginTop: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', maxWidth: '80vw', margin: '0 auto' }}>
                {/* Header with Toggle */}
                <div
                    onClick={() => setCiiCollapsed(!ciiCollapsed)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        cursor: 'pointer',
                        borderBottom: !ciiCollapsed ? '1px solid #e5e7eb' : 'none',
                        transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#f9fafb')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        {ciiCollapsed ? <FaChevronDown size={18} /> : <FaChevronUp size={18} />}
                        <span style={{ fontWeight: 600, fontSize: '16px' }}>CII Report Details</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '20px', color: ratingColor }}>
                        {rating || 'N/A'}
                    </span>
                </div>

                {/* Collapsed Content */}
                {!ciiCollapsed && (
                    <div style={{ padding: '16px' }}>
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
                    </div>
                )}
            </div>
        );
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
                                        borderRight: '1px solid #e5e7eb',
                                        maxWidth: '200px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }} title={row[col]}>
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

    const renderEuEtsAggregatorCard = (data) => {
        if (!data || data.length === 0) {
            return <p className="no-data-message">No EU ETS aggregator data available for this period.</p>;
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

    const renderUkAnnualAggregatorCard = (data) => {
        if (!data || data.length === 0) {
            return <p className="no-data-message">No UK MRV annual data available for this period.</p>;
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

    const renderUkEtsAggregatorCard = (data) => {
        if (!data || data.length === 0) {
            return <p className="no-data-message">No UK ETS aggregator data available for this period.</p>;
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

    const handleSheetAction = async (complianceId, sheetName, action) => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        switch (complianceId) {
            case 'cii':
                if (action === 'calculate') {
                    await handleCalculateCii();
                }
                break;
            case 'eu-mrv':
                if (action === 'preview') {
                    await handlePreviewEuMrv();
                } else if (action === 'download') {
                    await handleDownloadEuMrv();
                }
                break;
            case 'eu-ets':
                if (action === 'preview') {
                    await handlePreviewEuEts();
                } else if (action === 'download') {
                    await handleDownloadEuEts();
                }
                break;
            case 'uk-mrv':
                if (action === 'preview') {
                    await handlePreviewUkMrv();
                } else if (action === 'download') {
                    await handleDownloadUkMrv();
                }
                break;
            case 'uk-ets':
                if (action === 'preview') {
                    await handlePreviewUkEts();
                } else if (action === 'download') {
                    await handleDownloadUkEts();
                }
                break;
            default:
                console.warn(`Unknown compliance ID: ${complianceId}`);
        }
    };

    return (
        <div className="compliances-cards-page">
            <div className="content-container">
                <div className="cards-header">
                    <div>
                        <h1 className="page-title">Compliances Dashboard</h1>
                        <p className="page-subtitle">Monitor and generate compliance reports for your vessels</p>
                    </div>
                </div>

                <div className="filters-section">
                    <h3>Filter Compliance Data</h3>
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
                                menuPortalTarget={document.body}
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
                                    handleDateChange();
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
                                    handleDateChange();
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
                    </div>
                </div>

                <div className="cards-container">
                    <div className="cards-grid">
                        {COMPLIANCE_CARDS.map(card => {
                            const IconComponent = card.icon;
                            return (
                                <div key={card.id} className="compliance-card" style={{ background: card.color }}>
                                    <div className="card-header">
                                        <IconComponent className="card-icon" />
                                        <h3 className="card-title">{card.title}</h3>
                                    </div>
                                    <div className="card-content">
                                        <div className="sheets-list">
                                            {card.sheets.map((sheet, index) => (
                                                <div key={index} className="sheet-item">
                                                    <span className="sheet-name">{sheet.name}</span>
                                                <div className="sheet-actions">
                                                    <button
                                                        className="action-btn view-btn"
                                                        onClick={() => handleSheetAction(card.id, sheet.name, sheet.action)}
                                                        disabled={!selectedVessel || !fromDate || !toDate}
                                                        title="Preview data"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button
                                                        className="action-btn download-btn"
                                                        onClick={() => handleSheetAction(card.id, sheet.name, 'download')}
                                                        disabled={!selectedVessel || !fromDate || !toDate}
                                                        title="Download report"
                                                    >
                                                        <FaDownload />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                </div>

                <div className="data-preview-container">
                    <div className="data-preview-section">
                        <h2>Data Preview</h2>

                        {/* CII Preview Section */}
                        {ciiAttempted && (
                        <div className="preview-section" style={{ width: '100%', overflow: 'hidden' }}>
                            <div className="preview-header">
                                <h3>CII Rating Calculator</h3>
                            </div>
                            <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                                {ciiLoading ? (
                                    <p>Loading CII data...</p>
                                ) : (
                                    renderCiiDetails(ciiData)
                                )}
                            </div>
                        </div>
                    )}

                    {/* EU MRV Preview Section */}
                    {euMrvAttempted && (
                        <div className="collapsible-preview-section">
                            <div
                                className="collapsible-header"
                                onClick={() => setEuMrvCollapsed(!euMrvCollapsed)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {euMrvCollapsed ? <FaChevronDown size={18} /> : <FaChevronUp size={18} />}
                                    <h3>EU MRV Data</h3>
                                </div>
                                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                    {euMrvData ? `${euMrvData.dailyReports?.length || 0} records` : 'No data'}
                                </span>
                            </div>
                            {!euMrvCollapsed && (
                                <div className="collapsible-content">
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
                    )}

                    {/* EU ETS Preview Section */}
                    {euEtsAttempted && (
                        <div className="collapsible-preview-section">
                            <div
                                className="collapsible-header"
                                onClick={() => setEuEtsCollapsed(!euEtsCollapsed)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {euEtsCollapsed ? <FaChevronDown size={18} /> : <FaChevronUp size={18} />}
                                    <h3>EU ETS Data</h3>
                                </div>
                                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                    {euEtsData ? `${euEtsData.euEtsMrvVoyageSummary?.length || 0} records` : 'No data'}
                                </span>
                            </div>
                            {!euEtsCollapsed && (
                                <div className="collapsible-content">
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
                                                        className={activeEuEtsTab === 'etsAggregator' ? 'active' : ''}
                                                        onClick={() => setActiveEuEtsTab('etsAggregator')}
                                                    >
                                                        EU ETS Aggregator ({euEtsData.euEtsAggregator?.length || 0})
                                                    </button>
                                                </div>
                                                <div className="tab-content" style={{ width: '100%' }}>
                                                    {activeEuEtsTab === 'mrvVoyage' && renderEuMrvTable(euEtsData.euEtsMrvVoyageSummary)}
                                                    {activeEuEtsTab === 'etsVoyage' && renderEuMrvTable(euEtsData.euEtsVoyageSummary)}
                                                    {activeEuEtsTab === 'etsAggregator' && renderEuEtsAggregatorCard(euEtsData.euEtsAggregator)}
                                                </div>
                                            </>
                                        ) : (
                                            <p className="no-data-message">No EU ETS data available for this selection.</p>
                                        )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* UK MRV Preview Section */}
                    {ukMrvAttempted && (
                        <div className="collapsible-preview-section">
                            <div
                                className="collapsible-header"
                                onClick={() => setUkMrvCollapsed(!ukMrvCollapsed)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {ukMrvCollapsed ? <FaChevronDown size={18} /> : <FaChevronUp size={18} />}
                                    <h3>UK MRV Data</h3>
                                </div>
                                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                    {ukMrvData ? `${ukMrvData.ukMrvBasicData?.length || 0} records` : 'No data'}
                                </span>
                            </div>
                            {!ukMrvCollapsed && (
                                <div className="collapsible-content">
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
                                                        Annual Aggregator ({ukMrvData.ukMrvAnnualAggregator?.length || 0})
                                                    </button>
                                                </div>
                                                <div className="tab-content" style={{ width: '100%' }}>
                                                    {activeUkMrvTab === 'basicData' && renderEuMrvTable(ukMrvData.ukMrvBasicData)}
                                                    {activeUkMrvTab === 'voyageSummary' && renderEuMrvTable(ukMrvData.ukMrvVoyageSummary)}
                                                    {activeUkMrvTab === 'annualAggregator' && renderAnnualAggregatorCard(ukMrvData.ukMrvAnnualAggregator)}
                                                </div>
                                            </>
                                        ) : (
                                            <p className="no-data-message">No UK MRV data available for this selection.</p>
                                        )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* UK ETS Preview Section */}
                    {ukEtsAttempted && (
                        <div className="collapsible-preview-section">
                            <div
                                className="collapsible-header"
                                onClick={() => setUkEtsCollapsed(!ukEtsCollapsed)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {ukEtsCollapsed ? <FaChevronDown size={18} /> : <FaChevronUp size={18} />}
                                    <h3>UK ETS Data</h3>
                                </div>
                                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                    {ukEtsData ? `${ukEtsData.ukEtsMrvVoyageSummary?.length || 0} records` : 'No data'}
                                </span>
                            </div>
                            {!ukEtsCollapsed && (
                                <div className="collapsible-content">
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
                                                    </button>
                                                    <button
                                                        className={activeUkEtsTab === 'etsAggregator' ? 'active' : ''}
                                                        onClick={() => setActiveUkEtsTab('etsAggregator')}
                                                    >
                                                        ETS Aggregator ({ukEtsData.ukEtsAggregator?.length || 0})
                                                    </button>
                                                </div>
                                                <div className="tab-content" style={{ width: '100%' }}>
                                                    {activeUkEtsTab === 'mrvVoyage' && renderEuMrvTable(ukEtsData.ukEtsMrvVoyageSummary)}
                                                    {activeUkEtsTab === 'etsVoyage' && renderEuMrvTable(ukEtsData.ukEtsVoyageSummary)}
                                                    {activeUkEtsTab === 'etsAggregator' && renderUkEtsAggregatorCard(ukEtsData.ukEtsAggregator)}
                                                </div>
                                            </>
                                        ) : (
                                            <p className="no-data-message">No UK ETS data available for this selection.</p>
                                        )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
};

export default CompliancesDashboardPage;
