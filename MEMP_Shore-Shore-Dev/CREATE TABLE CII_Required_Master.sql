CREATE TABLE CII_Required_Master (
    VesselTypeKey VARCHAR(50),
    CapacityMin DECIMAL(18,2),
    CapacityMax DECIMAL(18,2),
    CalendarYear INT,
    RequiredCII DECIMAL(10,6),
    Boundary_A DECIMAL(10,6),
    Boundary_B DECIMAL(10,6),
    Boundary_C DECIMAL(10,6),
    Boundary_D DECIMAL(10,6)
);
