CREATE TABLE CII_Reduction_Factors (
    CalendarYear INT PRIMARY KEY,
    ReductionFactor DECIMAL(5,4)
);

INSERT INTO CII_Reduction_Factors VALUES
(2025, 0.09),
(2026, 0.11),
(2027, 0.13),
(2028, 0.15),
(2029, 0.17),
(2030, 0.19);
