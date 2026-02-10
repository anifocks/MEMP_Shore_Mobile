const db = require('../config/database');

const getMachineryDataForPeriod = async (shipId, fromDate, toDate) => {
    const connection = await db.getConnection();
    try {
        // Query 1: Fetch total fuel consumption grouped by fuel type
        const fuelQuery = `
            SELECT 
                fc.FuelTypeKey,
                SUM(fc.ConsumedMT) as ConsumedMT
            FROM FuelConsumptionLogs fc
            WHERE fc.ShipID = ? AND DATE(fc.EntryDate) BETWEEN ? AND ?
            GROUP BY fc.FuelTypeKey;
        `;

        // Query 2: Fetch total running hours grouped by machinery name
        const machineryQuery = `
            SELECT 
                md.MachineryName,
                SUM(md.RunningHrs) as RunningHours
            FROM MachineryData md
            WHERE md.ShipID = ? AND DATE(md.EntryDate) BETWEEN ? AND ?
            GROUP BY md.MachineryName;
        `;

        // Execute both queries concurrently for efficiency
        const [fuelResults] = await connection.execute(fuelQuery, [shipId, fromDate, toDate]);
        const [machineryResults] = await connection.execute(machineryQuery, [shipId, fromDate, toDate]);

        return {
            fuelConsumptions: fuelResults,
            machineryData: machineryResults,
        };
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    getMachineryDataForPeriod,
};