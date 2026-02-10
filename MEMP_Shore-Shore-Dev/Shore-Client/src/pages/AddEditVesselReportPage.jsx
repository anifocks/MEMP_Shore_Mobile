// File: Client/src/pages/AddEditVesselReportPage.jsx (SIMPLIFIED)
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AddEditVesselReportPage.css';

// Import Custom Hook and New Components
import useVesselReportLogic from '../hooks/useVesselReportLogic';
import ReportHeader from '../components/ReportHeader';
import PositionalActivityTab from '../components/ReportTabs/PositionalActivityTab';
import WeatherEnvironmentalTab from '../components/ReportTabs/WeatherEnvironmentalTab';

// Original Tab Imports (kept as is)
import CargoStabilityTab from '../components/ReportTabs/CargoStabilityTab';
import MachineryDataTab from '../components/ReportTabs/MachineryDataTab';
import FuelManagementTab from '../components/ReportTabs/FuelManagementTab';
import LubeOilManagementTab from '../components/ReportTabs/LubeOilManagementTab';
import ElecConsumptionTab from '../components/ReportTabs/ElecConsumptionTab'; 
import { getCleanValue } from '../utils/reportHelpers';

const AddEditVesselReportPage = () => {
    const { shipId, reportId } = useParams();
    const navigate = useNavigate();

    // --- USE CUSTOM HOOK FOR ALL LOGIC, STATE, AND DATA ---
    const {
        // State & Data
        report, loading, apiError, validationErrors, isEditMode, activeTab, 
        editHeaderEnabled, setEditHeaderEnabled, getCleanValue,
        // Dropdown/Lookup Data
        vessels, availableReportTypes, formattedTimezones, parentVoyageOptions, voyageLegOptions,
        filteredMachineryOptions, fuelTypesWithRob, lubeOilTypesWithRob, bdnNumbersByFuelType, loBdnData,
        formattedVesselActivities, formattedWindDirections, formattedSeaStates, formattedSwellDirections, formattedCargoActivities,
        mappedVesselMachinery,
        machineryTypesList,
        loadingMappedMachinery,
        // Voyage State
        selectedParentVoyageId, selectedVoyageLegId, fromPortName, toPortName,
        // Calculated/Metadata
        calculatedDurationHours, shipPitch, precedingReport,
        // Handlers
        handleMasterChange, handleChildChange, addChildRow, removeChildRow, handleMachinerySelection,
        handleSaveOrSubmit, handleCreateReport, handleTabClick,
        // ROB Cache
        fuelRobValues, loRobValues, bdnRobValues
    } = useVesselReportLogic(shipId, reportId);

    if (loading) return <div className="loading">Loading form...</div>;

    const tabs = [
        { id: 'reportOverview', label: 'Report Overview' },
        { id: 'positionalActivity', label: 'Positional & Activity' },
        { id: 'weatherEnvironmental', label: 'Weather & Environmental' },
        { id: 'machineryData', label: 'Machinery Data' },
        { id: 'elecConsumption', label: 'Elec Consumption' }, 
        { id: 'fuelManagement', label: 'Fuel Management' },
        { id: 'lubeOilManagement', label: 'Lube Oil Management' },
        { id: 'cargoStability', label: 'Cargo & Stability' },
        { id: 'remarks', label: 'Remarks' },
    ];

    const isSubmitted = report.master.ReportStatus === 'Submitted';
    const isHeaderDisabled = isSubmitted || (isEditMode && !editHeaderEnabled && report.master.ReportStatus !== 'Submitted');
    const isVoyageIdDisabled = isHeaderDisabled; 

    const handleCancel = () => {
        // Since useVesselReportLogic manages hasUnsavedChanges and warnings, 
        // we can simplify the cancel action here, assuming the hook's cleanup works.
        navigate('/app/memp/vessel-reports');
    };

    return (
        <div className="add-edit-vessel-report-page landscape-form">
            <h2>
                {report.master.ReportID
                    ? `Edit Report ID: ${report.master.ReportID} (Status: ${getCleanValue(report.master.ReportStatus)})` 
                    : `Create New Report for Ship ID: ${shipId}`}
            </h2>

            {(apiError || Object.keys(validationErrors).length > 0) && (
                <div className="error-messages">
                    {apiError && <p className="error-text">{apiError}</p>}
                    {Object.keys(validationErrors).length > 0 && (
                        <div>
                            <p className="error-text">Please correct the following issues:</p>
                            <ul>
                                {Object.entries(validationErrors).map(([key, value]) => (
                                    <li key={key}>{value}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <ReportHeader 
                report={report}
                vessels={vessels}
                availableReportTypes={availableReportTypes}
                formattedTimezones={formattedTimezones}
                parentVoyageOptions={parentVoyageOptions}
                voyageLegOptions={voyageLegOptions}
                selectedParentVoyageId={selectedParentVoyageId}
                selectedVoyageLegId={selectedVoyageLegId}
                fromPortName={fromPortName}
                toPortName={toPortName}
                calculatedDurationHours={calculatedDurationHours}
                validationErrors={validationErrors}
                isHeaderDisabled={isHeaderDisabled}
                isVoyageIdDisabled={isVoyageIdDisabled}
                isEditMode={isEditMode}
                editHeaderEnabled={editHeaderEnabled}
                setEditHeaderEnabled={setEditHeaderEnabled}
                handleMasterChange={handleMasterChange}
                handleParentVoyageSelection={handleMasterChange} // Logic delegated inside handleMasterChange in hook
                handleVoyageLegSelection={handleMasterChange} // Logic delegated inside handleMasterChange in hook
            />

            {!report.master.ReportID && (
                <div className="form-actions" style={{ marginBottom: '20px' }}>
                    {/* <button type="button" onClick={handleCreateReport} className="btn btn-primary">Create Report</button> */}
                    <button type="button" onClick={handleCancel} className="btn btn-secondary">Cancel</button>
                </div>
            )}

            {report.master.ReportID && (
                <form onSubmit={(e) => handleSaveOrSubmit(e, 'Submitted')} className="report-form">
                    <div className="tabs-container">
                        <div className="tabs-header">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => handleTabClick(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="tabs-content">
                            {activeTab === 'reportOverview' && (
                                <div className="tab-pane">
                                    <p>The Report Overview details are displayed at the top of the page and are mandatory for initial report creation.</p>
                                </div>
                            )}

                            {activeTab === 'positionalActivity' && (
                                <PositionalActivityTab
                                    report={report}
                                    formattedVesselActivities={formattedVesselActivities}
                                    validationErrors={validationErrors}
                                    isSubmitted={isSubmitted}
                                    handleMasterChange={handleMasterChange}
                                    shipPitch={shipPitch}
                                />
                            )}

                            {activeTab === 'weatherEnvironmental' && (
                                <WeatherEnvironmentalTab
                                    report={report}
                                    formattedWindDirections={formattedWindDirections}
                                    formattedSeaStates={formattedSeaStates}
                                    formattedSwellDirections={formattedSwellDirections}
                                    validationErrors={validationErrors}
                                    isSubmitted={isSubmitted}
                                    handleMasterChange={handleMasterChange}
                                />
                            )}

                            {activeTab === 'machineryData' && (
                                <MachineryDataTab 
                                    machineryData={(report.machineryData || []).filter(md => md.MachineryTypeKey && !['ELECTRICAL_CONSUMPTION', 'SHAFT_GENERATOR', 'SHORE_POWER'].includes(md.MachineryTypeKey))}
                                    // FIX 2: Pass the correct data and loading state
                                    mappedVesselMachinery={mappedVesselMachinery}
                                    machineryTypes={machineryTypesList}
                                    loadingMappedMachinery={loadingMappedMachinery}
                                    handleChildChange={handleChildChange}
                                    removeChildRow={removeChildRow}
                                    handleMachinerySelection={handleMachinerySelection}
                                    validationErrors={validationErrors}
                                    isSubmitted={isSubmitted}
                                />
                            )}
                            
                            {activeTab === 'elecConsumption' && (
                                <ElecConsumptionTab 
                                    machineryData={(report.machineryData || [])
                                        .map((md, index) => ({ ...md, OriginalIndex: index }))
                                        .filter(md => md.MachineryTypeKey && ['ELECTRICAL_CONSUMPTION', 'SHAFT_GENERATOR', 'SHORE_POWER'].includes(md.MachineryTypeKey))}
                                    // It's likely this component also needs the full list, ensuring all data is available
                                    mappedVesselMachinery={mappedVesselMachinery}
                                    machineryTypes={machineryTypesList}
                                    handleChildChange={handleChildChange}
                                    handleMachinerySelection={handleMachinerySelection}
                                    removeChildRow={removeChildRow}
                                    validationErrors={validationErrors}
                                    isSubmitted={isSubmitted}
                                />
                            )}

                            {activeTab === 'fuelManagement' && (
                                <FuelManagementTab 
                                    fuelConsumptions={report.fuelConsumptions}
                                    fuelTypesWithRob={fuelTypesWithRob}
                                    filteredMachineryOptions={filteredMachineryOptions}
                                    bdnNumbersByFuelType={bdnNumbersByFuelType}
                                    fuelRobValues={fuelRobValues}
                                    bdnRobValues={bdnRobValues}
                                    handleChildChange={handleChildChange}
                                    addChildRow={addChildRow}
                                    removeChildRow={removeChildRow}
                                    validationErrors={validationErrors}
                                    isSubmitted={isSubmitted}
                                    shipId={report.master.ShipID}
                                />
                            )}
                            
                            {activeTab === 'lubeOilManagement' && (
                                <LubeOilManagementTab 
                                    loConsumptionLogs={report.loConsumptionLogs}
                                    lubeOilTypesWithRob={lubeOilTypesWithRob}
                                    filteredMachineryOptions={filteredMachineryOptions}
                                    loBdnData={loBdnData}
                                    loRobValues={loRobValues}
                                    bdnRobValues={bdnRobValues}
                                    handleChildChange={handleChildChange}
                                    addChildRow={addChildRow}
                                    removeChildRow={removeChildRow}
                                    validationErrors={validationErrors}
                                    isSubmitted={isSubmitted}
                                />
                            )}
                            
                            {activeTab === 'cargoStability' && (
                                <CargoStabilityTab 
                                    reportCargo={report.cargo}
                                    formattedCargoActivities={formattedCargoActivities}
                                    handleMasterChange={handleMasterChange}
                                    validationErrors={validationErrors}
                                    isSubmitted={isSubmitted}
                                />
                            )}

                            {activeTab === 'remarks' && (
                                <div className="tab-pane">
                                    <div className="form-section four-col-grid">
                                        <label htmlFor="remarks">Remarks:</label>
                                        <textarea
                                            id="remarks"
                                            name="Remarks"
                                            value={report.master.Remarks || ''}
                                            onChange={(e) => handleMasterChange(e, 'master')}
                                            disabled={isSubmitted}
                                        ></textarea>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                    <div className="form-actions">
                        {report.master.ReportStatus !== 'Submitted' && (
                            <>
                                <button type="button" onClick={(e) => handleSaveOrSubmit(e, 'Draft')} className="btn btn-secondary" style={{ marginRight: '10px' }}>Save Draft</button>
                                <button type="submit" className="btn btn-primary">Submit Report</button>
                            </>
                        )}
                        <button type="button" onClick={handleCancel} className="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default AddEditVesselReportPage;