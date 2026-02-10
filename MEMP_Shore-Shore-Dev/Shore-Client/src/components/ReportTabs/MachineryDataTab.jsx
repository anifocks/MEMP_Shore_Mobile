import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

// Define the keys for electrical machinery to be EXCLUDED from this tab
const ELECTRIC_MACHINERY_KEYS = ['ELECTRICAL_CONSUMPTION', 'SHAFT_GENERATOR', 'SHORE_POWER'];

const MachineryDataTab = ({ 
    machineryData, 
    mappedVesselMachinery, 
    machineryTypes, 
    loadingMappedMachinery, 
    handleChildChange, 
    removeChildRow, 
    handleMachinerySelection, // This handler is still passed from the parent to be available
    validationErrors, 
    isSubmitted 
}) => {
    
    // Filter the full vessel machinery list to show ONLY available non-electrical machinery
    const availableNonElectricalMachinery = useMemo(() => {
        // IDs of machinery already added to the report
        const recordedIds = new Set((machineryData || []).map(md => String(md.ShipMachineryRecordID)));
        
        // Return only mapped machinery that is NOT already recorded AND is NOT electrical.
        return (mappedVesselMachinery || []).filter(mach => {
            const isElectrical = mach.MachineryTypeKey && ELECTRIC_MACHINERY_KEYS.includes(mach.MachineryTypeKey);
            const isRecorded = mach.MachineryRecordID && recordedIds.has(String(mach.MachineryRecordID));
            
            return !isElectrical && !isRecorded;
        });
    }, [mappedVesselMachinery, machineryData]);


    return (
        <div className="tab-pane">
            <h3>Machinery Data (Non-Electrical)</h3> 
            <div className="form-section">
                
                {/* --- ADD MACHINERY DROPDOWN (ONLY NON-ELECTRICAL) --- */}
                <div className="form-group full-width">
                    <label htmlFor="selectMachinery">Select Non-Electrical Machinery to Add/Edit:</label>
                    <div className="add-item-container">
                        <select
                            id="selectMachinery"
                            onChange={handleMachinerySelection}
                            value=""
                            disabled={isSubmitted || loadingMappedMachinery}
                        >
                            <option value="">-- Add Machinery --</option>
                            {loadingMappedMachinery && <option value="" disabled>Loading machinery...</option>}
                            {!loadingMappedMachinery && availableNonElectricalMachinery.length === 0 && <option value="" disabled>No available non-electrical machinery</option>}
                            {!loadingMappedMachinery && availableNonElectricalMachinery.length > 0 && availableNonElectricalMachinery.map(mach => (
                                <option key={mach.MachineryRecordID} value={mach.MachineryRecordID}>
                                    {mach.CustomMachineryName || mach.MachineryTypeDescription} ({mach.MachineryTypeKey})
                                </option>
                            ))}
                        </select>
                        {validationErrors.machinerySelection && <p className="error-text">{validationErrors.machinerySelection}</p>}
                    </div>
                </div>

                {/* --- DISPLAY FILTERED NON-ELECTRICAL MACHINERY --- */}
                
                {machineryData.length === 0 && !loadingMappedMachinery && (
                    <p className="no-data-message">No non-electrical machinery selected yet or tracked in this tab.</p>
                )}
                {loadingMappedMachinery && <p className="loading-message">Loading machinery data...</p>}

                {machineryData.filter(md => md.MachineryTypeKey && !ELECTRIC_MACHINERY_KEYS.includes(md.MachineryTypeKey)).map((md, index) => {
                    // FIX: Added || [] to prevent 'find' error if machineryTypes is undefined
                    const machType = (machineryTypes || []).find(type => type.MachineryTypeKey === md.MachineryTypeKey); 
                    const isEngine = (md.MachineryName && (md.MachineryName.toUpperCase().startsWith('AE') || md.MachineryName.toUpperCase().startsWith('ME'))) ||
                        (machType?.Description && (machType.Description.includes('Auxiliary Engine') || machType.Description.includes('Main Engine')));

                    const errorKeyRunningHrs = `machineryData[${index}].Running_Hrs`;
                    const errorKeyPower = `machineryData[${index}].Power`;
                    const errorKeyRPM = `machineryData[${index}].RPM`;

                    return (
                        <div key={md.ShipMachineryRecordID || index} className="nested-item four-col-grid">
                            <h4>{md.MachineryName || 'Unknown Machinery'}</h4>
                            <div className="form-group">
                                <label>Running Hours (Mandatory):</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={md.Running_Hrs || ''} // FIX: Use || '' for empty string rendering
                                    onChange={(e) => handleChildChange(index, 'Running_Hrs', e.target.value, 'machineryData')}
                                    required
                                    min="0"
                                    disabled={isSubmitted}
                                />
                                {validationErrors[errorKeyRunningHrs] && <p className="error-text">{validationErrors[errorKeyRunningHrs]}</p>}
                            </div>
                            <div className="form-group">
                                <label>Power Output (KW){isEngine ? ' (Mandatory)' : ''}:</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={md.Power || ''} // FIX: Use || '' for empty string rendering
                                    onChange={(e) => handleChildChange(index, 'Power', e.target.value, 'machineryData')}
                                    required={isEngine}
                                    disabled={!isEngine || isSubmitted}
                                    min="0"
                                />
                                {validationErrors[errorKeyPower] && <p className="error-text">{validationErrors[errorKeyPower]}</p>}
                            </div>
                            <div className="form-group">
                                <label>RPM{isEngine ? ' (Mandatory)' : ''}:</label>
                                <input
                                    type="number"
                                    step="1"
                                    value={md.RPM || ''} // FIX: Use || '' for empty string rendering
                                    onChange={(e) => handleChildChange(index, 'RPM', e.target.value, 'machineryData')}
                                    required={isEngine}
                                    disabled={!isEngine || isSubmitted}
                                    min="0"
                                />
                                {validationErrors[errorKeyRPM] && <p className="error-text">{validationErrors[errorKeyRPM]}</p>}
                            </div>
                            <div className="form-group full-width">
                                <label>Remarks:</label>
                                <textarea
                                    value={md.Remarks || ''}
                                    onChange={(e) => handleChildChange(index, 'Remarks', e.target.value, 'machineryData')}
                                    disabled={isSubmitted}
                                ></textarea>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeChildRow(index, 'machineryData')}
                                className="btn btn-remove"
                                disabled={isSubmitted}
                            >Remove</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

MachineryDataTab.propTypes = {
    machineryData: PropTypes.array.isRequired,
    mappedVesselMachinery: PropTypes.array.isRequired,
    machineryTypes: PropTypes.array.isRequired,
    loadingMappedMachinery: PropTypes.bool.isRequired,
    handleChildChange: PropTypes.func.isRequired,
    removeChildRow: PropTypes.func.isRequired,
    handleMachinerySelection: PropTypes.func.isRequired,
    validationErrors: PropTypes.object.isRequired,
    isSubmitted: PropTypes.bool.isRequired,
};

export default MachineryDataTab;