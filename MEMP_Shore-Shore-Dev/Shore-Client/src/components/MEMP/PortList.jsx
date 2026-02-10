import React from 'react';
import { FaSearch } from 'react-icons/fa';

const PortList = ({ ports, onSelectPort, searchTerm, setSearchTerm, loading, selectedPortId, debouncedSearchTerm }) => {
    
    // --- FIX: Helper text logic ---
    const renderHelperText = () => {
        if (loading) {
            return <p className="text-center text-gray-500 p-4">Loading...</p>;
        }
        if (searchTerm.length > 0 && searchTerm.length < 2) {
            return <p className="text-center text-gray-500 p-4">Keep typing to search...</p>;
        }
        if (debouncedSearchTerm.length >= 2 && ports.length === 0) {
            return <p className="text-center text-gray-500 p-4">No ports found for "{debouncedSearchTerm}".</p>;
        }
        if (ports.length === 0) {
            return <p className="text-center text-gray-500 p-4">Type at least 2 characters to search for a port.</p>;
        }
        return null;
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
            <div className="relative mb-4">
                <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search Port, Code, or Country..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div className="flex-grow overflow-y-auto">
                {ports.length > 0 ? (
                    <ul>
                        {ports.map(port => (
                            <li key={port.PortID} onClick={() => onSelectPort(port)}
                                className={`p-3 cursor-pointer rounded-md mb-2 transition-all ${selectedPortId === port.PortID ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>
                                <p className="font-semibold">{port.PortName}</p>
                                <p className={`text-sm ${selectedPortId === port.PortID ? 'text-blue-200' : 'text-gray-500'}`}>{port.Country} ({port.PortCode})</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                   renderHelperText()
                )}
            </div>
        </div>
    );
};

export default PortList;