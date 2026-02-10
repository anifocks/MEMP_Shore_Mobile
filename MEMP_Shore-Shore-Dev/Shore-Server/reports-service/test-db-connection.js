import sql from 'mssql';

const config = {
    user: 'sa',
    password: 'Singapore787501',
    server: 'VC-ITL-M031',
    database: 'Viswa_Memp_Shore',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: 'MEPZ_TEST_4_INST'
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
};

console.log('Testing database connection...');
console.log('Config:', {
    ...config,
    password: '***'
});

sql.connect(config)
    .then(pool => {
        console.log('✅ Connected successfully!');
        return pool.request().query('SELECT TOP 1 * FROM INFORMATION_SCHEMA.TABLES');
    })
    .then(result => {
        console.log('✅ Query executed successfully!');
        console.log('Sample data:', result.recordset.length, 'rows');
    })
    .catch(err => {
        console.error('❌ Connection failed:', err.message);
        console.error('Error code:', err.code);
        console.error('Full error:', err);
    })
    .finally(() => {
        sql.close();
        process.exit(0);
    });