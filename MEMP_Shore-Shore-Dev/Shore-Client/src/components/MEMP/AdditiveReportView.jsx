import React, { useEffect, useState } from 'react';
import { API_GATEWAY_URL } from '../../config/apiConfig';
import './AdditiveReportView.css';

const DetailItem = ({ label, value, highlight, fullWidth }) => (
    <div className={`detail-item ${fullWidth ? 'full-width' : ''}`}>
        <label>{label}</label>
        <div className={`value ${highlight ? 'highlight-text' : ''}`}>
            {value || '-'}
        </div>
    </div>
);

const AdditiveReportView = ({ event, onBack, onEdit }) => {
    const [auditData, setAuditData] = useState([]);
    const [loadingAudit, setLoadingAudit] = useState(false);

    useEffect(() => {
        if (event?.DosingEventID) {
            setLoadingAudit(true);
            fetch(`${API_GATEWAY_URL}/api/additives/audit/${event.DosingEventID}`)
                .then(r => r.ok ? r.json() : [])
                .then(setAuditData)
                .catch(console.error)
                .finally(() => setLoadingAudit(false));
        }
    }, [event]);

    if (!event) return null;

    const dateStr = new Date(event.DosingDateLocal).toLocaleDateString();
    const timeStr = new Date(event.DosingDateLocal).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const ratio = event.FuelQuantityBlended > 0 ? (event.DosingQuantity / event.FuelQuantityBlended).toFixed(2) : "0.00";
    const bdnList = event.BunkerRefNumber ? event.BunkerRefNumber.split(',') : [];

    return (
        <div className="report-view-container">
            
            <div className="report-header-section">
                <div>
                    <h2 className="report-title">Dosing Event Details</h2>
                    <span className="status-badge success">ID: {event.DosingReferenceID || event.DosingEventID}</span>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={onBack}>← Back to List</button>
                    <button className="btn-primary" onClick={() => onEdit(event)}>Edit Event</button>
                </div>
            </div>

            <div className="report-grid-layout">
                
                <div className="detail-card">
                    <div className="card-header">General Information</div>
                    <div className="card-body grid-2">
                        <DetailItem label="Vessel Name" value={event.ShipName} />
                        <DetailItem label="Reference ID" value={event.DosingReferenceID || "N/A"} />
                        <DetailItem label="Dosing Date" value={dateStr} />
                        <DetailItem label="Time" value={`${timeStr} (UTC ${event.TimeZoneOffset})`} />
                    </div>
                </div>

                <div className="detail-card">
                    <div className="card-header">Additive Product</div>
                    <div className="card-body grid-2">
                        <DetailItem label="Category" value={event.CategoryName} />
                        <DetailItem label="Product Name" value={event.AdditiveName} />
                        <DetailItem label="Dosing Quantity" value={`${event.DosingQuantity} Ltrs`} highlight />
                        <DetailItem label="Unit" value="Liters" />
                    </div>
                </div>

                <div className="detail-card full-span">
                    <div className="card-header">Fuel & Blending Operations</div>
                    <div className="card-body">
                        <div className="grid-3">
                            <DetailItem label="Fuel Type" value={event.FuelTypeKey} />
                            <DetailItem label="Total Fuel Blended" value={`${event.FuelQuantityBlended} MT`} highlight />
                            <DetailItem label="Dosage Ratio" value={`${ratio} L/MT`} />
                        </div>
                        <div className="divider"></div>
                        <div className="detail-item full-width">
                            <label>Bunker Delivery Notes (BDNs) Used</label>
                            <div className="bdn-tags-container">
                                {bdnList.length > 0 ? bdnList.map((bdn, i) => <span key={i} className="bdn-tag">📄 {bdn.trim()}</span>) : <span className="no-data-text">No BDN Linked</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="detail-card full-span">
                    <div className="card-header">Treated Consumers (Machinery)</div>
                    <div className="card-body">
                        <div className="machinery-tags-container">
                            {event.TreatedMachinery ? event.TreatedMachinery.split(',').map((m, i) => <div key={i} className="machinery-tag">⚙️ {m.trim()}</div>) : <span className="no-data-text">No machinery selected</span>}
                        </div>
                    </div>
                </div>

                {/* CONSUMPTION AUDIT TRAIL */}
                <div className="detail-card full-span">
                    <div className="card-header">Consumption Audit Trail (Usage of Blended Fuel)</div>
                    <div className="card-body" style={{padding:0}}>
                        {loadingAudit ? (
                            <div style={{padding:'20px', textAlign:'center', color:'#888'}}>Loading audit logs...</div>
                        ) : auditData.length === 0 ? (
                            <div style={{padding:'20px', textAlign:'center', color:'#888', fontStyle:'italic'}}>
                                No consumption reported yet for these BDNs after dosing date.
                            </div>
                        ) : (
                            <div className="audit-table-wrapper">
                                <table className="audit-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>BDN Ref</th>
                                            <th>Machinery</th>
                                            <th style={{textAlign:'right'}}>Opening (MT)</th>
                                            <th style={{textAlign:'right'}}>Consumed (MT)</th>
                                            <th style={{textAlign:'right'}}>Closing (MT)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditData.map((row, idx) => (
                                            <tr key={idx}>
                                                <td>{new Date(row.EntryDate).toLocaleDateString()}</td>
                                                <td><span className="bdn-mini-tag">{row.BDN_Number}</span></td>
                                                <td>{row.MachineryName}</td>
                                                
                                                {/* 🟢 FIX 1: Add || 0 check */}
                                                <td style={{textAlign:'right', color:'#666'}}>
                                                    {(row.InitialQuantity || 0).toFixed(2)}
                                                </td>
                                                
                                                {/* 🟢 FIX 2: Add || 0 check */}
                                                <td style={{textAlign:'right', fontWeight:'bold', color:'#d32f2f'}}>
                                                    {(row.ConsumedMT || 0).toFixed(2)}
                                                </td>
                                                
                                                {/* 🟢 FIX 3: Add || 0 check */}
                                                <td style={{textAlign:'right', fontWeight:'bold', color: row.FinalQuantity > 0 ? '#2e7d32' : '#999'}}>
                                                    {(row.FinalQuantity || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdditiveReportView;