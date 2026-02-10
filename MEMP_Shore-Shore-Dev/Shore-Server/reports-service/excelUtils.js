import ExcelJS from 'exceljs';
import moment from 'moment-timezone';

// --- Helper function to define common styling ---
const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    }
};

const subHeaderStyle = { // This style is defined but not currently used in addSheet for subheaders
    font: { bold: true, color: { argb: '000000' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DDEBF7' } }, // Light blue
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    }
};

const dataStyle = {
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    }
};

// Helper to format date-time values consistently for Excel export
const formatExcelDateTime = (date, timezone) => {
    if (!date) return null;
    let m = moment.utc(date); // Assume dates from DB are UTC

    if (timezone && moment.tz.zone(timezone)) {
        m = m.tz(timezone); // Convert to local timezone if specified
    } else if (typeof timezone === 'string' && timezone.match(/\(UTC([+-]\d{2}:\d{2})\)/)) {
        // Handle (UTC+XX:YY) format by applying offset
        const offset = timezone.match(/\(UTC([+-]\d{2}:\d{2})\)/)[1];
        m = moment.utc(date).utcOffset(offset, true);
    } else {
        m = moment(date); // Fallback to local machine time
    }

    if (!m.isValid()) return null;
    return m.toDate(); // ExcelJS handles Date objects for proper date formatting in Excel
};

// Helper to add data to a sheet with styling
const addSheet = (workbook, sheetName, columns, data) => {
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = columns;

    // Apply header style
    sheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // Add data rows and apply data style
    data.forEach(rowItem => {
        const rowValues = {};
        columns.forEach(col => {
            let value = rowItem[col.key];
            // Format dates using the helper function
            if (col.key.includes('Date') || col.key.includes('DateTime')) {
                // Pass timezone from main report if available, otherwise just use UTC or local for consistency
                value = formatExcelDateTime(value, rowItem.TimeZoneAtPort);
            }
            rowValues[col.key] = value;
        });
        const row = sheet.addRow(rowValues);
        row.eachCell(cell => { cell.style = dataStyle; });
    });

    // Add filter to all columns
    if (data.length > 0) {
        sheet.autoFilter = {
            from: 'A1',
            to: `${String.fromCharCode(64 + columns.length)}1`,
        };
    }
};


// --- Main function to generate the Excel template ---
export const generateReportTemplate = async (lookupData) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Viswa Digital';
    workbook.lastModifiedBy = 'Viswa Digital';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Sheet 1: Vessel Daily Reports (Main Data)
    const mainReportSheet = workbook.addWorksheet('VesselDailyReports');
    mainReportSheet.columns = [
        { header: 'Report Identifier (Unique Key)', key: 'reportIdentifier', width: 30 },
        { header: 'Ship IMO Number', key: 'imoNumber', width: 20 }, // User inputs IMO, backend looks up ShipID
        { header: 'Report Type (e.g., AT_SEA, AT_PORT)', key: 'reportTypeKey', width: 30 }, // Lookup
        { header: 'Report Date/Time UTC (YYYY-MM-DD HH:MM)', key: 'reportDateTimeUTC', width: 30 },
        { header: 'Report Date/Time Local (YYYY-MM-DD HH:MM)', key: 'reportDateTimeLocal', width: 35 },
        { header: 'Time Zone (e.g., Asia/Kolkata)', key: 'timeZoneAtPort', width: 25 },
        { header: 'Latitude', key: 'latitude', width: 15 },
        { header: 'Longitude', key: 'longitude', width: 15 },
        { header: 'Vessel Activity', key: 'vesselActivity', width: 25 }, // Lookup
        { header: 'Current Port Code (if at port)', key: 'currentPortCode', width: 25 }, // Lookup
        { header: 'Voyage Number (if applicable)', key: 'voyageNumber', width: 25 }, // Lookup
        { header: 'Report Status (e.g., Draft, Submitted)', key: 'reportStatus', width: 25 },
        { header: 'Report Duration (hours)', key: 'reportDuration', width: 20 },
        { header: 'From Port Code (if voyage)', key: 'fromPort', width: 20 },
        { header: 'To Port Code (if voyage)', key: 'toPort', width: 20 },
        { header: 'Course (DEG)', key: 'courseDEG', width: 15 },
        { header: 'Speed (Knots)', key: 'speedKnots', width: 15 },
        { header: 'Distance Since Last Report (NM)', key: 'distanceSinceLastReportNM', width: 30 },
        { header: 'Engine Distance (NM)', key: 'engineDistanceNM', width: 20 },
        { header: 'Distance To Go (NM)', key: 'distanceToGoNM', width: 20 },
        { header: 'Slip (%)', key: 'slipPercent', width: 15 },
        { header: 'Distance Travelled HS (NM)', key: 'distanceTravelledHS_NM', width: 30 },
        { header: 'Steaming Hours Period (HRS)', key: 'steamingHoursPeriod', width: 30 },
        { header: 'Time At Anchorage (HRS)', key: 'timeAtAnchorageHRS', width: 25 },
        { header: 'Time At Drifting (HRS)', key: 'timeAtDriftingHRS', width: 25 },
        { header: 'Wind Force', key: 'windForce', width: 15 },
        { header: 'Wind Direction', key: 'windDirection', width: 20 }, // Lookup
        { header: 'Sea State', key: 'seaState', width: 20 }, // Lookup
        { header: 'Swell Direction', key: 'swellDirection', width: 20 }, // Lookup
        { header: 'Swell Height (M)', key: 'swellHeightM', width: 20 },
        { header: 'Air Temperature (C)', key: 'airTemperatureC', width: 25 },
        { header: 'Sea Temperature (C)', key: 'seaTemperatureC', width: 25 },
        { header: 'Barometric Pressure (HPa)', key: 'barometricPressureHPa', width: 30 },
        { header: 'Cargo Activity', key: 'cargoActivity', width: 25 }, // Lookup
        { header: 'Reported Cargo Type', key: 'reportedCargoType', width: 30 },
        { header: 'Reported Cargo Quantity (MT)', key: 'reportedCargoQuantityMT', width: 35 },
        { header: 'Containers (TEU)', key: 'containersTEU', width: 20 },
        { header: 'Displacement (MT)', key: 'displacementMT', width: 20 },
        { header: 'Remarks', key: 'remarks', width: 40 },
    ];
    mainReportSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });
    mainReportSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) { // Apply style to data rows
            row.eachCell(cell => { cell.style = dataStyle; });
        }
    });

    // Sheet 2: Fuel Consumption
    const fuelConsumptionSheet = workbook.addWorksheet('Fuel Consumption');
    fuelConsumptionSheet.columns = [
        { header: 'Report Identifier (Unique Key)', key: 'reportIdentifier', width: 30 },
        { header: 'Fuel Type (e.g., HFO, MDO)', key: 'fuelTypeKey', width: 25 }, // Lookup
        { header: 'Machinery Name (Optional, e.g., ME1, AE2)', key: 'machineryName', width: 35 },
        { header: 'Machinery Type (e.g., MAIN_ENGINE, AUX_ENGINE)', key: 'machineryTypeKey', width: 35 }, // Lookup
        { header: 'Consumed By Description (e.g., Main Engine, Boilers)', key: 'consumedByDescription', width: 40 },
        { header: 'Consumed Quantity (MT)', key: 'consumedMT', width: 25 },
        { header: 'Vessel Tank (Optional, e.g., FO PORT STBD)', key: 'vesselTankName', width: 30 } // Lookup
    ];
    fuelConsumptionSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // Sheet 3: Lube Oil Consumption
    const loConsumptionSheet = workbook.addWorksheet('Lube Oil Consumption');
    loConsumptionSheet.columns = [
        { header: 'Report Identifier (Unique Key)', key: 'reportIdentifier', width: 30 },
        { header: 'LO Type (e.g., CYLINDER_OIL, SYSTEM_OIL)', key: 'loTypeKey', width: 25 }, // Lookup
        { header: 'Machinery Type (Optional)', key: 'machineryTypeKey', width: 25 }, // Lookup
        { header: 'Specific Machinery Name (Optional)', key: 'specificMachineryName', width: 30 },
        { header: 'Consumed Quantity', key: 'consumedQty', width: 20 },
        { header: 'Vessel Tank (Optional)', key: 'vesselTankName', width: 30 } // Lookup
    ];
    loConsumptionSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // Sheet 4: Machinery Data
    const machineryDataSheet = workbook.addWorksheet('Machinery Data');
    machineryDataSheet.columns = [
        { header: 'Report Identifier (Unique Key)', key: 'reportIdentifier', width: 30 },
        { header: 'Machinery Type (e.g., MAIN_ENGINE, AUX_ENGINE)', key: 'machineryTypeKey', width: 35 }, // Lookup
        { header: 'Machinery Name (e.g., ME1, AE2)', key: 'machineryName', width: 25 }, // Should be based on configured ship machinery
        { header: 'Power (kW)', key: 'power', width: 15 },
        { header: 'RPM', key: 'rpm', width: 10 },
        { header: 'Running Hours', key: 'running_Hrs', width: 20 },
        { header: 'Remarks', key: 'remarks', width: 40 }
    ];
    machineryDataSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // Sheet 5: Fuel ROB (Remaining On Board)
    const fuelRobSheet = workbook.addWorksheet('Fuel ROB');
    fuelRobSheet.columns = [
        { header: 'Report Identifier (Unique Key)', key: 'reportIdentifier', width: 30 },
        { header: 'Fuel Type (e.g., HFO, MDO)', key: 'fuelTypeKey', width: 25 }, // Lookup
        { header: 'ROB Quantity (MT)', key: 'robMT', width: 20 },
        { header: 'ROB Date (YYYY-MM-DD HH:MM)', key: 'rob_Date', width: 30 }
    ];
    fuelRobSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // Sheet 6: Lube Oil ROB
    const loRobSheet = workbook.addWorksheet('Lube Oil ROB');
    loRobSheet.columns = [
        { header: 'Report Identifier (Unique Key)', key: 'reportIdentifier', width: 30 },
        { header: 'LO Type (e.g., CYLINDER_OIL, SYSTEM_OIL)', key: 'loTypeKey', width: 25 }, // Lookup
        { header: 'Tank Identifier (Optional)', key: 'tankIdentifier', width: 25 },
        { header: 'ROB Quantity', key: 'robQty', width: 20 },
    ];
    loRobSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });


    // Sheet 7: Water Log
    const waterLogSheet = workbook.addWorksheet('Water Log');
    waterLogSheet.columns = [
        { header: 'Report Identifier (Unique Key)', key: 'reportIdentifier', width: 30 },
        { header: 'Water Type (e.g., FRESH_WATER, POTABLE_WATER)', key: 'waterTypeKey', width: 30 }, // Lookup
        { header: 'Quantity (MT)', key: 'quantityMT', width: 15 },
        { header: 'Operation Type (e.g., CONSUMED, GENERATED, DISPOSED)', key: 'operationType', width: 35 },
        { header: 'Disposal Method (if DISPOSED)', key: 'disposalMethodKey', width: 25 }, // Lookup
        { header: 'Disposed To (if DISPOSED)', key: 'disposedTo', width: 30 },
        { header: 'Remarks', key: 'remarks', width: 40 }
    ];
    waterLogSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    // Sheet 8: Oily Residue Log
    const oilyResidueLogSheet = workbook.addWorksheet('Oily Residue Log');
    oilyResidueLogSheet.columns = [
        { header: 'Report Identifier (Unique Key)', key: 'reportIdentifier', width: 30 },
        { header: 'Residue Type (e.g., SLUDGE, BILGE_WATER)', key: 'residueTypeKey', width: 30 }, // Lookup
        { header: 'Tank Identifier (Optional)', key: 'tankIdentifier', width: 25 },
        { header: 'ROB Quantity (M3)', key: 'robQtyM3', width: 20 },
        { header: 'Generated Quantity (M3)', key: 'generatedQtyM3', width: 25 },
        { header: 'Retained On Board (M3)', key: 'retainedOnBoardM3', width: 30 },
        { header: 'Disposed Quantity (M3)', key: 'disposedQtyM3', width: 25 },
        { header: 'Disposal Method (if disposed)', key: 'disposalMethodKey', width: 25 }, // Lookup
        { header: 'Disposal Port Code (if disposed)', key: 'disposalPortCode', width: 25 }, // Lookup
        { header: 'Disposal Date (YYYY-MM-DD HH:MM) (if disposed)', key: 'disposalDate', width: 40 },
        { header: 'Disposal Remarks', key: 'disposalRemarks', width: 40 }
    ];
    oilyResidueLogSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });


    // Sheet 9: Lookups (for user guidance)
    const lookupsSheet = workbook.addWorksheet('Lookups');
    lookupsSheet.columns = [
        { header: 'Category', key: 'category', width: 25 },
        { header: 'Key', key: 'key', width: 25 },
        { header: 'Description', key: 'description', width: 50 }
    ];
    lookupsSheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

    if (lookupData) {
        let rowNum = 2;
        // Ships
        lookupData.ships.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Ships (IMO Number)';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.IMO_Number || ''); // Ensure string conversion
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.ShipName || ''); // Ensure string conversion
            rowNum++;
        });
        // Ports
        lookupData.ports.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Ports (Code)';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.PortCode || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String((item.PortName || '') + ' (' + (item.Country || '') + ')');
            rowNum++;
        });
        // Report Types
        lookupData.reportTypes.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Report Types (Key)';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.ReportTypeKey || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.ReportTypeName || '');
            rowNum++;
        });
        // Vessel Activities
        lookupData.vesselActivities.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Vessel Activities';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.Vessel_Activity || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.Vessel_Activity || '');
            rowNum++;
        });
        // Fuel Types
        lookupData.fuelTypes.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Fuel Types (Key)';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.FuelTypeKey || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.FuelTypeDescription || '');
            rowNum++;
        });
        // Lube Oil Types
        lookupData.lubeOilTypes.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Lube Oil Types (Key)';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.LubeOilTypeKey || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.LubeOilTypeDescription || '');
            rowNum++;
        });
        // Machinery Types
        lookupData.machineryTypes.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Machinery Types (Key)';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.MachineryTypeKey || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.Description || '');
            rowNum++;
        });
        // Disposal Methods
        lookupData.disposalMethods.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Disposal Methods (Key)';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.DisposalMethodKey || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.Description || '');
            rowNum++;
        });
        // Water Types
        lookupData.waterTypes.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Water Types (Key)';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.WaterTypeKey || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.WaterTypeDescription || '');
            rowNum++;
        });
        // Oily Residue Types
        lookupData.oilyResidueTypes.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Oily Residue Types (Key)';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.OilyResidueTypeKey || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.OilyResidueTypeDescription || '');
            rowNum++;
        });
        // Wind Directions
        lookupData.windDirections.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Wind Directions';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.DirectionName || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.DirectionName || '');
            rowNum++;
        });
        // Sea States
        lookupData.seaStates.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Sea States';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.StateDescription || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.StateDescription || '');
            rowNum++;
        });
        // Swell Directions
        lookupData.swellDirections.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Swell Directions';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.DirectionName || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.DirectionName || '');
            rowNum++;
        });
        // Cargo Activities
        lookupData.cargoActivities.forEach(item => {
            lookupsSheet.getCell(`A${rowNum}`).value = 'Cargo Activities';
            lookupsSheet.getCell(`B${rowNum}`).value = String(item.Cargo_Activity || '');
            lookupsSheet.getCell(`C${rowNum}`).value = String(item.Cargo_Activity || '');
            rowNum++;
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

// --- Function to parse the uploaded Excel file ---
export const parseExcelReport = async (filePath) => {
    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.readFile(filePath);
    } catch (readErr) {
        console.error("Error reading Excel file:", readErr);
        throw new Error("Failed to read Excel file. It might be corrupted or in an unsupported format.");
    }

    const sheets = {};

    // Define expected sheets and their primary keys for linking
    const expectedSheets = {
        'VesselDailyReports': { key: 'reportIdentifier', isMain: true },
        'Fuel Consumption': { key: 'reportIdentifier' },
        'Lube Oil Consumption': { key: 'reportIdentifier' },
        'Machinery Data': { key: 'reportIdentifier' },
        'Fuel ROB': { key: 'reportIdentifier' },
        'Lube Oil ROB': { key: 'reportIdentifier' },
        'Water Log': { key: 'reportIdentifier' },
        'Oily Residue Log': { key: 'reportIdentifier' }
    };

    for (const sheetName in expectedSheets) {
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            // If a sheet is explicitly missing, we might want to log a warning but continue
            console.warn(`Worksheet '${sheetName}' not found in the uploaded Excel file.`);