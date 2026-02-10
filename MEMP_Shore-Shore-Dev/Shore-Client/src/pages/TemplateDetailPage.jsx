// client/src/pages/TemplateDetailPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AsyncSelect from 'react-select/async'; // Assuming fetchVessels is in your api.js
import { FaSpinner, FaDownload, FaShip, FaGasPump, FaCheckCircle, FaTachometerAlt } from 'react-icons/fa';
import { generateVerifaviaReport, previewVerifaviaData } from '../api';
import { useVesselOptions } from '../hooks/useVesselOptions';
import CiiReportPreview from '../components/MEMP/CiiReportPreview';
import './TemplateDetailPage.css';

// Styles for react-select, similar to VoyageManagementPage
const customSelectStyles = {
    control: (provided) => ({
        ...provided,
        borderColor: '#ccc',
    }),
    menu: (provided) => ({
        ...provided,
        zIndex: 9999,
    }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
};

const TemplateDetailPage = () => {
    const { templateName } = useParams();
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState('');
    const [previewData, setPreviewData] = useState(null);
    const [activePreviewTab, setActivePreviewTab] = useState('imoData');

    const imoTableWrapperRef = useRef(null);
    const mrvTableWrapperRef = useRef(null);
    const imoFakeScrollbarRef = useRef(null);
    const mrvFakeScrollbarRef = useRef(null);

    // Generate a list of years for the dropdown
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 2009 }, (_, i) => currentYear - i);

    // Handler for when a year is selected from the dropdown
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

    const useSyncScroll = (realScrollRef, fakeScrollRef) => {
        useEffect(() => {
            const realEl = realScrollRef.current;
            const fakeEl = fakeScrollRef.current;

            if (!realEl || !fakeEl) return;

            const innerContent = fakeEl.querySelector('.fake-scrollbar-content');
            if (!innerContent) return;

            const updateWidth = () => {
                if (realEl.scrollWidth > realEl.clientWidth) {
                    innerContent.style.width = `${realEl.scrollWidth}px`;
                    fakeEl.style.display = 'block';
                } else {
                    fakeEl.style.display = 'none';
                }
            };

            let isSyncing = false;
            const syncRealToFake = () => {
                if (isSyncing) return;
                isSyncing = true;
                fakeEl.scrollLeft = realEl.scrollLeft;
                requestAnimationFrame(() => { isSyncing = false; });
            };

            const syncFakeToReal = () => {
                if (isSyncing) return;
                isSyncing = true;
                realEl.scrollLeft = fakeEl.scrollLeft;
                requestAnimationFrame(() => { isSyncing = false; });
            };

            updateWidth();
            realEl.addEventListener('scroll', syncRealToFake);
            fakeEl.addEventListener('scroll', syncFakeToReal);

            const resizeObserver = new ResizeObserver(updateWidth);
            resizeObserver.observe(realEl);

            return () => {
                realEl.removeEventListener('scroll', syncRealToFake);
                fakeEl.removeEventListener('scroll', syncFakeToReal);
                resizeObserver.disconnect();
            };
        }, [realScrollRef, fakeScrollRef, previewData]);
    };

    useSyncScroll(imoTableWrapperRef, imoFakeScrollbarRef);
    useSyncScroll(mrvTableWrapperRef, mrvFakeScrollbarRef);

    const loadVesselOptions = useVesselOptions();

    const handlePreview = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Please select a vessel and both a "From" and "To" date.');
            return;
        }

        if (templateName !== 'Verifavia') {
            alert(`Report generation for ${templateName} is not yet implemented.`);
            return;
        }

        setIsLoading(true);
        setPreviewData(null); // Clear previous preview

        try {
            const response = await previewVerifaviaData({ shipId: selectedVessel.value, fromDate, toDate });
            if (response.success) {
                setPreviewData(response.data);
                if (response.data.ciiData) {
                    setActivePreviewTab('ciiRating'); // Default to new CII tab if data exists
                } else {
                    setActivePreviewTab('imoData');
                }
            } else {
                throw new Error(response.error || 'Failed to fetch preview data.');
            }
        } catch (error) {
            alert(`Preview Failed: ${error.message}`);
            console.error("Report preview failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!selectedVessel || !fromDate || !toDate) {
            alert('Parameters are missing. Please search for data again.');
            return;
        }

        try {
            const reportBlob = await generateVerifaviaReport({ shipId: selectedVessel.value, fromDate, toDate });
            const url = window.URL.createObjectURL(new Blob([reportBlob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Verifavia_Report_${selectedVessel.label}_${fromDate}_to_${toDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            alert(`Verifavia report for ${selectedVessel.label} downloaded successfully!`);
        } catch (error) {
            alert(`Download Failed: ${error.message}`);
            console.error("Report download failed:", error);
        }
    };

    const renderPreviewTable = (title, data, tableWrapperRef, fakeScrollbarRef) => {
        if (!data || data.length === 0) {
            return <p>No data available for {title}.</p>;
        }
        const headers = Object.keys(data[0]);
        return (
            <div className="preview-table-container">
                <h3>{title}</h3>
                <div className="table-wrapper" ref={tableWrapperRef}>
                    <table className="preview-table">
                        <thead>
                            <tr>
                                {headers.map(header => <th key={header}>{header}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, index) => (
                                <tr key={index}>
                                    {headers.map(header => <td key={header}>{String(row[header])}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="fake-scrollbar-container" ref={fakeScrollbarRef}>
                    <div className="fake-scrollbar-content"></div>
                </div>
            </div>
        );
    };

    const renderCiiDetailCard = (ciiData) => {
        if (!ciiData) {
            return <p>No CII data available for this selection.</p>;
        }

        // Map the keys to more readable labels
        const labelMap = Object.fromEntries(
            Object.keys(ciiData).map(key => [key, key.replace(/_/g, ' ')])
        );

        return (
            <div className="cii-detail-card">
                {Object.entries(ciiData).map(([key, value]) => (
                    <div className="detail-item" key={key}>
                        <span className="detail-label">{labelMap[key]}</span>
                        <span className="detail-value">{String(value)}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="template-detail-container full-width">
            <div className="template-detail-header">
                <Link to="/app/memp/templates" className="back-link">&larr; Back to Templates</Link>
                <h1>{templateName} Report</h1>
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
                <button onClick={handlePreview} className="search-button" disabled={isLoading}>
                    {isLoading ? (
                        <><FaSpinner className="spinner-icon" /> Previewing...</>
                    ) : (
                        'Preview Data'
                    )}
                </button>
            </div>

            {previewData && (
                <div className="preview-section">
                    <div className="preview-header">
                        <div className="preview-tabs">
                            {previewData.ciiData && (
                                <button
                                    className={`tab-button ${activePreviewTab === 'ciiRating' ? 'active' : ''}`}
                                    onClick={() => setActivePreviewTab('ciiRating')}
                                >
                                    CII RATING
                                </button>
                            )}
                            <button
                                className={`tab-button ${activePreviewTab === 'imoData' ? 'active' : ''}`}
                                onClick={() => setActivePreviewTab('imoData')}
                            >
                                IMO DATA
                            </button>
                            <button
                                className={`tab-button ${activePreviewTab === 'mrvData' ? 'active' : ''}`}
                                onClick={() => setActivePreviewTab('mrvData')}
                            >
                                MRV DATA
                            </button>
                            <button onClick={handleDownload} className="download-button" title="Download as Excel">
                                <FaDownload /> Download
                            </button>
                        </div>
                    </div>
                    {activePreviewTab === 'ciiRating' && renderCiiDetailCard(previewData.ciiData)}
                    {activePreviewTab === 'imoData' && renderPreviewTable('IMO DATA', previewData.imoData, imoTableWrapperRef, imoFakeScrollbarRef)}
                    {activePreviewTab === 'mrvData' && renderPreviewTable('MRV DATA', previewData.mrvData, mrvTableWrapperRef, mrvFakeScrollbarRef)}
                </div>
            )}
        </div>
    );
};

export default TemplateDetailPage;