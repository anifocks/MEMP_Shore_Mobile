import React, { useState, useEffect, useMemo } from 'react';
import RotatingBackground from '../components/RotatingBackground'; 
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar, LineChart, Line
} from 'recharts';

import { 
    fetchVessels, 
    fetchMachineryRecordById, 
    fetchMachineryAnalytics, 
    fetchSFOCAnalytics, 
    fetchAssignedMachinery,
    fetchVoyageList 
} from '../api'; 

import './VesselMachineryDataPage.css'; 

const VesselMachineryDataPage = () => {
    
    // --- State Management ---
    const [ships, setShips] = useState([]); 
    const [selectedShip, setSelectedShip] = useState(''); 
    
    // Data States
    const [activeId, setActiveId] = useState(null); 
    const [machinery, setMachinery] = useState(null); 
    const [machineryList, setMachineryList] = useState([]); 

    // Analytics Data
    const [analytics, setAnalytics] = useState({ 
        powerStats: {}, fuelStats: [], auditData: [], pieData: [], fuelTrend: [], bdnData: [] 
    });
    const [sfocData, setSfocData] = useState([]); 

    // --- Filter States ---
    const [fromDate, setFromDate] = useState('2025-01-01');
    const [toDate, setToDate] = useState('2025-03-31');

    // Voyage State
    const [allVoyages, setAllVoyages] = useState([]); 
    const [selectedVoyage, setSelectedVoyage] = useState('');

    const [loading, setLoading] = useState(false);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [error, setError] = useState('');

    // --- Chart Visibility / Filter States ---
    const [visiblePurposes, setVisiblePurposes] = useState([]); 
    const [showPurposeFilter, setShowPurposeFilter] = useState(false);
    const [visibleFuels, setVisibleFuels] = useState([]);
    const [bdnFuelFilter, setBdnFuelFilter] = useState('');
    const [availableBdnFuels, setAvailableBdnFuels] = useState([]);

    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    const BAR_COLORS = { 'HFO': '#8884d8', 'LFO': '#82ca9d', 'MDO': '#ffc658', 'MGO': '#ff8042', 'DIESEL_GAS_OIL': '#ff7300' };

    // --- HELPER: Pollutant Calculations ---
    const calculatePollutants = (fuelConsumed, sulphurPercent, fuelType) => {
        const fc = parseFloat(fuelConsumed) || 0;
        const s = parseFloat(sulphurPercent) || 0.5; 
        const sox = fc * (s / 100) * 2;
        const nox = fc * 0.07; 
        const fType = fuelType ? fuelType.toUpperCase() : '';
        const isClean = fType.includes('MGO') || fType.includes('LFO') || fType.includes('GAS') || fType.includes('DIESEL');
        const pmFactor = isClean ? 0.001 : 0.007; 
        const pm = fc * pmFactor;
        return { sox, nox, pm };
    };

    // --- 1. Load Vessels on Mount ---
    useEffect(() => {
        const loadVessels = async () => {
            setLoading(true);
            try {
                const shipsData = await fetchVessels();
                setShips(shipsData || []);
                if (shipsData && shipsData.length > 0) setSelectedShip(shipsData[0].ShipID);
            } catch (err) {
                console.error("Vessel Load Error:", err);
                setError("Failed to load vessel list.");
            } finally {
                setLoading(false);
            }
        };
        loadVessels();
    }, []);

    // --- 2. Load Machinery & All Voyages when Ship Changes ---
    useEffect(() => {
        if (!selectedShip) return;

        const initShipData = async () => {
            setLoading(true);
            try {
                const [machList, voyageList] = await Promise.all([
                    fetchAssignedMachinery(selectedShip),
                    fetchVoyageList(selectedShip)
                ]);

                setMachineryList(machList || []);
                setAllVoyages(voyageList || []); 
                setSelectedVoyage(''); 
                
                if (machList && machList.length > 0) {
                    const firstMachineId = machList[0].MachineryRecordID;
                    setActiveId(firstMachineId);
                    // Pass null for voyage initially
                    await loadAllData(firstMachineId, fromDate, toDate, null);
                } else {
                    setMachineryList([]);
                    setMachinery(null);
                    setError("No machinery assigned to this vessel.");
                }
            } catch (err) {
                console.error("Initialization Error:", err);
                setError("Failed to load ship data.");
            } finally {
                setLoading(false);
            }
        };

        initShipData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedShip]);

    // --- 3. Filter Voyages based on Selected Date Range ---
    const filteredVoyages = useMemo(() => {
        if (!fromDate || !toDate) {
            return allVoyages;
        }
        try {
            const start = new Date(fromDate);
            const end = new Date(toDate);
            
            // Set time to end of day for 'end' date to include all of that day.
            end.setHours(23, 59, 59, 999);

            return allVoyages.filter(v => {
                if (!v.VoyageStart) return false;
                const vStart = new Date(v.VoyageStart);
                // If voyage end is not set, consider it ongoing.
                const vEnd = v.VoyageEnd ? new Date(v.VoyageEnd) : new Date(); 
                // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
                return vStart <= end && vEnd >= start;
            });
        } catch (e) {
            console.error("Error filtering voyages by date:", e);
            return allVoyages; // Return all if dates are invalid
        }
    }, [allVoyages, fromDate, toDate]);

    // --- 4. Main Data Loader (UPDATED to accept voyage) ---
    const loadAllData = async (id, fDate, tDate, voyage) => {
        setAnalyticsLoading(true);
        try {
            // 🟢 UPDATED: Pass 'voyage' to the API calls
            const [detailsData, analyticsData, sfocRawData] = await Promise.all([
                fetchMachineryRecordById(id),
                fetchMachineryAnalytics(id, fDate, tDate, voyage),
                fetchSFOCAnalytics(id, fDate, tDate, voyage)
            ]);

            setMachinery(detailsData);
            setAnalytics(analyticsData || { powerStats: {}, fuelStats: [], auditData: [], pieData: [], fuelTrend: [], bdnData: [] });
            
            if (sfocRawData && Array.isArray(sfocRawData)) {
                const processedSfoc = sfocRawData.map(item => ({
                    ...item,
                    date: new Date(item.ReportDate).toLocaleDateString()
                }));
                setSfocData(processedSfoc);
            } else {
                setSfocData([]);
            }

            if (analyticsData) {
                if(analyticsData.pieData) setVisiblePurposes(analyticsData.pieData.map(item => item.name));
                if (analyticsData.fuelTrend) {
                    const fuels = [...new Set(analyticsData.fuelTrend.map(item => item.FuelTypeKey))];
                    setVisibleFuels(fuels);
                }
                if (analyticsData.bdnData && analyticsData.bdnData.length > 0) {
                    const uniqueFuels = [...new Set(analyticsData.bdnData.map(item => item.FuelTypeKey))];
                    setAvailableBdnFuels(uniqueFuels);
                    if(!bdnFuelFilter) setBdnFuelFilter(uniqueFuels[0]);
                }
            }
            setError(''); 
        } catch (err) {
            console.error("Data Load Error:", err);
            setError("Failed to load analytics data.");
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // --- Handlers ---
    const handleDateSearch = () => {
        if (activeId) {
            // 🟢 UPDATED: Pass currently selected voyage
            loadAllData(activeId, fromDate, toDate, selectedVoyage);
        }
    };

    const handleVoyageChange = (e) => {
        const vNum = e.target.value;
        setSelectedVoyage(vNum);

        if (vNum) {
            const selectedVObj = allVoyages.find(v => v.VoyageNumber === vNum);
            if (selectedVObj) {
                // 🟢 Update Date Range to match selected voyage automatically
                const start = new Date(selectedVObj.VoyageStart).toISOString().split('T')[0];
                const end = selectedVObj.VoyageEnd 
                    ? new Date(selectedVObj.VoyageEnd).toISOString().split('T')[0] 
                    : new Date().toISOString().split('T')[0];

                setFromDate(start);
                setToDate(end);
                
                if (activeId) {
                    // 🟢 UPDATED: Call with the specific Voyage Number immediately
                    loadAllData(activeId, start, end, vNum);
                }
            }
        } else {
             // Handle clear selection
             if (activeId) {
                loadAllData(activeId, fromDate, toDate, null);
            }
        }
    };

    const handleSwitchMachinery = async (e) => {
        const newId = parseInt(e.target.value);
        if (newId && newId !== activeId) {
            setActiveId(newId);
            // 🟢 UPDATED: Pass currently selected voyage
            await loadAllData(newId, fromDate, toDate, selectedVoyage);
        }
    };

    const togglePurpose = (p) => setVisiblePurposes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    const formatNum = (v, d = 0) => (v === undefined || v === null) ? '0' : Number(v).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

    if (loading && !ships.length) {
        return (
            <RotatingBackground pageKey="MEMP-OVERVIEW">
                <div className="vessel-dashboard-page flex items-center justify-center h-screen">
                    <h2 className="text-white text-2xl animate-pulse">Loading Application...</h2>
                </div>
            </RotatingBackground>
        );
    }

    const { powerStats, fuelStats, auditData, pieData, fuelTrend, bdnData } = analytics;
    
    const showFuel = !!machinery?.Fuel_Consumption;
    const showPower = !!machinery?.Power;
    const showRPM = !!machinery?.Rpm;
    const allowedSFOC = ['MAIN_ENGINE', 'DIESEL_GENERATOR'];
    const showSFOC = machinery && allowedSFOC.includes(machinery.MachineryTypeKey);

    const filteredPieData = (pieData || []).filter(item => visiblePurposes.includes(item.name));
    const filteredBdnData = (bdnData || []).filter(item => item.FuelTypeKey === bdnFuelFilter).map(item => ({ name: item.BDN_Number, value: item.Bunker_Consumption }));
    
    const totalEmissions = (auditData || []).reduce((acc, row) => {
        const pol = calculatePollutants(row.Fuel_Consumed_MT, row.Sulphur_Percent, row.Fuel_Type);
        return {
            CO2: acc.CO2 + (row.CO2_Emissions || 0),
            CH4: acc.CH4 + (row.CH4_Emissions || 0),
            N2O: acc.N2O + (row.N2O_Emissions || 0),
            TotalGHG: acc.TotalGHG + (row.Total_GHG || 0),
            SOx: acc.SOx + pol.sox,
            NOx: acc.NOx + pol.nox,
            PM: acc.PM + pol.pm
        };
    }, { CO2: 0, CH4: 0, N2O: 0, TotalGHG: 0, SOx: 0, NOx: 0, PM: 0 });

    const graphData = (auditData || []).filter(d => d.Power > 0 && d.RPM > 0).map(d => ({ rpm: d.RPM, power: d.Power, date: new Date(d.ReportDate).toLocaleDateString() }));
    
    const barChartData = [];
    if (fuelTrend) {
        const groupedFuel = {};
        fuelTrend.forEach(item => {
            const d = new Date(item.ReportDate).toLocaleDateString();
            if (!groupedFuel[d]) groupedFuel[d] = { date: d };
            groupedFuel[d][item.FuelTypeKey] = item.Consumed;
        });
        for (const date in groupedFuel) barChartData.push(groupedFuel[date]);
        barChartData.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    const stickyThStyle = { position: 'sticky', top: 0, backgroundColor: '#1f2937', zIndex: 50, borderBottom: '1px solid #374151', padding: '12px', textAlign: 'left', fontWeight: '700', color: '#e5e7eb', whiteSpace: 'nowrap' };

    return (
        <RotatingBackground pageKey="MEMP-OVERVIEW">
            <div className="vessel-dashboard-page" style={{ padding: '20px', width: '100%', minHeight: '100vh' }}>
                
                {/* --- HEADER --- */}
                <div className="dashboard-card mb-6 flex flex-wrap items-end gap-4 bg-white/95 text-gray-800 p-5 rounded-lg shadow">
                    
                    {/* Vessel */}
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600 text-sm">Vessel:</label>
                        <select 
                            value={selectedShip} 
                            onChange={(e) => setSelectedShip(e.target.value)}
                            className="border border-gray-300 rounded p-2 text-gray-800 font-medium h-10 min-w-[200px]"
                        >
                            <option value="">-- Choose Vessel --</option>
                            {ships.map(ship => (
                                <option key={ship.ShipID} value={ship.ShipID}>{ship.ShipName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Dates */}
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600 text-sm">From Date:</label>
                        <input 
                            type="date" 
                            value={fromDate} 
                            onChange={(e) => setFromDate(e.target.value)} 
                            className="border border-gray-300 rounded p-2 h-10 text-gray-800"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600 text-sm">To Date:</label>
                        <input 
                            type="date" 
                            value={toDate} 
                            onChange={(e) => setToDate(e.target.value)} 
                            className="border border-gray-300 rounded p-2 h-10 text-gray-800"
                        />
                    </div>

                    {/* Action */}
                    <button 
                        onClick={handleDateSearch} 
                        disabled={analyticsLoading || !activeId} 
                        className={`h-10 px-6 rounded shadow text-white font-bold transition ${analyticsLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {analyticsLoading ? 'Fetching...' : 'Load Data'}
                    </button>

                    <div className="w-px h-10 bg-gray-300 mx-2 hidden md:block"></div>

                    {/* Voyage Selection */}
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600 text-sm">
                            Select Voyage <span className="font-normal text-xs text-gray-400">({filteredVoyages.length} available)</span>:
                        </label>
                        <select 
                            value={selectedVoyage} 
                            onChange={handleVoyageChange}
                            disabled={!selectedShip}
                            className="border border-gray-300 rounded p-2 text-gray-800 font-medium h-10 min-w-[200px] disabled:bg-gray-100"
                        >
                            <option value="">-- Select Voyage --</option>
                            {filteredVoyages.map(v => (
                                <option key={v.VoyageNumber} value={v.VoyageNumber}>
                                    {v.VoyageNumber} ({new Date(v.VoyageStart).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {machinery ? (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white text-shadow-md m-0">{machinery.CustomMachineryName}</h1>
                                <span className="text-gray-200 text-sm">{machinery.MachineryTypeDescription}</span>
                            </div>
                            <div className="bg-white/90 p-2 rounded shadow flex items-center gap-2">
                                <span className="text-gray-700 font-bold text-sm">Switch Machine:</span>
                                <select 
                                    value={activeId || ''} 
                                    onChange={handleSwitchMachinery} 
                                    className="border border-gray-300 rounded p-1 text-gray-800 font-medium outline-none min-w-[200px]"
                                >
                                    {machineryList.map(m => (
                                        <option key={m.MachineryRecordID} value={m.MachineryRecordID}>{m.CustomMachineryName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ROW 1: METRICS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 w-full">
                             <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-500">
                                <div className="flex items-center mb-4 border-b pb-2">
                                    <h3 className="text-lg font-bold text-gray-700 m-0">Performance</h3>
                                </div>
                                <div className="space-y-4">
                                    {showPower && <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Total Power</span><span className="text-2xl font-bold text-gray-800">{formatNum(powerStats?.Total_Power)} <small className="text-sm text-gray-500">kW</small></span></div>}
                                    {showPower && <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Avg Power</span><span className="text-2xl font-bold text-gray-800">{formatNum(powerStats?.Avg_Power, 2)} <small className="text-sm text-gray-500">kW</small></span></div>}
                                    <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Running Hrs</span><span className="text-2xl font-bold text-gray-800">{formatNum(powerStats?.Running_Hrs)} <small className="text-sm text-gray-500">hrs</small></span></div>
                                </div>
                            </div>
                            
                            {showFuel && (
                                <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500">
                                    <div className="flex items-center mb-4 border-b pb-2">
                                        <h3 className="text-lg font-bold text-gray-700 m-0">Fuel Consumption</h3>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {fuelStats && fuelStats.length > 0 ? fuelStats.map((f, idx) => (
                                            <div key={idx} className="flex justify-between items-center border-b border-gray-100 last:border-0 pb-2">
                                                <span className="text-gray-600 font-medium">{f.FuelTypeKey}</span>
                                                <span className="text-xl font-bold text-gray-800">{formatNum(f.Fuel_Consumed, 1)} <small className="text-sm text-gray-500">MT</small></span>
                                            </div>
                                        )) : <div className="text-center text-gray-400 py-4 italic">No data.</div>}
                                    </div>
                                </div>
                            )}

                             {showFuel && (
                                <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-green-500">
                                    <div className="flex items-center mb-4 border-b pb-2">
                                        <h3 className="text-lg font-bold text-gray-700 m-0">Greenhouse Gases</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-gray-600">CO₂</span><span className="font-bold text-gray-800">{formatNum(totalEmissions.CO2, 2)} MT</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600">CH₄</span><span className="font-bold text-gray-800">{formatNum(totalEmissions.CH4, 4)} MT</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600">N₂O</span><span className="font-bold text-gray-800">{formatNum(totalEmissions.N2O, 4)} MT</span></div>
                                        <div className="flex justify-between border-t pt-1 mt-1"><span className="text-gray-800 font-bold">Total GHG (CO₂e)</span><span className="font-bold text-green-600">{formatNum(totalEmissions.TotalGHG, 2)} MT</span></div>
                                    </div>
                                </div>
                            )}
                        </div>

                         {showFuel && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">
                                <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-purple-500">
                                    <h3 className="text-lg font-bold text-gray-700 m-0 mb-2">Sulphur Oxides (SOx)</h3>
                                    <div className="flex justify-between items-end">
                                        <span className="text-3xl font-bold text-purple-600">{formatNum(totalEmissions.SOx, 3)}</span>
                                        <span className="text-gray-500 font-medium mb-1">MT</span>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-orange-500">
                                    <h3 className="text-lg font-bold text-gray-700 m-0 mb-2">Nitrogen Oxides (NOx)</h3>
                                    <div className="flex justify-between items-end">
                                        <span className="text-3xl font-bold text-orange-600">{formatNum(totalEmissions.NOx, 3)}</span>
                                        <span className="text-gray-500 font-medium mb-1">MT</span>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-gray-500">
                                    <h3 className="text-lg font-bold text-gray-700 m-0 mb-2">Particulate Matter (PM)</h3>
                                    <div className="flex justify-between items-end">
                                        <span className="text-3xl font-bold text-gray-600">{formatNum(totalEmissions.PM, 4)}</span>
                                        <span className="text-gray-500 font-medium mb-1">MT</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* GRAPHS (Length checks removed to ensure appearance) */}
                        {showSFOC && (
                            <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full mb-8">
                                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Specific Fuel Oil Consumption (SFOC)</h3>
                                <div style={{ width: '100%', height: 350, minHeight: 350 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={sfocData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis domain={['auto', 'auto']} label={{ value: 'g/kWh', angle: -90, position: 'insideLeft' }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#333', border: '1px solid #ddd' }} />
                                            <Legend />
                                            <Line type="monotone" dataKey="SFOC" stroke="#e11d48" strokeWidth={3} name="SFOC" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {showFuel && barChartData.length > 0 && (
                            <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full mb-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Fuel Consumption Trend</h3>
                                <div style={{ width: '100%', height: 350, minHeight: 350 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip cursor={{fill: '#f3f4f6'}} />
                                            <Legend />
                                            {visibleFuels.map((key, i) => <Bar key={key} dataKey={key} fill={BAR_COLORS[key] || PIE_COLORS[i]} stackId="a" />)}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {showPower && showRPM && (
                            <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full mb-8">
                                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Power vs RPM Analysis</h3>
                                <div style={{ width: '100%', height: 400, minHeight: 400 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" dataKey="rpm" name="RPM" unit=" rpm" />
                                            <YAxis type="number" dataKey="power" name="Power" unit=" kW" />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                            <Scatter name="Engine Performance" data={graphData} fill="#2563eb" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {pieData && (
                                <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full">
                                    <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Reports by Purpose</h3>
                                    <div style={{ width: '100%', height: 350, minHeight: 350 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={filteredPieData} cx="50%" cy="50%" outerRadius={110} fill="#8884d8" dataKey="value">
                                                    {filteredPieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                                                </Pie>
                                                <Legend />
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {showFuel && (
                                <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full">
                                    <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">BDN Usage (%)</h3>
                                    <div style={{ width: '100%', height: 350, minHeight: 350 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={filteredBdnData} cx="50%" cy="50%" outerRadius={110} fill="#82ca9d" dataKey="value">
                                                    {filteredBdnData.map((entry, index) => (<Cell key={`cell-bdn-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                                                </Pie>
                                                <Legend />
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full mb-8">
                            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Machinery Status Audit</h3>
                            <div className="table-responsive" style={{ maxHeight: '800px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                                <table className="w-full text-left border-collapse" style={{ minWidth: '1600px' }}>
                                    <thead>
                                        <tr>
                                            <th style={stickyThStyle}>Report Date</th>
                                            <th style={stickyThStyle}>Purpose</th>
                                            {showPower && <th style={stickyThStyle}>Power (kW)</th>}
                                            {showRPM && <th style={stickyThStyle}>RPM</th>}
                                            <th style={stickyThStyle}>Running Hrs</th>
                                            {showFuel && <th style={stickyThStyle}>Fuel Type</th>}
                                            {showFuel && <th style={stickyThStyle}>Fuel MT</th>}
                                            {showFuel && <th style={stickyThStyle}>CO₂ (MT)</th>}
                                            {showFuel && <th style={stickyThStyle}>Total GHG (MT)</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditData && auditData.length > 0 ? auditData.map((row, index) => {
                                            const pol = calculatePollutants(row.Fuel_Consumed_MT, row.Sulphur_Percent, row.Fuel_Type);
                                            return (
                                                <tr key={index} className="hover:bg-gray-50 border-b">
                                                    <td className="p-3">{new Date(row.ReportDate).toLocaleDateString()}</td>
                                                    <td className="p-3">{row.Purpose || '-'}</td>
                                                    {showPower && <td className="p-3">{formatNum(row.Power)}</td>}
                                                    {showRPM && <td className="p-3">{row.RPM || '-'}</td>}
                                                    <td className="p-3">{formatNum(row.Running_Hrs)}</td>
                                                    {showFuel && <td className="p-3">{row.Fuel_Type}</td>}
                                                    {showFuel && <td className="p-3">{formatNum(row.Fuel_Consumed_MT, 2)}</td>}
                                                    {showFuel && <td className="p-3">{formatNum(row.CO2_Emissions, 3)}</td>}
                                                    {showFuel && <td className="p-3 font-bold">{formatNum(row.Total_GHG, 3)}</td>}
                                                </tr>
                                            );
                                        }) : <tr><td colSpan={15} className="p-8 text-center text-gray-500 italic">No report data found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-64 bg-white/10 backdrop-blur rounded-lg">
                        <h3 className="text-white text-xl">Please select a vessel to view machinery data.</h3>
                    </div>
                )}
            </div>
        </RotatingBackground>
    );
};

export default VesselMachineryDataPage;