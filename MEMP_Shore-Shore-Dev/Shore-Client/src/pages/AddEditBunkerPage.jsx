// File: MEMP_Test/Client/src/pages/AddEditBunkerPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import Select from 'react-select';
import debounce from 'lodash.debounce';
import { FaSave, FaTimes, FaShip, FaMapMarkerAlt, FaGasPump, FaOilCan, FaFlask, FaTint, FaWeightHanging, FaPaperclip } from 'react-icons/fa';
import { format } from 'date-fns';
import './AddEditBunkerPage.css';
import * as Yup from 'yup';

const API_BASE_URL = 'http://localhost:7000/api';
//const API_BASE_URL = 'https://veemsonboardupgrade.theviswagroup.com/api';

const customStyles = {
    menu: (provided) => ({
        ...provided,
        zIndex: 9999,
        position: 'absolute',
        display: 'block',
        opacity: 1,
        visibility: 'visible',
    }),
};

const AddEditBunkerPage = () => {
    const { id, vesselId: initialVesselIdParam } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        ShipID: initialVesselIdParam || '',
        VoyageID: '',
        BunkerPortCode: '',
        BunkerDate: '',
        BDN_Number: '',
        BunkerCategory: 'FUEL',
        FuelTypeKey: '',
        LubeOilTypeKey: '',
        Bunkered_Quantity: '',
        DensityAt15C: '',
        SulphurContentPercent: '',
        FlashPointC: '',
        ViscosityAt50C_cSt: '',
        WaterContentPercent: '',
        LCV: '',
        TemperatureC: '',
        PressureBar: '',
        SupplierName: '',
        BargeName: '',
        MARPOLSampleSealNumber: '',
        Initial_Quantity_MT: '',
        Final_Quantity_MT: '',
        OperationType: 'BUNKER',
        Initial_Volume_M3: '',
        Final_Volume_M3: '',
        Bunkered_Volume_M3: '',
        Remarks: '',
        IsActive: true,
        TankAllocations: [],
    });

    const [initialVesselOption, setInitialVesselOption] = useState(null);
    const [initialVoyageOption, setInitialVoyageOption] = useState(null);
    const [initialFuelTypeOption, setInitialFuelTypeOption] = useState(null);
    const [initialLubeOilTypeOption, setInitialLubeOilTypeOption] = useState(null);
    const [voyageOptions, setVoyageOptions] = useState([]);
    const [fuelTypeOptions, setFuelTypeOptions] = useState([]);
    const [lubeOilTypeOptions, setLubeOilTypeOptions] = useState([]);
    const [bunkerPortSearchTerm, setBunkerPortSearchTerm] = useState('');
    const [bunkerPortSuggestions, setBunkerPortSuggestions] = useState([]);
    const [showBunkerSuggestions, setShowBunkerSuggestions] = useState(false);
    const bunkerPortRef = useRef(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(isEditing);
    const [error, setError] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const fileInputRef = useRef(null);

    const [bdnNumbers, setBdnNumbers] = useState([]);
    const [allExistingBdnNumbers, setAllExistingBdnNumbers] = useState([]);
    const [correctionSign, setCorrectionSign] = useState('+');

    const fetchLastROB = useCallback(async (shipId, bunkerCategory, itemTypeKey) => {
        if (!shipId || !bunkerCategory || !itemTypeKey) {
            return;
        }
        try {
            const response = await axios.get(`${API_BASE_URL}/bunkering/lookup/last-rob`, {
                params: { shipId, bunkerCategory, itemTypeKey }
            });
            const lastRob = response.data;
            const initialQty = lastRob ? parseFloat(lastRob.Final_Quantity_MT) : 0;
            const initialVol = lastRob ? parseFloat(lastRob.Final_Volume_M3) : 0;
            setFormData(prev => ({
                ...prev,
                Initial_Quantity_MT: initialQty,
                Initial_Volume_M3: initialVol,
                Final_Quantity_MT: initialQty,
                Final_Volume_M3: initialVol,
            }));
        } catch (err) {
            console.error("Error fetching last ROB:", err);
            setError("Failed to fetch last ROB for vessel and fuel type.");
            setFormData(prev => ({ ...prev, Initial_Quantity_MT: 0, Initial_Volume_M3: 0, Final_Quantity_MT: 0, Final_Volume_M3: 0 }));
        }
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            setError('');
            setLoadingDetails(true);
            try {
                const [fuelRes, lubeOilRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/bunkering/lookup/fuel-types`),
                    axios.get(`${API_BASE_URL}/bunkering/lookup/lube-oil-types`)
                ]);
                setFuelTypeOptions(fuelRes.data.map(f => ({ value: f.FuelTypeKey, label: f.FuelTypeDescription })));
                setLubeOilTypeOptions(lubeOilRes.data.map(lo => ({ value: lo.LubeOilTypeKey, label: lo.LubeOilTypeDescription })));
                
                if (isEditing && id) {
                    const response = await axios.get(`${API_BASE_URL}/bunkering/details/${id}`);
                    const details = response.data;
                    const bunkerDateString = details.BunkerDate ? details.BunkerDate.slice(0, 16) : '';
                    setFormData({
                        ...details,
                        BunkerDate: bunkerDateString,
                        IsActive: details.IsActive !== undefined ? !!details.IsActive : true,
                        TankAllocations: [],
                    });
                    if (details.ShipID && details.ShipName) {
                        setInitialVesselOption({ value: details.ShipID, label: `${details.ShipName} (${details.IMO_Number})` });
                        const voyagesRes = await axios.get(`${API_BASE_URL}/bunkering/lookup/voyages/${details.ShipID}`);
                        setVoyageOptions(voyagesRes.data.map(v => ({ value: v.VoyageID, label: v.VoyageNumber })));
                        if (details.VoyageID && details.VoyageNumber) {
                            setInitialVoyageOption({ value: details.VoyageID, label: details.VoyageNumber });
                        }
                    }
                    if (details.BunkerPortCode && details.BunkerPortName) {
                        setBunkerPortSearchTerm(details.BunkerPortName);
                    }
                    if (details.BunkerCategory === 'FUEL' && details.FuelTypeKey && details.FuelTypeDescription) {
                        setInitialFuelTypeOption({ value: details.FuelTypeKey, label: details.FuelTypeDescription });
                    } else if (details.BunkerCategory === 'LUBE_OIL' && details.LubeOilTypeKey && details.LubeOilTypeDescription) {
                        setInitialLubeOilTypeOption({ value: details.LubeOilTypeKey, label: details.LubeOilTypeDescription });
                    }
                } else if (initialVesselIdParam) {
                    const vesselResponse = await axios.get(`${API_BASE_URL}/bunkering/lookup/ships/active`, { params: { search: initialVesselIdParam } });
                    if (vesselResponse.data && vesselResponse.data.length > 0) {
                        const selectedVessel = vesselResponse.data[0];
                        setInitialVesselOption({ value: selectedVessel.ShipID, label: `${selectedVessel.ShipName} (${selectedVessel.IMO_Number})` });
                        setFormData(prev => ({ ...prev, ShipID: selectedVessel.ShipID }));
                        const voyagesRes = await axios.get(`${API_BASE_URL}/bunkering/lookup/voyages/${selectedVessel.ShipID}`);
                        setVoyageOptions(voyagesRes.data.map(v => ({ value: v.VoyageID, label: v.VoyageNumber })));
                    }
                }
            } catch (err) {
                console.error("Error fetching initial bunker data:", err);
                setError("Failed to load bunkering data. " + (err.response?.data?.error || err.message));
            } finally {
                setLoadingDetails(false);
            }
        };
        fetchInitialData();
    }, [isEditing, id, initialVesselIdParam]);


    useEffect(() => {
        const fetchBunkerDetailsForLookup = async () => {
            if (formData.BDN_Number && ['DEBUNKER', 'CORRECTION', 'LO_TOPUP'].includes(formData.OperationType)) {
                setLoadingDetails(true);
                try {
                    const response = await axios.get(`${API_BASE_URL}/bunkering/lookup/bdn-details/${formData.BDN_Number}`);
                    const details = response.data;
                    const bunkerDateString = details.BunkerDate ? details.BunkerDate.slice(0, 16) : '';
                    setFormData(prev => ({
                        ...prev,
                        ...details,
                        BunkerDate: bunkerDateString,
                        Bunkered_Quantity: '',
                        Initial_Quantity_MT: details.Final_Quantity_MT,
                        Initial_Volume_M3: details.Final_Volume_M3,
                        Final_Quantity_MT: details.Final_Quantity_MT,
                        Final_Volume_M3: details.Final_Volume_M3,
                        OperationType: prev.OperationType,
                        IsActive: true,
                    }));
                    
                    if (details.ShipID && details.ShipName) {
                        setInitialVesselOption({ value: details.ShipID, label: `${details.ShipName} (${details.IMO_Number})` });
                        const voyagesRes = await axios.get(`${API_BASE_URL}/bunkering/lookup/voyages/${details.ShipID}`);
                        setVoyageOptions(voyagesRes.data.map(v => ({ value: v.VoyageID, label: v.VoyageNumber })));
                        if (details.VoyageID && details.VoyageNumber) {
                            setInitialVoyageOption({ value: details.VoyageID, label: details.VoyageNumber });
                        }
                    }
                    if (details.BunkerPortCode && details.BunkerPortName) {
                        setBunkerPortSearchTerm(details.BunkerPortName);
                    }
                    if (details.BunkerCategory === 'FUEL' && details.FuelTypeKey && details.FuelTypeDescription) {
                        setInitialFuelTypeOption({ value: details.FuelTypeKey, label: details.FuelTypeDescription });
                    } else if (details.BunkerCategory === 'LUBE_OIL' && details.LubeOilTypeKey && details.LubeOilTypeDescription) {
                        setInitialLubeOilTypeOption({ value: details.LubeOilTypeKey, label: details.LubeOilTypeDescription });
                    }
                } catch (err) {
                    console.error("Error fetching bunker details for BDN lookup:", err);
                    setError("Failed to fetch bunker details for the selected BDN number.");
                } finally {
                    setLoadingDetails(false);
                }
            }
        };
        fetchBunkerDetailsForLookup();
    }, [formData.BDN_Number, formData.OperationType]);


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bunkerPortRef.current && !bunkerPortRef.current.contains(event.target)) {
                setShowBunkerSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const parsedInitialQuantity = parseFloat(formData.Initial_Quantity_MT) || 0;
        const parsedBunkeredQuantity = parseFloat(formData.Bunkered_Quantity) || 0;
        const parsedDensityAt15C = parseFloat(formData.DensityAt15C) || 1000;

        let finalQuantity;
        if (['BUNKER', 'LO_TOPUP', 'INITIAL_FILL'].includes(formData.OperationType)) {
            finalQuantity = parsedInitialQuantity + parsedBunkeredQuantity;
        } else if (formData.OperationType === 'DEBUNKER') {
            finalQuantity = parsedInitialQuantity - parsedBunkeredQuantity;
        } else if (formData.OperationType === 'CORRECTION') {
            finalQuantity = correctionSign === '+' ? parsedInitialQuantity + parsedBunkeredQuantity : parsedInitialQuantity - parsedBunkeredQuantity;
        } else {
            finalQuantity = parsedInitialQuantity;
        }

        const bunkeredVolume = parsedBunkeredQuantity / (parsedDensityAt15C / 1000.0);
        const initialVolume = parsedInitialQuantity / (parsedDensityAt15C / 1000.0);
        const finalVolume = finalQuantity / (parsedDensityAt15C / 1000.0);

        setFormData(prev => ({
            ...prev,
            Final_Quantity_MT: finalQuantity.toFixed(3),
            Bunkered_Volume_M3: bunkeredVolume.toFixed(3),
            Initial_Volume_M3: initialVolume.toFixed(3),
            Final_Volume_M3: finalVolume.toFixed(3),
        }));
    }, [formData.Initial_Quantity_MT, formData.Bunkered_Quantity, formData.DensityAt15C, formData.OperationType, correctionSign]);

    useEffect(() => {
        const fetchAttachments = async () => {
            if (isEditing && id) {
                try {
                    const response = await axios.get(`${API_BASE_URL}/bunkering/${id}/attachments`);
                    setExistingAttachments(response.data);
                } catch (err) {
                    console.error("Error fetching attachments:", err);
                    setError("Failed to load existing attachments.");
                }
            }
        };
        fetchAttachments();
    }, [isEditing, id]);

    useEffect(() => {
        const fetchBdnNumbers = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/bunkering/lookup/bdn-numbers`);
                setAllExistingBdnNumbers(response.data);
            } catch (err) {
                console.error("Failed to fetch all BDN numbers", err);
            }
        };
        fetchBdnNumbers();
    }, []);

    useEffect(() => {
        const fetchBdnNumbersForLookup = async () => {
            if (['DEBUNKER', 'CORRECTION', 'LO_TOPUP'].includes(formData.OperationType)) {
                try {
                    const response = await axios.get(`${API_BASE_URL}/bunkering/lookup/bdn-numbers`, {
                        params: { bunkerCategory: formData.BunkerCategory }
                    });
                    setBdnNumbers(response.data);
                } catch (err) {
                    console.error("Failed to fetch BDN numbers for category", err);
                }
            } else {
                setBdnNumbers([]);
            }
        };
        fetchBdnNumbersForLookup();
    }, [formData.OperationType, formData.BunkerCategory]);


    const loadVesselOptions = useCallback(debounce(async (inputValue, callback) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/bunkering/lookup/ships/active`, { params: { search: inputValue } });
            callback(response.data.map(v => ({ value: v.ShipID, label: `${v.ShipName} (${v.IMO_Number})` })));
        } catch (err) {
            console.error("[AddEditBunkerPage] Error loading vessel options:", err);
            setError(`Failed to fetch vessels: ${err.response?.data?.error || err.message}`);
            callback([]);
        }
    }, 300), []);

    const fetchPortSuggestions = useCallback(debounce(async (searchTerm, setSuggestions) => {
        if (searchTerm.length < 2) { setSuggestions([]); return; }
        try {
            const response = await axios.get(`${API_BASE_URL}/ports/names-only`, { params: { search: searchTerm } });
            setSuggestions(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("[AddEditBunkerPage] Error fetching port suggestions:", err);
            setError(`Failed to fetch ports: ${err.response?.data?.error || err.message}`);
            setSuggestions([]);
        }
    }, 300), []);

    const handleFieldChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleOperationTypeChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            BDN_Number: ''
        }));
    };

    const handleSelectChange = async (selectedOption, actionMeta) => {
        const { name } = actionMeta;
        const value = selectedOption ? selectedOption.value : '';
        
        if (name === "BDN_Number") {
            setFormData(prev => ({ ...prev, BDN_Number: value }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        
        if (name === "ShipID") {
            setInitialVesselOption(selectedOption);
            setFormData(prev => ({
                ...prev, VoyageID: '', FuelTypeKey: '', LubeOilTypeKey: '',
                Initial_Quantity_MT: '', Final_Quantity_MT: '', Bunkered_Quantity: '',
                Initial_Volume_M3: '', Final_Volume_M3: '', Bunkered_Volume_M3: ''
            }));
            setInitialVoyageOption(null); setInitialFuelTypeOption(null); setInitialLubeOilTypeOption(null);
            if (value) {
                try {
                    const voyagesRes = await axios.get(`${API_BASE_URL}/bunkering/lookup/voyages/${value}`);
                    setVoyageOptions(voyagesRes.data.map(v => ({ value: v.VoyageID, label: v.VoyageNumber })));
                } catch (err) { console.error("Error fetching related data for vessel:", err); setError("Failed to load vessel-specific data."); }
            } else { setVoyageOptions([]); }
        } else if (name === "VoyageID") {
            setInitialVoyageOption(selectedOption);
        } else if (name === "BunkerCategory") {
            setFormData(prev => ({ ...prev, BunkerCategory: value, FuelTypeKey: '', LubeOilTypeKey: '', SulphurContentPercent: '', LCV: '', Initial_Quantity_MT: 0, Initial_Volume_M3: 0 }));
            setInitialFuelTypeOption(null); setInitialLubeOilTypeOption(null);
        } else if (name === "FuelTypeKey" || name === "LubeOilTypeKey") {
            if (name === "FuelTypeKey") {
                setInitialFuelTypeOption(selectedOption);
                setFormData(prev => ({ ...prev, LubeOilTypeKey: '' }));
                setInitialLubeOilTypeOption(null);
            } else {
                setInitialLubeOilTypeOption(selectedOption);
                setFormData(prev => ({ ...prev, FuelTypeKey: '' }));
                setInitialFuelTypeOption(null);
            }
            if (formData.ShipID && value) {
                await fetchLastROB(formData.ShipID, formData.BunkerCategory, value);
            } else {
                setFormData(prev => ({ ...prev, Initial_Quantity_MT: 0, Initial_Volume_M3: 0 }));
            }
        }
    };

    const handleBunkerPortSearchChange = (e) => {
        const { value } = e.target;
        setBunkerPortSearchTerm(value); setShowBunkerSuggestions(true); fetchPortSuggestions(value, setBunkerPortSuggestions);
        if (value === '') setFormData(prev => ({ ...prev, BunkerPortCode: '' }));
    };

    const handleBunkerPortSelect = (port) => {
        setBunkerPortSearchTerm(port.PortName); setFormData(prev => ({ ...prev, BunkerPortCode: port.PortCode })); setShowBunkerSuggestions(false);
    };

    const handleBunkerPortInputFocus = () => {
        setShowBunkerSuggestions(true);
        if (bunkerPortSearchTerm.length >= 2) fetchPortSuggestions(bunkerPortSearchTerm, setBunkerPortSuggestions);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const newAttachments = files.filter(file => file.type === 'application/pdf');
        
        if (newAttachments.length !== files.length) {
            setError('Only PDF documents are allowed for upload.');
        } else {
            setError('');
        }
        
        setAttachments(newAttachments);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitLoading(true);

        // Separate validation for required fields based on whether it's a new entry or an edit
        if (!formData.ShipID || !formData.BunkerDate || !formData.OperationType || !formData.BunkerPortCode) {
            setError('Please fill in all common required fields (Vessel, Bunker Date, Operation Type, Bunker Port).');
            setSubmitLoading(false);
            return;
        }

        // New validation check for Bunkered Quantity, only for new reports
        if (!isEditing && !formData.Bunkered_Quantity) {
            setError('Please provide a Bunkered Quantity.');
            setSubmitLoading(false);
            return;
        }

        if (formData.BunkerCategory === 'FUEL' && !formData.FuelTypeKey) {
            setError('Please select a Fuel Type.');
            setSubmitLoading(false);
            return;
        }
        if (formData.BunkerCategory === 'LUBE_OIL' && !formData.LubeOilTypeKey) {
            setError('Please select a Lube Oil Type.');
            setSubmitLoading(false);
            return;
        }
        
        if (!formData.BDN_Number) {
            if (formData.OperationType === 'BUNKER') {
                setError('Please provide a BDN Number for this Bunkering operation.');
            } else {
                setError('Please select a BDN Number from the lookup for this operation.');
            }
            setSubmitLoading(false);
            return;
        }

        if (!isEditing && ['BUNKER', 'LO_TOPUP', 'INITIAL_FILL'].includes(formData.OperationType)) {
            if (allExistingBdnNumbers.includes(formData.BDN_Number)) {
                setError(`A bunker report with BDN Number '${formData.BDN_Number}' already exists. Please use a different BDN number or select 'De-bunkering' or 'Correction' as the operation type.`);
                setSubmitLoading(false);
                return;
            }
        }


        const submitData = { 
            ...formData, 
            CorrectionSign: formData.OperationType === 'CORRECTION' ? correctionSign : null,
        };

        if (submitData.BunkerCategory === 'LUBE_OIL') {
            submitData.SulphurContentPercent = null;
            submitData.LCV = null;
            submitData.FuelTypeKey = null;
        } else {
            submitData.SulphurContentPercent = parseFloat(submitData.SulphurContentPercent) || null;
            submitData.LCV = parseFloat(submitData.LCV) || null;
            submitData.LubeOilTypeKey = null;
        }

        const payload = new FormData();

        for (const key in submitData) {
            const value = submitData[key];
            if (value !== null && value !== undefined && value !== '') {
                if (key === 'BunkerDate') {
                    payload.append(key, value);
                } else if (key === 'IsActive') {
                    payload.append(key, value ? 1 : 0);
                } else if (key === 'TankAllocations') {
                    // Do nothing
                } else {
                    payload.append(key, value);
                }
            }
        }

        attachments.forEach(file => {
            payload.append('attachments', file);
        });

        try {
            if (isEditing) {
                await axios.put(`${API_BASE_URL}/bunkering/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
                alert('Bunkering record updated successfully!');
            } else {
                await axios.post(`${API_BASE_URL}/bunkering`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
                alert('Bunkering record created successfully!');
            }
            navigate('/app/memp/bunkering-management');
        } catch (err) {
            console.error("Submission error:", err);
            setError('Failed to save bunkering record: ' + (err.response?.data?.error || err.message || 'Please check your input.'));
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loadingDetails) return <div className="loading-state">Loading bunkering details...</div>;

    const isLookupOperation = ['DEBUNKER', 'CORRECTION', 'LO_TOPUP'].includes(formData.OperationType);

    return (
        <div className="bunker-add-edit-page-container">
            <div className="page-header">
                <h1>{isEditing ? `Edit Bunker Record: ${formData.BDN_Number || 'N/A'}` : 'Add New Bunker Record'}</h1>
                <Link to="/app/memp/bunkering-management" className="back-link">&larr; Back to Bunker List</Link>
            </div>
            {error && <p className="form-error-message page-level-error">{error}</p>}
            <section className="form-section">
                <form onSubmit={handleSubmit} className="bunker-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="ShipID">Vessel <span className="required-star">*</span>:</label>
                            <AsyncSelect id="ShipID" name="ShipID" cacheOptions={false} loadOptions={loadVesselOptions} defaultOptions value={initialVesselOption} onChange={(opt) => handleSelectChange(opt, { name: "ShipID" })} placeholder="Search & Select Vessel" isClearable isDisabled={submitLoading || isEditing} required classNamePrefix="react-select" styles={customStyles} menuPortalTarget={document.body} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="BunkerDate">Bunker Date/Time <span className="required-star">*</span>:</label>
                            <input type="datetime-local" id="BunkerDate" name="BunkerDate" value={formData.BunkerDate || ''} onChange={handleFieldChange} disabled={submitLoading || isEditing} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="BunkerCategory">Bunker Category <span className="required-star">*</span>:</label>
                            <Select id="BunkerCategory" name="BunkerCategory" options={[{ value: 'FUEL', label: 'Fuel' }, { value: 'LUBE_OIL', label: 'Lube Oil' }]} value={{ value: formData.BunkerCategory, label: formData.BunkerCategory === 'FUEL' ? 'Fuel' : 'Lube Oil' }} onChange={(opt) => handleSelectChange(opt, { name: "BunkerCategory" })} placeholder="Select Category" isClearable={false} isDisabled={submitLoading || isEditing} required classNamePrefix="react-select" styles={customStyles} menuPortalTarget={document.body} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="OperationType">Operation Type <span className="required-star">*</span>:</label>
                            <select id="OperationType" name="OperationType" value={formData.OperationType} onChange={handleOperationTypeChange} disabled={submitLoading || isEditing} required>
                                <option value="BUNKER">Bunkering</option>
                                <option value="DEBUNKER">De-Bunkering</option>
                                <option value="CORRECTION">Correction</option>
                                {formData.BunkerCategory === 'LUBE_OIL' && (<>
                                    <option value="LO_TRANSFER">LO Transfer</option>
                                    <option value="LO_TOPUP">LO Top-up</option>
                                    <option value="INITIAL_FILL">Initial Fill</option>
                                </>)}
                            </select>
                        </div>
                        
                        {isLookupOperation ? (
                             <div className="form-group">
                                <label htmlFor="BDN_Number">BDN Number Lookup <span className="required-star">*</span>:</label>
                                <Select
                                    id="BDN_Number"
                                    name="BDN_Number"
                                    options={bdnNumbers.map(bdn => ({ value: bdn, label: bdn }))}
                                    value={bdnNumbers.map(bdn => ({ value: bdn, label: bdn })).find(opt => opt.value === formData.BDN_Number) || null}
                                    onChange={(opt) => setFormData(prev => ({ ...prev, BDN_Number: opt?.value || '' }))}
                                    placeholder="Select BDN Number"
                                    isClearable
                                    isDisabled={submitLoading || isEditing}
                                    required
                                    classNamePrefix="react-select"
                                    styles={customStyles}
                                    menuPortalTarget={document.body}
                                />
                            </div>
                        ) : (
                            <div className="form-group">
                                <label htmlFor="BDN_Number">BDN Number:</label>
                                <input type="text" id="BDN_Number" name="BDN_Number" value={formData.BDN_Number || ''} onChange={handleFieldChange} disabled={isEditing || isLookupOperation} />
                            </div>
                        )}

                        {formData.BunkerCategory === 'FUEL' && (<div className="form-group">
                            <label htmlFor="FuelTypeKey">Fuel Type <span className="required-star">*</span>:</label>
                            <Select id="FuelTypeKey" name="FuelTypeKey" options={fuelTypeOptions} value={fuelTypeOptions.find(opt => opt.value === formData.FuelTypeKey) || null} onChange={(opt) => handleSelectChange(opt, { name: "FuelTypeKey" })} placeholder="Select Fuel Type" isClearable isDisabled={submitLoading || !formData.ShipID || isEditing} required={formData.BunkerCategory === 'FUEL'} classNamePrefix="react-select" styles={customStyles} menuPortalTarget={document.body} />
                        </div>)}
                        {formData.BunkerCategory === 'LUBE_OIL' && (<div className="form-group">
                            <label htmlFor="LubeOilTypeKey">Lube Oil Type <span className="required-star">*</span>:</label>
                            <Select id="LubeOilTypeKey" name="LubeOilTypeKey" options={lubeOilTypeOptions} value={lubeOilTypeOptions.find(opt => opt.value === formData.LubeOilTypeKey) || null} onChange={(opt) => handleSelectChange(opt, { name: "LubeOilTypeKey" })} placeholder="Select Lube Oil Type" isClearable isDisabled={submitLoading || !formData.ShipID || isEditing} required={formData.BunkerCategory === 'LUBE_OIL'} classNamePrefix="react-select" styles={customStyles} menuPortalTarget={document.body} />
                        </div>)}
                        <div className="form-group">
                            <label htmlFor="Bunkered_Quantity">Quantity (MT) <span className="required-star">*</span>:</label>
                            <input type="number" step="0.001" id="Bunkered_Quantity" name="Bunkered_Quantity" value={formData.Bunkered_Quantity || ''} onChange={handleFieldChange} disabled={submitLoading || isEditing} required={!isEditing} />
                            {formData.OperationType === 'CORRECTION' && (
                                <div className="correction-sign-container">
                                    <label>
                                        <input type="radio" name="correctionSign" value="+" checked={correctionSign === '+'} onChange={() => setCorrectionSign('+')} disabled={isEditing} />
                                        +
                                    </label>
                                    <label>
                                        <input type="radio" name="correctionSign" value="-" checked={correctionSign === '-'} onChange={() => setCorrectionSign('-')} disabled={isEditing} />
                                        -
                                    </label>
                                </div>
                            )}
                        </div>
                        
                        <div className="form-group" ref={bunkerPortRef}>
                            <label htmlFor="BunkerPortName">Bunker Port <span className="required-star">*</span>:</label>
                            <input type="text" id="BunkerPortName" name="BunkerPortName" value={bunkerPortSearchTerm} onChange={handleBunkerPortSearchChange} onFocus={handleBunkerPortInputFocus} placeholder="Search & Select Bunker Port (Type 2+ chars)" disabled={submitLoading} required autoComplete="off" />
                            {showBunkerSuggestions && bunkerPortSuggestions.length > 0 && (<ul className="port-suggestions-list">{bunkerPortSuggestions.map(port => (<li key={port.PortCode} onClick={() => handleBunkerPortSelect(port)}>{port.PortName} ({port.PortCode})</li>))}</ul>)}
                            {showBunkerSuggestions && bunkerPortSearchTerm.length >= 2 && bunkerPortSuggestions.length === 0 && (<div className="no-options-message">No matching ports found.</div>)}
                        </div>
                        <div className="form-group">
                            <label htmlFor="VoyageID">Voyage Number:</label>
                            <Select id="VoyageID" name="VoyageID" options={voyageOptions} value={voyageOptions.find(opt => opt.value === formData.VoyageID) || null} onChange={(opt) => handleSelectChange(opt, { name: "VoyageID" })} placeholder="Select Voyage" isClearable isDisabled={submitLoading || !formData.ShipID || isEditing} classNamePrefix="react-select" styles={customStyles} menuPortalTarget={document.body} />
                        </div>
                        <div className="form-group-heading full-width"><h2><FaFlask /> {formData.BunkerCategory === 'FUEL' ? 'Fuel Quality Parameters' : 'Lube Oil Quality Parameters'}</h2></div>
                        <div className="form-group"><label htmlFor="DensityAt15C">Density at 15°C (kg/m³):</label><input type="number" step="0.001" id="DensityAt15C" name="DensityAt15C" value={formData.DensityAt15C || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        {formData.BunkerCategory === 'FUEL' && (<>
                            <div className="form-group"><label htmlFor="SulphurContentPercent">Sulphur Content (%):</label><input type="number" step="0.01" id="SulphurContentPercent" name="SulphurContentPercent" value={formData.SulphurContentPercent || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        </>)}
                        <div className="form-group"><label htmlFor="FlashPointC">Flash Point (°C):</label><input type="number" step="0.1" id="FlashPointC" name="FlashPointC" value={formData.FlashPointC || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        <div className="form-group"><label htmlFor="ViscosityAt50C_cSt">Viscosity at 50°C (cSt):</label><input type="number" step="0.001" id="ViscosityAt50C_cSt" name="ViscosityAt50C_cSt" value={formData.ViscosityAt50C_cSt || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        <div className="form-group"><label htmlFor="WaterContentPercent">Water Content (%):</label><input type="number" step="0.01" id="WaterContentPercent" name="WaterContentPercent" value={formData.WaterContentPercent || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        {formData.BunkerCategory === 'FUEL' && (<>
                            <div className="form-group"><label htmlFor="LCV">LCV (MJ/kg):</label><input type="number" step="0.001" id="LCV" name="LCV" value={formData.LCV || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        </>)}
                        <div className="form-group"><label htmlFor="TemperatureC">Temperature (°C):</label><input type="number" step="0.1" id="TemperatureC" name="TemperatureC" value={formData.TemperatureC || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        <div className="form-group"><label htmlFor="PressureBar">Pressure (bar):</label><input type="number" step="0.01" id="PressureBar" name="PressureBar" value={formData.PressureBar || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        <div className="form-group-heading full-width"><h2><FaOilCan /> Supplier & Sample Details</h2></div>
                        <div className="form-group"><label htmlFor="SupplierName">Supplier Name:</label><input type="text" id="SupplierName" name="SupplierName" value={formData.SupplierName || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        <div className="form-group"><label htmlFor="BargeName">Barge Name:</label><input type="text" id="BargeName" name="BargeName" value={formData.BargeName || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        <div className="form-group"><label htmlFor="MARPOLSampleSealNumber">MARPOL Sample Seal No.:</label><input type="text" id="MARPOLSampleSealNumber" name="MARPOLSampleSealNumber" value={formData.MARPOLSampleSealNumber || ''} onChange={handleFieldChange} disabled={submitLoading} /></div>
                        <div className="form-group-heading full-width"><h2><FaWeightHanging /> Quantity & Volume Details (Calculated)</h2></div>
                        <div className="form-group"><label htmlFor="Initial_Quantity_MT">Initial Quantity (MT):</label><input type="number" step="0.001" id="Initial_Quantity_MT" name="Initial_Quantity_MT" value={formData.Initial_Quantity_MT || ''} disabled={true} /></div>
                        <div className="form-group"><label htmlFor="Final_Quantity_MT">Final Quantity (MT):</label><input type="number" step="0.001" id="Final_Quantity_MT" name="Final_Quantity_MT" value={formData.Final_Quantity_MT || ''} onChange={handleFieldChange} disabled={true} /></div>
                        <div className="form-group"><label htmlFor="Initial_Volume_M3">Initial Volume (m³):</label><input type="number" step="0.001" id="Initial_Volume_M3" name="Initial_Volume_M3" value={formData.Initial_Volume_M3 || ''} onChange={handleFieldChange} disabled={true} /></div>
                        <div className="form-group"><label htmlFor="Final_Volume_M3">Final Volume (m³):</label><input type="number" step="0.001" id="Final_Volume_M3" name="Final_Volume_M3" value={formData.Final_Volume_M3 || ''} onChange={handleFieldChange} disabled={true} /></div>
                        <div className="form-group"><label htmlFor="Bunkered_Volume_M3">Bunkered Volume (m³):</label><input type="number" step="0.001" id="Bunkered_Volume_M3" name="Bunkered_Volume_M3" value={formData.Bunkered_Volume_M3 || ''} onChange={handleFieldChange} disabled={true} /></div>
                        <div className="form-group-heading full-width"><h2><FaPaperclip /> BDN Documents</h2></div>
                        <div className="form-group full-width">
                            <label htmlFor="attachments">Upload BDN Documents:</label>
                            <input type="file" id="attachments" name="attachments" ref={fileInputRef} onChange={handleFileChange} multiple disabled={submitLoading} />
                        </div>
                        {error && (
                            <p className="form-error-message page-level-error">{error}</p>
                        )}
                        {isEditing && existingAttachments.length > 0 && (
                            <div className="form-group full-width">
                                <label>BDN Documents:</label>
                                <ul className="attachment-list">
                                    {existingAttachments.map(attachment => (
                                        <li key={attachment.Attachment_Id}>
                                            <a href={`${API_BASE_URL}/bunkering/uploads/bunker_attachments/${attachment.Filename}`} target="_blank" rel="noopener noreferrer" className="attachment-link">
                                                {attachment.OriginalName}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="submit-button" disabled={submitLoading}>{submitLoading ? 'Saving...' : (isEditing ? 'Update Bunker' : 'Create Bunker')}</button>
                        <Link to="/app/memp/bunkering-management" className="cancel-button" disabled={submitLoading}>Cancel</Link>
                    </div>
                </form>
            </section>
        </div>
    );
};

export default AddEditBunkerPage;