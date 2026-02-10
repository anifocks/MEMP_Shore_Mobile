// File: Client/src/components/ReportTabs/PositionalActivityTab.jsx

import React from 'react';
import SearchableDropdown from '../SearchableDropdown/SearchableDropdown';

const PositionalActivityTab = ({
    report, formattedVesselActivities, validationErrors, isSubmitted, handleMasterChange, shipPitch
}) => (
    <div className="tab-pane">
        <div className="form-section four-col-grid">
            <div className="form-group">
                <label htmlFor="latitude">{'Latitude (0.59 to 90.59):'}</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <input
                        type="text"
                        id="latitude"
                        name="Latitude"
                        value={report.positional.Latitude}
                        onChange={(e) => handleMasterChange(e, 'positional')}
                        step="0.01"
                        placeholder="e.g., 34.59"
                        disabled={isSubmitted}
                    />
                    <select
                        name="LatitudeDirection"
                        value={report.positional.LatitudeDirection}
                        onChange={(e) => handleMasterChange(e, 'positional')}
                        disabled={isSubmitted}
                        >
                        <option value="N">N</option>
                        <option value="S">S</option>
                    </select>
                </div>
                {validationErrors['positional.Latitude'] && <p className="error-text">{validationErrors['positional.Latitude']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="longitude">{'Longitude (0.59 to 180.59):'}</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <>
                        <input
                            type="text"
                            id="longitude"
                            name="Longitude"
                            value={report.positional.Longitude}
                            onChange={(e) => handleMasterChange(e, 'positional')}
                            step="0.01"
                            placeholder="e.g., 118.59"
                            disabled={isSubmitted}
                        />
                        <select
                            name="LongitudeDirection"
                            value={report.positional.LongitudeDirection}
                            onChange={(e) => handleMasterChange(e, 'positional')}
                            disabled={isSubmitted}
                            >
                        <option value="E">E</option>
                        <option value="W">W</option>
                    </select>
                    </>
                </div>
                 {validationErrors['positional.Longitude'] && <p className="error-text">{validationErrors['positional.Longitude']}</p>}
            </div>
            <div className="form-group">
                <SearchableDropdown
                    label="Vessel Activity"
                    htmlFor="vesselActivity"
                    options={formattedVesselActivities}
                    value={report.positional.VesselActivity}
                    onChange={(value) => handleMasterChange({ target: { name: 'VesselActivity', value: value } }, 'positional')}
                    placeholder="Search or select activity"
                    disabled={isSubmitted}
                />
            </div>
            <div className="form-group">
                <label htmlFor="courseDEG">Course (DEG):</label>
                <input
                    type="number"
                    step="0.01"
                    id="courseDEG"
                    name="CourseDEG"
                    value={report.positional.CourseDEG}
                    onChange={(e) => handleMasterChange(e, 'positional')}
                    min="0"
                    disabled={isSubmitted}
                />
                {validationErrors['positional.CourseDEG'] && <p className="error-text">{validationErrors['positional.CourseDEG']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="speedKnots">Speed (Knots) (&lt; 20):</label>
                <input
                    type="number"
                    step="0.01"
                    id="speedKnots"
                    name="SpeedKnots"
                    value={report.positional.SpeedKnots}
                    onChange={(e) => handleMasterChange(e, 'positional')}
                    min="0"
                    max="19.99"
                    disabled={isSubmitted}
                />
                {validationErrors['positional.SpeedKnots'] && <p className="error-text">{validationErrors['positional.SpeedKnots']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="distanceSinceLastReportNM">Distance Since Last Report (NM):</label>
                <input
                    type="number"
                    step="0.001"
                    id="distanceSinceLastReportNM"
                    name="DistanceSinceLastReportNM"
                    value={report.positional.DistanceSinceLastReportNM}
                    onChange={(e) => handleMasterChange(e, 'positional')}
                    min="0"
                    disabled={isSubmitted}
                />
                {validationErrors['positional.DistanceSinceLastReportNM'] && <p className="error-text">{validationErrors['positional.DistanceSinceLastReportNM']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="engineDistanceNM">Engine Distance (NM) (Calculated):</label>
                <input
                    type="text"
                    id="engineDistanceNM"
                    name="EngineDistanceNM"
                    value={report.positional.EngineDistanceNM} 
                    readOnly
                    disabled
                    title={`Calculated: (Pitch (${shipPitch || 'N/A'}) * RPM * Running_Hrs * 60) / 1852`}
                />
                {validationErrors['positional.EngineDistanceNM'] && <p className="error-text">{validationErrors['positional.EngineDistanceNM']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="distanceToGoNM">Distance To Go (NM):</label>
                <input
                    type="number"
                    step="0.001"
                    id="distanceToGoNM"
                    name="DistanceToGoNM"
                    value={report.positional.DistanceToGoNM}
                    onChange={(e) => handleMasterChange(e, 'positional')}
                    min="0"
                    disabled={isSubmitted}
                    title="Manual entry (Planned Distance from voyage)"
                />
                {validationErrors['positional.DistanceToGoNM'] && <p className="error-text">{validationErrors['positional.DistanceToGoNM']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="slipPercent">Slip Percent (Calculated):</label>
                <input
                    type="text"
                    id="slipPercent"
                    name="SlipPercent"
                    value={report.positional.SlipPercent} 
                    readOnly
                    title="Calculated: (Engine Distance - Dist Since Last Report) * 100 / Engine Distance"
                    disabled
                />
                 {validationErrors['positional.SlipPercent'] && <p className="error-text">{validationErrors['positional.SlipPercent']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="steamingHoursPeriod">Steaming Hours Period (&lt; 26):</label>
                <input
                    type="number"
                    step="0.01"
                    id="steamingHoursPeriod"
                    name="SteamingHoursPeriod"
                    value={report.positional.SteamingHoursPeriod}
                    onChange={(e) => handleMasterChange(e, 'positional')}
                    min="0"
                    max="25.99"
                    disabled={isSubmitted}
                />
                {validationErrors['positional.SteamingHoursPeriod'] && <p className="error-text">{validationErrors['positional.SteamingHoursPeriod']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="timeAtAnchorageHRS">Time At Anchorage (HRS) (&lt; 26):</label>
                <input
                    type="number"
                    step="0.01"
                    id="timeAtAnchorageHRS"
                    name="TimeAtAnchorageHRS"
                    value={report.positional.TimeAtAnchorageHRS}
                    onChange={(e) => handleMasterChange(e, 'positional')}
                    min="0"
                    max="25.99"
                    disabled={isSubmitted}
                />
                {validationErrors['positional.TimeAtAnchorageHRS'] && <p className="error-text">{validationErrors['positional.TimeAtAnchorageHRS']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="timeAtDriftingHRS">Time At Drifting (HRS) (&lt; 26):</label>
                <input
                    type="number"
                    step="0.01"
                    id="timeAtDriftingHRS"
                    name="TimeAtDriftingHRS"
                    value={report.positional.TimeAtDriftingHRS}
                    onChange={(e) => handleMasterChange(e, 'positional')}
                    min="0"
                    max="25.99"
                    disabled={isSubmitted}
                />
                {validationErrors['positional.TimeAtDriftingHRS'] && <p className="error-text">{validationErrors['positional.TimeAtDriftingHRS']}</p>}
            </div>
        </div>
        
        {/* Draft & Trim Fields */}
        <div className="form-section four-col-grid" style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
            <div className="form-group">
                <label htmlFor="fwdDraft">{'Draft Fwd (M):'}</label>
                <input
                    type="number"
                    step="0.01"
                    id="fwdDraft"
                    name="FwdDraft"
                    value={report.positional.FwdDraft}
                    onChange={(e) => handleMasterChange(e, 'positional')}
                    min="0"
                    disabled={isSubmitted}
                />
                {validationErrors['positional.FwdDraft'] && <p className="error-text">{validationErrors['positional.FwdDraft']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="aftDraft">{'Draft Aft (M):'}</label>
                <input
                    type="number"
                    step="0.01"
                    id="aftDraft"
                    name="AftDraft"
                    value={report.positional.AftDraft}
                    onChange={(e) => handleMasterChange(e, 'positional')}
                    min="0"
                    disabled={isSubmitted}
                />
                {validationErrors['positional.AftDraft'] && <p className="error-text">{validationErrors['positional.AftDraft']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="trim">{'Trim (M) (Calculated: Aft - Fwd):'}</label>
                <input
                    type="text"
                    id="trim"
                    name="Trim"
                    value={report.positional.Trim}
                    readOnly
                    disabled
                />
                {validationErrors['positional.Trim'] && <p className="error-text">{validationErrors['positional.Trim']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="midDraft">{'Mid Draft (M) (Calculated: (Aft + Fwd) / 2):'}</label>
                <input
                    type="text"
                    id="midDraft"
                    name="MidDraft"
                    value={report.positional.MidDraft}
                    readOnly
                    disabled
                />
                {validationErrors['positional.MidDraft'] && <p className="error-text">{validationErrors['positional.MidDraft']}</p>}
            </div>
        </div>
    </div>
);

export default PositionalActivityTab;