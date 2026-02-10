import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

// --- NEW CONSTANT: Dynamic options for Consumed By Description ---
const CONSUMED_BY_OPTIONS = {
    // These keys must match the MachineryTypeKey from the DB table you provided
    'MAIN_ENGINE': ['General Purpose', 'Propulsion', 'Maneuvering', 'Shifting of Anchorage', 'Ice Navigation'],
    'DIESEL_GENERATOR': ['General Purpose', 'Cargo Handling – Discharging / Loading', 'Reliquefaction / Boil-off Recovery', 'Cranes Operation', 'Pumps Operation'],
    'AUX_BOILER': ['General Purpose', 'Cargo heating', 'Steam-assisted cargo discharge', 'Fuel Heating'],
    'BOW_THRUSTER': ['Maneuvering', 'General Purpose'],
    'FW_GENERATOR': ['Water Production', 'General Purpose'],
    'INCINERATOR': ['General Purpose', 'Burning of sludge oil', 'Burning of bilge water residues', 'Solid garbage incineration', 'Food waste disposal'],
    'BALLAST_PUMP': ['Ballasting Operations', 'General Purpose'],
    'BILGE_PUMP': ['Bilge Water Management', 'General Purpose'],
    'EXHAUST_GAS_BOILER': ['General Purpose', 'Fuel Heating', 'Cargo Heating'],
    'IGG': [,'General Purpose', 'Cargo tank inerting', 'Purge and gas-free operations', 'Blanketing and safety', 'Cargo discharge Inerting'],
    'MAIN_AIR_COMPRESSOR': ['General Purpose', 'Starting Air Supply'],
    'OIL_WATER_SEPARATOR': ['Waste Management', 'General Purpose'],
    'OTHER_EQUIPMENT': ['General Purpose'],
    'PROVISIONS_REEFER': ['Provisions Cooling', 'General Purpose'],
    'SEWAGE_PLANT': ['Waste Management', 'General Purpose'],
    'SHAFT_GENERATOR': ['General Purpose', 'Propulsion'],
    'STEERING_GEAR': ['Maneuvering', 'General Purpose'],
};

const DEFAULT_CONSUMED_BY_OPTIONS = ['General Purpose'];
// --- END NEW CONSTANT ---

const FuelManagementTab = ({
    fuelConsumptions,
    fuelTypesWithRob,
    filteredMachineryOptions,
    bdnNumbersByFuelType,
    fuelRobValues,
    bdnRobValues,
    handleChildChange,
    addChildRow,
    removeChildRow,
    validationErrors,
    isSubmitted,
    fetchBdnNumbersForFuelType,
    shipId,
}) => {
    
    // Default structure for a new fuel consumption row
    const newFuelConsumptionDefault = { FuelTypeKey: '', ConsumedMT: '', ShipMachineryRecordID: null, BDN_Number: '', MachineryName: null, MachineryTypeKey: null, ConsumedByDescription: 'General Purpose' };

    // Helper function to get machinery details from the filtered options
    const getMachineryDetails = (recordId) => {
        return filteredMachineryOptions.find(opt => String(opt.value) === String(recordId))?.data;
    };
    
    // Function to get the dynamic consumed by options for a given machinery type
    const getConsumedByOptions = (machineryTypeKey) => {
        if (!machineryTypeKey) {
            return DEFAULT_CONSUMED_BY_OPTIONS;
        }
        return CONSUMED_BY_OPTIONS[machineryTypeKey] || DEFAULT_CONSUMED_BY_OPTIONS;
    };

    // NEW HELPER: Filter machinery options to exclude those already selected in other rows
    const getAvailableMachineryOptions = (currentIndex, currentMachineryId) => {
        const usedIds = new Set(
            fuelConsumptions
                .filter((fc, idx) => idx !== currentIndex) 
                .map(fc => String(fc.ShipMachineryRecordID))
                .filter(Boolean)
        );

        return filteredMachineryOptions.filter(mach => 
            !usedIds.has(String(mach.value)) || String(mach.value) === String(currentMachineryId)
        );
    };

    // Use a secondary useEffect hook if needed in the parent component for fetching BDN numbers 
    // when FuelTypeKey changes, as the fetch is already wired up in AddEditVesselReportPage.jsx

    return (
        <div className="tab-pane">
            <h3>Fuel Consumption</h3>
            <div className="form-section">
                {fuelConsumptions.map((fc, index) => {
                    
                    const machineryDetails = getMachineryDetails(fc.ShipMachineryRecordID);
                    const currentMachineryTypeKey = machineryDetails?.MachineryTypeKey;
                    
                    const currentFuelRob = fuelRobValues[fc.FuelTypeKey] !== undefined ? `${fuelRobValues[fc.FuelTypeKey].toFixed(3)} MT` : 'N/A';
                    const currentBdnRob = bdnRobValues[fc.BDN_Number] !== undefined ? `${bdnRobValues[fc.BDN_Number].toFixed(3)} MT` : 'N/A';
                    
                    // Filtered BDN numbers for the current Fuel Type (List of strings)
                    const currentBdnList = fc.FuelTypeKey ? (bdnNumbersByFuelType[fc.FuelTypeKey] || []) : [];

                    const errorKeyFuelType = `fuelConsumptions[${index}].FuelTypeKey`;
                    const errorKeyMachinery = `fuelConsumptions[${index}].ShipMachineryRecordID`;
                    const errorKeyConsumed = `fuelConsumptions[${index}].ConsumedMT`;
                    const errorKeyBdn = `fuelConsumptions[${index}].BDN_Number`;
                    const errorKeyConsumedBy = `fuelConsumptions[${index}].ConsumedByDescription`;

                    // Get the dynamically filtered list for this row
                    const availableMachinery = getAvailableMachineryOptions(index, fc.ShipMachineryRecordID); 

                    return (
                        <div key={index} className="nested-item">
                            <div className="form-group-row four-col-grid">
                                <div className="form-group">
                                    <label htmlFor={`fuelTypeKey-${index}`}>Fuel Type (ROB &gt; 0):</label>
                                    <select
                                        id={`fuelTypeKey-${index}`}
                                        name="FuelTypeKey"
                                        value={fc.FuelTypeKey || ''}
                                        // onChange handler triggers the BDN fetch in parent via handleChildChange
                                        onChange={(e) => handleChildChange(index, 'FuelTypeKey', e.target.value, 'fuelConsumptions')}
                                        disabled={isSubmitted}
                                        title={`Current ROB: ${currentFuelRob}`}
                                    >
                                        <option value="">Select Fuel Type</option>
                                        {fuelTypesWithRob.map(type => (
                                            <option 
                                                key={type.FuelTypeKey} 
                                                value={type.FuelTypeKey}
                                                title={`ROB: ${fuelRobValues[type.FuelTypeKey] ? fuelRobValues[type.FuelTypeKey].toFixed(3) : 'N/A'} MT`}
                                            >
                                                {type.FuelTypeDescription}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors[errorKeyFuelType] && <p className="error-text">{validationErrors[errorKeyFuelType]}</p>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor={`machinery-${index}`}>Machinery:</label>
                                    <select
                                        id={`machinery-${index}`}
                                        name="ShipMachineryRecordID"
                                        value={fc.ShipMachineryRecordID || ''}
                                        onChange={(e) => handleChildChange(index, 'ShipMachineryRecordID', e.target.value, 'fuelConsumptions')}
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
                                
                                {/* NEW DROPDOWN: Consumed By Description */}
                                <div className="form-group">
                                    <label htmlFor={`consumedBy-${index}`}>Purpose (Consumed By Description):</label>
                                    <select
                                        id={`consumedBy-${index}`}
                                        name="ConsumedByDescription"
                                        value={fc.ConsumedByDescription || ''}
                                        onChange={(e) => handleChildChange(index, 'ConsumedByDescription', e.target.value, 'fuelConsumptions')}
                                        disabled={isSubmitted || !fc.ShipMachineryRecordID}
                                    >
                                        <option value="">Select Purpose</option>
                                        {getConsumedByOptions(currentMachineryTypeKey).map(purpose => (
                                            <option 
                                                key={purpose} 
                                                value={purpose}
                                            >
                                                {purpose}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors[errorKeyConsumedBy] && <p className="error-text">{validationErrors[errorKeyConsumedBy]}</p>}
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor={`bdn-${index}`}>From BDN (ROB: {currentBdnRob}):</label>
                                    <select
                                        id={`bdn-${index}`}
                                        name="BDN_Number"
                                        value={fc.BDN_Number || ''}
                                        onChange={(e) => handleChildChange(index, 'BDN_Number', e.target.value, 'fuelConsumptions')}
                                        disabled={isSubmitted || currentBdnList.length === 0}
                                    >
                                        <option value="">Select BDN Number</option>
                                        {currentBdnList.map(bdn => {
                                            const rob = bdnRobValues[bdn];
                                            const robDisplay = rob !== undefined ? `${rob.toFixed(3)} MT` : 'N/A';
                                            return (
                                                <option key={bdn} value={bdn} title={`ROB: ${robDisplay}`}>
                                                    {bdn}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {validationErrors[errorKeyBdn] && <p className="error-text">{validationErrors[errorKeyBdn]}</p>}
                                </div>
                            </div>
                            <div className="form-group-row four-col-grid">
                                <div className="form-group">
                                    <label htmlFor={`consumed-${index}`}>Consumed (MT):</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        id={`consumed-${index}`}
                                        name="ConsumedMT"
                                        value={fc.ConsumedMT || ''}
                                        onChange={(e) => handleChildChange(index, 'ConsumedMT', parseFloat(e.target.value) || '', 'fuelConsumptions')}
                                        min="0"
                                        disabled={isSubmitted}
                                    />
                                    {validationErrors[errorKeyConsumed] && <p className="error-text">{validationErrors[errorKeyConsumed]}</p>}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeChildRow(index, 'fuelConsumptions')}
                                className="btn btn-remove"
                                disabled={isSubmitted}
                            >Remove</button>
                        </div>
                    );
                })}
                <button
                    type="button"
                    onClick={() => addChildRow('fuelConsumptions', newFuelConsumptionDefault)}
                    className="btn btn-add"
                    disabled={isSubmitted}
                >Add Fuel Consumption</button>
            </div>
        </div>
    );
};

FuelManagementTab.propTypes = {
    fuelConsumptions: PropTypes.array.isRequired,
    fuelTypesWithRob: PropTypes.array.isRequired,
    filteredMachineryOptions: PropTypes.array.isRequired,
    bdnNumbersByFuelType: PropTypes.object.isRequired,
    fuelRobValues: PropTypes.object.isRequired,
    bdnRobValues: PropTypes.object.isRequired,
    handleChildChange: PropTypes.func.isRequired,
    addChildRow: PropTypes.func.isRequired,
    removeChildRow: PropTypes.func.isRequired,
    validationErrors: PropTypes.object.isRequired,
    isSubmitted: PropTypes.bool.isRequired,
    fetchBdnNumbersForFuelType: PropTypes.func.isRequired,
    shipId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default FuelManagementTab;