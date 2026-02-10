// File: Client/src/components/ReportHeader.jsx

import React from 'react';
import SearchableDropdown from '../components/SearchableDropdown/SearchableDropdown';
import { getCleanValue } from '../utils/reportHelpers';

const ReportHeader = ({
    report, vessels, availableReportTypes, formattedTimezones, parentVoyageOptions, 
    voyageLegOptions, selectedParentVoyageId, selectedVoyageLegId, fromPortName, 
    toPortName, calculatedDurationHours, validationErrors, isHeaderDisabled, 
    isVoyageIdDisabled, isEditMode, editHeaderEnabled, setEditHeaderEnabled,
    handleMasterChange, handleParentVoyageSelection, handleVoyageLegSelection
}) => {

    const isSubmitted = report.master.ReportStatus === 'Submitted';

    return (
        <div className="fixed-header-section form-section">
            <h3>Report Overview
                {report.master.ReportID && !isSubmitted && (
                    <button
                        type="button"
                        className="btn-toggle-edit-header"
                        onClick={() => setEditHeaderEnabled(!editHeaderEnabled)}
                        style={{ marginLeft: '10px', padding: '5px 10px', fontSize: '0.8em' }}
                    >
                        {editHeaderEnabled ? 'Disable Header Edit' : 'Enable Header Edit'}
                    </button>
                )}
            </h3>
            <p style={{ marginTop: '5px' }}>Current Report Status: <strong>{getCleanValue(report.master.ReportStatus)}</strong></p>

            <div className="form-group-row four-col-grid">
                <div className="form-group">
                    <label>Vessel:</label>
                    <input type="text" value={vessels.find(v => v.ShipID === report.master.ShipID)?.ShipName || 'N/A'} disabled />
                </div>
                <div className="form-group">
                    <label htmlFor="reportTypeKey">Report Type:</label>
                    <select
                        id="reportTypeKey"
                        name="ReportTypeKey"
                        value={report.master.ReportTypeKey}
                        onChange={(e) => handleMasterChange(e, 'master')}
                        required
                        disabled={isHeaderDisabled}
                    >
                        <option value="">Select Report Type</option>
                        {availableReportTypes.map(type => (
                            <option key={type.ReportTypeKey} value={type.ReportTypeKey}>{type.ReportTypeName}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="reportDateTimeLocal">Report Date/Time (Local):</label>
                    <input
                        type="datetime-local"
                        id="reportDateTimeLocal"
                        name="ReportDateTimeLocal"
                        value={report.master.ReportDateTimeLocal}
                        onChange={(e) => handleMasterChange(e, 'master')}
                        required
                        disabled={isHeaderDisabled}
                    />
                     {validationErrors.ReportDateTimeLocal && <p className="error-text">{validationErrors.ReportDateTimeLocal}</p>}
                </div>
                <div className="form-group">
                    <SearchableDropdown
                        label="Time Zone"
                        htmlFor="timeZoneAtPort"
                        options={formattedTimezones}
                        value={report.master.TimeZoneAtPort}
                        onChange={(value) => handleMasterChange({ target: { name: 'TimeZoneAtPort', value: value } }, 'master')}
                        placeholder="Search or select timezone"
                        required
                        disabled={isHeaderDisabled}
                    />
                </div>
            </div>
            
            {/* Two-Tier Voyage Selection */}
            <div className="form-group-row four-col-grid">
                {/* Dropdown 1: Parent Voyage */}
                <div className="form-group">
                    <label htmlFor="parentVoyageId">Voyage Number (Parent):</label>
                    <select
                        id="parentVoyageId"
                        name="ParentVoyageID"
                        value={selectedParentVoyageId || ''}
                        onChange={handleParentVoyageSelection}
                        required
                        disabled={isVoyageIdDisabled}
                    >
                        <option value="">Select Parent Voyage</option>
                        {parentVoyageOptions.map(item => (
                            <option 
                                key={item.value} 
                                value={item.value} 
                                title={item.tooltip}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>
                     {validationErrors['master.VoyageID'] && !selectedParentVoyageId && <p className="error-text">{validationErrors['master.VoyageID']}</p>}
                </div>
                
                {/* Dropdown 2: Voyage Leg */}
                <div className="form-group">
                    <label htmlFor="voyageLegId">Voyage Leg:</label>
                    <select
                        id="voyageLegId"
                        name="VoyageLegID"
                        value={selectedVoyageLegId || ''}
                        onChange={handleVoyageLegSelection}
                        required={false}
                        disabled={isVoyageIdDisabled || parentVoyageOptions.length === 0}
                    >
                        <option value="">{voyageLegOptions.length > 0 ? 'Select Leg (Optional)' : 'No Legs Available'}</option>
                        {voyageLegOptions.map(item => (
                            <option 
                                key={item.value} 
                                value={item.value} 
                                title={item.tooltip}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>From Port (Leg):</label>
                    <input type="text" value={fromPortName} disabled />
                </div>
                <div className="form-group">
                    <label>To Port (Leg):</label>
                    <input type="text" value={toPortName} disabled />
                </div>
            </div>

            <div className="form-group-row">
                <div className="form-group" style={{ flexBasis: '48%', minWidth: 'unset' }}>
                    <label>Calculated Duration (HRS):</label>
                    <input type="text" value={calculatedDurationHours} readOnly title="Calculated from Report Date/Time differences" />
                     {validationErrors.CalculatedDurationHrs && <p className="error-text">{validationErrors.CalculatedDurationHrs}</p>}
                </div>
            </div>
            {validationErrors.PrecedingReportStatus && <div className="form-group-row"><div className="form-group full-width"><p className="error-text">{validationErrors.PrecedingReportStatus}</p></div></div>}
        </div>
    );
};

export default ReportHeader;