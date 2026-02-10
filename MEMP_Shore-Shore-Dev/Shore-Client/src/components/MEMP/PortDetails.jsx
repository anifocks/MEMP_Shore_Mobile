import React from 'react';
import { FaMapMarkerAlt, FaEdit, FaTrashAlt, FaGlobe, FaClock } from 'react-icons/fa';

const PortDetails = ({ port, onEdit, onDelete }) => {
    if (!port) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 h-full flex items-center justify-center">
                <p className="text-gray-500 text-lg">Select a port to see details</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{port.PortName} ({port.PortCode})</h2>
                    <p className="text-gray-600 flex items-center mt-1"><FaGlobe className="mr-2" /> {port.Country}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onEdit(port)} className="p-2 text-gray-600 hover:text-blue-600"><FaEdit size={20} /></button>
                    {port.IsActive ? 
                        <button onClick={() => onDelete(port.PortID)} className="p-2 text-gray-600 hover:text-red-600"><FaTrashAlt size={20} /></button>
                        : <span className="text-sm font-semibold text-red-500 p-2">Inactive</span>
                    }
                </div>
            </div>
            <div className="border-t my-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                <p><strong className="font-semibold">Country Code:</strong> {port.CountryCode}</p>
                <p><strong className="font-semibold">UTC Offset:</strong> {port.UTCOffSet}</p>
                <p><strong className="font-semibold">Latitude:</strong> {port.Latitude}</p>
                <p><strong className="font-semibold">Longitude:</strong> {port.Longitude}</p>
                <p><strong className="font-semibold">EU Port:</strong> {port.EuInd === 'Y' ? 'Yes' : 'No'}</p>
                <p><strong className="font-semibold">UK Port:</strong> {port.UkInd === 'Y' ? 'Yes' : 'No'}</p>
            </div>
        </div>
    );
};

export default PortDetails;