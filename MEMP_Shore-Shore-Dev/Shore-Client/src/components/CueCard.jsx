// src/components/CueCard.jsx
import React from 'react';
import './CueCard.css'; // We'll create this CSS file

const CueCard = ({ title, backgroundImage, onClick }) => {
  const cardStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})` } // Corrected: NO process.env.PUBLIC_URL
    : {};

  return (
    <div className="cue-card" style={cardStyle} onClick={onClick}>
      <div className="cue-card-overlay">
        <h3 className="cue-card-title">{title}</h3>
      </div>
    </div>
  );
};

export default CueCard;