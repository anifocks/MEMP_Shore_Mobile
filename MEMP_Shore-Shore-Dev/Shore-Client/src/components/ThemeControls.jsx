import React, { useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaImage, FaLayerGroup, FaPalette, FaUndo } from 'react-icons/fa';
import './ThemeControls.css'; 

const DEFAULT_BG_COLOR = '#f9fafb';

const ThemeControls = () => {
    const { bgMode, toggleMode, customBgColor, changeColor } = useTheme();
    const colorInputRef = useRef(null);

    const openColorPicker = () => {
        if (colorInputRef.current) colorInputRef.current.click();
    };

    const resetBgColor = () => {
        changeColor(DEFAULT_BG_COLOR);
    };

    return (
        <div className="theme-header-controls">
            {/* TOGGLE BUTTONS */}
            <div className="bg-toggle-pill">
                <button 
                    className={`toggle-btn ${bgMode === 'default' ? 'active' : ''}`}
                    onClick={() => toggleMode('default')}
                >
                    <FaLayerGroup /> Default
                </button>
                <button 
                    className={`toggle-btn ${bgMode === 'rotating' ? 'active' : ''}`}
                    onClick={() => toggleMode('rotating')}
                >
                    <FaImage /> Rotating
                </button>
            </div>

            {/* COLOR PICKER (Only in Default Mode) */}
            {bgMode === 'default' && (
                <div className="color-controls-group">
                    <div className="color-picker-wrapper">
                        <button 
                            className="control-btn" 
                            onClick={openColorPicker}
                            title="Choose Background Color"
                        >
                            <FaPalette />
                            <span className="color-preview" style={{ backgroundColor: customBgColor }}></span>
                        </button>
                        <input 
                            type="color" 
                            ref={colorInputRef}
                            value={customBgColor}
                            onChange={(e) => changeColor(e.target.value)}
                            className="hidden-color-input"
                        />
                    </div>

                    {customBgColor !== DEFAULT_BG_COLOR && (
                        <button 
                            className="control-btn reset-btn" 
                            onClick={resetBgColor}
                            title="Reset"
                        >
                            <FaUndo />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ThemeControls;