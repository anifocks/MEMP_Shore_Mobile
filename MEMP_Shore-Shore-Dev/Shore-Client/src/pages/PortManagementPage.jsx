import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios'; // REMOVED: Replaced with API functions
import PortList from '../components/MEMP/PortList';
import PortDetails from '../components/MEMP/PortDetails';
import AddEditPortModal from '../components/MEMP/AddEditPortModal';
import { FaPlusCircle } from 'react-icons/fa';
import './PortManagementPage.css';
// *** ADDED: Import centralized API functions ***
import { fetchPorts, fetchPortDetails, deletePort } from '../api';

// REMOVED: Hardcoded API_BASE_URL is replaced by centralized functions from api.js
// const API_BASE_URL = 'http://localhost:7000/api';


// Custom hook for debouncing input to prevent API calls on every keystroke
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const PortManagementPage = () => {
    const [ports, setPorts] = useState([]);
    const [selectedPort, setSelectedPort] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPort, setEditingPort] = useState(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchPortsData = useCallback(async () => {
        // This function will now only be called when the search term is valid
        setLoading(true);
        setError('');
        try {
            // *** UPDATED: Use centralized API function fetchPorts ***
            const data = await fetchPorts(debouncedSearchTerm);
            setPorts(data);
        } catch (err) {
            // Catch the standardized Error thrown by API functions
            setError(err.message || 'Failed to fetch port data.');
            setPorts([]); // Clear results on error
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm]);

    // --- FIX: This useEffect now controls the API call logic ---
    useEffect(() => {
        // Only fetch data if the user has typed 2 or more characters
        if (debouncedSearchTerm.length >= 2) {
            fetchPortsData();
        } else {
            // If the search term is short, clear the list of ports
            setPorts([]);
        }
    }, [debouncedSearchTerm, fetchPortsData]);

    const fetchPortDetailsData = async (portId) => {
        try {
            // *** UPDATED: Use centralized API function fetchPortDetails ***
            const data = await fetchPortDetails(portId);
            setSelectedPort(data);
        } catch (err) {
            // Catch the standardized Error thrown by API functions
            setError(err.message || 'Failed to fetch port details.');
            setSelectedPort(null);
        }
    };

    const handleSelectPort = (port) => {
        fetchPortDetailsData(port.PortID);
    };

    const handleOpenAddModal = () => {
        setEditingPort(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (port) => {
        setEditingPort(port);
        setIsModalOpen(true);
    };

    const handleDeletePort = async (portId) => {
        if (!window.confirm('Are you sure you want to mark this port as inactive?')) return;
        try {
            const username = localStorage.getItem('username') || 'SYSTEM';
            // *** UPDATED: Use centralized API function deletePort ***
            await deletePort(portId, username);
            alert('Port marked as inactive.');
            // After deleting, refetch the current search to update the list
            if (debouncedSearchTerm.length >= 2) {
                fetchPortsData();
            }
            setSelectedPort(null);
        } catch (err) {
            // Catch the standardized Error thrown by API functions
            alert(err.message || 'Failed to delete port.');
        }
    };
    
    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        setEditingPort(null);
        // After saving, refetch the current search to update the list
        if (debouncedSearchTerm.length >= 2) {
            fetchPortsData();
        }
        if (editingPort) {
            fetchPortDetailsData(editingPort.PortID);
        }
    };


    return (
        <div className="port-management-container">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Global Port Directory</h1>
                <button onClick={handleOpenAddModal} className="add-port-button">
                    <FaPlusCircle className="mr-2" /> Add New Port
                </button>
            </div>

            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <PortList
                        ports={ports}
                        onSelectPort={handleSelectPort}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        loading={loading}
                        selectedPortId={selectedPort?.PortID}
                        // --- FIX: Pass the debounced term to show helper text ---
                        debouncedSearchTerm={debouncedSearchTerm}
                    />
                </div>
                <div className="lg:col-span-2">
                    <PortDetails
                        port={selectedPort}
                        onEdit={handleOpenEditModal}
                        onDelete={handleDeletePort}
                    />
                </div>
            </div>

            {isModalOpen && (
                <AddEditPortModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSaveSuccess={handleSaveSuccess}
                    port={editingPort}
                />
            )}
        </div>
    );
};

export default PortManagementPage;