import React, { useState, useEffect } from 'react';
import RotatingBackground from '../components/RotatingBackground';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
    fetchVessels, 
    fetchVoyageList,
    fetchVesselEmissionsAnalytics 
} from '../api';
import './VesselDashboardPage.css';

const VesselEmissionsPage = () => {
    // --- State Management ---
    const [ships, setShips] = useState([]);
    const [selectedShip, setSelectedShip] = useState('');
    
    // Filters
    const [fromDate, setFromDate] = useState('2025-01-01');
    const [toDate, setToDate] = useState('2025-03-31');
    
    // Voyage Data
    const [allVoyages, setAllVoyages] = useState([]);
    const [selectedVoyage, setSelectedVoyage] = useState('');

    // Analytics Data Container
    const [data, setData] = useState({
        metrics: {},
        fuelBreakdown: [],
        trendData: [],
        fuelTrend: [],
        fuelTrendPivoted: []
    });
    
    // --- CHART FILTER STATES ---
    const [activeFilters, setActiveFilters] = useState(['Daily_TotalGHG']);
    const [activeFuelFilters, setActiveFuelFilters] = useState([]); 
    const [activePieMetric, setActivePieMetric] = useState('GHG_MT'); 

    const [loading, setLoading] = useState(false);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // --- Configuration: DISTINCT COLORS ---
    
    // Expanded Palette for Pie Charts
    const PIE_COLORS = [
        '#2563eb', // Blue
        '#16a34a', // Green
        '#db2777', // Pink
        '#ea580c', // Orange
        '#7c3aed', // Violet
        '#0891b2', // Cyan
        '#d97706', // Amber
        '#4b5563', // Gray
        '#dc2626'  // Red
    ];

    // Specific Colors for Fuel Types
    const FUEL_COLORS = { 
        'HFO': '#8b5cf6',   // Violet
        'LFO': '#10b981',   // Emerald
        'MDO': '#f59e0b',   // Amber
        'MGO': '#f43f5e',   // Rose
        'LNG': '#3b82f6',   // Blue
        'LPG': '#06b6d4',   // Cyan
        'DIESEL_GAS_OIL': '#f64bc3' // Indigo
    };

    // DISTINCT COLORS for Daily Emissions Trend
    // Each category now has a unique, high-contrast color
    const EMISSION_TYPES = [
        { key: 'Daily_TotalGHG', label: 'Total GHG', color: '#16a34a' }, // Green
        { key: 'Daily_CO2', label: 'CO₂', color: '#374151' },             // Dark Gray
        { key: 'Daily_SOx', label: 'SOx', color: '#eab308' },             // Yellow (Sulphur)
        { key: 'Daily_NOx', label: 'NOx', color: '#2563eb' },             // Blue
        { key: 'Daily_PM', label: 'PM', color: '#78716c' },               // Stone/Brown
        { key: 'Daily_CH4', label: 'CH₄', color: '#f97316' },             // Orange
        { key: 'Daily_N2O', label: 'N₂O', color: '#9333ea' },             // Purple
    ];

    const PIE_METRICS = [
        { key: 'CO2_MT', label: 'CO₂' },
        { key: 'CH4_MT', label: 'CH₄' },
        { key: 'N2O_MT', label: 'N₂O' },
        { key: 'GHG_MT', label: 'Total GHG' },
        { key: 'SOx_MT', label: 'SOx' },
        { key: 'NOx_MT', label: 'NOx' },
        { key: 'PM_MT', label: 'PM' },
    ];

    // --- 1. Load Vessels on Mount ---
    useEffect(() => {
        const loadVessels = async () => {
            setLoading(true);
            try {
                const shipsData = await fetchVessels();
                setShips(shipsData || []);
                if (shipsData && shipsData.length > 0) setSelectedShip(shipsData[0].ShipID);
            } catch (err) {
                console.error("Failed to load vessels", err);
            } finally {
                setLoading(false);
            }
        };
        loadVessels();
    }, []);

    // --- 2. Load Voyage List when Ship Changes ---
    useEffect(() => {
        if (!selectedShip) return;
        const loadVoyages = async () => {
            try {
                const list = await fetchVoyageList(selectedShip);
                setAllVoyages(list || []);
                setSelectedVoyage('');
                loadAnalytics(selectedShip, fromDate, toDate, '');
            } catch (err) {
                console.error("Failed to load voyages", err);
            }
        };
        loadVoyages();
        // eslint-disable-next-line
    }, [selectedShip]);

    // --- 3. Main Data Fetch Function ---
    const loadAnalytics = async (shipId, start, end, voyage) => {
        setAnalyticsLoading(true);
        try {
            const result = await fetchVesselEmissionsAnalytics(shipId, start, end, voyage);
            if (result) {
                if (result.trendData) {
                    result.trendData = result.trendData.map(d => ({
                        ...d,
                        ReportDate: new Date(d.ReportDate).toLocaleDateString()
                    }));
                }
                
                let uniqueFuels = [];
                if (result.fuelTrend) {
                    const pivotMap = {};
                    uniqueFuels = [...new Set(result.fuelTrend.map(item => item.FuelTypeKey))];
                    
                    result.fuelTrend.forEach(item => {
                        const dateStr = new Date(item.ReportDate).toLocaleDateString();
                        if (!pivotMap[dateStr]) pivotMap[dateStr] = { ReportDate: dateStr };
                        pivotMap[dateStr][item.FuelTypeKey] = item.Consumed;
                    });
                    result.fuelTrendPivoted = Object.values(pivotMap).sort((a, b) => new Date(a.ReportDate) - new Date(b.ReportDate));
                }

                setActiveFuelFilters(uniqueFuels); 
                setData(result);
            }
        } catch (err) {
            console.error("Error loading analytics", err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // --- Handlers ---
    const handleUpdateClick = () => {
        if (selectedShip) loadAnalytics(selectedShip, fromDate, toDate, selectedVoyage);
    };

    const handleVoyageChange = (e) => {
        const vNum = e.target.value;
        setSelectedVoyage(vNum);
        if (vNum) {
            const selectedVObj = allVoyages.find(v => v.VoyageNumber === vNum);
            if (selectedVObj) {
                const start = new Date(selectedVObj.VoyageStart).toISOString().split('T')[0];
                const end = selectedVObj.VoyageEnd 
                    ? new Date(selectedVObj.VoyageEnd).toISOString().split('T')[0] 
                    : new Date().toISOString().split('T')[0];
                setFromDate(start);
                setToDate(end);
                loadAnalytics(selectedShip, start, end, vNum);
                return;
            }
        }
        loadAnalytics(selectedShip, fromDate, toDate, vNum);
    };

    const toggleFilter = (key) => {
        if (activeFilters.includes(key)) {
            if (activeFilters.length > 1) setActiveFilters(activeFilters.filter(k => k !== key));
        } else {
            setActiveFilters([...activeFilters, key]);
        }
    };

    const toggleFuelFilter = (key) => {
        if (activeFuelFilters.includes(key)) {
            if (activeFuelFilters.length > 1) setActiveFuelFilters(activeFuelFilters.filter(k => k !== key));
        } else {
            setActiveFuelFilters([...activeFuelFilters, key]);
        }
    };

    const formatNum = (val, dec = 2) => val ? Number(val).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '0';

    const getCIIRating = (cii) => {
        if (!cii || cii <= 0) return { grade: 'N/A', color: 'gray' };
        if (cii < 5) return { grade: 'A', color: '#22c55e' }; 
        if (cii < 10) return { grade: 'B', color: '#84cc16' }; 
        if (cii < 20) return { grade: 'C', color: '#eab308' }; 
        if (cii < 30) return { grade: 'D', color: '#f97316' }; 
        return { grade: 'E', color: '#ef4444' }; 
    };

    const ciiInfo = getCIIRating(data.metrics.AttainedCII);
    const presentFuelKeys = data.fuelBreakdown ? [...new Set(data.fuelBreakdown.map(f => f.FuelTypeKey))] : [];

    if (loading && !ships.length) {
        return (
            <RotatingBackground pageKey="MEMP-OVERVIEW">
                <div className="flex items-center justify-center h-screen">
                    <h2 className="text-white text-2xl animate-pulse">Loading Emissions Data...</h2>
                </div>
            </RotatingBackground>
        );
    }

    return (
        <RotatingBackground pageKey="MEMP-OVERVIEW">
            <div className="vessel-dashboard-page" style={{ padding: '20px', width: '100%', minHeight: '100vh' }}>
                
                {/* --- HEADER CONTROLS --- */}
                <div className="dashboard-card mb-6 flex flex-wrap items-end gap-4 bg-white/95 text-gray-800 p-5 rounded-lg shadow">
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600 text-sm">Vessel:</label>
                        <select value={selectedShip} onChange={(e) => setSelectedShip(e.target.value)} className="border border-gray-300 rounded p-2 text-gray-800 font-medium h-10 min-w-[200px]">
                            {ships.map(s => <option key={s.ShipID} value={s.ShipID}>{s.ShipName}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600 text-sm">From:</label>
                        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-gray-300 rounded p-2 h-10 text-gray-800"/>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600 text-sm">To:</label>
                        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border border-gray-300 rounded p-2 h-10 text-gray-800"/>
                    </div>
                    <button onClick={handleUpdateClick} disabled={analyticsLoading} className="h-10 px-6 rounded shadow text-white font-bold bg-blue-600 hover:bg-blue-700 transition">
                        {analyticsLoading ? 'Loading...' : 'Update'}
                    </button>
                    <div className="w-px h-10 bg-gray-300 mx-2 hidden md:block"></div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600 text-sm">Filter by Voyage:</label>
                        <select value={selectedVoyage} onChange={handleVoyageChange} className="border border-gray-300 rounded p-2 text-gray-800 font-medium h-10 min-w-[200px]">
                            <option value="">-- All Voyages --</option>
                            {allVoyages.map(v => <option key={v.VoyageNumber} value={v.VoyageNumber}>{v.VoyageNumber}</option>)}
                        </select>
                    </div>
                </div>

                {selectedShip ? (
                    <>
                        {/* --- ROW 1: CII RATING (Single Card, same size as others) --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4" style={{ borderColor: ciiInfo.color }}>
                                <h3 className="text-gray-600 font-bold text-sm uppercase">CII Rating</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <div className="flex items-baseline">
                                        <span className="text-5xl font-extrabold" style={{ color: ciiInfo.color }}>{ciiInfo.grade}</span>
                                        <span className="ml-2 text-gray-500 font-medium text-sm">({formatNum(data.metrics.AttainedCII, 2)})</span>
                                    </div>
                                    <span className="text-xs text-gray-400">gCO2 / dwt-nm</span>
                                </div>
                            </div>
                        </div>

                        {/* --- ROW 2: FUEL, CO2, CH4, N2O --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            {/* 1. Total Fuel */}
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-500">
                                <h3 className="text-gray-600 font-bold text-sm uppercase">Total Fuel</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-4xl font-bold text-blue-700">{formatNum(data.metrics.TotalFuel)}</span>
                                    <span className="text-sm text-gray-500 font-bold mb-1">MT</span>
                                </div>
                            </div>
                            {/* 2. Total CO2 */}
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-gray-600">
                                <h3 className="text-gray-600 font-bold text-sm uppercase">Total CO₂</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-4xl font-bold text-gray-700">{formatNum(data.metrics.TotalCO2)}</span>
                                    <span className="text-sm text-gray-500 font-bold mb-1">MT</span>
                                </div>
                            </div>
                            {/* 3. Methane */}
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-orange-500">
                                <h3 className="text-gray-600 font-bold text-sm uppercase">Methane (CH₄)</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-4xl font-bold text-orange-700">{formatNum(data.metrics.TotalCH4, 4)}</span>
                                    <span className="text-sm text-gray-500 font-bold mb-1">MT</span>
                                </div>
                            </div>
                            {/* 4. N2O */}
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-purple-500">
                                <h3 className="text-gray-600 font-bold text-sm uppercase">Nitrous Oxide (N₂O)</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-4xl font-bold text-purple-700">{formatNum(data.metrics.TotalN2O, 4)}</span>
                                    <span className="text-sm text-gray-500 font-bold mb-1">MT</span>
                                </div>
                            </div>
                        </div>

                        {/* --- ROW 3: GHG, SOx, NOx, PM --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            {/* 1. GHG */}
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-green-600">
                                <h3 className="text-gray-600 font-bold text-sm uppercase">Total GHG (CO₂e)</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-4xl font-bold text-green-700">{formatNum(data.metrics.TotalGHG)}</span>
                                    <span className="text-sm text-gray-500 font-bold mb-1">MT</span>
                                </div>
                            </div>
                            {/* 2. SOx */}
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-yellow-500">
                                <h3 className="text-gray-600 font-bold text-sm uppercase">Sulphur Oxides (SOx)</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-3xl font-bold text-yellow-600">{formatNum(data.metrics.TotalSOx, 3)}</span>
                                    <span className="text-sm text-gray-500 font-bold mb-1">MT</span>
                                </div>
                            </div>
                            {/* 3. NOx */}
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-600">
                                <h3 className="text-gray-600 font-bold text-sm uppercase">Nitrogen Oxides (NOx)</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-3xl font-bold text-blue-700">{formatNum(data.metrics.TotalNOx, 3)}</span>
                                    <span className="text-sm text-gray-500 font-bold mb-1">MT</span>
                                </div>
                            </div>
                            {/* 4. PM */}
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-gray-500">
                                <h3 className="text-gray-600 font-bold text-sm uppercase">Particulate Matter (PM)</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-3xl font-bold text-gray-600">{formatNum(data.metrics.TotalPM, 3)}</span>
                                    <span className="text-sm text-gray-500 font-bold mb-1">MT</span>
                                </div>
                            </div>
                        </div>

                        {/* --- ROW 4: FUEL CONSUMPTION TREND (FULL WIDTH) --- */}
                        <div className="w-full mb-6">
                            <div className="bg-white/95 rounded-lg shadow-lg p-5">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 mb-4 gap-2">
                                    <h3 className="text-lg font-bold text-gray-800">Fuel Consumption Trend</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {presentFuelKeys.map((key, index) => (
                                            <button
                                                key={key}
                                                onClick={() => toggleFuelFilter(key)}
                                                className={`px-2 py-1 rounded text-[10px] font-bold transition border ${
                                                    activeFuelFilters.includes(key) 
                                                    ? 'text-white' 
                                                    : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-100'
                                                }`}
                                                style={{ 
                                                    backgroundColor: activeFuelFilters.includes(key) ? (FUEL_COLORS[key] || PIE_COLORS[index % PIE_COLORS.length]) : undefined,
                                                    borderColor: activeFuelFilters.includes(key) ? (FUEL_COLORS[key] || PIE_COLORS[index % PIE_COLORS.length]) : undefined
                                                }}
                                            >
                                                {key}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.fuelTrendPivoted} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="ReportDate" />
                                            <YAxis label={{ value: 'MT', angle: -90, position: 'insideLeft' }} />
                                            <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(val) => `${formatNum(val, 2)} MT`} />
                                            <Legend />
                                            {presentFuelKeys.map((key, index) => (
                                                activeFuelFilters.includes(key) && (
                                                    <Bar key={key} dataKey={key} stackId="a" fill={FUEL_COLORS[key] || PIE_COLORS[index % PIE_COLORS.length]} />
                                                )
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* --- ROW 5: PIE CHART (1/3 WIDTH) --- */}
                        <div className="flex flex-wrap mb-6">
                            <div className="w-full lg:w-1/3 pr-0 lg:pr-4 mb-6 lg:mb-0">
                                <div className="bg-white/95 rounded-lg shadow-lg p-5">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 mb-4 gap-2">
                                        <h3 className="text-lg font-bold text-gray-800">
                                            {PIE_METRICS.find(m => m.key === activePieMetric)?.label || 'Total GHG'} Breakdown
                                        </h3>
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {PIE_METRICS.map(metric => (
                                                <button
                                                    key={metric.key}
                                                    onClick={() => setActivePieMetric(metric.key)}
                                                    className={`px-2 py-1 rounded text-[10px] font-bold transition border ${
                                                        activePieMetric === metric.key 
                                                        ? 'bg-blue-600 text-white border-blue-600' 
                                                        : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {metric.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie 
                                                    data={data.fuelBreakdown} 
                                                    dataKey={activePieMetric} 
                                                    nameKey="FuelTypeKey" 
                                                    cx="50%" cy="50%" 
                                                    outerRadius={100} 
                                                    label={({ FuelTypeKey, percent }) => percent > 0 ? `${FuelTypeKey} ${(percent * 100).toFixed(0)}%` : ''}
                                                >
                                                    {data.fuelBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={FUEL_COLORS[entry.FuelTypeKey] || PIE_COLORS[index % PIE_COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(val) => `${formatNum(val)} MT`} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                            {/* Empty space for future pie charts (2/3 width) */}
                            <div className="w-full lg:w-2/3"></div>
                        </div>

                        {/* --- ROW 6: EMISSIONS TREND (KEPT AT BOTTOM) --- */}
                        <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full mb-8">
                            <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4 mb-4 gap-4">
                                <h3 className="text-xl font-bold text-gray-800">Daily Emissions Trend</h3>
                                <div className="flex flex-wrap gap-2">
                                    {EMISSION_TYPES.map(type => (
                                        <button
                                            key={type.key}
                                            onClick={() => toggleFilter(type.key)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition border ${
                                                activeFilters.includes(type.key) 
                                                ? 'text-white' 
                                                : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-100'
                                            }`}
                                            style={{ 
                                                backgroundColor: activeFilters.includes(type.key) ? type.color : undefined,
                                                borderColor: activeFilters.includes(type.key) ? type.color : undefined
                                            }}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="ReportDate" />
                                        <YAxis />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}
                                            formatter={(val) => `${formatNum(val, 3)} MT`} 
                                        />
                                        <Legend />
                                        {EMISSION_TYPES.map(type => (
                                            activeFilters.includes(type.key) && (
                                                <Line 
                                                    key={type.key}
                                                    type="monotone" 
                                                    dataKey={type.key} 
                                                    stroke={type.color} 
                                                    name={type.label} 
                                                    strokeWidth={3} 
                                                    dot={{ r: 4 }} 
                                                    activeDot={{ r: 6 }}
                                                />
                                            )
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* --- TABLE ROW --- */}
                        <div className="bg-white/95 rounded-lg shadow-lg p-6 mb-8">
                            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Emissions Breakdown by Fuel</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-700">
                                            <th className="p-3 border-b">Fuel Type</th>
                                            <th className="p-3 border-b">Fuel (MT)</th>
                                            <th className="p-3 border-b text-right">CO₂ (MT)</th>
                                            <th className="p-3 border-b text-right">CH₄ (MT)</th>
                                            <th className="p-3 border-b text-right">N₂O (MT)</th>
                                            <th className="p-3 border-b text-right font-bold text-green-700">Total GHG (MT)</th>
                                            <th className="p-3 border-b text-right text-purple-700">SOx (MT)</th>
                                            <th className="p-3 border-b text-right text-orange-700">NOx (MT)</th>
                                            <th className="p-3 border-b text-right text-gray-600">PM (MT)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.fuelBreakdown.length > 0 ? (
                                            data.fuelBreakdown.map((row, idx) => (
                                                <tr key={idx} className="border-b hover:bg-gray-50">
                                                    <td className="p-3 font-medium">{row.FuelTypeKey}</td>
                                                    <td className="p-3">{formatNum(row.Fuel_MT)}</td>
                                                    <td className="p-3 text-right">{formatNum(row.CO2_MT)}</td>
                                                    <td className="p-3 text-right">{formatNum(row.CH4_MT, 4)}</td>
                                                    <td className="p-3 text-right">{formatNum(row.N2O_MT, 4)}</td>
                                                    <td className="p-3 text-right font-bold text-green-700">{formatNum(row.GHG_MT)}</td>
                                                    <td className="p-3 text-right text-purple-700">{formatNum(row.SOx_MT, 3)}</td>
                                                    <td className="p-3 text-right text-orange-700">{formatNum(row.NOx_MT, 3)}</td>
                                                    <td className="p-3 text-right text-gray-600">{formatNum(row.PM_MT, 4)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="9" className="p-5 text-center text-gray-500">No data found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-64 bg-white/10 backdrop-blur rounded-lg">
                        <h3 className="text-white text-xl">Please select a vessel.</h3>
                    </div>
                )}
            </div>
        </RotatingBackground>
    );
};

export default VesselEmissionsPage;