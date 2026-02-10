// Bunker Modified/Client/src/components/SearchableDropdown/SearchableDropdown.jsx
import React, { useState, useRef, useEffect } from 'react';
import './SearchableDropdown.css'; // Assuming CSS is in the same directory

const SearchableDropdown = ({
    options,      // Array of { value: '...', label: '...' }
    value,        // Currently selected value
    onChange,     // Function to call on value change (value)
    placeholder,  // Placeholder text
    label,        // Label for the input
    htmlFor,      // htmlFor for the label
    required = false,
    disabled = false,
    className = '' // Optional custom class for the container
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Find the label for the currently selected value
    const selectedOptionLabel = options.find(option => option.value === value)?.label || '';

    // Handle clicks outside to close the dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm(''); // Clear search on close
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelectOption = (optionValue, optionLabel) => {
        onChange(optionValue);
        setSearchTerm(optionLabel); // Display selected label in input
        setIsOpen(false);
    };

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
        setIsOpen(true); // Open dropdown when typing
    };

    const handleInputFocus = () => {
        setIsOpen(true);
        // If an item is already selected, put its label in search term for easy re-filtering
        if (value) {
            setSearchTerm(selectedOptionLabel);
        }
    };

    return (
        <div className={`searchable-dropdown-container ${className}`} ref={dropdownRef}>
            {label && <label htmlFor={htmlFor}>{label}{required && <span className="required-asterisk">*</span>}:</label>}
            <input
                type="text"
                id={htmlFor}
                className="searchable-dropdown-input"
                value={isOpen ? searchTerm : selectedOptionLabel}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
            />
            {isOpen && (
                <ul className="searchable-dropdown-options">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <li
                                key={option.value}
                                onClick={() => handleSelectOption(option.value, option.label)}
                                className={option.value === value ? 'selected' : ''}
                            >
                                {option.label}
                            </li>
                        ))
                    ) : (
                        <li className="no-results">No results found.</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default SearchableDropdown;