// Shore-Client/src/pages/MachineryDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RotatingBackground from '../components/RotatingBackground';
import { 
    fetchMachineryRecordById, 
    fetchMachineryAnalytics,
    fetchAssignedMachinery 
} from '../api';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar
} from 'recharts';
import './MachineryPage.css'; 

const MachineryDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [machinery, setMachinery] = useState(null);
    const [machineryList, setMachineryList] = useState([]); 
    
    const [analytics, setAnalytics] = useState({ 
        powerStats: {}, 
        fuelStats: [], 
        auditData: [],
        pieData: [],
        fuelTrend: [],
        bdnData: [] // New State
    });

    // --- Filter States ---
    const [visiblePurposes, setVisiblePurposes] = useState([]); 
    const [showPurposeFilter, setShowPurposeFilter] = useState(false);

    const [availableFuels, setAvailableFuels] = useState([]);
    const [visibleFuels, setVisibleFuels] = useState([]);
    const [showFuelFilter, setShowFuelFilter] = useState(false);
    
    // BDN Filter State
    const [bdnFuelFilter, setBdnFuelFilter] = useState('');
    const [availableBdnFuels, setAvailableBdnFuels] = useState([]);

    const [fromDate, setFromDate] = useState('2025-01-01');
    const [toDate, setToDate] = useState('2025-03-31');

    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [error, setError] = useState('');

    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    const BAR_COLORS = { 'HFO': '#8884d8', 'LFO': '#82ca9d', 'MDO': '#ffc658', 'MGO': '#ff8042', 'DIESEL_GAS_OIL': '#ff7300' };

    // 1. Initial Load
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const currentData = await fetchMachineryRecordById(id);
                setMachinery(currentData);

                if (currentData && currentData.ShipID) {
                    const list = await fetchAssignedMachinery(currentData.ShipID);
                    setMachineryList(list);
                }

                handleSearch(currentData.MachineryRecordID); 

            } catch (err) {
                console.error(err);
                setError("Failed to load machinery info.");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // 2. Search Handler
    const handleSearch = async (recordId = id) => {
        if (!fromDate || !toDate) return;
        setAnalyticsLoading(true);
        try {
            const data = await fetchMachineryAnalytics(recordId, fromDate, toDate);
            setAnalytics(data);
            
            // Initialize Purpose Filter
            if(data.pieData) {
                setVisiblePurposes(data.pieData.map(item => item.name));
            }
            // Initialize Fuel Filter for Trend
            if (data.fuelTrend) {
                const fuels = [...new Set(data.fuelTrend.map(item => item.FuelTypeKey))];
                setAvailableFuels(fuels);
                setVisibleFuels(fuels);
            }
            
            // Initialize BDN Fuel Filter
            if (data.bdnData && data.bdnData.length > 0) {
                const uniqueFuels = [...new Set(data.bdnData.map(item => item.FuelTypeKey))];
                setAvailableBdnFuels(uniqueFuels);
                // Set default to first fuel type if not already set
                if (uniqueFuels.length > 0) {
                    setBdnFuelFilter(uniqueFuels[0]);
                }
            } else {
                setAvailableBdnFuels([]);
                setBdnFuelFilter('');
            }

        } catch (err) {
            console.error("Analytics Error:", err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleSwitchMachinery = (e) => {
        const newId = e.target.value;
        if (newId && newId !== id) {
            navigate(`/app/memp/machinery-details/${newId}`);
        }
    };

    // --- Filter Handlers ---
    const togglePurpose = (purposeName) => {
        setVisiblePurposes(prev => prev.includes(purposeName) ? prev.filter(p => p !== purposeName) : [...prev, purposeName]);
    };

    const toggleFuel = (fuelName) => {
        setVisibleFuels(prev => prev.includes(fuelName) ? prev.filter(f => f !== fuelName) : [...prev, fuelName]);
    };

    const formatNum = (val, decimals = 0) => {
        if (val === undefined || val === null) return '0';
        return Number(val).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    if (loading && !machinery) return <div className="p-5 text-white">Loading details...</div>;
    if (!machinery && error) return <div className="p-5 text-red-500">{error}</div>;

    const { powerStats, fuelStats, auditData, pieData, fuelTrend, bdnData } = analytics;

    // --- 🟢 DYNAMIC UI FLAGS (Fixed Boolean Logic) ---
    const showFuel = !!machinery.Fuel_Consumption;
    const showPower = !!machinery.Power;
    const showRPM = !!machinery.Rpm;

    // --- Data Prep for Charts ---
    const filteredPieData = pieData.filter(item => visiblePurposes.includes(item.name));

    // Prepare BDN Pie Data
    const filteredBdnData = bdnData.filter(item => item.FuelTypeKey === bdnFuelFilter).map(item => ({
        name: item.BDN_Number,
        value: item.Bunker_Consumption
    }));

    const totalEmissions = fuelStats.reduce((acc, curr) => ({
        CO2: acc.CO2 + (curr.CO2_MT || 0),
        CH4: acc.CH4 + (curr.CH4_MT || 0),
        N2O: acc.N2O + (curr.N2O_MT || 0),
        TotalGHG: acc.TotalGHG + (curr.Total_GHG_CO2e_MT || 0)
    }), { CO2: 0, CH4: 0, N2O: 0, TotalGHG: 0 });

    const graphData = auditData
        .filter(d => d.Power > 0 && d.RPM > 0)
        .map(d => ({
            rpm: d.RPM,
            power: d.Power,
            date: new Date(d.ReportDate).toLocaleDateString()
        }));

    // Transform Fuel Trend Data
    const barChartData = [];
    const groupedFuel = {};
    if (fuelTrend) {
        fuelTrend.forEach(item => {
            const d = new Date(item.ReportDate).toLocaleDateString();
            if (!groupedFuel[d]) groupedFuel[d] = { date: d };
            groupedFuel[d][item.FuelTypeKey] = item.Consumed;
        });
        for (const date in groupedFuel) {
            barChartData.push(groupedFuel[date]);
        }
        barChartData.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    const stickyThStyle = {
        position: 'sticky', top: 0, backgroundColor: '#e5e7eb', zIndex: 50,
        borderBottom: '2px solid #9ca3af', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '12px', textAlign: 'left', fontWeight: '700', color: '#1f2937',
        whiteSpace: 'nowrap'
    };

    return (
        <div className="machinery-details-page" style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
            <RotatingBackground pageKey="MACHINERY-DETAILS">
                <div className="content-overlay" style={{ padding: '20px', position: 'relative', zIndex: 10 }}>
                    
                    {/* Header & Switcher */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/app/memp/machinery')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition">← Back</button>
                            <div>
                                <h1 className="text-3xl font-bold text-white text-shadow-md m-0">{machinery ? machinery.CustomMachineryName : 'Machinery Details'}</h1>
                                <span className="text-gray-200 text-sm">{machinery?.MachineryTypeDescription}</span>
                            </div>
                        </div>
                        <div className="bg-white/90 p-2 rounded shadow flex items-center gap-2">
                            <span className="text-gray-700 font-bold text-sm">Switch Machinery:</span>
                            <select value={id} onChange={handleSwitchMachinery} className="border border-gray-300 rounded p-1 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none" style={{ minWidth: '220px' }}>
                                {machineryList.map(m => (
                                    <option key={m.MachineryRecordID} value={m.MachineryRecordID}>{m.CustomMachineryName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="filter-bar-container" style={{ backgroundColor: 'rgba(255,255,255,0.95)', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: 0, color: '#333' }}>Analytics Filter:</h3>
                        <div className="filter-group">
                            <label style={{ fontWeight: 'bold', marginRight: '5px', color:'#555' }}>From:</label>
                            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                        <div className="filter-group">
                            <label style={{ fontWeight: 'bold', marginRight: '5px', color:'#555' }}>To:</label>
                            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                        <button onClick={() => handleSearch(id)} disabled={analyticsLoading} className={`px-6 py-1.5 rounded shadow text-white font-bold transition ${analyticsLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                            {analyticsLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Loading...</> : 'Search'}
                        </button>
                    </div>

                    {/* 3-Column Metrics (Full Width) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 w-full">
                        {/* 1. Performance */}
                        <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-500">
                            <div className="flex items-center mb-4 border-b pb-2">
                                <i className="fas fa-cogs text-blue-500 mr-2 text-xl"></i>
                                <h3 className="text-lg font-bold text-gray-700 m-0">Performance</h3>
                            </div>
                            <div className="space-y-4">
                                {showPower && <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Total Power</span><span className="text-2xl font-bold text-gray-800">{formatNum(powerStats.Total_Power)} <small className="text-sm text-gray-500">kW</small></span></div>}
                                {showPower && <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Avg Power</span><span className="text-2xl font-bold text-gray-800">{formatNum(powerStats.Avg_Power, 2)} <small className="text-sm text-gray-500">kW</small></span></div>}
                                <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">Running Hrs</span><span className="text-2xl font-bold text-gray-800">{formatNum(powerStats.Running_Hrs)} <small className="text-sm text-gray-500">hrs</small></span></div>
                            </div>
                        </div>

                        {/* 2. Fuel Consumption (Conditional) */}
                        {showFuel && (
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500">
                                <div className="flex items-center mb-4 border-b pb-2">
                                    <i className="fas fa-gas-pump text-red-500 mr-2 text-xl"></i>
                                    <h3 className="text-lg font-bold text-gray-700 m-0">Fuel Consumption</h3>
                                </div>
                                <div className="space-y-2" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                                    {fuelStats.length > 0 ? fuelStats.map((f, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-gray-100 last:border-0 pb-2">
                                            <span className="text-gray-600 font-medium">{f.FuelTypeKey}</span>
                                            <span className="text-xl font-bold text-gray-800">{formatNum(f.Fuel_Consumed, 1)} <small className="text-sm text-gray-500">MT</small></span>
                                        </div>
                                    )) : <div className="text-center text-gray-400 py-4 italic">No data.</div>}
                                </div>
                            </div>
                        )}

                        {/* 3. Environment (Conditional) */}
                        {showFuel && (
                            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-green-500">
                                <div className="flex items-center mb-4 border-b pb-2">
                                    <i className="fas fa-leaf text-green-500 mr-2 text-xl"></i>
                                    <h3 className="text-lg font-bold text-gray-700 m-0">Environmental Impact</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">CO₂ Emissions</span><span className="text-lg font-bold text-gray-800">{formatNum(totalEmissions.CO2, 2)} <small className="text-sm text-gray-500">MT</small></span></div>
                                    <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">CH₄ Emissions</span><span className="text-lg font-bold text-gray-800">{formatNum(totalEmissions.CH4, 4)} <small className="text-sm text-gray-500">MT</small></span></div>
                                    <div className="flex justify-between items-center"><span className="text-gray-600 font-medium">N₂O Emissions</span><span className="text-lg font-bold text-gray-800">{formatNum(totalEmissions.N2O, 4)} <small className="text-sm text-gray-500">MT</small></span></div>
                                    <div className="flex justify-between items-center border-t pt-2 mt-2"><span className="text-gray-800 font-bold">Total GHG (CO₂e)</span><span className="text-xl font-bold text-green-700">{formatNum(totalEmissions.TotalGHG, 2)} <small className="text-sm">MT</small></span></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 🟢 1. Fuel Trend Bar Chart (Conditional) */}
                    {showFuel && barChartData.length > 0 && (
                        <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full mb-8">
                            <div className="flex justify-between items-center border-b pb-2 mb-4 relative">
                                <h3 className="text-xl font-bold text-gray-800 text-center flex-grow">Fuel Consumption Trend</h3>
                                <div className="relative">
                                    <button onClick={() => setShowFuelFilter(!showFuelFilter)} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded border"><i className="fas fa-filter mr-1"></i> Fuel Filter</button>
                                    {showFuelFilter && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-xl z-50 p-2">
                                            <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Select Fuels</div>
                                            {availableFuels.map(f => (
                                                <label key={f} className="flex items-center space-x-2 mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded"><input type="checkbox" checked={visibleFuels.includes(f)} onChange={() => toggleFuel(f)} className="form-checkbox text-blue-600 h-4 w-4" /><span className="text-gray-700 text-sm">{f}</span></label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer>
                                    <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis label={{ value: 'Consumed (MT)', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip cursor={{fill: '#f3f4f6'}} />
                                        <Legend />
                                        {visibleFuels.map((fuelKey, index) => <Bar key={fuelKey} dataKey={fuelKey} stackId="a" fill={BAR_COLORS[fuelKey] || PIE_COLORS[index % PIE_COLORS.length]} />)}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* 🟢 2. Power vs RPM Graph (ENABLED FOR ANY MACHINE WITH POWER & RPM) */}
                    {showPower && showRPM && graphData.length > 0 && (
                        <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full mb-8">
                            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4 text-center">Power vs RPM Analysis</h3>
                            <div style={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer>
                                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" dataKey="rpm" name="RPM" unit=" rpm" domain={['dataMin - 5', 'dataMax + 5']}><Label value="RPM" offset={-10} position="insideBottom" /></XAxis>
                                        <YAxis type="number" dataKey="power" name="Power" unit=" kW" domain={['dataMin - 100', 'dataMax + 100']}><Label value="Power" angle={-90} position="insideLeft" /></YAxis>
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <Scatter name="Engine Performance" data={graphData} fill="#2563eb" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* 🟢 3. Pie Charts Section (Side-by-Side) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        
                        {/* 3a. Usage by Purpose */}
                        {pieData && pieData.length > 0 && (
                            <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full">
                                <div className="flex justify-between items-center border-b pb-2 mb-4 relative">
                                    <h3 className="text-xl font-bold text-gray-800 text-center flex-grow">Reports by Purpose</h3>
                                    <div className="relative">
                                        <button onClick={() => setShowPurposeFilter(!showPurposeFilter)} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded border"><i className="fas fa-filter mr-1"></i> Filter</button>
                                        {showPurposeFilter && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-xl z-50 p-2">
                                                {pieData.map(item => (
                                                    <label key={item.name} className="flex items-center space-x-2 mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded"><input type="checkbox" checked={visiblePurposes.includes(item.name)} onChange={() => togglePurpose(item.name)} className="form-checkbox text-blue-600 h-4 w-4" /><span className="text-gray-700 text-sm">{item.name}</span></label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ width: '100%', height: 350 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={filteredPieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={110} fill="#8884d8" dataKey="value">
                                                {filteredPieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                                            </Pie>
                                            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                                            <Tooltip formatter={(value) => `${formatNum(value)} Reports`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* 🟢 3b. BDN Usage % (New Chart) */}
                        {showFuel && bdnData.length > 0 && (
                            <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full">
                                <div className="flex justify-between items-center border-b pb-2 mb-4">
                                    <h3 className="text-xl font-bold text-gray-800 text-center flex-grow">BDN Usage (%)</h3>
                                    <div className="relative">
                                        <select 
                                            value={bdnFuelFilter} 
                                            onChange={(e) => setBdnFuelFilter(e.target.value)}
                                            className="text-sm bg-gray-50 border border-gray-300 text-gray-900 rounded focus:ring-blue-500 focus:border-blue-500 block p-1"
                                            style={{ minWidth: '100px' }}
                                        >
                                            {availableBdnFuels.map(f => (
                                                <option key={f} value={f}>{f}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {filteredBdnData.length > 0 ? (
                                    <div style={{ width: '100%', height: 350 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={filteredBdnData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={110} fill="#82ca9d" dataKey="value">
                                                    {filteredBdnData.map((entry, index) => (<Cell key={`cell-bdn-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                                                </Pie>
                                                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                                                <Tooltip formatter={(value) => `${formatNum(value, 2)} MT`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-64 text-gray-500 italic">No BDN data for selected fuel.</div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Audit Table (Dynamic Columns) */}
                    <div className="bg-white/95 rounded-lg shadow-lg p-6 w-full mb-8">
                        <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Machinery Status Audit</h3>
                        <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px', position: 'relative' }}>
                            <table className="w-full text-left border-collapse" style={{ minWidth: '1400px' }}>
                                <thead>
                                    <tr>
                                        <th style={stickyThStyle}>Report Date</th>
                                        <th style={stickyThStyle}>Purpose</th>
                                        
                                        {/* 🟢 Conditional Headers */}
                                        {showPower && <th style={stickyThStyle}>Power (kW)</th>}
                                        {showRPM && <th style={stickyThStyle}>RPM</th>}
                                        <th style={stickyThStyle}>Running Hrs</th>
                                        
                                        {showFuel && <th style={stickyThStyle}>Fuel Type</th>}
                                        {showFuel && <th style={stickyThStyle}>Fuel Consumed (MT)</th>}
                                        {showFuel && <th style={stickyThStyle}>CO₂ (MT)</th>}
                                        {showFuel && <th style={stickyThStyle}>CH₄ (MT)</th>}
                                        {showFuel && <th style={stickyThStyle}>N₂O (MT)</th>}
                                        {showFuel && <th style={stickyThStyle}>Total GHG (MT)</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditData.length > 0 ? auditData.map((row, index) => (
                                        <tr key={index} className="hover:bg-gray-50 border-b last:border-0 transition-colors">
                                            <td className="p-3 text-gray-800">{new Date(row.ReportDate).toLocaleDateString()} <span className="text-gray-500 text-xs">{new Date(row.ReportDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></td>
                                            <td className="p-3 text-gray-800">{row.Purpose || '-'}</td>
                                            
                                            {/* 🟢 Conditional Rows */}
                                            {showPower && <td className="p-3 text-gray-800 font-medium">{formatNum(row.Power)}</td>}
                                            {showRPM && <td className="p-3 text-gray-800">{row.RPM || '-'}</td>}
                                            <td className="p-3 text-gray-800">{formatNum(row.Running_Hrs)}</td>
                                            
                                            {showFuel && <td className="p-3 text-gray-800">{row.Fuel_Type}</td>}
                                            {showFuel && <td className="p-3 text-gray-800 font-medium">{formatNum(row.Fuel_Consumed_MT, 2)}</td>}
                                            {showFuel && <td className="p-3 text-gray-800">{formatNum(row.CO2_Emissions, 3)}</td>}
                                            {showFuel && <td className="p-3 text-gray-800">{formatNum(row.CH4_Emissions, 6)}</td>}
                                            {showFuel && <td className="p-3 text-gray-800">{formatNum(row.N2O_Emissions, 6)}</td>}
                                            {showFuel && <td className="p-3 text-green-700 font-bold bg-green-50">{formatNum(row.Total_GHG, 3)}</td>}
                                        </tr>
                                    )) : <tr><td colSpan={3 + (showPower?1:0) + (showRPM?1:0) + (showFuel?6:0)} className="p-8 text-center text-gray-500 italic">No report data found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </RotatingBackground>
        </div>
    );
};

export default MachineryDetailsPage;