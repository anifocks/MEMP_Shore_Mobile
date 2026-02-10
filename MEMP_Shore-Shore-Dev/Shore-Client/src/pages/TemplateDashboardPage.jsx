// client/src/pages/TemplateDashboardPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './TemplateDashboardPage.css';
import { FaFileContract } from 'react-icons/fa';

const templates = [
    {
        name: 'Verifavia',
        description: 'EU MRV and IMO DCS reporting.',
        color: 'linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)', // Blue gradient
    },
    {
        name: 'DNV',
        description: 'Verification and compliance reporting.',
        color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Green gradient
    },
    {
        name: 'ABS',
        description: 'Classification and technical reporting.',
        color: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', // Purple-blue gradient
    },
    {
        name: 'ClassNK',
        description: 'Nippon Kaiji Kyokai reporting standards.',
        color: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', // Orange-yellow gradient
    },
];

const TemplateDashboardPage = () => {
    return (
        <div className="template-dashboard-container">
            <div className="template-page-header">
                <h1>Reporting Templates</h1>
                <Link to="/app/memp" className="global-back-link">
                    &larr; Back to MEMP Overview
                </Link>
            </div>
            <div className="template-cards-container">
                {templates.map((template) => (
                    <Link 
                        key={template.name} 
                        to={`/app/memp/templates/${template.name}`} 
                        className="template-card"
                        style={{ background: template.color }}>
                        <div className="template-card-icon">
                            <FaFileContract size={48} />
                        </div>
                        <h2>{template.name}</h2>
                        <p>{template.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default TemplateDashboardPage;