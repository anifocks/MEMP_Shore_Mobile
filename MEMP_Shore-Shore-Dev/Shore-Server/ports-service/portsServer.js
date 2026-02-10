// viswa-digital-backend/ports-service/portsServer.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process'; // <-- ADDED
import portRoutes from './routes/portRoutes.js';
import { getPool } from './utils/db.js'; // Assuming getPool also handles connection setup on first call

const app = express();
const port = process.env.PORT || 7006; // The ports service will run on this port

// CORS configuration to allow requests from your frontend and API Gateway
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:7000';

console.log(`[PortsService] Configuring CORS for origins: ${clientUrl}, ${gatewayUrl}`);
const corsOptions = {
  origin: [clientUrl, gatewayUrl, 'http://127.0.0.1:5173'], // Add 127.0.0.1 for local dev
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'Ports Service', timestamp: new Date().toISOString() });
});

// All API routes will be handled by the portRoutes router
app.use('/', portRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("[PortsService Global Error Handler]", err.message, err.stack ? err.stack.substring(0,600) : '');
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
      error: err.message || 'An unexpected error occurred in Ports Service.',
      details: process.env.NODE_ENV === 'development' && err.stack ? err.stack : (err.details || undefined)
  });
});

let serverInstance;

const startServer = async () => {
  const portInUse = port; // <-- ADDED for port killer

    try {
        // ------------------------------
        // AUTO-KILL PORT HANDLER
        // ------------------------------
        // 🧩 Kill any process using this port (cross-platform)
        if (process.platform === 'win32') {
          try {
            const findCmd = `netstat -ano | findstr :${portInUse}`;
            const result = execSync(findCmd).toString();
            const lines = result.trim().split('\n');
    
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(pid)) {
                console.log(`[PortsService] Port ${portInUse} is in use by PID ${pid}. Killing it...`);
                execSync(`taskkill /PID ${pid} /F`);
              }
            }
          } catch {
            // No process found using port
          }
        } else {
          try {
            execSync(`fuser -k ${portInUse}/tcp`);
          } catch {
            // Ignore if nothing found
          }
        }
        // ------------------------------
        // END AUTO-KILL PORT HANDLER
        // ------------------------------


        if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_DATABASE) {
            console.error("[PortsService] FATAL ERROR: One or more essential database configuration variables are missing from .env file. Please check DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE.");
            process.exit(1);
        }
        await getPool(); // Initialize DB pool
        serverInstance = app.listen(portInUse, () => { // <-- Changed 'port' to 'portInUse'
            console.log(`🚀 Ports Service running at http://localhost:${portInUse}`); // <-- Changed 'port' to 'portInUse'
            console.log(`   DB: ${process.env.DB_HOST}${process.env.DB_INSTANCE_NAME ? '\\' + process.env.DB_INSTANCE_NAME : ''} -> ${process.env.DB_DATABASE}`);
        });
    } catch (error) {
        console.error(`[PortsService] Failed to start server during initial setup:`, error.message, error.stack);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`[PortsService] Received ${signal}. Attempting graceful shutdown...`);
    if (serverInstance) {
        serverInstance.close(async () => {
            console.log('[PortsService] HTTP server closed.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  console.error('[PortsService] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[PortsService] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException').then(() => process.exit(1));
});

startServer();