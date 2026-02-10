import React from 'react';
import { FaShip, FaGasPump, FaCheckCircle, FaTachometerAlt } from 'react-icons/fa';
import './CiiReportPreview.css'; 

const CiiReportPreview = ({ ciiData }) => {
    if (!ciiData) {
        return (
            <div className="cii-no-data">
                <p>CII data is not available for this selection. Please use filters above.</p>
            </div>
        );
    }

    const getRatingColor = (rating) => {
        switch (rating) {
            case 'A': return '#16a34a';
            case 'B': return '#84cc16';
            case 'C': return '#facc15';
            case 'D': return '#f97316';
            case 'E': return '#dc2626';
            default: return '#6b7280';
        }
    };

    const attained = parseFloat(ciiData.AttainedCII || 0);
    const required = parseFloat(ciiData.RequiredCII || 0);
    const emissions = parseFloat(ciiData.TotalCO2Emissions_MT || 0);

    return (
        <div className="cii-report-container">
            <div className="cii-card rating-card" style={{ '--rating-color': getRatingColor(ciiData.CIIRating) }}>
                <div className="cii-card-header">
                    <h3>CII Rating</h3>
                    <FaCheckCircle className="cii-header-icon" />
                </div>
                <div className="cii-rating-display">
                    <span className="cii-rating-badge">
                        {ciiData.CIIRating || 'N/A'}
                    </span>
                </div>
            </div>

            <div className="cii-card attained-card">
                <div className="cii-card-header">
                    <h3>Attained CII</h3>
                    <FaShip className="cii-header-icon" />
                </div>
                <p className="cii-value">{attained.toFixed(2)}</p>
                <p className="cii-unit">gCO₂ / dwt-nm</p>
            </div>

            <div className="cii-card required-card">
                <div className="cii-card-header">
                    <h3>Required CII</h3>
                    <FaTachometerAlt className="cii-header-icon" />
                </div>
                <p className="cii-value">{required.toFixed(2)}</p>
                <p className="cii-unit">gCO₂ / dwt-nm</p>
            </div>

            <div className="cii-card emissions-card">
                <div className="cii-card-header">
                    <h3>Total CO₂</h3>
                    <FaGasPump className="cii-header-icon" />
                </div>
                <p className="cii-value">{emissions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="cii-unit">Metric Tons</p>
            </div>
        </div>
    );
};

export default CiiReportPreview;