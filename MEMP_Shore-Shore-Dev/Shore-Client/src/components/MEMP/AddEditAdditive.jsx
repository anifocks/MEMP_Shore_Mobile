import React, { useState, useEffect } from 'react';
import { API_GATEWAY_URL } from '../../config/apiConfig';
import './AddEditAdditive.css';

const AddEditAdditive = ({ 
    editEvent, ships, types, fuels, onSave, onCancel   
}) => {

    const [submitting, setSubmitting] = useState(false);
    const [machines, setMachines] = useState([]);
    const [availableBDNs, setAvailableBDNs] = useState([]);
    const [bdnEntries, setBdnEntries] = useState([
        { id: Date.now(), bdn: '', qty: '', rob: 0, robDate: null, warning: null }
    ]);
    const [robDateInfo, setRobDateInfo] = useState(null); // For single BDN context if needed, mostly used inside array now

    const [formData, setFormData] = useState({
        dosingEventId: null,
        shipId: '',
        dosingDate: new Date().toISOString().slice(0, 10),
        dosingTime: "12:00",
        timeZone: '+05:30',
        additiveTypeId: '',
        additiveName: '',
        dosingQuantity: '',
        fuelTypeKey: '',
        fuelQuantity: 0,
        machineryIds: []
    });

    const isEdit = !!editEvent;

    // --- LOGIC SECTION (UNCHANGED) ---
    // [Keeping all your existing useEffects and Handlers exactly as they were to ensure functionality]
    
    useEffect(() => {
        if (editEvent) {
            const loadData = async () => {
                const dt = new Date(editEvent.DosingDateLocal);
                const typeObj = types.find(t => t.CategoryName === editEvent.CategoryName);
                let preSelectedIds = [];
                try {
                    const res = await fetch(`${API_GATEWAY_URL}/api/machinery/consumers/${editEvent.ShipID}`);
                    if (res.ok) {
                        const machList = await res.json();
                        setMachines(machList);
                        if (editEvent.TreatedMachinery) {
                            const names = editEvent.TreatedMachinery.split(',').map(s => s.trim());
                            preSelectedIds = machList.filter(m => names.includes(m.CustomMachineryName)).map(m => m.MachineryRecordID);
                        }
                    }
                } catch (err) { console.error(err); }

                setFormData({
                    dosingEventId: editEvent.DosingEventID,
                    shipId: editEvent.ShipID,
                    dosingDate: dt.toISOString().slice(0, 10),
                    dosingTime: dt.toTimeString().slice(0, 5),
                    timeZone: editEvent.TimeZoneOffset,
                    additiveTypeId: typeObj ? typeObj.AdditiveTypeID : '',
                    additiveName: editEvent.AdditiveName,
                    dosingQuantity: editEvent.DosingQuantity,
                    fuelTypeKey: editEvent.FuelTypeKey,
                    fuelQuantity: editEvent.FuelQuantityBlended,
                    machineryIds: preSelectedIds
                });

                if(editEvent.BunkerRefNumber) {
                     setBdnEntries([{ id: Date.now(), bdn: editEvent.BunkerRefNumber, qty: editEvent.FuelQuantityBlended, rob: 99999, robDate: null }]);
                }
            };
            loadData();
        }
    }, [editEvent, types]);

    useEffect(() => {
        if (formData.shipId && !isEdit) {
            fetch(`${API_GATEWAY_URL}/api/machinery/consumers/${formData.shipId}`)
                .then(r => r.ok ? r.json() : [])
                .then(data => setMachines(Array.isArray(data) ? data : []))
                .catch(console.error);
        }
    }, [formData.shipId, isEdit]);

    useEffect(() => {
        if (formData.shipId && formData.fuelTypeKey && formData.dosingDate) {
            const url = `${API_GATEWAY_URL}/api/bunkering/lookup/bdn?shipId=${formData.shipId}&fuelType=${encodeURIComponent(formData.fuelTypeKey)}&dosingDate=${formData.dosingDate}`;
            fetch(url).then(r => r.ok ? r.json() : []).then(setAvailableBDNs);
        } else {
            setAvailableBDNs([]);
        }
    }, [formData.shipId, formData.fuelTypeKey, formData.dosingDate]);

    const addBdnRow = () => {
        setBdnEntries([...bdnEntries, { id: Date.now(), bdn: '', qty: '', rob: 0, robDate: null }]);
    };

    const removeBdnRow = (id) => {
        if (bdnEntries.length > 1) {
            const updated = bdnEntries.filter(b => b.id !== id);
            setBdnEntries(updated);
            updateTotalFuel(updated);
        }
    };

    const handleBdnChange = async (id, newBdnRef) => {
        let robVal = 0; let robDt = null; let warningMsg = null;
        if (newBdnRef) {
            try {
                const url = `${API_GATEWAY_URL}/api/additives/bdn-availability?bdn=${encodeURIComponent(newBdnRef)}&shipId=${formData.shipId}`;
                const res = await fetch(url);
                const data = await res.json();
                if (res.ok) {
                    robVal = data.available;
                    if (robVal <= 0) warningMsg = "Warning: Low Availability";
                }
            } catch (err) { console.error(err); }
        }
        const updated = bdnEntries.map(entry => {
            if (entry.id === id) return { ...entry, bdn: newBdnRef, rob: robVal, qty: '', warning: warningMsg };
            return entry;
        });
        setBdnEntries(updated);
        updateTotalFuel(updated);
    };

    const handleQtyChange = (id, newQty) => {
        const updated = bdnEntries.map(entry => {
            if (entry.id === id) return { ...entry, qty: newQty };
            return entry;
        });
        setBdnEntries(updated);
        updateTotalFuel(updated);
    };

    const updateTotalFuel = (entries) => {
        const total = entries.reduce((sum, e) => sum + parseFloat(e.qty || 0), 0);
        setFormData(prev => ({ ...prev, fuelQuantity: total }));
    };

    const handleMachineryToggle = (id) => {
        setFormData(prev => {
            const ids = prev.machineryIds.includes(id) ? prev.machineryIds.filter(x => x !== id) : [...prev.machineryIds, id];
            return { ...prev, machineryIds: ids };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.shipId) return alert("Select a vessel");
        for(let entry of bdnEntries) {
            if (parseFloat(entry.qty) > entry.rob && entry.rob > 0) {
                 return alert(`Validation Error: Blended Qty (${entry.qty} MT) exceeds available ROB (${entry.rob} MT).`);
            }
        }
        setSubmitting(true);
        const finalDate = `${formData.dosingDate}T${formData.dosingTime}`;
        const payload = { 
            ...formData, dosingDate: finalDate, shipId: parseInt(formData.shipId),
            dosingQuantity: parseFloat(formData.dosingQuantity), fuelQuantity: parseFloat(formData.fuelQuantity),
            bdnEntries: bdnEntries 
        };
        const url = isEdit ? `${API_GATEWAY_URL}/api/additives/event/${formData.dosingEventId}` : `${API_GATEWAY_URL}/api/additives/event`;
        const method = isEdit ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) onSave(); else alert('Error saving data');
        } catch (error) { alert('Network error'); } finally { setSubmitting(false); }
    };

    // --- RENDER (REVAMPED UI) ---
    return (
        <form onSubmit={handleSubmit} className="form-layout-container">
            
            {/* CARD 1: GENERAL INFORMATION */}
            <div className="additive-card">
                <div className="additive-card-header">
                    <span>General Information</span>
                    {isEdit && <span style={{fontSize:'0.7rem', color:'#666'}}>Ref: {editEvent.DosingReferenceID}</span>}
                </div>
                <div className="additive-card-body grid-3">
                    <div className="form-item">
                        <label>Vessel *</label>
                        <select value={formData.shipId} onChange={e => setFormData({...formData, shipId: e.target.value})} required disabled={isEdit}>
                            <option value="">-- Select Vessel --</option>
                            {ships.map(s => <option key={s.ShipID} value={s.ShipID}>{s.ShipName}</option>)}
                        </select>
                    </div>
                    <div className="form-item">
                        <label>Dosing Date *</label>
                        <input type="date" value={formData.dosingDate} onChange={e => setFormData({...formData, dosingDate: e.target.value})} required />
                    </div>
                    <div className="form-item">
                        <label>Time & Zone *</label>
                        <div style={{display:'flex', gap:'10px'}}>
                            <input type="time" value={formData.dosingTime} onChange={e => setFormData({...formData, dosingTime: e.target.value})} required style={{flex:1}} />
                            <select value={formData.timeZone} onChange={e => setFormData({...formData, timeZone: e.target.value})} style={{flex:1}}>
                                <option value="+00:00">UTC</option>
                                <option value="+05:30">IST</option>
                                <option value="+08:00">SGT</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* CARD 2: ADDITIVE PRODUCT */}
            <div className="additive-card">
                <div className="additive-card-header">Additive Product Details</div>
                <div className="additive-card-body grid-3">
                    <div className="form-item">
                        <label>Additive Type *</label>
                        <select value={formData.additiveTypeId} onChange={e => setFormData({...formData, additiveTypeId: e.target.value})} required>
                            <option value="">Select Type...</option>
                            {types.map(t => <option key={t.AdditiveTypeID} value={t.AdditiveTypeID}>{t.CategoryName}</option>)}
                        </select>
                    </div>
                    <div className="form-item">
                        <label>Product Name *</label>
                        <input type="text" value={formData.additiveName} onChange={e => setFormData({...formData, additiveName: e.target.value})} placeholder="e.g. Unitor Biocide" required />
                    </div>
                    <div className="form-item">
                        <label>Quantity (Liters) *</label>
                        <input type="number" step="0.1" value={formData.dosingQuantity} onChange={e => setFormData({...formData, dosingQuantity: e.target.value})} required />
                    </div>
                </div>
            </div>

            {/* CARD 3: FUEL & BLENDING */}
            <div className="additive-card">
                <div className="additive-card-header">
                    <span>Fuel & Blending Operations</span>
                    <button type="button" onClick={addBdnRow} className="btn-outline">+ Add BDN</button>
                </div>
                <div className="additive-card-body">
                    {/* Common Fuel Type */}
                    <div className="form-item" style={{maxWidth:'300px', marginBottom:'20px'}}>
                        <label>Fuel Type *</label>
                        <select value={formData.fuelTypeKey} onChange={e => setFormData({...formData, fuelTypeKey: e.target.value})} required>
                            <option value="">Select Fuel Type...</option>
                            {fuels.map(f => <option key={f.FuelTypeKey} value={f.FuelTypeKey}>{f.FuelTypeDescription || f.FuelTypeKey}</option>)}
                        </select>
                    </div>

                    {/* Dynamic BDN List */}
                    <div className="bdn-list-container">
                        {bdnEntries.map((entry, index) => (
                            <div key={entry.id} className="bdn-row">
                                {/* Col 1: BDN Selection */}
                                <div className="form-item">
                                    <label>Bunker Delivery Note (BDN) #{index + 1}</label>
                                    <select 
                                        value={entry.bdn} 
                                        onChange={e => handleBdnChange(entry.id, e.target.value)} 
                                        required 
                                        disabled={availableBDNs.length === 0}
                                    >
                                        <option value="">
                                            {availableBDNs.length === 0 ? "Select Fuel & Date First" : "Select BDN..."}
                                        </option>
                                        {availableBDNs.map(b => (
                                            <option key={b.BDN_Number} value={b.BDN_Number}>
                                                {b.BDN_Number} ({new Date(b.EntryDate).toLocaleDateString()} - {b.Quantity_MT} MT)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Col 2: Quantity Input */}
                                <div className="form-item">
                                    <label>Qty Blended (MT)</label>
                                    <input 
                                        type="number" step="0.1" 
                                        value={entry.qty} 
                                        onChange={e => handleQtyChange(entry.id, e.target.value)} 
                                        required 
                                        style={parseFloat(entry.qty) > entry.rob && entry.rob > 0 ? {borderColor:'red', background:'#fff0f0'} : {}}
                                    />
                                    {entry.rob > 0 && (
                                        <div className={`info-text ${parseFloat(entry.qty) > entry.rob ? 'error' : 'success'}`}>
                                            Max: {entry.rob.toFixed(2)} MT
                                        </div>
                                    )}
                                </div>

                                {/* Col 3: Delete Button */}
                                <div>
                                    {bdnEntries.length > 1 && (
                                        <button type="button" onClick={() => removeBdnRow(entry.id)} className="btn-icon-del" title="Remove">×</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="total-display">
                        Total Fuel Blended: {formData.fuelQuantity.toFixed(2)} MT
                    </div>
                </div>
            </div>

            {/* CARD 4: MACHINERY */}
            <div className="additive-card">
                <div className="additive-card-header">Treated Consumers (Machinery)</div>
                <div className="additive-card-body">
                    {isEdit && <div className="info-text warning" style={{marginBottom:'10px'}}>Note: Please verify machinery selection for this update.</div>}
                    <div className="machinery-grid-layout">
                        {!formData.shipId ? <div className="no-data">Select a vessel first.</div> :
                         machines.length === 0 ? <div className="no-data">No consumers found.</div> :
                         machines.map(m => (
                            <label key={m.MachineryRecordID} className="checkbox-card">
                                <input type="checkbox" 
                                    checked={formData.machineryIds.includes(m.MachineryRecordID)}
                                    onChange={() => handleMachineryToggle(m.MachineryRecordID)} 
                                /> 
                                <span>{m.CustomMachineryName}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="form-actions-footer">
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting || formData.machineryIds.length === 0} className="btn-primary">
                    {isEdit ? 'Update Operation' : 'Save Operation'}
                </button>
            </div>

        </form>
    );
};

export default AddEditAdditive;