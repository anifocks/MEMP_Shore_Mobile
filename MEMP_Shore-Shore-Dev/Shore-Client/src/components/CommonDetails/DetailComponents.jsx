import React from 'react';
import { FaInfoCircle } from 'react-icons/fa'; // Default icon for DetailCard if none is provided

// Reusable component for displaying a single detail item (label-value pair)
export const DetailItem = ({ label, value, unit = '' }) => (
    <div className="detail-item">
        <p className="detail-label">{label}</p>
        {/* FIX: Use a single expression to consolidate value, unit, and N/A check. 
           This permanently resolves the accidental duplication bug for all fields using DetailItem.
        */}
        <p className="detail-value">
            {value ? `${value}${unit ? ' ' + unit : ''}` : 'N/A'}
        </p>
    </div>
);

// Reusable component for a card that groups related detail items
export const DetailCard = ({ title, icon, children }) => (
    <div className="detail-card">
        <h3 className="detail-card-title">
            {icon || <FaInfoCircle />} {/* Use the provided icon, or a default info icon */}
            <span>{title}</span>
        </h3>
        <div className="detail-grid">
            {children}
        </div>
    </div>
);
