// Shore-Client/src/components/RotatingBackground.jsx
import React, { useState, useEffect } from 'react';
import { BACKGROUND_IMAGES } from '../utils/backgroundImages';
import { useTheme } from '../context/ThemeContext'; 
import '../styles/RotatingBackground.css';

const RotatingBackground = ({ children, className = '', forceRotating = false }) => {
    const { bgMode, customBgColor } = useTheme(); 
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const duration = 4000; 

    useEffect(() => {
        if (!BACKGROUND_IMAGES || BACKGROUND_IMAGES.length === 0) return;

        const intervalId = setInterval(() => {
            setCurrentImageIndex(prevIndex => (prevIndex + 1) % BACKGROUND_IMAGES.length);
        }, duration);

        return () => clearInterval(intervalId);
    }, []);

    const currentImageUrl = BACKGROUND_IMAGES.length > 0 ? BACKGROUND_IMAGES[currentImageIndex] : 'none';

    // LOGIC FIX: If forceRotating is true, we ignore the 'default' mode and show images
    const isRotating = forceRotating || bgMode === 'rotating';
    const effectiveBgColor = (bgMode === 'default' && !forceRotating) ? customBgColor : 'transparent';

    return (
        <div 
            className={`rotating-background-container ${className}`}
            style={{ 
                // Apply color only if we are NOT forcing rotation and mode is default
                backgroundColor: effectiveBgColor,
                transition: 'background-color 0.3s ease'
            }}
        >
            {/* Render image if mode is rotating OR if we are forcing it (like on Login page) */}
            {isRotating && (
                <div 
                    className="rotating-background-image"
                    style={{ backgroundImage: `url(${currentImageUrl})` }}
                />
            )}

            {/* Content sits on top */}
            {children}
        </div>
    );
};

export default RotatingBackground;