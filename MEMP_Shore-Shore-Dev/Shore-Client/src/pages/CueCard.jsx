// src/components/CueCard.jsx
import React from 'react';
import './CueCard.css'; // Make sure this CSS file exists

const CueCard = ({ title, backgroundImage, onClick }) => {
  const cardStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})` } 
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