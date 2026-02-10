CREATE TABLE Fuel_Sulphur_Master (
    FuelTypeKey            VARCHAR(50)  PRIMARY KEY,
    FuelTypeDescription    VARCHAR(255),
    DefaultSulphurPercent  DECIMAL(5,3),
    Basis                  VARCHAR(100),
    IsActive               BIT
);

INSERT INTO Fuel_Sulphur_Master
(FuelTypeKey, FuelTypeDescription, DefaultSulphurPercent, Basis, IsActive)
VALUES
('DIESEL_GAS_OIL', 'Diesel/Gas Oil (ISO 8217 DMX-DMB)', 0.100, 'MARPOL Annex VI', 1),
('HFO',             'Heavy Fuel Oil (ISO 8217 RME-RMK)', 3.500, 'MARPOL Annex VI', 1),
('LFO',             'Light Fuel Oil (ISO 8217 RMA-RMD)', 3.500, 'MARPOL Annex VI', 1),
('LNG',             'Liquefied Natural Gas',            0.000, 'Sulphur Free Fuel', 1),
('LPG_BUTANE',      'Liquefied Petroleum Gas (Butane)', 0.000, 'Sulphur Free Fuel', 1),
('LPG_PROPANE',     'Liquefied Petroleum Gas (Propane)',0.000, 'Sulphur Free Fuel', 1),
('METHANOL',        'Methanol',                          0.000, 'Sulphur Free Fuel', 1),
('ETHANOL',         'Ethanol',                           0.000, 'Sulphur Free Fuel', 1);
