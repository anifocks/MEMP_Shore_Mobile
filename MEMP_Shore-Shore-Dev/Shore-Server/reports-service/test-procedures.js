import sql from 'mssql';
import { getPool } from './utils/db.js';

async function testUKProcedures() {
  try {
    const pool = await getPool();

    // Test UK_MRV_Data_Summary
    console.log('Testing UK_MRV_Data_Summary...');
    const request1 = pool.request();
    request1.input('ShipID', sql.Int, 1); // Use a test ship ID
    request1.input('Fromdate', sql.Date, new Date('2024-01-01'));
    request1.input('Todate', sql.Date, new Date('2024-12-31'));

    const result1 = await request1.execute('UK_MRV_Data_Summary');
    console.log('UK_MRV_Data_Summary recordsets:', result1.recordsets.length);
    result1.recordsets.forEach((rs, i) => {
      console.log(`Recordset ${i}: ${rs.length} rows`);
    });

    // Test UKETS_Data
    console.log('\nTesting UKETS_Data...');
    const request2 = pool.request();
    request2.input('ShipID', sql.Int, 1);
    request2.input('Fromdate', sql.Date, new Date('2024-01-01'));
    request2.input('Todate', sql.Date, new Date('2024-12-31'));

    const result2 = await request2.execute('UKETS_Data');
    console.log('UKETS_Data recordsets:', result2.recordsets.length);
    result2.recordsets.forEach((rs, i) => {
      console.log(`Recordset ${i}: ${rs.length} rows`);
    });

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testUKProcedures();