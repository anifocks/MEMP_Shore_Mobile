import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

const ELECTRIC_MACHINERY_KEYS = ['ELECTRICAL_CONSUMPTION', 'SHAFT_GENERATOR', 'SHORE_POWER'];
const PURPOSE_OPTIONS = ['General Purpose', 'Cargo Activity']; // <<-- NEW: Purpose options

const ElecConsumptionTab = ({
    machineryData, // Filtered machinery data (only electrical types)
    mappedVesselMachinery, // Full list of ALL mapped machinery (for dropdown options)
    handleChildChange,
    handleMachinerySelection, // Passed from parent (AddEditVesselReportPage) to add new records
    removeChildRow, // <<-- ADDED: Function to delete a row
    validationErrors,
    isSubmitted
}) => {
    
    // Helper to find the correct index in the parent's full machineryData array
    // Note: The parent component should ensure 'OriginalIndex' is passed in machineryData
    
    const handlePowerChange = (originalIndex, value) => {
        // Clear Total_Power when Power (KW) or Running_Hrs changes
        handleChildChange(originalIndex, "Total_Power", "", "machineryData");
        handleChildChange(originalIndex, "Power", value, "machineryData");
    };

    const handleRunningHrsChange = (originalIndex, value) => {
        // Clear Total_Power when Power (KW) or Running_Hrs changes
        handleChildChange(originalIndex, "Total_Power", "", "machineryData");
        handleChildChange(originalIndex, "Running_Hrs", value, "machineryData");
    };

    const handleTotalPowerChange = (originalIndex, value) => {
        // Clear Power (KW) and Running_Hrs when Total_Power changes
        handleChildChange(originalIndex, "Power", "", "machineryData");
        handleChildChange(originalIndex, "Running_Hrs", "", "machineryData");
        handleChildChange(originalIndex, "Total_Power", value, "machineryData");
    };

    const handleBlurPowerOrHours = (md, originalIndex) => {
        const power = parseFloat(md.Power);
        const hours = parseFloat(md.Running_Hrs);

        if (!md.Total_Power && !isNaN(power) && power >= 0 && !isNaN(hours) && hours >= 0) {
            const totalPower = (power * hours).toFixed(3);
            
            // Update the calculated Total_Power in the parent state
            handleChildChange(originalIndex, 'Total_Power', parseFloat(totalPower), 'machineryData');
        }
    };
    
    // FIX: Filter the full mapped list to show ONLY available electrical machinery for the dropdown
    const availableElectricalMachinery = useMemo(() => {
        const recordedIds = new Set((machineryData || []).map(md => String(md.ShipMachineryRecordID)));
        
        return (mappedVesselMachinery || []).filter(mach => {
            const isElectrical = mach.MachineryTypeKey && ELECTRIC_MACHINERY_KEYS.includes(mach.MachineryTypeKey);
            const isRecorded = mach.MachineryRecordID && recordedIds.has(String(mach.MachineryRecordID));
            
            // Only show electrical machinery that is not already recorded
            return isElectrical && !isRecorded;
        });
    }, [mappedVesselMachinery, machineryData]);


    if (machineryData.length === 0 && availableElectricalMachinery.length === 0) {
        return (
            <div className="tab-pane">
                <h3>Electrical Consumption Data</h3>
                <p>No electrical machinery is mapped to this vessel. Please contact administration or select machinery to add them to the report.</p>
            </div>
        );
    }
    
    return (
        <div className="tab-pane">
            <h3>Electrical Consumption Data (KWH Calculation)</h3>
            <p className="hint-text">Note: Enter either **Power (KW) and Running Hours** to auto-calculate Total Power, OR enter **Total Power (KWH)** directly.</p>
            
            {/* --- ADD ELECTRICAL MACHINERY DROPDOWN --- */}
            <div className="form-section">
                <div className="form-group full-width">
                    <label htmlFor="selectElecMachinery">Select Electrical Machinery to Add/Edit:</label>
                    <div className="add-item-container">
                        <select
                            id="selectElecMachinery"
                            // Use the handleMachinerySelection passed from the parent
                            onChange={handleMachinerySelection} 
                            value=""
                            disabled={isSubmitted}
                        >
                            <option value="">-- Add Electrical Machinery --</option>
                            {availableElectricalMachinery.map(mach => (
                                <option key={mach.MachineryRecordID} value={mach.MachineryRecordID}>
                                    {mach.CustomMachineryName || mach.MachineryTypeDescription} ({mach.MachineryTypeKey})
                                </option>
                            ))}
                        </select>
                        {validationErrors.machinerySelection && <p className="error-text">{validationErrors.machinerySelection}</p>}
                    </div>
                </div>
            </div>
            {/* --- END ADD ELECTRICAL MACHINERY DROPDOWN --- */}

            <div className="form-section">
                {machineryData.map((md, index) => {
                    const originalIndex = md.OriginalIndex; 
                    
                    const isPowerAndHoursFilled = md.Power && md.Running_Hrs && parseFloat(md.Power) >= 0 && parseFloat(md.Running_Hrs) >= 0;
                    const isTotalPowerEntered = md.Total_Power && parseFloat(md.Total_Power) > 0;
                    
                    const lockPowerAndHours = isTotalPowerEntered;
                    // Total Power input is disabled if Power and Hours are filled 
                    const lockTotalPower = isSubmitted || (isPowerAndHoursFilled && !isTotalPowerEntered); 
                    const isTotalPowerCalculated = isPowerAndHoursFilled && md.Total_Power !== '';

                    const errorKeyPower = `machineryData[${originalIndex}].Power`;
                    const errorKeyHours = `machineryData[${originalIndex}].Running_Hrs`;
                    const errorKeyTotalPower = `machineryData[${originalIndex}].Total_Power`;
                    const errorKeyPurpose = `machineryData[${originalIndex}].ConsumedByDescription`; // <<-- NEW ERROR KEY

                    return (
                        <div key={originalIndex} className="nested-item">
                            <h4>{md.MachineryName} ({md.MachineryTypeKey})</h4>
                            <div className="form-group-row four-col-grid">
                                
                                <div className="form-group">
                                    <label>Power (KW):</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={md.Power || ''}
                                        onChange={(e) => handlePowerChange(originalIndex, parseFloat(e.target.value) || '')}
                                        onBlur={() => handleBlurPowerOrHours(md, originalIndex)}
                                        min="0"
                                        disabled={isSubmitted || lockPowerAndHours}
                                    />
                                    {validationErrors[errorKeyPower] && <p className="error-text">{validationErrors[errorKeyPower]}</p>}
                                </div>
                                
                                <div className="form-group">
                                    <label>Running Hours:</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={md.Running_Hrs || ''}
                                        onChange={(e) => handleRunningHrsChange(originalIndex, parseFloat(e.target.value) || '')}
                                        onBlur={() => handleBlurPowerOrHours(md, originalIndex)}
                                        min="0"
                                        disabled={isSubmitted || lockPowerAndHours}
                                    />
                                    {validationErrors[errorKeyHours] && <p className="error-text">{validationErrors[errorKeyHours]}</p>}
                                </div>

                                <div className="form-group">
                                    <label>Total Power (KWH):</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={md.Total_Power || ''}
                                        onChange={(e) => handleTotalPowerChange(originalIndex, parseFloat(e.target.value) || '')}
                                        min="0"
                                        disabled={lockTotalPower} 
                                        title={isTotalPowerCalculated ? `Calculated (${md.Power} KW * ${md.Running_Hrs} HRS)` : "Enter Total KWH or use Power/Hours fields."}
                                    />
                                    {validationErrors[errorKeyTotalPower] && <p className="error-text">{validationErrors[errorKeyTotalPower]}</p>}
                                </div>

                                <div className="form-group">
                                    <label>Purpose / Consumed By:</label>
                                    <select
                                        value={md.ConsumedByDescription || 'General Purpose'} // Use General Purpose as default selected state
                                        onChange={(e) => handleChildChange(originalIndex, 'ConsumedByDescription', e.target.value, 'machineryData')}
                                        disabled={isSubmitted}
                                    >
                                        {PURPOSE_OPTIONS.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                    {validationErrors[errorKeyPurpose] && <p className="error-text">{validationErrors[errorKeyPurpose]}</p>}
                                </div>
                            </div>
                            
                            {/* --- REMOVE BUTTON --- */}
                            <button
                                type="button"
                                onClick={() => removeChildRow(originalIndex, 'machineryData')}
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

ElecConsumptionTab.propTypes = {
    machineryData: PropTypes.array.isRequired,
    mappedVesselMachinery: PropTypes.array.isRequired,
    handleChildChange: PropTypes.func.isRequired,
    handleMachinerySelection: PropTypes.func.isRequired,
    removeChildRow: PropTypes.func.isRequired, 
    validationErrors: PropTypes.object.isRequired,
    isSubmitted: PropTypes.bool.isRequired,
};

export default ElecConsumptionTab;