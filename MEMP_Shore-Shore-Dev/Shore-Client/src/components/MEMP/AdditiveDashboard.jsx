import React, { useEffect, useState } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, ComposedChart
} from 'recharts';
// 🟢 UPDATED: Import secured API functions from api.js
import { fetchVessels, fetchAdditiveDosingRefs, fetchAdditiveDashboard } from '../../api';
import { API_GATEWAY_URL } from '../../config/apiConfig';
import './AdditiveDashboard.css'; 

const KPICard = ({ title, value, unit, color }) => (
    <div className="kpi-card" style={{ borderTop: `4px solid ${color}` }}>
        <h3>{title}</h3>
        <div className="kpi-value">
            {value} <span className="kpi-unit">{unit}</span>
        </div>
    </div>
);

const AdditiveDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ships, setShips] = useState([]); 
    
    // 🟢 NEW: State for Dosing Reference IDs
    const [dosingRefs, setDosingRefs] = useState([]);

    const [filters, setFilters] = useState({
        from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10), 
        to: new Date().toISOString().slice(0,10),
        shipId: '0',       
        dosingRef: ''      
    });

    // 1. Load Ships on Mount (Secured)
    useEffect(() => {
        // fetch(`${API_GATEWAY_URL}/api/ships`) // OLD
        fetchVessels() // 🟢 SECURED
            .then(setShips)
            .catch(console.error);
    }, []);

    // 🟢 2. NEW: Fetch Dosing Refs when Ship Changes
    useEffect(() => {
        // Use helper from api.js (or keep direct fetch if preferred, but api.js is cleaner)
        fetchAdditiveDosingRefs(filters.shipId)
          .then(setDosingRefs)
          .catch(console.error);
        
        // Reset ref filter when ship changes so we don't keep an invalid ID selected
        setFilters(prev => ({ ...prev, dosingRef: '' }));
    }, [filters.shipId]);

    // 3. Fetch Dashboard Data
    useEffect(() => {
        setLoading(true);
        // Use secured dashboard fetcher
        fetchAdditiveDashboard(filters)
            .then(setData)
            .catch(err => {
                console.error(err);
                setData(null);
            })
            .finally(() => setLoading(false));
    }, [filters]);

    if (loading) return <div className="dash-loading">Loading Analytics...</div>;
    
    if (!data || !data.summary) {
        return <div className="dash-loading">No Data Available or API Error.</div>;
    }

    return (
        <div className="dashboard-container">
            {/* FILTERS HEADER */}
            <div className="dash-header">
                <h2>Additive Performance & Efficiency</h2>
                
                <div className="filters-wrapper">
                    {/* Vessel Filter */}
                    <select 
                        value={filters.shipId} 
                        onChange={e => setFilters({...filters, shipId: e.target.value})}
                        className="dash-filter-input"
                    >
                        <option value="0">All Vessels</option>
                        {ships.map(s => (
                            <option key={s.ShipID || s.shipId} value={s.ShipID || s.shipId}>{s.ShipName || s.shipName}</option>
                        ))}
                    </select>

                    {/* 🟢 UPDATED: Dosing Ref Dropdown (Replaces Input) */}
                    <select 
                        value={filters.dosingRef} 
                        onChange={e => setFilters({...filters, dosingRef: e.target.value})}
                        className="dash-filter-input"
                        style={{minWidth:'160px'}}
                    >
                        <option value="">All Dosing IDs</option>
                        {dosingRefs.map((ref, idx) => (
                            <option key={idx} value={ref.DosingReferenceID}>
                                {ref.DosingReferenceID}
                            </option>
                        ))}
                    </select>

                    {/* Date Range */}
                    <div className="date-group">
                        <input type="date" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} className="dash-filter-input" />
                        <span style={{color:'#666'}}>to</span>
                        <input type="date" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} className="dash-filter-input" />
                    </div>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="kpi-grid">
                <KPICard title="Total Additive Used" value={data.summary.TotalAdditiveLiters?.toFixed(0) || 0} unit="Ltrs" color="#007bff" />
                <KPICard title="Total Fuel Treated" value={data.summary.TotalFuelTreatedMT?.toFixed(0) || 0} unit="MT" color="#28a745" />
                <KPICard title="Dosing Events" value={data.summary.TotalEvents || 0} unit="Ops" color="#ffc107" />
                <KPICard title="Avg Dosage Ratio" value={data.summary.AvgRatio?.toFixed(3) || 0} unit="L/MT" color="#17a2b8" />
            </div>

            <div className="charts-grid">
                {/* FLEET COMPARISON */}
                <div className="chart-card">
                    <div className="chart-title">Fleet Consumption Overview</div>
                    <div className="chart-subtitle">Additive Usage (L) vs Fuel Treated (MT)</div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <ComposedChart data={data.byShip}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="ShipName" scale="point" padding={{ left: 20, right: 20 }} />
                                <YAxis yAxisId="left" orientation="left" stroke="#007bff" />
                                <YAxis yAxisId="right" orientation="right" stroke="#28a745" />
                                <Tooltip />
                                <Legend />
                                <Bar yAxisId="left" dataKey="AdditiveUsed" name="Additive Used (L)" fill="#007bff" barSize={30} />
                                <Line yAxisId="right" type="monotone" dataKey="FuelTreated" name="Fuel Treated (MT)" stroke="#28a745" strokeWidth={3} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TRENDS */}
                <div className="chart-card">
                    <div className="chart-title">Dosing Efficiency Trend</div>
                    <div className="chart-subtitle">Monthly Average Dosage Ratio (L/MT)</div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={data.trends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="Month" />
                                <YAxis domain={['auto', 'auto']} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="AvgRatio" name="Avg Ratio (L/MT)" stroke="#ff7300" strokeWidth={3} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdditiveDashboard;