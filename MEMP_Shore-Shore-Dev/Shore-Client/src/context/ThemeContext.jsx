import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // 1. STATE LIFTED FROM USER MANAGEMENT PAGE
    const [bgMode, setBgMode] = useState('default'); // 'default' or 'rotating'
    const [customBgColor, setCustomBgColor] = useState('#f9fafb'); // Default gray

    // 2. PERSIST SETTINGS
    useEffect(() => {
        const savedMode = localStorage.getItem('app_bg_mode');
        const savedColor = localStorage.getItem('app_bg_color');
        if (savedMode) setBgMode(savedMode);
        if (savedColor) setCustomBgColor(savedColor);
    }, []);

    const toggleMode = (mode) => {
        setBgMode(mode);
        localStorage.setItem('app_bg_mode', mode);
    };

    const changeColor = (color) => {
        setCustomBgColor(color);
        localStorage.setItem('app_bg_color', color);
    };

    return (
        <ThemeContext.Provider value={{ bgMode, customBgColor, toggleMode, changeColor }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);