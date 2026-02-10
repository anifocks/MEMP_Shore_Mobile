import React from 'react';
import PropTypes from 'prop-types';

const LubeOilManagementTab = ({
    loConsumptionLogs,
    lubeOilTypesWithRob,
    filteredMachineryOptions,
    loBdnData = {}, // CRITICAL FIX: Changed prop name and added default to prevent crash
    loRobValues,
    bdnRobValues, // <<-- ADDED: Prop containing ROB for each BDN number
    handleChildChange,
    addChildRow,
    removeChildRow,
    validationErrors,
    isSubmitted
}) => {
    
    // Default structure for a new LO consumption row
    const newLoConsumptionDefault = { LOTypeKey: '', ConsumedQty: '', ShipMachineryRecordID: null, BDN_Number: '', SpecificMachineryName: null, MachineryTypeKey: null };

    // NEW HELPER: Filter machinery options to exclude those already selected in other rows
    const getAvailableMachineryOptions = (currentIndex, currentMachineryId) => {
        const usedIds = new Set(
            loConsumptionLogs
                .filter((loCon, idx) => idx !== currentIndex) // Exclude the current row
                .map(loCon => String(loCon.ShipMachineryRecordID))
                .filter(Boolean)
        );

        return filteredMachineryOptions.filter(mach => 
            !usedIds.has(String(mach.value)) || String(mach.value) === String(currentMachineryId)
        );
    };

    return (
        <div className="tab-pane">
            <h3>Lube Oil Consumption</h3>
            <div className="form-section">
                {loConsumptionLogs.map((loCon, index) => {
                    
                    const currentLoRob = loRobValues[loCon.LOTypeKey] !== undefined ? `${loRobValues[loCon.LOTypeKey].toFixed(3)} Ltrs` : 'N/A';
                    
                    // CRITICAL FIX: Filter BDN list using the LOTypeKey from the current consumption log and the new loBdnData map
                    const currentBdnList = loCon.LOTypeKey ? (loBdnData[loCon.LOTypeKey] || []) : [];
                    
                    // NEW: Calculate/Look up BDN ROB for display
                    const bdnRobKey = loCon.BDN_Number ? loCon.BDN_Number.trim().toUpperCase() : null;
                    const currentBdnRob = bdnRobValues[bdnRobKey] !== undefined ? `${bdnRobValues[bdnRobKey].toFixed(3)} Ltrs` : 'N/A';

                    const errorKeyLOType = `loConsumptionLogs[${index}].LOTypeKey`;
                    const errorKeyBDN = `loConsumptionLogs[${index}].BDN_Number`;
                    const errorKeyMachinery = `loConsumptionLogs[${index}].ShipMachineryRecordID`;
                    const errorKeyConsumed = `loConsumptionLogs[${index}].ConsumedQty`;

                    // Get the dynamically filtered list for this row
                    const availableMachinery = getAvailableMachineryOptions(index, loCon.ShipMachineryRecordID); 

                    return (
                        <div key={index} className="nested-item">
                            <div className="form-group-row three-col-grid">
                                <div className="form-group">
                                    <label htmlFor={`loTypeKey-${index}`}>Lube Oil Type (ROB &gt; 0):</label>
                                    <select
                                        id={`loTypeKey-${index}`}
                                        value={loCon.LOTypeKey || ''}
                                        onChange={(e) => handleChildChange(index, 'LOTypeKey', e.target.value, 'loConsumptionLogs')}
                                        disabled={isSubmitted}
                                        title={`Current LO ROB: ${currentLoRob}`}
                                    >
                                        <option value="">Select Lube Oil Type</option>
                                        {lubeOilTypesWithRob.map(type => (
                                            <option 
                                                key={type.LubeOilTypeKey} 
                                                value={type.LubeOilTypeKey}
                                                title={`ROB: ${loRobValues[type.LubeOilTypeKey] ? loRobValues[type.LubeOilTypeKey].toFixed(3) : 'N/A'} Ltrs`}
                                            >
                                                {/* Fallback to Key if description is blank */}
                                                {type.LubeOilTypeDescription || type.LubeOilTypeKey}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors[errorKeyLOType] && <p className="error-text">{validationErrors[errorKeyLOType]}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Machinery:</label>
                                    <select
                                        value={loCon.ShipMachineryRecordID || ''}
                                        onChange={(e) => handleChildChange(index, 'ShipMachineryRecordID', e.target.value, 'loConsumptionLogs')}
                                        disabled={isSubmitted}
                                    >
                                        <option value="">Select Machinery</option>
                                        {availableMachinery.length === 0 && <option value="" disabled>No available machinery</option>}
                                        {availableMachinery.map(mach => (
                                            <option key={mach.value} value={mach.value}>
                                                {mach.label}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors[errorKeyMachinery] && <p className="error-text">{validationErrors[errorKeyMachinery]}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Selected Machinery Name:</label>
                                    <input type="text" value={loCon.SpecificMachineryName || ''} readOnly disabled={true} />
                                </div>
                                <div className="form-group">
                                    <label>From BDN:</label>
                                    <select
                                        value={loCon.BDN_Number || ''}
                                        onChange={(e) => handleChildChange(index, 'BDN_Number', e.target.value, 'loConsumptionLogs')}
                                        disabled={isSubmitted}
                                        title="LO BDN is a reference document and does not track live ROB."
                                    >
                                        <option value="">Select BDN Number</option>
                                        {/* CRITICAL FIX: Use the dynamically filtered BDN list */}
                                        {currentBdnList.map(bdn => (
                                            <option key={bdn} value={bdn}>{bdn}</option>
                                        ))}
                                    </select>
                                    {validationErrors[errorKeyBDN] && <p className="error-text">{validationErrors[errorKeyBDN]}</p>}
                                </div>
                                {/* NEW FIELD: Display ROB from BDN */}
                                <div className="form-group">
                                    <label>BDN ROB (Ltrs):</label>
                                    <input
                                        type="text"
                                        value={currentBdnRob}
                                        readOnly
                                        disabled={true}
                                        title="Remaining On Board (ROB) from BDN record"
                                    />
                                </div>
                            </div>
                            <div className="form-group-row three-col-grid">
                                <div className="form-group">
                                    <label>Consumed (Liters):</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={loCon.ConsumedQty || ''}
                                        onChange={(e) => handleChildChange(index, 'ConsumedQty', parseFloat(e.target.value) || '', 'loConsumptionLogs')}
                                        min="0"
                                        disabled={isSubmitted}
                                    />
                                    {validationErrors[errorKeyConsumed] && <p className="error-text">{validationErrors[errorKeyConsumed]}</p>}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeChildRow(index, 'loConsumptionLogs')}
                                className="btn btn-remove"
                                disabled={isSubmitted}
                            >Remove</button>
                        </div>
                    );
                })}
                <button
                    type="button"
                    onClick={() => addChildRow('loConsumptionLogs', newLoConsumptionDefault)}
                    className="btn btn-add"
                    disabled={isSubmitted}
                >Add LO Consumption</button>
            </div>
        </div>
    );
};

LubeOilManagementTab.propTypes = {
    loConsumptionLogs: PropTypes.array.isRequired,
    lubeOilTypesWithRob: PropTypes.array.isRequired,
    filteredMachineryOptions: PropTypes.array.isRequired,
    // CRITICAL FIX: Changed to object and made optional since we set a default in the functional component
    loBdnData: PropTypes.object, 
    loRobValues: PropTypes.object.isRequired,
    bdnRobValues: PropTypes.object.isRequired, // <<-- ADDED TO PROP TYPES
    handleChildChange: PropTypes.func.isRequired,
    addChildRow: PropTypes.func.isRequired,
    removeChildRow: PropTypes.func.isRequired,
    validationErrors: PropTypes.object.isRequired,
    isSubmitted: PropTypes.bool.isRequired,
};

export default LubeOilManagementTab;