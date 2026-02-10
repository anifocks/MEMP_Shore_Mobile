import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { BACKGROUND_IMAGES } from '../utils/backgroundImages'; 
import './GlobalLayout.css';

const GlobalLayout = ({ children }) => {
    const { bgMode, customBgColor } = useTheme(); 
    const [currentBgIndex, setCurrentBgIndex] = useState(0);

    // TIMER LOGIC (Moved from UserManagementPage)
    useEffect(() => {
        let interval;
        if (bgMode === 'rotating') {
            interval = setInterval(() => {
                setCurrentBgIndex(prev => (prev + 1) % BACKGROUND_IMAGES.length);
            }, 5000); 
        }
        return () => clearInterval(interval);
    }, [bgMode]);

    return (
        <div 
            className={`global-app-container ${bgMode}`}
            style={bgMode === 'default' ? { backgroundColor: customBgColor } : {}}
        >
            {/* ROTATING BACKGROUND LAYERS */}
            {bgMode === 'rotating' && (
                <div className="global-rotating-bg-container">
                    {BACKGROUND_IMAGES.map((img, index) => (
                        <div 
                            key={index}
                            className={`global-bg-slide ${index === currentBgIndex ? 'active' : ''}`}
                            style={{ backgroundImage: `url(${img})` }}
                        />
                    ))}
                    <div className="global-bg-overlay"></div>
                </div>
            )}

            {/* CONTENT */}
            <div className="global-content-wrapper">
                {children}
            </div>
        </div>
    );
};

export default GlobalLayout;