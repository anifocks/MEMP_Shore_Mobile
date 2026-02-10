// File: Client/src/components/ReportTabs/WeatherEnvironmentalTab.jsx

import React from 'react';

const WeatherEnvironmentalTab = ({
    report, formattedWindDirections, formattedSeaStates, formattedSwellDirections, 
    validationErrors, isSubmitted, handleMasterChange
}) => (
    <div className="tab-pane">
        <div className="form-section four-col-grid">
            <div className="form-group">
                <label htmlFor="windForce">{'Wind Force (<= 71):'}</label>
                <input
                    type="number"
                    step="0.01"
                    id="windForce"
                    name="WindForce"
                    value={report.weather.WindForce}
                    onChange={(e) => handleMasterChange(e, 'weather')}
                    min="0"
                    max="71"
                    disabled={isSubmitted}
                />
                {validationErrors['weather.WindForce'] && <p className="error-text">{validationErrors['weather.WindForce']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="windDirection">Wind Direction:</label>
                <select
                    id="windDirection"
                    name="WindDirection"
                    value={report.weather.WindDirection}
                    onChange={(e) => handleMasterChange(e, 'weather')}
                    disabled={isSubmitted}
                >
                    <option value="">Select Direction</option>
                    {formattedWindDirections.map(dir => (
                        <option key={dir.value} value={dir.value}>{dir.label}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="seaState">Sea State:</label>
                <select
                    id="seaState"
                    name="SeaState"
                    value={report.weather.SeaState}
                    onChange={(e) => handleMasterChange(e, 'weather')}
                    disabled={isSubmitted}
                >
                    <option value="">Select Sea State</option>
                    {formattedSeaStates.map(state => (
                        <option key={state.value} value={state.value}>{state.label}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="swellDirection">Swell Direction:</label>
                <select
                    id="swellDirection"
                    name="SwellDirection"
                    value={report.weather.SwellDirection}
                    onChange={(e) => handleMasterChange(e, 'weather')}
                    disabled={isSubmitted}
                >
                    <option value="">Select Direction</option>
                    {formattedSwellDirections.map(dir => (
                        <option key={dir.value} value={dir.value}>{dir.label}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="swellHeightM">{'Swell Height (M) (<= 15):'}</label>
                <input
                    type="number"
                    step="0.01"
                    id="swellHeightM"
                    name="SwellHeightM"
                    value={report.weather.SwellHeightM}
                    onChange={(e) => handleMasterChange(e, 'weather')}
                    min="0"
                    max="15"
                    disabled={isSubmitted}
                />
                {validationErrors['weather.SwellHeightM'] && <p className="error-text">{validationErrors['weather.SwellHeightM']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="airTemperatureC">{'Air Temperature (C) (<= 60):'}</label>
                <input
                    type="number"
                    step="0.01"
                    id="airTemperatureC"
                    name="AirTemperatureC"
                    value={report.weather.AirTemperatureC}
                    onChange={(e) => handleMasterChange(e, 'weather')}
                    max="60"
                    disabled={isSubmitted}
                />
                {validationErrors['weather.AirTemperatureC'] && <p className="error-text">{validationErrors['weather.AirTemperatureC']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="seaTemperatureC">{'Sea Temperature (C) (<= 40):'}</label>
                <input
                    type="number"
                    step="0.01"
                    id="seaTemperatureC"
                    name="SeaTemperatureC"
                    value={report.weather.SeaTemperatureC}
                    onChange={(e) => handleMasterChange(e, 'weather')}
                    max="40"
                    disabled={isSubmitted}
                />
                {validationErrors['weather.SeaTemperatureC'] && <p className="error-text">{validationErrors['weather.SeaTemperatureC']}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="barometricPressureHPa">{'Barometric Pressure (HPa) (<= 5):'}</label>
                <input
                    type="number"
                    step="0.01"
                    id="barometricPressureHPa"
                    name="BarometricPressureHPa"
                    value={report.weather.BarometricPressureHPa}
                    onChange={(e) => handleMasterChange(e, 'weather')}
                    min="0"
                    max="5"
                    disabled={isSubmitted}
                />
                {validationErrors['weather.BarometricPressureHPa'] && <p className="error-text">{validationErrors['weather.BarometricPressureHPa']}</p>}
            </div>
        </div>
    </div>
);

export default WeatherEnvironmentalTab;