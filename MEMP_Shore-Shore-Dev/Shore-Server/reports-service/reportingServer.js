// File: AI Help/viswa-digital-backend/reports-service/reportingServer.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from './utils/db.js';
import reportingRoutes from './routes/reportingRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const PORT = process.env.VESSEL_REPORTING_SERVICE_PORT || 7010;

app.use(cors());
// CRITICAL FIX: Enable express.json() to parse JSON request bodies
app.use(express.json({ limit: '10mb' })); // Allows parsing JSON bodies up to 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Keep if you use application/x-www-form-urlencoded anywhere


app.use('/uploads/reports', express.static(path.join(__dirname, 'public/uploads/reports')));

// Use getPool to establish database connection at startup
getPool().then(() => {
    app.use('/', reportingRoutes);

    app.use((err, req, res, next) => {
        console.error("[VesselReportingService Error Handler]:", err.stack);
        res.status(err.status || 500).send({ error: 'Error in Vessel Reporting Service!', details: err.message });
    });

    const server = app.listen(PORT, () => {
        console.log(`🚀 Vessel Reporting Service running on http://localhost:${PORT}`);
    });

    const gracefulShutdown = (signal) => {
        console.log(`\n${signal} received. Shutting down Vessel Reporting Service...`);
        server.close(async () => {
            console.log('HTTP server closed.');
            try {
                const pool = await getPool();
                if (pool) await pool.close();
                console.log('Database pool closed.');
            } catch (dbErr) { console.error('Error closing database pool:', dbErr); }
            process.exit(0);
        });
        setTimeout(() => { console.error('Forcefully shutting down.'); process.exit(1); }, 10000);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}).catch(err => {
    console.error("Failed to connect to DB for Vessel Reporting Service. Exiting.", err);
    process.exit(1);
});