import React from 'react';
import PropTypes from 'prop-types';

const CargoStabilityTab = ({ reportCargo, formattedCargoActivities, handleMasterChange, validationErrors, isSubmitted }) => {
    return (
        <div className="tab-pane">
            <p className="hint-text">Cargo data is pre-filled from the previous report if creating a new sequential report and is fully editable.</p>
            <div className="form-section three-col-grid">
                <div className="form-group">
                    <label htmlFor="cargoActivity">Cargo Activity:</label>
                    <select
                        id="cargoActivity"
                        name="CargoActivity"
                        value={reportCargo.CargoActivity || ''}
                        onChange={(e) => handleMasterChange(e, 'cargo')}
                        disabled={isSubmitted}
                    >
                        <option value="">Select Activity</option>
                        {formattedCargoActivities.map(activity => (
                            <option key={activity.value} value={activity.value}>{activity.label}</option>
                        ))}
                    </select>
                    {validationErrors.cargoMandatory && <p className="error-text">{validationErrors.cargoMandatory}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="reportedCargoType">Reported Cargo Type:</label>
                    <input
                        type="text"
                        id="reportedCargoType"
                        name="ReportedCargoType"
                        value={reportCargo.ReportedCargoType}
                        onChange={(e) => handleMasterChange(e, 'cargo')}
                        disabled={isSubmitted}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="reportedCargoQuantityMT">{'Reported Cargo Quantity (MT):'}</label>
                    <input
                        type="number"
                        step="0.001"
                        id="reportedCargoQuantityMT"
                        name="ReportedCargoQuantityMT"
                        value={reportCargo.ReportedCargoQuantityMT}
                        onChange={(e) => handleMasterChange(e, 'cargo')}
                        min="0"
                        disabled={isSubmitted}
                    />
                    {validationErrors['cargo.ReportedCargoQuantityMT'] && <p className="error-text">{validationErrors['cargo.ReportedCargoQuantityMT']}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="containersTEU">{'Containers (TEU):'}</label>
                    <input
                        type="number"
                        step="1"
                        id="containersTEU"
                        name="ContainersTEU"
                        value={reportCargo.ContainersTEU}
                        onChange={(e) => handleMasterChange(e, 'cargo')}
                        min="0"
                        disabled={isSubmitted}
                    />
                    {validationErrors['cargo.ContainersTEU'] && <p className="error-text">{validationErrors['cargo.ContainersTEU']}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="displacementMT">{'Displacement (MT):'}</label>
                    <input
                        type="number"
                        step="0.001"
                        id="displacementMT"
                        name="DisplacementMT"
                        value={reportCargo.DisplacementMT}
                        onChange={(e) => handleMasterChange(e, 'cargo')}
                        min="0"
                        disabled={isSubmitted}
                    />
                    {validationErrors['cargo.DisplacementMT'] && <p className="error-text">{validationErrors['cargo.DisplacementMT']}</p>}
                </div>
            </div>
        </div>
    );
};

CargoStabilityTab.propTypes = {
    reportCargo: PropTypes.object.isRequired,
    formattedCargoActivities: PropTypes.array.isRequired,
    handleMasterChange: PropTypes.func.isRequired,
    validationErrors: PropTypes.object.isRequired,
    isSubmitted: PropTypes.bool.isRequired,
};

export default CargoStabilityTab;