import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import Select from 'react-select';
import debounce from 'lodash.debounce';
import './AddEditTankPage.css';
import { FaSave, FaTimes, FaRulerCombined, FaWeightHanging } from 'react-icons/fa';

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

const AddEditTankPage = () => {
    const { id, vesselId: initialVesselIdParam } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        VesselID: initialVesselIdParam || '',
        TankID: '',
        Tank_Name: '',
        ContentCategory: '',
        ContentTypeKey: '',
        CapacityM3: '',      // Capacity is now always a direct input for MEMP_VesselTanks
        IsActive: true,
        Location: '',
        LengthMeters: '',
        BreadthMeters: '',
        DepthMeters: '',
        Ullage: '',
        DensityKGM3: '',
        TemperatureC: '',
        PressureBar: '',
        VolumeM3: '',
        WeightMT: '',
    });

    const [initialVesselOption, setInitialVesselOption] = useState(null);
    const [initialTankDefinitionOption, setInitialTankDefinitionOption] = useState(null);
    const [tankDefinitions, setTankDefinitions] = useState([]);
    const [contentCategories, setContentCategories] = useState([
        { value: 'FUEL', label: 'Fuel' },
        { value: 'WATER', label: 'Water' },
        { value: 'LO', label: 'Lube Oil' },
        { value: 'OR', label: 'Oily Residue' },
    ]);
    const [fuelTypes, setFuelTypes] = useState([]);
    const [waterTypes, setWaterTypes] = useState([]);
    const [lubeOilTypes, setLubeOilTypes] = useState([]);
    const [oilyResidueTypes, setOilyResidueTypes] = useState([]);

    const [submitLoading, setSubmitLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(isEditing);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            setError('');
            setLoadingDetails(true);
            try {
                // Fetch Tank Definitions (Designations) - Only basic info, no capacity from this table
                const tankDefsResponse = await axios.get(`${API_BASE_URL}/tanks/metadata/definitions`);
                setTankDefinitions(tankDefsResponse.data.map(td => ({
                    value: td.TankID,
                    label: `${td.Designation} (${td.TankNumber})`,
                    // Removed definition.CapacityM3 here as MEMP_Tanks no longer holds it.
                })));

                // Fetch Content Type Keys
                const [fuelRes, waterRes, loRes, orRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/tanks/metadata/content-types/fuel`),
                    axios.get(`${API_BASE_URL}/tanks/metadata/content-types/water`),
                    axios.get(`${API_BASE_URL}/tanks/metadata/content-types/lubeoil`),
                    axios.get(`${API_BASE_URL}/tanks/metadata/content-types/oilyresidue`)
                ]);
                setFuelTypes(fuelRes.data.map(t => ({ value: t.FuelTypeKey, label: t.FuelTypeDescription })));
                setWaterTypes(waterRes.data.map(t => ({ value: t.WaterTypeKey, label: t.WaterTypeDescription })));
                setLubeOilTypes(loRes.data.map(t => ({ value: t.LubeOilTypeKey, label: t.LubeOilTypeDescription })));
                setOilyResidueTypes(orRes.data.map(t => ({ value: t.OilyResidueTypeKey, label: t.OilyResidueTypeDescription })));

                if (isEditing && id) {
                    const response = await axios.get(`${API_BASE_URL}/tanks/details/${id}`);
                    const details = response.data;

                    setFormData({
                        VesselID: details.VesselID || '',
                        TankID: details.TankID || '',
                        Tank_Name: details.Tank_Name || '',
                        ContentCategory: details.ContentCategory || '',
                        ContentTypeKey: details.ContentTypeKey || '',
                        CapacityM3: details.CapacityM3 || '', // This capacity comes from MEMP_VesselTanks
                        IsActive: details.IsActive !== undefined ? !!details.IsActive : true,
                        Location: details.Location || '',
                        LengthMeters: details.LengthMeters || '',
                        BreadthMeters: details.BreadthMeters || '',
                        DepthMeters: details.DepthMeters || '',
                        Ullage: details.Ullage || '',
                        DensityKGM3: details.DensityKGM3 || '',
                        TemperatureC: details.TemperatureC || '',
                        PressureBar: details.PressureBar || '',
                        VolumeM3: details.VolumeM3 || '',
                        WeightMT: details.WeightMT || '',
                    });

                    if (details.VesselID && details.ShipName) {
                        setInitialVesselOption({ value: details.VesselID, label: `${details.ShipName} (${details.IMO_Number})` });
                    }
                    if (details.TankID && details.TankDesignation) {
                        setInitialTankDefinitionOption({ value: details.TankID, label: `${details.TankDesignation} (${details.TankNumber || ''})` });
                    }
                } else if (initialVesselIdParam) {
                    const vesselResponse = await axios.get(`${API_BASE_URL}/ships/details/${initialVesselIdParam}`);
                    setInitialVesselOption({ value: vesselResponse.data.ShipID, label: `${vesselResponse.data.ShipName} (${vesselResponse.data.IMO_Number})` });
                    setFormData(prev => ({ ...prev, VesselID: initialVesselIdParam }));
                }

            } catch (err) {
                console.error("Error fetching initial tank data:", err);
                setError("Failed to load tank data. " + (err.response?.data?.error || err.message));
            } finally {
                setLoadingDetails(false);
            }
        };

        fetchInitialData();
    }, [isEditing, id, initialVesselIdParam]);

    const loadVesselOptions = useCallback(debounce(async (inputValue, callback) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/ships/active`, {
                params: { search: inputValue }
            });
            const options = response.data.map(v => ({ value: v.ShipID, label: `${v.ShipName} (${v.IMO_Number})` }));
            callback(options);
        } catch (err) {
            console.error("[AddEditTankPage] Error loading vessel options:", err);
            setError(`Failed to fetch vessels: ${err.response?.data?.error || err.message}`);
            callback([]);
        }
    }, 300), []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSelectChange = (selectedOption, actionMeta) => {
        const { name } = actionMeta;
        setFormData(prev => ({
            ...prev,
            [name]: selectedOption ? selectedOption.value : ''
        }));

        if (name === "VesselID") {
            setInitialVesselOption(selectedOption);
            // Reset relevant fields when vessel changes
            setFormData(prev => ({
                ...prev,
                TankID: '',
                Tank_Name: '',
                ContentCategory: '',
                ContentTypeKey: '',
                CapacityM3: '',
                Location: '',
                LengthMeters: '',
                BreadthMeters: '',
                DepthMeters: '',
                Ullage: '',
                DensityKGM3: '',
                TemperatureC: '',
                PressureBar: '',
                VolumeM3: '',
                WeightMT: '',
            }));
            setInitialTankDefinitionOption(null);
        } else if (name === "TankID") {
            setInitialTankDefinitionOption(selectedOption);
            // CapacityM3 is now a manual input, not auto-filled from definition
            // Physical dimensions are always manual inputs for new tanks, or loaded on edit.
            setFormData(prev => ({
                ...prev,
                TankID: selectedOption ? selectedOption.value : '',
                // CapacityM3 is NOT set from definition anymore
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitLoading(true);

        if (!formData.VesselID || !formData.TankID || !formData.Tank_Name || !formData.ContentCategory || !formData.CapacityM3) {
            setError('Please fill in all required fields (Vessel, Tank Definition, Tank Name, Content Category, and Capacity).');
            setSubmitLoading(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                CapacityM3: parseFloat(formData.CapacityM3) || null,
                Location: formData.Location || null,
                LengthMeters: parseFloat(formData.LengthMeters) || null,
                BreadthMeters: parseFloat(formData.BreadthMeters) || null,
                DepthMeters: parseFloat(formData.DepthMeters) || null,
                Ullage: parseFloat(formData.Ullage) || null,
                DensityKGM3: parseFloat(formData.DensityKGM3) || null,
                TemperatureC: parseFloat(formData.TemperatureC) || null,
                PressureBar: parseFloat(formData.PressureBar) || null,
                VolumeM3: parseFloat(formData.VolumeM3) || null,
                WeightMT: parseFloat(formData.WeightMT) || null,
                IsActive: formData.IsActive ? 1 : 0,
            };

            if (isEditing) {
                await axios.put(`${API_BASE_URL}/tanks/${id}`, payload);
                alert('Tank updated successfully!');
            } else {
                await axios.post(`${API_BASE_URL}/tanks`, payload);
                alert('Tank created successfully!');
            }
            navigate('/app/memp/tank-management');
        } catch (err) {
            console.error("Submission error:", err);
            setError('Failed to save tank: ' + (err.response?.data?.error || err.message || 'Please check your input.'));
        } finally {
            setSubmitLoading(false);
        }
    };

    const getContentTypeOptions = () => {
        switch (formData.ContentCategory) {
            case 'FUEL': return fuelTypes;
            case 'WATER': return waterTypes;
            case 'LO': return lubeOilTypes;
            case 'OR': return oilyResidueTypes;
            default: return [];
        }
    };

    if (loadingDetails) {
        return <div className="loading-state">Loading tank details...</div>;
    }

    return (
        <div className="tank-add-edit-page-container">
            <div className="page-header">
                <h1>{isEditing ? `Edit Tank: ${formData.Tank_Name}` : 'Add New Tank'}</h1>
                <Link to="/app/memp/tank-management" className="back-link">&larr; Back to Tank List</Link>
            </div>

            {error && <p className="form-error-message page-level-error">{error}</p>}

            <section className="form-section">
                <form onSubmit={handleSubmit} className="tank-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="VesselID">Vessel <span className="required-star">*</span>:</label>
                            <AsyncSelect
                                id="VesselID"
                                name="VesselID"
                                cacheOptions={false}
                                loadOptions={loadVesselOptions}
                                defaultOptions={true}
                                value={initialVesselOption}
                                onChange={(selectedOption) => handleSelectChange(selectedOption, { name: "VesselID" })}
                                placeholder="Search & Select Vessel"
                                isClearable
                                isDisabled={submitLoading || isEditing}
                                required
                                classNamePrefix="react-select"
                                styles={customStyles}
                                menuPortalTarget={document.body}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="TankID">Tank Definition <span className="required-star">*</span>:</label>
                            <Select
                                id="TankID"
                                name="TankID"
                                options={tankDefinitions}
                                value={tankDefinitions.find(opt => opt.value === formData.TankID) || null}
                                onChange={(selectedOption) => handleSelectChange(selectedOption, { name: "TankID" })}
                                placeholder="Select Tank Type"
                                isClearable
                                isDisabled={submitLoading}
                                required
                                classNamePrefix="react-select"
                                styles={customStyles}
                                menuPortalTarget={document.body}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="Tank_Name">Tank Instance Name <span className="required-star">*</span>:</label>
                            <input
                                type="text"
                                id="Tank_Name"
                                name="Tank_Name"
                                value={formData.Tank_Name}
                                onChange={handleChange}
                                disabled={submitLoading}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="VolumeM3">Volume (m³):</label>
                            <input
                                type="text"
                                id="VolumeM3"
                                name="VolumeM3"
                                value={formData.VolumeM3 || ''} // Display current derived value
                                readOnly // Make it read-only
                                disabled // Disable interaction
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="WeightMT">Weight (MT):</label>
                            <input
                                type="text"
                                id="WeightMT"
                                name="WeightMT"
                                value={formData.WeightMT || ''} // Display current derived value
                                readOnly // Make it read-only
                                disabled // Disable interaction
                            />
                        </div>


                        <div className="form-group">
                            <label htmlFor="CapacityM3">Capacity (m³) <span className="required-star">*</span>:</label>
                            <input
                                type="number"
                                step="0.01"
                                id="CapacityM3"
                                name="CapacityM3"
                                value={formData.CapacityM3}
                                onChange={handleChange}
                                disabled={submitLoading}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ContentCategory">Content Category <span className="required-star">*</span>:</label>
                            <select
                                id="ContentCategory"
                                name="ContentCategory"
                                value={formData.ContentCategory}
                                onChange={handleChange}
                                disabled={submitLoading}
                                required
                            >
                                <option value="">Select Category</option>
                                {contentCategories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="ContentTypeKey">Specific Content Type:</label>
                            <Select
                                id="ContentTypeKey"
                                name="ContentTypeKey"
                                options={getContentTypeOptions()}
                                value={getContentTypeOptions().find(opt => opt.value === formData.ContentTypeKey) || null}
                                onChange={(selectedOption) => handleSelectChange(selectedOption, { name: "ContentTypeKey" })}
                                placeholder="Select Type"
                                isClearable
                                isDisabled={submitLoading || !formData.ContentCategory}
                                classNamePrefix="react-select"
                                styles={customStyles}
                                menuPortalTarget={document.body}
                            />
                        </div>

                        <div className="form-group-heading full-width">
                            <h2><FaRulerCombined /> Physical Dimensions</h2>
                        </div>
                        <div className="form-group">
                            <label htmlFor="Location">Location:</label>
                            <input type="text" id="Location" name="Location" value={formData.Location} onChange={handleChange} disabled={submitLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="LengthMeters">Length (m):</label>
                            <input type="number" step="0.01" id="LengthMeters" name="LengthMeters" value={formData.LengthMeters} onChange={handleChange} disabled={submitLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="BreadthMeters">Breadth (m):</label>
                            <input type="number" step="0.01" id="BreadthMeters" name="BreadthMeters" value={formData.BreadthMeters} onChange={handleChange} disabled={submitLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="DepthMeters">Depth (m):</label>
                            <input type="number" step="0.01" id="DepthMeters" name="DepthMeters" value={formData.DepthMeters} onChange={handleChange} disabled={submitLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="Ullage">Ullage (m):</label>
                            <input type="number" step="0.01" id="Ullage" name="Ullage" value={formData.Ullage} onChange={handleChange} disabled={submitLoading} />
                        </div>

                        <div className="form-group-heading full-width">
                            <h2><FaWeightHanging /> Current Content Details</h2>
                        </div>
                        <div className="form-group">
                            <label htmlFor="DensityKGM3">Density (kg/m³):</label>
                            <input type="number" step="0.001" id="DensityKGM3" name="DensityKGM3" value={formData.DensityKGM3} onChange={handleChange} disabled={submitLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="TemperatureC">Temperature (°C):</label>
                            <input type="number" step="0.1" id="TemperatureC" name="TemperatureC" value={formData.TemperatureC} onChange={handleChange} disabled={submitLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="PressureBar">Pressure (bar):</label>
                            <input type="number" step="0.01" id="PressureBar" name="PressureBar" value={formData.PressureBar} onChange={handleChange} disabled={submitLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="VolumeM3">Volume (m³):</label>
                            <input type="number" step="0.01" id="VolumeM3" name="VolumeM3" value={formData.VolumeM3} onChange={handleChange} disabled={submitLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="WeightMT">Weight (MT):</label>
                            <input type="number" step="0.01" id="WeightMT" name="WeightMT" value={formData.WeightMT} onChange={handleChange} disabled={submitLoading} />
                        </div>

                        {isEditing && (
                            <div className="form-group full-width checkbox-group">
                                <label htmlFor="IsActive">
                                    <input
                                        type="checkbox"
                                        id="IsActive"
                                        name="IsActive"
                                        checked={formData.IsActive}
                                        onChange={handleChange}
                                        disabled={submitLoading}
                                    />
                                    Is Active
                                </label>
                            </div>
                        )}
                    </div>

                    {error && <p className="form-error-message page-level-error">{error}</p>}

                    <div className="form-actions">
                        <button type="submit" className="submit-button" disabled={submitLoading}>
                            {submitLoading ? 'Saving...' : (isEditing ? 'Update Tank' : 'Create Tank')}
                        </button>
                        <Link to="/app/memp/tank-management" className="cancel-button" disabled={submitLoading}>
                            Cancel
                        </Link>
                    </div>
                </form>
            </section>
        </div>
    );
};

export default AddEditTankPage;