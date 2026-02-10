// File: Bunker Modified/Client/src/pages/VesselReportsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './VesselReportsPage.css';
import moment from 'moment-timezone'; 
import { FaEye, FaEdit, FaTrashAlt } from 'react-icons/fa';
import { 
    fetchVessels, 
    fetchReportTypes, 
    fetchPorts, 
    fetchVoyageLegsUnified, 
    fetchVesselReports, 
    deleteVesselReport 
} from '../api';

const VesselReportsPage = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ships, setShips] = useState([]);
    const [seaPorts, setSeaPorts] = useState([]);
    const [voyageLegs, setVoyageLegs] = useState([]);
    const [selectedShipId, setSelectedShipId] = useState('');
    const [selectedVoyageId, setSelectedVoyageId] = useState('');
    const [reportTypeFilter, setReportTypeFilter] = useState('');
    const [reportTypes, setReportTypes] = useState([]);
    const [fromDateFilter, setFromDateFilter] = useState('');
    const [toDateFilter, setToDateFilter] = useState('');
    const [totalReports, setTotalReports] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const reportsPerPage = 10;

    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [shipsData, reportTypesData, seaPortsData] = await Promise.all([
                    fetchVessels(), 
                    fetchReportTypes(), 
                    fetchPorts() 
                ]);
                setShips(shipsData);
                setReportTypes(reportTypesData);
                setSeaPorts(seaPortsData);
                if (shipsData.length > 0) {
                    setSelectedShipId(shipsData[0].ShipID);
                }
            } catch (err) {
                console.error("Error fetching lookups:", err);
                setError(err.message || "Failed to load necessary data for filters.");
            }
        };
        fetchLookups();
    }, []);

    useEffect(() => {
        const fetchVoyagesData = async () => {
            setVoyageLegs([]);
            setSelectedVoyageId('');
            if (!selectedShipId) return;
            try {
                const data = await fetchVoyageLegsUnified(selectedShipId); 
                setVoyageLegs(data); 
            } catch (err) {
                console.error("Error fetching voyage legs:", err);
            }
        };
        fetchVoyagesData();
    }, [selectedShipId]); 

    useEffect(() => {
        const fetchReports = async () => {
            if (!selectedShipId) {
                setReports([]);
                setTotalReports(0);
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const params = {
                    shipId: selectedShipId,
                    reportType: reportTypeFilter,
                    fromDate: fromDateFilter,
                    toDate: toDateFilter,
                    page: currentPage,
                    limit: reportsPerPage,
                    voyageId: selectedVoyageId,
                };
                const responseData = await fetchVesselReports(params);
                setReports(responseData.reports);
                setTotalPages(Math.ceil(responseData.totalCount / reportsPerPage));
                setTotalReports(responseData.totalCount);
            } catch (err) {
                console.error("Error fetching reports:", err);
                setError(err.message || "Failed to load vessel reports.");
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [selectedShipId, currentPage, reportTypeFilter, fromDateFilter, toDateFilter, selectedVoyageId]); 

    const handleApplyFilters = () => {
        setCurrentPage(1);
    };

    const handleNewReportClick = () => {
        if (selectedShipId) {
            navigate(`/app/memp/vessel-reports/create/${selectedShipId}`);
        } else {
            alert("Please select a vessel first.");
        }
    };

    const handleDelete = async (reportId) => {
        if (window.confirm("Are you sure you want to delete this report?")) {
            try {
                await deleteVesselReport(reportId);
                handleApplyFilters();
            } catch (err) {
                console.error("Error deleting report:", err);
                setError(err.message || "Failed to delete report.");
            }
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // ALTERED: Simplified to return database string exactly as is for display
    const formatDateTimeConsistent = (dateString, timezoneString, includeTime = true) => {
        if (!dateString) return 'N/A';
        let cleanedDateString = dateString.split('.')[0];
        if (!includeTime) {
            cleanedDateString = cleanedDateString.split('T')[0].split(' ')[0];
        }
        cleanedDateString = cleanedDateString.replace('T', ' '); 
        // Logic preserved: Returns cleaned database string without timezone conversion
        return cleanedDateString;
    };

    if (loading) return <div className="loading">Loading vessel reports...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="page-container">
            <h2 className="page-title">Vessel Daily Reports</h2>
            <div className="filter-actions-container">
                <div className="filter-controls">
                    <div className="form-group">
                        <label htmlFor="shipSelect">Select Vessel:</label>
                        <select id="shipSelect" value={selectedShipId} onChange={(e) => setSelectedShipId(e.target.value)}>
                            <option value="">-- Select a Vessel --</option>
                            {ships.map(ship => (
                                <option key={ship.ShipID} value={ship.ShipID}>{ship.ShipName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="voyageSelect">Select Voyage:</label>
                        <select id="voyageSelect" value={selectedVoyageId} onChange={(e) => setSelectedVoyageId(e.target.value)} disabled={!selectedShipId}>
                            <option value="">All Voyages</option>
                            {voyageLegs.map(voyage => (
                                <option key={voyage.VoyageID} value={voyage.VoyageID}>
                                    {voyage.VoyageNumber} ({voyage.DeparturePortCode} to {voyage.ArrivalPortCode})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="reportTypeFilter">Report Type:</label>
                        <select id="reportTypeFilter" value={reportTypeFilter} onChange={(e) => setReportTypeFilter(e.target.value)}>
                            <option value="">All Types</option>
                            {reportTypes.map(type => (
                                <option key={type.ReportTypeKey} value={type.ReportTypeKey}>{type.ReportTypeName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="fromDateFilter">From Date:</label>
                        <input type="date" id="fromDateFilter" value={fromDateFilter} onChange={(e) => setFromDateFilter(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="toDateFilter">To Date:</label>
                        <input type="date" id="toDateFilter" value={toDateFilter} onChange={(e) => setToDateFilter(e.target.value)} />
                    </div>
                </div>
                <button onClick={handleApplyFilters} className="apply-filters-btn">Apply Filters</button>
                {/* <button className="add-report-btn" onClick={handleNewReportClick}>Add New Report</button> */}
            </div>
            <div className="content-card">
                {reports.length > 0 ? (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Report ID</th>
                                    <th>Vessel</th>
                                    <th>Report Type</th>
                                    <th>Report Date/Time (Local)</th>
                                    <th>Voyage No</th>
                                    <th>From Port</th>
                                    <th>To Port</th>
                                    <th>Current Port</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map(report => (
                                    <tr key={report.ReportID}>
                                        <td>{report.ReportID}</td>
                                        <td>{ships.find(ship => ship.ShipID === report.ShipID)?.ShipName || 'N/A'}</td>
                                        <td>{reportTypes.find(type => type.ReportTypeKey === report.ReportTypeKey)?.ReportTypeName || report.ReportTypeKey}</td>
                                        <td>{formatDateTimeConsistent(report.ReportDateTimeLocal, report.TimeZoneAtPort)}</td>
                                        <td>{report.VoyageNumber || 'N/A'}</td>
                                        <td>{seaPorts.find(port => port.PortCode === report.DeparturePortCode)?.PortName || report.DeparturePortCode || 'N/A'}</td>
                                        <td>{seaPorts.find(port => port.PortCode === report.ArrivalPortCode)?.PortName || report.ArrivalPortCode || 'N/A'}</td>
                                        <td>{seaPorts.find(port => port.PortCode === report.CurrentPortCode)?.PortName || report.CurrentPortCode || 'N/A'}</td>
                                        <td>{report.ReportStatus}</td>
                                        <td>
                                            <div className="action-icons">
                                                <Link to={`/app/memp/vessel-reports/details/${report.ReportID}`} title="View Details" className="action-icon">
                                                    <FaEye />
                                                </Link>
                                                {/* <Link to={`/app/memp/vessel-reports/edit/${report.ReportID}`} title="Edit Report" className="action-icon">
                                                    <FaEdit />
                                                </Link>
                                                <button onClick={() => handleDelete(report.ReportID)} title="Delete Report" className="action-icon delete-icon">
                                                    <FaTrashAlt />
                                                </button> */}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="no-reports">No reports found for the selected vessel or filters.</div>
                )}
                {totalReports > reportsPerPage && (
                    <div className="pagination">
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="btn btn-secondary">Previous</button>
                        <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="btn btn-secondary">Next</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VesselReportsPage;