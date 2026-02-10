// viswa-digital-backend/voyage-service/voyageServer.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process'; // <-- ADDED
import voyageRoutes from './routes/voyageRoutes.js';
import { getPool } from './utils/db.js';
import path from 'path'; 

const app = express();
const port = process.env.PORT || 7007;

// CORS configuration
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:7000';

console.log(`[VoyageService] Configuring CORS for origins: ${clientUrl}, ${gatewayUrl}`);
const corsOptions = {
  origin: [clientUrl, gatewayUrl, 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// CRITICAL FIX: The following lines MUST be commented out or removed.
// This resolves the "Unexpected end of form" error.
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


// CRITICAL FIX: Serve static files from the 'public' directory
app.use(express.static(path.join(path.resolve(), 'public'))); 


// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'Voyage Service', timestamp: new Date().toISOString() });
});

// All API routes will be handled by the voyageRoutes router
app.use('/', voyageRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("[VoyageService Global Error Handler]", err.message, err.stack ? err.stack.substring(0,600) : '');
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
      error: err.message || 'An unexpected error occurred in Voyage Service.',
      details: process.env.NODE_ENV === 'development' && err.stack ? err.stack : (err.details || undefined)
  });
});

let serverInstance;

const startServer = async () => {
  const portInUse = port; // <-- ADDED for port killer

  try { // <-- REMOVED 'T-'
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
                console.log(`[VoyageService] Port ${portInUse} is in use by PID ${pid}. Killing it...`);
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
            console.error("[VoyageService] FATAL ERROR: One or more essential database configuration variables are missing from .env file. Please check DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE.");
            process.exit(1);
        } // <-- REMOVED 'T-'
        await getPool(); 
        serverInstance = app.listen(portInUse, () => { // <-- Use portInUse
            console.log(`🚀 Voyage Service running at http://localhost:${portInUse}`); // <-- Use portInUse
            console.log(`   DB: ${process.env.DB_HOST}${process.env.DB_INSTANCE_NAME ? '\\' + process.env.DB_INSTANCE_NAME : ''} -> ${process.env.DB_DATABASE}`);
        }); // <-- REMOVED 'T-'
    } catch (error) {
        console.error(`[VoyageService] Failed to start server during initial setup:`, error.message, error.stack);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`[VoyageService] Received ${signal}. Attempting graceful shutdown...`);
    if (serverInstance) {
        serverInstance.close(async () => {
            console.log('[VoyageService] HTTP server closed.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  console.error('[VoyageService] Unhandled Rejection at:', promise, 'reason:', reason); // <-- REMOVED 'T-'
});
process.on('uncaughtException', (error) => {
  console.error('[VoyageService] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException').then(() => process.exit(1));
});

startServer();